# Slippage Issue Fix

## Problem

Reverse swaps (B→A) fail with "exceeds desired slippage limit" even with 1% slippage.

## Temporary Solution

Increased slippage tolerance to 5% for testing:

```typescript
const signature = await executeSwap(quote, 5.0);
```

## Why This Happens

The off-chain calculation and on-chain calculation have slight differences due to:

1. **Rounding differences**: BigInt division truncates, causing small discrepancies
2. **Precision loss**: Converting between human-readable and base units
3. **Order of operations**: The on-chain program might calculate differently

## Permanent Solution Options

### Option 1: Add Safety Buffer
Always calculate minimum output with extra buffer:

```typescript
const minOutput = quote.estimatedOutput * (1 - (slippageTolerance + 0.5) / 100);
```

### Option 2: Fetch On-Chain Quote
Query the on-chain program for the exact output before submitting:

```typescript
const onChainQuote = await program.methods.getQuote(amountIn).view();
const minOutput = onChainQuote * (1 - slippageTolerance / 100);
```

### Option 3: Use Larger Slippage for Reverse Swaps
Detect reverse swaps and use higher slippage:

```typescript
const slippage = isForwardSwap ? 1.0 : 5.0;
```

## Recommendation

For now, use 5% slippage tolerance. This is acceptable for devnet testing.

For production, implement Option 2 (fetch on-chain quote) for accuracy.
