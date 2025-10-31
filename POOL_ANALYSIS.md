# Complete Pool Analysis

## Available Trading Pairs

### 1. USDC/SOL (4 shards)
- **Pool Structure**: USDC (tokenA) / SOL (tokenB)
- **Possible Directions**:
  - ✅ USDC → SOL (Forward: A→B) - **WORKING**
  - ❌ SOL → USDC (Reverse: B→A) - **FAILING**

### 2. USDC/USDT (4 shards)
- **Pool Structure**: USDC (tokenA) / USDT (tokenB)
- **Possible Directions**:
  - ❌ USDC → USDT (Forward: A→B) - **FAILING** (should work!)
  - ❌ USDT → USDC (Reverse: B→A) - **FAILING**

### 3. ETH/SOL (4 shards)
- **Pool Structure**: ETH (tokenA) / SOL (tokenB)
- **Possible Directions**:
  - ✅ ETH → SOL (Forward: A→B) - **WORKING**
  - ❌ SOL → ETH (Reverse: B→A) - **FAILING**

## Key Observations

### Working Pattern
All **Forward swaps (A→B)** where:
- Input token = tokenA
- Output token = tokenB
- Examples: USDC→SOL, ETH→SOL

### Failing Pattern
All **Reverse swaps (B→A)** where:
- Input token = tokenB
- Output token = tokenA
- Examples: SOL→USDC, SOL→ETH, USDT→USDC

### Exception
**USDC→USDT** is failing even though it's a forward swap! This is suspicious.

## Pool Liquidity Analysis

### USDC/SOL Pools
```
Shard 1: 50,000 USDC / 500 SOL (ratio: 100:1)
Shard 2: 100,000 USDC / 1,000 SOL (ratio: 100:1)
Shard 3: 200,000 USDC / 2,000 SOL (ratio: 100:1)
Shard 4: 400,000 USDC / 4,000 SOL (ratio: 100:1)
```
**Price**: 1 SOL = 100 USDC

### USDC/USDT Pools
```
Shard 1: 100,000 USDC / 100,000 USDT (ratio: 1:1)
Shard 2: 200,000 USDC / 200,000 USDT (ratio: 1:1)
Shard 3: 400,000 USDC / 400,000 USDT (ratio: 1:1)
Shard 4: 800,000 USDC / 800,000 USDT (ratio: 1:1)
```
**Price**: 1 USDC = 1 USDT

### ETH/SOL Pools
```
Shard 1: 100 ETH / 5,000 SOL (ratio: 1:50)
Shard 2: 200 ETH / 10,000 SOL (ratio: 1:50)
Shard 3: 400 ETH / 20,000 SOL (ratio: 1:50)
Shard 4: 800 ETH / 40,000 SOL (ratio: 1:50)
```
**Price**: 1 ETH = 50 SOL

## Decimal Differences

This is CRITICAL for understanding the issue:

```
USDC: 6 decimals
SOL:  9 decimals (3 more than USDC)
USDT: 6 decimals (same as USDC)
ETH:  8 decimals (2 more than USDC, 1 less than SOL)
```

### When Swapping USDC → SOL:
- Input: 121 USDC = 121,000,000 (base units, 6 decimals)
- Output: ~1.2 SOL = ~1,200,000,000 (base units, 9 decimals)
- **Multiplying by 1000x** due to decimal difference

### When Swapping SOL → USDC:
- Input: 121 SOL = 121,000,000,000 (base units, 9 decimals)
- Output: ~11,710 USDC = ~11,710,000,000 (base units, 6 decimals)
- **Dividing by ~10x** due to decimal difference

## The Problem

When we have **large decimal differences** (like SOL's 9 decimals vs USDC's 6 decimals), the calculation precision becomes critical.

For reverse swaps (B→A), we're:
1. Taking a large number (121 SOL = 121,000,000,000 base units)
2. Calculating output in smaller units (USDC = 6 decimals)
3. Any rounding error gets magnified

## Why USDC→USDT Fails

Even though USDC and USDT both have 6 decimals, the swap is still failing. This suggests the issue is NOT just about decimal differences, but about **how the on-chain program validates reverse swaps**.

## Hypothesis

The on-chain program might be:
1. Calculating the output amount differently for reverse swaps
2. Using a different rounding method
3. Applying fees in a different order
4. Having stricter validation for B→A swaps

## Solution

We need to either:
1. **Increase slippage tolerance** for all swaps (temporary fix)
2. **Match the on-chain calculation exactly** (permanent fix)
3. **Add a safety buffer** to minimum output (pragmatic fix)

The fact that even 1% slippage fails suggests our calculation is off by MORE than 1%, which is significant.
