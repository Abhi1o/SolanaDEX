# DEX Smart Contract Interface Documentation

## Overview

This document provides comprehensive documentation for the DEX smart contract interface, including all instruction discriminators, data formats, and account orders required for successful transactions.

**Smart Contract Program ID:** `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z`

**Network:** Solana Devnet

**Type:** Automated Market Maker (AMM) DEX

## Instruction Discriminators

The discriminator is a single byte (u8) at offset 0 in the instruction data that tells the smart contract which operation to perform. Using incorrect discriminators will cause transactions to fail with "Feature Not Supported" or "Invalid Instruction" errors (error code 0xe).

| Discriminator | Operation | Status | Description |
|---------------|-----------|--------|-------------|
| 0 | INITIALIZE | Not used in frontend | Creates a new liquidity pool |
| 1 | SWAP | ✅ Working | Swaps one token for another |
| 2 | ADD_LIQUIDITY | ✅ Working | Deposits both tokens to receive LP tokens |
| 3 | REMOVE_LIQUIDITY | ✅ Working | Burns LP tokens to withdraw both tokens |
| 4 | ADD_SINGLE | Future feature | Deposits single token to receive LP tokens |
| 5 | REMOVE_SINGLE | Future feature | Burns LP tokens to withdraw single token |

## Instruction Data Formats

All numeric values in instruction data use **little-endian byte order** and are represented as **u64 (8 bytes)**.

### ADD_LIQUIDITY (Discriminator 2)

**Total Size:** 25 bytes

**Format:**
```
┌──────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Discriminator│ Pool Token Amount│ Max Token A      │ Max Token B      │
│ 1 byte       │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │
│ Value: 2     │                  │                  │                  │
└──────────────┴──────────────────┴──────────────────┴──────────────────┘
Byte offsets:  0                  1                  9                  17
```

**Parameters:**
- **pool_token_amount** (bytes 1-8): Minimum LP tokens to receive (slippage protection)
- **maximum_token_a_amount** (bytes 9-16): Maximum token A to deposit (slippage protection)
- **maximum_token_b_amount** (bytes 17-24): Maximum token B to deposit (slippage protection)

**Example:**
```typescript
// Add liquidity: deposit up to 1000 USDC and 10 SOL, expect at least 100 LP tokens
const data = Buffer.alloc(25);
data.writeUInt8(2, 0);                                    // Discriminator
data.writeBigUInt64LE(BigInt(100_000_000_000), 1);       // 100 LP tokens (9 decimals)
data.writeBigUInt64LE(BigInt(1_000_000_000), 9);         // 1000 USDC (6 decimals)
data.writeBigUInt64LE(BigInt(10_000_000_000), 17);       // 10 SOL (9 decimals)
```

### REMOVE_LIQUIDITY (Discriminator 3)

**Total Size:** 25 bytes

**Format:**
```
┌──────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Discriminator│ Pool Token Amount│ Min Token A      │ Min Token B      │
│ 1 byte       │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │
│ Value: 3     │                  │                  │                  │
└──────────────┴──────────────────┴──────────────────┴──────────────────┘
Byte offsets:  0                  1                  9                  17
```

**Parameters:**
- **pool_token_amount** (bytes 1-8): LP tokens to burn
- **minimum_token_a_amount** (bytes 9-16): Minimum token A to receive (slippage protection)
- **minimum_token_b_amount** (bytes 17-24): Minimum token B to receive (slippage protection)

**Example:**
```typescript
// Remove liquidity: burn 100 LP tokens, expect at least 950 USDC and 9.5 SOL
const data = Buffer.alloc(25);
data.writeUInt8(3, 0);                                    // Discriminator
data.writeBigUInt64LE(BigInt(100_000_000_000), 1);       // 100 LP tokens (9 decimals)
data.writeBigUInt64LE(BigInt(950_000_000), 9);           // 950 USDC minimum (6 decimals)
data.writeBigUInt64LE(BigInt(9_500_000_000), 17);        // 9.5 SOL minimum (9 decimals)
```

## Account Orders

⚠️ **CRITICAL:** Account order MUST match the smart contract specification exactly. Using incorrect account order will cause transactions to fail with InvalidInstruction error (0xe).

### ADD_LIQUIDITY Account Order

**Total Accounts:** 14

| Index | Account Name | Flags | Description |
|-------|--------------|-------|-------------|
| 0 | swap_account | read-only | The token swap pool account |
| 1 | swap_authority | read-only | PDA authority of the swap |
| 2 | user_transfer_authority | signer | User's wallet (must sign) |
| 3 | user_token_a_account | writable | User's token A account (source) |
| 4 | user_token_b_account | writable | User's token B account (source) |
| 5 | pool_token_a_account | writable | Pool's token A reserve |
| 6 | pool_token_b_account | writable | Pool's token B reserve |
| 7 | pool_mint | writable | LP token mint |
| 8 | user_lp_token_account | writable | User's LP token account (destination) |
| 9 | token_a_mint | read-only | Token A mint address |
| 10 | token_b_mint | read-only | Token B mint address |
| 11 | token_a_program | read-only | SPL Token program (Token A) |
| 12 | token_b_program | read-only | SPL Token program (Token B) |
| 13 | pool_token_program | read-only | SPL Token program (LP tokens) |

**Example:**
```typescript
const keys = [
  { pubkey: poolAddress, isSigner: false, isWritable: false },
  { pubkey: poolAuthority, isSigner: false, isWritable: false },
  { pubkey: userAuthority, isSigner: true, isWritable: false },
  { pubkey: userTokenAccountA, isSigner: false, isWritable: true },
  { pubkey: userTokenAccountB, isSigner: false, isWritable: true },
  { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
  { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
  { pubkey: lpTokenMint, isSigner: false, isWritable: true },
  { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
  { pubkey: tokenAMint, isSigner: false, isWritable: false },
  { pubkey: tokenBMint, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
];
```

### REMOVE_LIQUIDITY Account Order

**Total Accounts:** 15

| Index | Account Name | Flags | Description |
|-------|--------------|-------|-------------|
| 0 | swap_account | read-only | The token swap pool account |
| 1 | swap_authority | read-only | PDA authority of the swap |
| 2 | user_transfer_authority | signer | User's wallet (must sign) |
| 3 | pool_mint | writable | LP token mint |
| 4 | user_lp_token_account | writable | User's LP token account (source) |
| 5 | pool_token_a_account | writable | Pool's token A reserve |
| 6 | pool_token_b_account | writable | Pool's token B reserve |
| 7 | user_token_a_account | writable | User's token A account (destination) |
| 8 | user_token_b_account | writable | User's token B account (destination) |
| 9 | fee_account | writable | Pool fee account |
| 10 | token_a_mint | read-only | Token A mint address |
| 11 | token_b_mint | read-only | Token B mint address |
| 12 | pool_token_program | read-only | SPL Token program (LP tokens) |
| 13 | token_a_program | read-only | SPL Token program (Token A) |
| 14 | token_b_program | read-only | SPL Token program (Token B) |

**Example:**
```typescript
const keys = [
  { pubkey: poolAddress, isSigner: false, isWritable: false },
  { pubkey: poolAuthority, isSigner: false, isWritable: false },
  { pubkey: userAuthority, isSigner: true, isWritable: false },
  { pubkey: lpTokenMint, isSigner: false, isWritable: true },
  { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
  { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
  { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
  { pubkey: userTokenAccountA, isSigner: false, isWritable: true },
  { pubkey: userTokenAccountB, isSigner: false, isWritable: true },
  { pubkey: feeAccount, isSigner: false, isWritable: true },
  { pubkey: tokenAMint, isSigner: false, isWritable: false },
  { pubkey: tokenBMint, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
];
```

## Usage Examples

### Complete Add Liquidity Example

```typescript
import { createAddLiquidityInstruction } from '@/lib/solana/poolInstructions';
import { Connection, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

// Setup
const connection = new Connection('https://api.devnet.solana.com');
const programId = new PublicKey('6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z');

// Create instruction
const addLiquidityIx = createAddLiquidityInstruction(
  programId,
  poolAddress,
  poolAuthority,
  poolTokenAccountA,
  poolTokenAccountB,
  lpTokenMint,
  feeAccount,
  tokenAMint,
  tokenBMint,
  wallet.publicKey,
  userTokenAccountA,
  userTokenAccountB,
  userLpTokenAccount,
  BigInt(1_000_000_000),    // 1000 USDC max
  BigInt(10_000_000_000),   // 10 SOL max
  BigInt(100_000_000_000)   // 100 LP tokens min
);

// Send transaction
const transaction = new Transaction().add(addLiquidityIx);
const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
console.log('Transaction confirmed:', signature);
```

### Complete Remove Liquidity Example

```typescript
import { createRemoveLiquidityInstruction } from '@/lib/solana/poolInstructions';
import { Connection, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

// Setup
const connection = new Connection('https://api.devnet.solana.com');
const programId = new PublicKey('6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z');

// Create instruction
const removeLiquidityIx = createRemoveLiquidityInstruction(
  programId,
  poolAddress,
  poolAuthority,
  poolTokenAccountA,
  poolTokenAccountB,
  lpTokenMint,
  feeAccount,
  tokenAMint,
  tokenBMint,
  wallet.publicKey,
  userTokenAccountA,
  userTokenAccountB,
  userLpTokenAccount,
  BigInt(100_000_000_000),  // 100 LP tokens to burn
  BigInt(950_000_000),      // 950 USDC minimum
  BigInt(9_500_000_000)     // 9.5 SOL minimum
);

// Send transaction
const transaction = new Transaction().add(removeLiquidityIx);
const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
console.log('Transaction confirmed:', signature);
```

## Common Errors and Solutions

### Error: "Feature Not Supported" or "Invalid Instruction" (0xe)

**Cause:** Incorrect discriminator value or account order

**Solutions:**
1. Verify discriminator is 2 for add liquidity, 3 for remove liquidity
2. Verify account order matches the specification exactly
3. Check that instruction data is exactly 25 bytes
4. Ensure all amounts are positive (> 0)

### Error: "Insufficient Funds"

**Cause:** User doesn't have enough tokens or SOL for transaction fees

**Solutions:**
1. Check user's token balances before creating transaction
2. Ensure user has enough SOL for transaction fees (~0.000005 SOL)
3. Reduce the amount being deposited/withdrawn

### Error: "Slippage Tolerance Exceeded"

**Cause:** Pool ratio changed significantly between quote and execution

**Solutions:**
1. Increase slippage tolerance
2. Reduce transaction amount
3. Try again with fresh quote

## Testing Checklist

- [ ] Verify discriminator value is correct (2 for add, 3 for remove)
- [ ] Verify instruction data is exactly 25 bytes
- [ ] Verify account count (14 for add, 15 for remove)
- [ ] Verify account order matches specification
- [ ] Verify all amounts are positive
- [ ] Test with small amounts first
- [ ] Verify LP tokens are minted/burned correctly
- [ ] Verify token balances change as expected

## Additional Resources

- [Solana Transaction Documentation](https://solana.com/docs/core/transactions)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

## Implementation Files

- **Instruction Builders:** `src/lib/solana/poolInstructions.ts`
- **Liquidity Service:** `src/services/liquidityService.ts`
- **Pool Loader:** `src/lib/solana/poolLoader.ts`

## Version History

- **v1.0.0** (2024-11-01): Fixed discriminator values and account orders
  - Changed ADD_LIQUIDITY discriminator from 0 to 2
  - Changed REMOVE_LIQUIDITY discriminator from 2 to 3
  - Corrected account orders for both operations
  - Added comprehensive documentation and validation
