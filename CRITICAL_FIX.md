# Critical Issue Analysis

## The Problem

ALL swaps are failing with "exceeds desired slippage limit" even with:
- 5% slippage tolerance
- 0.5% safety buffer in calculation
- Fetching on-chain reserves
- Both forward and reverse swaps

This suggests the issue is NOT with our calculation, but with **how the on-chain program interprets the minimum output parameter**.

## Hypothesis

The on-chain program might be:
1. **Interpreting the minimum output incorrectly** - Maybe it expects a different format
2. **Using a different decimal precision** - Maybe it's not handling the base units correctly
3. **Having a bug in the slippage check** - The program's slippage validation might be broken

## Test

Let me try setting minimum output to 0 (no slippage protection) to see if the swap goes through. This will tell us if:
- ✅ Swap succeeds → The issue is with how we calculate/encode minimum output
- ❌ Swap fails → There's a deeper issue with the transaction structure or program

## Next Steps

If setting minimum to 0 works, we know the program is functional but our minimum output encoding is wrong.

If it still fails, we need to compare our transaction byte-for-byte with your working Node.js script.
