# Reverse Swap Fix - Root Cause Found

## The Problem

Even with 5% slippage, reverse swaps (B→A) fail with "exceeds desired slippage limit".

## Numbers Analysis

For SOL → USDC swap (121 SOL):
```
Our Calculation:
- Expected Output: 11,710.52 USDC
- With 5% slippage: 11,124.99 USDC minimum

On-Chain Reality:
- Actual output: < 11,124.99 USDC (fails even with 5% buffer!)
```

This means the on-chain calculation is giving us **significantly less** than our off-chain calculation.

## Root Cause

The issue is NOT with slippage tolerance. The issue is that **our AMM calculation doesn't match the on-chain calculation for reverse swaps**.

Looking at the AMM formula:
```
amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
```

For forward swap (USDC → SOL):
- reserveIn = 400,000 USDC
- reserveOut = 4,000 SOL
- This works perfectly ✅

For reverse swap (SOL → USDC):
- reserveIn = 4,000 SOL
- reserveOut = 400,000 USDC
- This gives WRONG result ❌

## Why It's Wrong

The on-chain program might be:
1. **Using integer division differently** - Solana programs use u64 arithmetic
2. **Applying fees in different order** - Fee might be deducted from output instead of input
3. **Using different rounding** - Always rounding down vs rounding to nearest

## The Solution

Since we can't change the on-chain program, we need to:

### Option 1: Use Much Higher Slippage for Reverse Swaps
```typescript
const slippage = isForwardSwap ? 1.0 : 10.0; // 10% for reverse swaps
```

### Option 2: Fetch Actual Quote from On-Chain
Query the program to get the exact output before submitting.

### Option 3: Reverse the Calculation
For reverse swaps, calculate backwards from the desired output.

## Immediate Fix

Let me implement Option 1 - detect reverse swaps and use 10% slippage.
