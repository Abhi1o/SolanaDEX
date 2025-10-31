# Swap Direction Issue Analysis

## Problem Summary

**Working**: USDC → SOL, ETH → SOL (forward swaps where input = tokenA)
**Failing**: SOL → USDC, SOL → ETH, USDT → USDC (reverse swaps where input = tokenB)

**Error**: "Swap instruction exceeds desired slippage limit" (error code 0x10)

## Console Output Analysis

### Working Example (USDC → SOL):
```
Swap direction: USDC → SOL
Pool tokens: USDC (A) / SOL (B)
Is forward swap (A→B): true
✅ Transaction successful
```

### Failing Example (SOL → USDC):
```
Swap direction: SOL → USDC
Pool tokens: USDC (A) / SOL (B)
Is forward swap (A→B): false
❌ Error: Swap instruction exceeds desired slippage limit
```

## Root Cause

The on-chain program is calculating a different output amount for reverse swaps than our off-chain calculation. This suggests:

1. **Account Order Issue**: The program might expect accounts in a different order for reverse swaps
2. **Calculation Mismatch**: Our AMM formula might not match the on-chain calculation for reverse swaps
3. **Direction Indicator**: The program might need an explicit direction flag

## Key Observation

Looking at the working Node.js script, it ALWAYS uses the same account order:
```javascript
keys: [
  poolAddress,
  authority,
  user,
  userSourceAccount,      // Always the input token account
  poolTokenAccountA,      // Always pool's token A
  poolTokenAccountB,      // Always pool's token B  
  userDestAccount,        // Always the output token account
  poolTokenMint,
  feeAccount,
  tokenA,                 // Always token A mint
  tokenB,                 // Always token B mint
  TOKEN_PROGRAM_ID (x3)
]
```

The program determines swap direction by comparing:
- `userSourceAccount` with `poolTokenAccountA` and `poolTokenAccountB`
- If source matches A, it's A→B swap
- If source matches B, it's B→A swap

## The Issue in Our Code

We're passing accounts in the SAME order regardless of swap direction, which is CORRECT. But our **minimum output calculation** might be wrong for reverse swaps.

## Solution

The issue is likely in how we calculate `minimumAmountOut`. The on-chain program calculates the actual output, and if it's less than our `minimumAmountOut`, it fails with slippage error.

For reverse swaps, we need to ensure our calculation matches the on-chain calculation exactly.

## Next Steps

1. Verify the AMM calculation is correct for both directions
2. Check if we need to adjust the minimum output calculation
3. Test with higher slippage tolerance to confirm it's a calculation issue
