# Swap Mechanism Fix - Insufficient Balance Error

## Problem
The swap interface was showing "Insufficient token balance or token account not found" errors even when users had sufficient balance. The transaction was failing during execution.

## Root Cause Analysis
After analyzing your working Node.js swap script, I identified several critical mismatches between the working implementation and the frontend code:

### 1. **Incorrect Instruction Discriminator**
- **Working Script**: Uses `1` for swap instruction
- **Frontend Code**: Was using `0` for swap instruction
- **Fix**: Changed `INSTRUCTION_DISCRIMINATORS.SWAP` from `0` to `1`

### 2. **Wrong Account Order**
The account order in the transaction instruction MUST match the on-chain program exactly.

**Working Script Order:**
```javascript
[
  poolAddress,           // 0
  authority,             // 1
  user (signer),         // 2
  userSourceAccount,     // 3
  poolTokenAccountA,     // 4
  poolTokenAccountB,     // 5
  userDestAccount,       // 6
  poolTokenMint,         // 7
  feeAccount,            // 8
  tokenA (mint),         // 9
  tokenB (mint),         // 10
  TOKEN_PROGRAM_ID,      // 11
  TOKEN_PROGRAM_ID,      // 12
  TOKEN_PROGRAM_ID       // 13
]
```

**Frontend Code (Before Fix):**
```javascript
[
  user (signer),
  poolAddress,
  authority,
  userTokenAccountIn,
  userTokenAccountOut,
  poolTokenAccountA,
  poolTokenAccountB,
  TOKEN_PROGRAM_ID
]
```

### 3. **Missing Required Accounts**
The working script includes several accounts that were missing:
- `poolTokenMint` - The LP token mint
- `feeAccount` - Where protocol fees are collected
- `tokenA` mint address
- `tokenB` mint address
- Three separate `TOKEN_PROGRAM_ID` references (not just one)

## Changes Made

### File: `src/lib/swapInstructions.ts`

#### Change 1: Fixed Instruction Discriminator
```typescript
const INSTRUCTION_DISCRIMINATORS = {
  SWAP: 1, // Changed from 0 to 1
  ADD_LIQUIDITY: 0,
  REMOVE_LIQUIDITY: 2,
};
```

#### Change 2: Updated Account Order in `createSimpleSwapInstruction`
```typescript
const keys = [
  { pubkey: poolAddress, isSigner: false, isWritable: false },
  { pubkey: poolAuthority, isSigner: false, isWritable: false },
  { pubkey: user, isSigner: true, isWritable: false },
  { pubkey: userTokenAccountIn, isSigner: false, isWritable: true },
  { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
  { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
  { pubkey: userTokenAccountOut, isSigner: false, isWritable: true },
  { pubkey: poolTokenMint, isSigner: false, isWritable: true },
  { pubkey: feeAccount, isSigner: false, isWritable: true },
  { pubkey: tokenAMint, isSigner: false, isWritable: false },
  { pubkey: tokenBMint, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
];
```

#### Change 3: Added Missing Parameters to `buildSimpleSwapTransaction`
```typescript
export async function buildSimpleSwapTransaction(
  connection: Connection,
  programId: PublicKey,
  user: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  inputMint: PublicKey,
  outputMint: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  poolTokenMint: PublicKey,        // Added
  feeAccount: PublicKey,            // Added
  tokenAMint: PublicKey,            // Added
  tokenBMint: PublicKey,            // Added
  amountIn: bigint,
  minimumAmountOut: bigint
): Promise<Transaction>
```

### File: `src/lib/shardedDex.ts`

#### Change: Updated Transaction Builder Call
```typescript
const transaction = await buildSimpleSwapTransaction(
  this.connection,
  this.programId,
  wallet,
  new PublicKey(pool.poolAddress),
  new PublicKey(pool.authority),
  new PublicKey(inputTokenConfig.mint),
  new PublicKey(outputTokenConfig.mint),
  new PublicKey(pool.tokenAccountA),
  new PublicKey(pool.tokenAccountB),
  new PublicKey(pool.poolTokenMint),    // Added
  new PublicKey(pool.feeAccount),       // Added
  new PublicKey(pool.tokenA),           // Added
  new PublicKey(pool.tokenB),           // Added
  amountIn,
  minimumAmountOut
);
```

## Testing Recommendations

1. **Test with small amounts first** (e.g., 1-10 USDC)
2. **Verify you have devnet tokens**:
   - Get SOL from https://faucet.solana.com/
   - Ensure you have test USDC/SOL tokens
3. **Check the transaction on Solana Explorer** after execution
4. **Monitor console logs** for detailed swap information

## Expected Behavior After Fix

✅ Swap transactions should now execute successfully
✅ Proper balance checks before transaction
✅ Clear error messages if balance is insufficient
✅ Transaction signature returned on success
✅ Automatic routing to the best shard for optimal pricing

## Key Learnings

1. **Account order matters**: Solana programs expect accounts in a specific order
2. **Instruction discriminators must match**: The first byte identifies the instruction type
3. **All required accounts must be included**: Missing accounts cause transaction failures
4. **Testing with working scripts is valuable**: Your Node.js script was the key to identifying the issues

## Next Steps

1. Test the swap functionality with your wallet connected
2. Try swaps on different shards to verify routing works
3. Monitor for any edge cases or additional errors
4. Consider adding more detailed logging for debugging

---

**Status**: ✅ Fixed and ready for testing
**Files Modified**: 2
**Lines Changed**: ~80
