# Sharded DEX Integration Guide

## What is This?

Your DEX uses a **Sharded Liquidity Pool Architecture** - a unique approach where each trading pair is split across multiple pools (shards) with increasing liquidity tiers.

### Architecture

```
USDC/SOL Pair:
├── Shard 1: 50K USDC / 500 SOL
├── Shard 2: 100K USDC / 1K SOL
├── Shard 3: 200K USDC / 2K SOL
└── Shard 4: 400K USDC / 4K SOL

USDC/USDT Pair:
├── Shard 1: 100K USDC / 100K USDT
├── Shard 2: 200K USDC / 200K USDT
├── Shard 3: 400K USDC / 400K USDT
└── Shard 4: 800K USDC / 800K USDT

ETH/SOL Pair:
├── Shard 1: 100 ETH / 5K SOL
├── Shard 2: 200 ETH / 10K SOL
├── Shard 3: 400 ETH / 20K SOL
└── Shard 4: 800 ETH / 40K SOL
```

## Benefits

1. **Better Pricing**: Larger shards for big trades, smaller for retail
2. **Reduced Slippage**: Smart routing distributes trades optimally
3. **Scalability**: More shards = more capacity
4. **Capital Efficiency**: Different liquidity tiers for different trade sizes

## Integration

### 1. Configuration

Your DEX configuration is stored in:
```
src/config/dex-config.json
```

Contains:
- 4 tokens (USDC, SOL, USDT, ETH)
- 12 pools (3 pairs × 4 shards each)
- All contract addresses
- Liquidity levels

### 2. Service Layer

```typescript
// src/lib/shardedDex.ts
import { shardedDex } from '@/lib/shardedDex';

// Get all supported tokens
const tokens = shardedDex.getTokens();

// Get quote for swap
const quote = await shardedDex.getQuote('USDC', 'SOL', 100);

// Execute swap
const signature = await shardedDex.executeSwap(walletPublicKey, quote, 0.5);

// Get pools for pair
const pools = shardedDex.getShardsBySymbol('USDC', 'SOL');
```

### 3. React Hook

```typescript
// In your component
import { useShardedDex } from '@/hooks/useShardedDex';

function SwapComponent() {
  const {
    tokens,
    getQuote,
    executeSwap,
    loading,
    error
  } = useShardedDex();

  const handleSwap = async () => {
    // Get quote
    const quote = await getQuote('USDC', 'SOL', 100);

    if (quote) {
      // Execute swap with 0.5% slippage tolerance
      const signature = await executeSwap(quote, 0.5);
      console.log('Swap successful:', signature);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleSwap}>Swap</button>
    </div>
  );
}
```

## Usage Examples

### Example 1: Get Best Quote

```typescript
import { useShardedDex } from '@/hooks/useShardedDex';

function QuoteDisplay() {
  const { getQuote } = useShardedDex();
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    async function fetchQuote() {
      const q = await getQuote('USDC', 'SOL', 1000);
      setQuote(q);
    }
    fetchQuote();
  }, [getQuote]);

  return (
    <div>
      <p>Input: {quote?.inputAmount} USDC</p>
      <p>Output: ~{quote?.estimatedOutput} SOL</p>
      <p>Price Impact: {quote?.priceImpact.toFixed(2)}%</p>
      <p>Using Shard: {quote?.route[0].shardNumber}</p>
    </div>
  );
}
```

### Example 2: Show All Trading Pairs

```typescript
function TradingPairs() {
  const { getTradingPairs } = useShardedDex();
  const pairs = getTradingPairs();

  return (
    <ul>
      {pairs.map(pair => (
        <li key={pair.pair}>
          {pair.pair} - {pair.shards} shards
        </li>
      ))}
    </ul>
  );
}
```

### Example 3: Display Pool Shards

```typescript
function PoolShards() {
  const { getPoolsForPair } = useShardedDex();
  const pools = getPoolsForPair('USDC', 'SOL');

  return (
    <div>
      <h3>USDC/SOL Liquidity Shards</h3>
      {pools.map(pool => (
        <div key={pool.poolAddress}>
          <p>Shard {pool.shardNumber}</p>
          <p>Liquidity: {pool.liquidityA} {pool.tokenASymbol} / {pool.liquidityB} {pool.tokenBSymbol}</p>
        </div>
      ))}
    </div>
  );
}
```

## Smart Routing Algorithm

The service automatically selects the best shard based on:

1. **Output Amount**: Maximum tokens received
2. **Price Impact**: Lowest slippage
3. **Liquidity**: Sufficient reserves

### Current Implementation

```typescript
// Single-shard routing (current)
- Evaluates each shard independently
- Selects shard with best output/impact ratio
- Best for small to medium trades
```

### Future Enhancement

```typescript
// Multi-shard split routing (TODO)
- Splits large trades across multiple shards
- Minimizes total price impact
- Example: 1000 USDC trade might use:
  - 300 USDC → Shard 1
  - 400 USDC → Shard 2
  - 300 USDC → Shard 3
```

## Integration with Your Swap UI

To integrate with your existing swap interface (`SolanaSwapInterface`):

1. **Replace Jupiter Integration** with Sharded DEX:

```typescript
// In src/components/swap/SolanaSwapInterface.tsx
import { useShardedDex } from '@/hooks/useShardedDex';

function SolanaSwapInterface() {
  const { getQuote, executeSwap, tokens } = useShardedDex();

  // Use tokens from sharded DEX instead of hardcoded list
  // Use getQuote() instead of Jupiter API
  // Use executeSwap() for transaction execution
}
```

2. **Token Selector** - Use `tokens` from hook
3. **Quote Display** - Show shard routing information
4. **Pool Stats** - Display liquidity per shard

## Transaction Building

**IMPORTANT**: The `executeSwap()` method is a placeholder. You need to:

1. **Create Program IDL** - Define your program's instruction interface
2. **Build Instructions** - Create swap instruction builders
3. **Handle Accounts** - Set up all required accounts (pool, token accounts, etc.)

Example structure:

```typescript
async function buildSwapInstruction(
  wallet: PublicKey,
  poolAddress: string,
  inputMint: string,
  outputMint: string,
  amount: number,
  minOutput: number
) {
  // Your program instruction builder
  return new TransactionInstruction({
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(poolAddress), isSigner: false, isWritable: true },
      // ... other accounts
    ],
    programId: shardedDex.getProgramId(),
    data: // ... encoded instruction data
  });
}
```

## Network Configuration

Currently configured for **Solana Devnet**:
- RPC: https://api.devnet.solana.com
- Program: `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z`

To switch networks:
1. Update `src/config/dex-config.json`
2. Update pool addresses for target network
3. Update `.env.local` with new RPC URL

## Testing

Test your integration:

```bash
# Test in browser console
const { shardedDex } = await import('./src/lib/shardedDex');
const quote = await shardedDex.getQuote('USDC', 'SOL', 100);
console.log(quote);
```

## Next Steps

1. **Complete Transaction Building**: Implement actual swap instructions
2. **Add Multi-Shard Routing**: Split large trades across shards
3. **Pool Analytics**: Fetch on-chain data for TVL, volume, APY
4. **Add Liquidity**: Implement LP token minting
5. **Remove Liquidity**: Implement LP token burning
6. **Fee Tracking**: Calculate and display earned fees

## Support

For questions about the sharded architecture or integration:
- Check your program documentation
- Review the pool deployment logs
- Test on devnet first before mainnet

---

**Status**: ✅ Configuration Ready | ⚠️ Transaction Building Required
