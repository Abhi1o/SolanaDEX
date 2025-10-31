# Design Document: Accurate Swap Calculations

## Overview

This design addresses the root cause of swap transaction failures: the mismatch between off-chain estimates and on-chain execution. Currently, the system uses stale reserve data from `dex-config.json` which was captured at pool deployment time. As trades occur, the actual on-chain reserves change, causing our calculations to diverge from what the on-chain program computes.

The solution involves fetching live pool state from the blockchain before calculating swap quotes, ensuring our minimum output calculations match what the on-chain program will accept.

## Architecture

### Current Flow (Problematic)
```
User Input → getQuote() → Use config reserves → Calculate output → executeSwap() → ❌ Slippage error
```

### New Flow (Fixed)
```
User Input → getQuote() → Fetch on-chain reserves → Calculate output → executeSwap() → ✅ Success
```

### Key Changes

1. **Pool State Fetching**: Add method to fetch current reserves from on-chain pool accounts
2. **Quote Calculation**: Update `getQuote()` to use live reserves instead of config values
3. **Caching Layer**: Implement short-lived cache (5 seconds) to reduce RPC calls
4. **Error Handling**: Add robust error handling for RPC failures with fallback to config values

## Components and Interfaces

### 1. Pool State Interface

```typescript
interface PoolState {
  reserveA: bigint;        // Current reserve of token A in base units
  reserveB: bigint;        // Current reserve of token B in base units
  feeNumerator: bigint;    // Fee numerator (e.g., 3 for 0.3%)
  feeDenominator: bigint;  // Fee denominator (e.g., 1000)
  lastUpdated: number;     // Timestamp of fetch
}

interface PoolStateCache {
  [poolAddress: string]: {
    state: PoolState;
    expiresAt: number;
  };
}
```

### 2. ShardedDexService Updates

#### New Methods

```typescript
class ShardedDexService {
  private poolStateCache: PoolStateCache = {};
  private readonly CACHE_TTL_MS = 5000; // 5 seconds
  
  /**
   * Fetch current pool state from on-chain account
   * Uses token account balances as source of truth
   */
  private async fetchPoolState(pool: ShardedPool): Promise<PoolState> {
    // Fetch token account balances directly
    // This is more reliable than deserializing pool account
    const [tokenAccountAInfo, tokenAccountBInfo] = await Promise.all([
      this.connection.getTokenAccountBalance(new PublicKey(pool.tokenAccountA)),
      this.connection.getTokenAccountBalance(new PublicKey(pool.tokenAccountB))
    ]);
    
    return {
      reserveA: BigInt(tokenAccountAInfo.value.amount),
      reserveB: BigInt(tokenAccountBInfo.value.amount),
      feeNumerator: 3n,      // 0.3% fee
      feeDenominator: 1000n,
      lastUpdated: Date.now()
    };
  }
  
  /**
   * Get pool state with caching
   */
  private async getPoolState(pool: ShardedPool): Promise<PoolState> {
    const cached = this.poolStateCache[pool.poolAddress];
    const now = Date.now();
    
    if (cached && cached.expiresAt > now) {
      return cached.state;
    }
    
    try {
      const state = await this.fetchPoolState(pool);
      this.poolStateCache[pool.poolAddress] = {
        state,
        expiresAt: now + this.CACHE_TTL_MS
      };
      return state;
    } catch (error) {
      console.warn(`Failed to fetch pool state for ${pool.poolAddress}:`, error);
      // Fallback to config values
      return this.getPoolStateFromConfig(pool);
    }
  }
  
  /**
   * Fallback: Convert config reserves to PoolState
   */
  private getPoolStateFromConfig(pool: ShardedPool): PoolState {
    const tokenA = dexConfig.tokens.find(t => t.mint === pool.tokenA)!;
    const tokenB = dexConfig.tokens.find(t => t.mint === pool.tokenB)!;
    
    return {
      reserveA: BigInt(Math.floor(parseFloat(pool.liquidityA) * Math.pow(10, tokenA.decimals))),
      reserveB: BigInt(Math.floor(parseFloat(pool.liquidityB) * Math.pow(10, tokenB.decimals))),
      feeNumerator: 3n,
      feeDenominator: 1000n,
      lastUpdated: 0 // Indicates stale data
    };
  }
}
```

#### Modified Methods

```typescript
async getQuote(
  inputTokenSymbol: string,
  outputTokenSymbol: string,
  inputAmount: number
): Promise<SwapQuote> {
  // ... existing validation code ...
  
  // NEW: Fetch live pool states for all shards
  const poolStates = await Promise.all(
    shards.map(shard => this.getPoolState(shard))
  );
  
  // Calculate quotes using live reserves
  for (let i = 0; i < shards.length; i++) {
    const shard = shards[i];
    const poolState = poolStates[i];
    
    // Use poolState.reserveA and poolState.reserveB instead of config values
    const reserveInBase = isForward ? poolState.reserveA : poolState.reserveB;
    const reserveOutBase = isForward ? poolState.reserveB : poolState.reserveA;
    
    // Rest of calculation logic remains the same
    const outputAmount = this.calculateSwapOutput(
      inputAmountBase,
      reserveInBase,
      reserveOutBase
    );
    
    // ... rest of quote calculation ...
  }
}
```

### 3. Enhanced Logging

Add detailed logging to help diagnose issues:

```typescript
console.log('📊 Pool State:');
console.log(`  Reserve A: ${poolState.reserveA} (${Number(poolState.reserveA) / Math.pow(10, inputToken.decimals)} ${pool.tokenASymbol})`);
console.log(`  Reserve B: ${poolState.reserveB} (${Number(poolState.reserveB) / Math.pow(10, outputToken.decimals)} ${pool.tokenBSymbol})`);
console.log(`  Data age: ${poolState.lastUpdated === 0 ? 'STALE (from config)' : `${Date.now() - poolState.lastUpdated}ms`}`);
```

## Data Models

### Token Account Balance Response
```typescript
// From @solana/web3.js
interface TokenAmount {
  amount: string;          // Raw amount as string
  decimals: number;        // Token decimals
  uiAmount: number | null; // Human-readable amount
  uiAmountString: string;  // Human-readable as string
}

interface RpcResponseAndContext<T> {
  context: { slot: number };
  value: T;
}
```

## Error Handling

### RPC Failure Scenarios

1. **Network timeout**: Fallback to config values, show warning
2. **Invalid account**: Log error, fallback to config values
3. **Rate limiting**: Implement exponential backoff, use cache aggressively

### Error Messages

```typescript
if (poolState.lastUpdated === 0) {
  console.warn('⚠️  Using stale reserve data from config - quotes may be inaccurate');
}

if (error.message.includes('429')) {
  throw new Error('RPC rate limit exceeded. Please try again in a moment.');
}
```

## Testing Strategy

### Unit Tests

1. **Pool State Fetching**
   - Test successful fetch with mock RPC responses
   - Test fallback to config on RPC failure
   - Test cache hit/miss scenarios
   - Test cache expiration

2. **Quote Calculation**
   - Test with live reserves vs config reserves
   - Verify output amounts match on-chain calculations
   - Test minimum output calculation accuracy

3. **Cache Behavior**
   - Test TTL expiration
   - Test concurrent requests use same cached data
   - Test cache invalidation

### Integration Tests

1. **End-to-End Swap**
   - Execute actual swap on devnet
   - Verify transaction succeeds with 1% slippage
   - Compare estimated vs actual output

2. **RPC Resilience**
   - Test with slow RPC responses
   - Test with intermittent failures
   - Verify graceful degradation

### Manual Testing Checklist

- [ ] Swap succeeds with 1% slippage on fresh pool
- [ ] Swap succeeds with 1% slippage after multiple trades
- [ ] UI shows accurate price impact
- [ ] Logs show live reserve data being used
- [ ] Fallback works when RPC is unavailable
- [ ] Cache reduces RPC calls (check network tab)

## Performance Considerations

### RPC Call Optimization

- **Parallel fetching**: Fetch all shard states concurrently
- **Caching**: 5-second TTL reduces calls by ~80% for active users
- **Batch requests**: Consider using `getMultipleAccounts` for multiple shards

### Expected Performance

- **Without cache**: ~200-500ms per quote (2 RPC calls)
- **With cache hit**: <10ms per quote
- **Cache hit rate**: ~80% for users actively trading

## Migration Strategy

### Phase 1: Add Pool State Fetching (Non-Breaking)
- Add new methods without changing existing behavior
- Add feature flag to enable/disable live fetching
- Test thoroughly on devnet

### Phase 2: Enable by Default
- Switch default to use live reserves
- Keep config fallback for reliability
- Monitor error rates

### Phase 3: Cleanup
- Remove feature flag after 1 week of stable operation
- Add metrics/monitoring for cache hit rates
- Consider removing config reserves (keep for fallback only)

## Security Considerations

1. **RPC Trust**: We trust the RPC endpoint to provide accurate data
2. **Cache Poisoning**: Cache is in-memory only, cleared on page refresh
3. **Decimal Overflow**: Use BigInt for all calculations to prevent overflow
4. **Slippage Protection**: On-chain program still enforces minimum output

## Future Enhancements

1. **WebSocket Subscriptions**: Subscribe to account changes for real-time updates
2. **Multi-hop Routing**: Use live reserves for complex routing decisions
3. **Price Oracle**: Aggregate prices across shards for better estimates
4. **Historical Data**: Track reserve changes for analytics
