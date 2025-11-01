# Smallest Shard Routing for Liquidity Addition

## Overview

Implemented the "fillup strategy" from the SAMM paper for optimal liquidity routing. When users add liquidity, the system now automatically selects the smallest shard to provide the best trading experience.

## Implementation Details

### 1. Backend API Integration

Added new method to `SammRouterService` (`src/services/sammRouterService.ts`):

```typescript
async getSmallestShards(
  tokenA: string,
  tokenB: string,
  inputToken: string
): Promise<SmallestShardsResponse>
```

**API Endpoint:** `GET /api/shards/smallest/:tokenA/:tokenB/:inputToken`

**Response Format:**
```json
{
  "success": true,
  "data": {
    "tokenPair": {
      "tokenA": "...",
      "tokenB": "..."
    },
    "inputToken": "...",
    "shards": [
      {
        "id": "...",
        "address": "SaRT3ZFpAbsFUSixKgwULFURsv2Nc7xf1qUxEfQxvCJ",
        "reserves": {
          "tokenA": "100000000000",
          "tokenB": "100000000000"
        }
      }
    ],
    "count": 4
  }
}
```

### 2. Liquidity Service Enhancement

Added method to `LiquidityService` (`src/services/liquidityService.ts`):

```typescript
async getSmallestShard(
  tokenAMint: string,
  tokenBMint: string
): Promise<{ poolAddress: string; shardNumber: number; reserves: { tokenA: string; tokenB: string } } | null>
```

**Features:**
- Calls backend API to get smallest shard
- Returns pool address, shard number, and current reserves
- Graceful fallback to first available pool if API fails
- Comprehensive logging for debugging

### 3. UI Integration

Updated liquidity page (`src/app/liquidity/page.tsx`):

**New State:**
```typescript
const [selectedShard, setSelectedShard] = useState<...>(null);
const [isLoadingShard, setIsLoadingShard] = useState(false);
```

**Automatic Shard Selection:**
- Fetches smallest shard when both tokens are selected
- Updates UI to show selected shard number
- Displays loading state while fetching
- Shows educational tooltip about the fillup strategy

**UI Enhancements:**
- Shows "Shard X (Smallest)" badge when shard is selected
- Displays loading spinner while fetching optimal shard
- Educational tooltip explaining the liquidity routing strategy
- Graceful fallback if backend API is unavailable

### 4. User Experience Flow

1. User selects Token A and Token B
2. System automatically calls backend API to get smallest shard
3. UI shows "Selecting Optimal Shard..." with loading spinner
4. Once loaded, displays "Shard X (Smallest)" in green
5. Shows educational tooltip about the fillup strategy
6. User enters amounts and adds liquidity to the optimal shard

## Benefits

### For Liquidity Providers
- Automatic optimal shard selection
- No manual shard selection required
- Clear indication of which shard is being used

### For Traders
- Better liquidity distribution across shards
- Reduced slippage due to balanced liquidity
- Improved overall trading experience

### For the Protocol
- Implements SAMM paper's fillup strategy
- Balances liquidity across all shards
- Optimizes capital efficiency

## Fallback Behavior

If the backend API is unavailable or fails:
1. System logs a warning
2. Falls back to using the first available pool from config
3. User can still add liquidity (no blocking errors)
4. UI doesn't show the "Smallest" badge

## Testing

### Manual Testing Steps

1. **Open Liquidity Page**
   - Navigate to `/liquidity`
   - Connect wallet

2. **Select Token Pair**
   - Select first token (e.g., USDC)
   - Select second token (e.g., USDT)
   - Observe "Selecting Optimal Shard..." loading state

3. **Verify Shard Selection**
   - Check that "Shard X (Smallest)" appears in green
   - Verify educational tooltip is displayed
   - Check browser console for API logs

4. **Add Liquidity**
   - Enter amounts
   - Click "Add Liquidity"
   - Verify transaction uses the selected shard

### Console Logs to Check

```
🔍 Fetching smallest shard for liquidity addition...
   Token A: BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa
   Token B: F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu
[SammRouterService] Smallest Shards Request: {...}
[SammRouterService] Smallest Shards Response: {...}
✅ Smallest shard found:
   Address: SaRT3ZFpAbsFUSixKgwULFURsv2Nc7xf1qUxEfQxvCJ
   Shard Number: 1
   Reserve A: 100000000000
   Reserve B: 100000000000
✅ Selected smallest shard for liquidity addition: {...}
```

## Code References

### Files Modified
1. `src/services/sammRouterService.ts` - Added `getSmallestShards()` method
2. `src/services/liquidityService.ts` - Added `getSmallestShard()` method
3. `src/app/liquidity/page.tsx` - Integrated shard routing into UI

### Key Functions
- `SammRouterService.getSmallestShards()` - Calls backend API
- `LiquidityService.getSmallestShard()` - Wraps API call with fallback logic
- `useEffect()` in liquidity page - Fetches shard when tokens selected

## Future Enhancements

1. **Manual Shard Override**
   - Allow advanced users to manually select a different shard
   - Show all shards with their sizes

2. **Real-time Updates**
   - Refresh shard selection periodically
   - Update if liquidity distribution changes significantly

3. **Analytics**
   - Track which shards receive the most liquidity
   - Monitor fillup strategy effectiveness

4. **Multi-shard Deposits**
   - Allow splitting large deposits across multiple shards
   - Optimize for even distribution

## Matching the Working Script

The implementation matches the working Node.js script pattern:

**Script Pattern:**
```javascript
const depositIx = createDepositInstruction(
  pool.poolAddress,
  pool.authority,
  userTransferAuthority,
  sourceA,
  sourceB,
  poolTokenA,
  poolTokenB,
  poolMint,
  destPoolToken,
  tokenAMint,
  tokenBMint,
  tokenAProgram,
  tokenBProgram,
  poolTokenProgram,
  poolTokenAmount,
  maximumTokenA,
  maximumTokenB
);
```

**Our Implementation:**
```typescript
const addLiquidityIx = createAddLiquidityInstruction(
  this.programId,
  poolAddress,
  poolAuthority,
  poolTokenAccountA,
  poolTokenAccountB,
  lpTokenMint,
  feeAccount,
  tokenAMint,
  tokenBMint,
  userPublicKey,
  userTokenAccountA,
  userTokenAccountB,
  userLpTokenAccount,
  amountA,        // maxTokenA
  amountB,        // maxTokenB
  minLpTokens     // poolTokenAmount
);
```

Both use:
- Discriminator 2 for ADD_LIQUIDITY
- 25-byte instruction data format
- 14 accounts in the same order
- Same parameter meanings (poolTokenAmount, maxTokenA, maxTokenB)

## Conclusion

The smallest shard routing feature is now fully implemented and integrated into the liquidity addition flow. Users will automatically add liquidity to the optimal shard, implementing the SAMM paper's fillup strategy for better capital efficiency and trader experience.
