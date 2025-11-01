# Quick Reference Guide - Liquidity Routing

## TL;DR

**Add Liquidity:** Automatically routes to the **SMALLEST** shard
**Remove Liquidity:** Recommend removing from the **LARGEST** shard

This implements the SAMM paper's "fillup strategy" for balanced liquidity distribution.

---

## API Endpoints

### Get Smallest Shards

```
GET http://saigreen.cloud:3000/api/shards/smallest/:tokenA/:tokenB/:inputToken
```

**Response:**

```json
{
  "success": true,
  "data": {
    "shards": [
      { "address": "...", "reserves": {...} }  // Smallest first
    ]
  }
}
```

---

## Frontend Code Snippets

### 1. Fetch Smallest Shard

```typescript
// In liquidity page component
useEffect(() => {
  if (!selectedTokenA || !selectedTokenB) return;

  const fetchShard = async () => {
    setIsLoadingShard(true);
    try {
      const service = getLiquidityService(connection, programId);
      const shard = await service.getSmallestShard(
        selectedTokenA.mint,
        selectedTokenB.mint
      );
      setSelectedShard(shard);
    } catch (error) {
      console.error(error);
      setSelectedShard(null); // Fallback to first pool
    } finally {
      setIsLoadingShard(false);
    }
  };

  fetchShard();
}, [selectedTokenA, selectedTokenB]);
```

### 2. Use Selected Shard for Pool

```typescript
const currentPool = useMemo(() => {
  if (selectedShard) {
    const pool = availablePools.find((p) => p.id === selectedShard.poolAddress);
    if (pool) return pool;
  }
  return availablePools[0] || null; // Fallback
}, [availablePools, selectedShard]);
```

### 3. Display Shard Info

```tsx
{
  isLoadingShard ? (
    <div>
      Selecting Optimal Shard... <LoadingSpinner />
    </div>
  ) : selectedShard ? (
    <div>
      Selected Shard: Shard {selectedShard.shardNumber} (Smallest) ✓
      <Tooltip>
        Adding to the smallest shard provides the best experience for traders by
        balancing liquidity across all shards.
      </Tooltip>
    </div>
  ) : null;
}
```

### 4. Add Liquidity Transaction

```typescript
const handleAddLiquidity = async () => {
  const service = getLiquidityService(connection, programId);

  const result = await service.addLiquidity(
    {
      pool: currentPool, // Uses smallest shard
      amountA: amountABigInt,
      amountB: amountBBigInt,
      minLpTokens: (lpTokensToReceive * 99n) / 100n, // 1% slippage
    },
    wallet
  );

  if (result.status === TransactionStatus.CONFIRMED) {
    showSuccess(`Added to Shard ${selectedShard?.shardNumber}`);
  }
};
```

---

## Backend Code Snippet

```javascript
// GET /api/shards/smallest/:tokenA/:tokenB/:inputToken
router.get("/smallest/:tokenA/:tokenB/:inputToken", async (req, res) => {
  const { tokenA, tokenB } = req.params;

  // Get pools for this pair
  const pools = config.pools.filter(
    (p) =>
      (p.tokenA === tokenA && p.tokenB === tokenB) ||
      (p.tokenA === tokenB && p.tokenB === tokenA)
  );

  // Fetch reserves from Solana
  const shardsWithReserves = await Promise.all(
    pools.map(async (pool) => {
      const [accountA, accountB] = await Promise.all([
        getAccount(connection, new PublicKey(pool.tokenAccountA)),
        getAccount(connection, new PublicKey(pool.tokenAccountB)),
      ]);

      return {
        address: pool.poolAddress,
        reserves: {
          tokenA: accountA.amount.toString(),
          tokenB: accountB.amount.toString(),
        },
        totalSize: Number(accountA.amount) + Number(accountB.amount),
      };
    })
  );

  // Sort by size (smallest first)
  const sorted = shardsWithReserves.sort((a, b) => a.totalSize - b.totalSize);

  res.json({
    success: true,
    data: {
      tokenPair: { tokenA, tokenB },
      shards: sorted.map(({ totalSize, ...s }) => s),
      count: sorted.length,
    },
  });
});
```

---

## Transaction Structure

### Add Liquidity (Discriminator 2)

```
Instruction Data (25 bytes):
[2][poolTokenAmount(8)][maxTokenA(8)][maxTokenB(8)]

Accounts (14):
0. Pool address (read-only)
1. Pool authority (read-only)
2. User wallet (signer)
3. User token A account (writable)
4. User token B account (writable)
5. Pool token A account (writable)
6. Pool token B account (writable)
7. LP token mint (writable)
8. User LP token account (writable)
9. Token A mint (read-only)
10. Token B mint (read-only)
11-13. Token programs (read-only)
```

### Remove Liquidity (Discriminator 3)

```
Instruction Data (25 bytes):
[3][lpTokenAmount(8)][minTokenA(8)][minTokenB(8)]

Accounts (15):
0. Pool address (read-only)
1. Pool authority (read-only)
2. User wallet (signer)
3. LP token mint (writable)
4. User LP token account (writable)
5. Pool token A account (writable)
6. Pool token B account (writable)
7. User token A account (writable)
8. User token B account (writable)
9. Fee account (writable)
10. Token A mint (read-only)
11. Token B mint (read-only)
12-14. Token programs (read-only)
```

---

## Error Handling Checklist

- [ ] Backend API timeout → Fallback to first pool
- [ ] Backend API error → Fallback to first pool
- [ ] No shards returned → Show error message
- [ ] Invalid response → Fallback to first pool
- [ ] RPC error → Retry once, then fallback
- [ ] Show warning toast but don't block user
- [ ] Always allow user to proceed with fallback

---

## Testing Checklist

### Add Liquidity

- [ ] Select tokens → Shard selection starts
- [ ] Loading state shows
- [ ] Shard badge appears with number
- [ ] Tooltip explains strategy
- [ ] Transaction uses correct shard
- [ ] Success message shows shard number

### Remove Liquidity

- [ ] Positions show shard numbers
- [ ] Largest shard is highlighted
- [ ] Transaction uses correct shard
- [ ] Success message confirms removal

### Error Scenarios

- [ ] Backend down → Fallback works
- [ ] Slow network → Loading state shows
- [ ] Invalid pair → Error message
- [ ] Insufficient balance → Error message

---

## Key Files

```
src/
├── services/
│   ├── sammRouterService.ts
│   │   └── getSmallestShards()  ← NEW
│   └── liquidityService.ts
│       └── getSmallestShard()   ← NEW
└── app/
    └── liquidity/
        └── page.tsx              ← UPDATED
```

---

## Console Logs to Check

```
✅ Good logs:
🔍 Fetching smallest shard for liquidity addition...
[SammRouterService] Smallest Shards Request: {...}
[SammRouterService] Smallest Shards Response: {...}
✅ Smallest shard found: Shard 1

⚠️ Warning logs (non-blocking):
⚠️  Backend API failed, using fallback
ℹ️  Using first available pool as fallback

❌ Error logs (blocking):
❌ No pools found for this token pair
❌ Transaction failed: Insufficient balance
```

---

## Common Issues & Solutions

| Issue                    | Solution                                        |
| ------------------------ | ----------------------------------------------- |
| "Shard not loading"      | Check backend API is running                    |
| "Always uses first pool" | Backend API might be down (check logs)          |
| "Transaction fails"      | Verify discriminator is 2 for add, 3 for remove |
| "Wrong shard used"       | Check currentPool logic uses selectedShard      |
| "No shard badge shown"   | selectedShard might be null (fallback mode)     |

---

## Performance Tips

1. **Cache backend responses** - 30 seconds is good
2. **Parallel RPC calls** - Use Promise.all()
3. **Debounce token selection** - Avoid rapid API calls
4. **Show loading states** - Better UX during fetches
5. **Log everything** - Easier debugging

---

## Next Steps

1. ✅ Implement backend API endpoint
2. ✅ Add frontend service methods
3. ✅ Update UI components
4. ✅ Add error handling
5. ✅ Test with real backend
6. ⏳ Deploy to production
7. ⏳ Monitor metrics
