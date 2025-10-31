# Swap System Analysis - Complete Flow

## Overview

The application has **TWO swap implementations**:

1. **Jupiter Aggregator Swap** (`SolanaSwapInterface.tsx`) - Uses Jupiter API for routing
2. **Sharded DEX Swap** (`ShardedSwapInterface.tsx`) - Uses custom sharded pools from `dex-config.json`

Currently, the swap page (`/swap`) uses the **ShardedSwapInterface** implementation.

---

## 🔄 Token Integration & Listing System

### 1. Token Sources

#### A. **Token List Hook (`useTokenList.ts`)**

The app fetches tokens from multiple sources with fallback:

```typescript
// Primary Sources (in order of priority):
1. https://token.jup.ag/strict        // Jupiter strict token list
2. https://tokens.jup.ag/all          // Jupiter all tokens
3. GitHub Solana Token List          // Fallback registry
4. POPULAR_TOKENS (hardcoded)        // SOL, USDC, USDT fallback
```

**Features:**
- ✅ Automatic retry with 10-second timeout per URL
- ✅ Graceful fallback to hardcoded popular tokens if all APIs fail
- ✅ Transforms tokens to unified format
- ✅ Supports custom token import by mint address
- ✅ Favorite tokens (localStorage persistence)
- ✅ Search functionality

#### B. **Config-Based Tokens (`dex-config.json`)**

The sharded DEX uses tokens defined in `dex-config.json`:

```json
{
  "tokens": [
    {
      "symbol": "USDC",
      "mint": "BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa",
      "decimals": 6
    },
    {
      "symbol": "SOL",
      "mint": "7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r",
      "decimals": 9
    }
  ]
}
```

### 2. Token Display Components

#### **TokenSelector Component**
- Uses `useTokenList()` hook
- Shows balance from `useWallet()`
- Search and filter functionality
- Custom token import support
- Excludes already-selected tokens

#### **Token Display Features**
- Balance fetching from on-chain
- Token logos (with fallback gradients)
- Decimal precision handling
- Sorting by balance/name

---

## 🔀 Swap Mechanism Flow

### **Implementation 1: Sharded DEX Swap** (Currently Active)

#### **Flow Diagram:**
```
User Input
    ↓
ShardedSwapInterface Component
    ↓
useShardedDex Hook
    ↓
shardedDex.getQuote() [Selects best shard]
    ↓
User Confirms
    ↓
shardedDex.executeSwap()
    ↓
buildSimpleSwapTransaction() [Creates instruction]
    ↓
Wallet Signs Transaction
    ↓
Send to Solana Network
    ↓
Transaction Confirmed
```

#### **Step-by-Step Process:**

1. **Token Selection**
   - User selects input/output tokens from dropdown
   - Tokens loaded from `dex-config.json`
   - Limited to configured tokens (USDC, SOL, USDT, ETH)

2. **Amount Input**
   - User enters swap amount
   - Debounced quote fetching (500ms delay)

3. **Quote Calculation (`shardedDex.getQuote()`)**
   ```typescript
   // Algorithm:
   1. Find all shards for the token pair
   2. For each shard:
      - Calculate swap output using x*y=k formula
      - Calculate price impact
      - Apply 0.3% fee
   3. Select shard with BEST output (lowest price impact)
   4. Return quote with selected shard
   ```

4. **Smart Routing Logic:**
   - Compares all available shards
   - Uses `c-smaller-better` property (smaller shards give better rates for small swaps)
   - Selects optimal shard automatically

5. **Transaction Building (`buildSimpleSwapTransaction`)**
   ```typescript
   // Instruction Format:
   Data: [discriminator: 1, amountIn: 8 bytes, minAmountOut: 8 bytes]
   
   Accounts:
   [
     poolAddress,
     poolAuthority,
     user (signer),
     userTokenIn,
     poolTokenA,
     poolTokenB,
     userTokenOut,
     poolTokenMint,
     feeAccount,
     tokenAMint,
     tokenBMint,
     TOKEN_PROGRAM_ID (×3)
   ]
   ```

6. **Execution**
   - Creates associated token accounts if needed
   - Signs transaction with wallet
   - Sends to Solana network
   - Confirms transaction

#### **Key Files:**
- `src/lib/shardedDex.ts` - Core swap logic
- `src/lib/swapInstructions.ts` - Transaction building
- `src/hooks/useShardedDex.ts` - React hook wrapper
- `src/components/swap/ShardedSwapInterface.tsx` - UI component

---

### **Implementation 2: Jupiter Aggregator Swap** (Available but not used on swap page)

#### **Flow:**
```
User Input
    ↓
SolanaSwapInterface Component
    ↓
getJupiterSwapService()
    ↓
jupiterService.getOptimizedQuote() [Jupiter API call]
    ↓
User Confirms
    ↓
jupiterService.executeSwap()
    ↓
Jupiter API builds transaction
    ↓
Wallet Signs
    ↓
Send to Network
```

#### **Features:**
- ✅ Multi-hop routing via Jupiter
- ✅ Access to all Solana tokens (not just config)
- ✅ Automatic route optimization
- ✅ Advanced settings (slippage, priority fees, deadlines)
- ✅ Quote auto-refresh (10 seconds)

#### **Key Files:**
- `src/services/jupiterSwapService.ts` - Jupiter API integration
- `src/components/swap/SolanaSwapInterface.tsx` - UI component

---

## 📊 Current State Analysis

### **What's Working:**

✅ **Token Listing:**
- Multiple token sources with fallbacks
- Custom token import
- Balance fetching
- Search and favorites

✅ **Sharded DEX Swap:**
- Quote calculation across shards
- Smart shard selection
- Transaction building with correct account order
- On-chain execution

✅ **Jupiter Swap:**
- Full Jupiter integration
- Multi-hop routing
- Advanced swap settings
- Error handling

### **Current Configuration:**

**Swap Page (`/swap`):**
- Uses `ShardedSwapInterface`
- Tokens from `dex-config.json` only
- Pools from `dex-config.json`
- Custom shard routing

**Alternative (Available):**
- `SolanaSwapInterface` exists but not used on swap page
- Can swap any token Jupiter supports
- Better for mainnet deployment

---

## 🔍 Key Components Breakdown

### **1. Token Management**

```typescript
// Token List Hook
useTokenList()
  ├─ Fetches from Jupiter/GitHub APIs
  ├─ Falls back to POPULAR_TOKENS
  ├─ Supports custom token import
  └─ Manages favorites

// Token Selector Component
TokenSelector
  ├─ Uses useTokenList()
  ├─ Shows balances
  ├─ Search/filter
  └─ Custom token input
```

### **2. Swap State Management**

```typescript
// Sharded DEX
useShardedDex()
  ├─ getQuote() - Calculate best quote
  ├─ executeSwap() - Execute transaction
  ├─ getPoolsForPair() - Get available pools
  └─ getTradingPairs() - Get all pairs

// Jupiter Swap (Alternative)
useSwap() + jupiterSwapService
  ├─ getOptimizedQuote() - Jupiter API
  ├─ executeSwap() - Jupiter transaction
  └─ Advanced settings support
```

### **3. Transaction Building**

```typescript
// Sharded DEX
buildSimpleSwapTransaction()
  ├─ findOrCreateATA() - Create token accounts
  ├─ createSimpleSwapInstruction() - Build instruction
  ├─ Correct account order (matches on-chain)
  └─ Sets blockhash & fee payer

// Instruction Data Format
[1 byte discriminator, 8 bytes amountIn, 8 bytes minAmountOut]
```

---

## 🎯 Integration Points

### **Token List Integration:**
1. `useTokenList()` → Fetches tokens
2. `TokenSelector` → Displays tokens
3. `ShardedSwapInterface` → Uses config tokens
4. `SolanaSwapInterface` → Uses Jupiter tokens

### **Swap Execution:**
1. User selects tokens & enters amount
2. Quote calculated/retrieved
3. User confirms in modal
4. Transaction built with all accounts
5. Wallet signs
6. Sent to network
7. Confirmed & tracked

---

## 📝 Summary

**Current Setup:**
- ✅ Swap page uses **Sharded DEX** (custom pools)
- ✅ Tokens limited to `dex-config.json`
- ✅ Smart shard selection working
- ✅ Real on-chain swaps functional

**Available but Not Used:**
- ⚠️ Jupiter swap interface exists
- ⚠️ Can access all Solana tokens
- ⚠️ Better for production (mainnet)

**Token System:**
- ✅ Multi-source token fetching
- ✅ Graceful fallbacks
- ✅ Custom token support
- ✅ Balance integration

The swap system is **fully functional** with proper token listing, quote calculation, and on-chain execution matching your working swap script pattern.

