/**
 * Solana Pool Program Instructions
 * 
 * This file contains instruction builders for interacting with the DEX smart contract.
 * It provides functions to create properly formatted transaction instructions for:
 * - Adding liquidity to pools (both tokens)
 * - Removing liquidity from pools (both tokens)
 * - Swapping tokens (handled in separate file)
 * 
 * Smart Contract Information:
 * - Program ID: 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z
 * - Network: Solana Devnet
 * - Type: Automated Market Maker (AMM) DEX
 * 
 * Available Operations:
 * - INITIALIZE (0): Create new liquidity pool (not used in frontend - pools are pre-created)
 * - SWAP (1): Exchange one token for another
 * - ADD_LIQUIDITY (2): Deposit both tokens to receive LP tokens
 * - REMOVE_LIQUIDITY (3): Burn LP tokens to withdraw both tokens
 * - ADD_SINGLE (4): Deposit single token to receive LP tokens (future feature)
 * - REMOVE_SINGLE (5): Burn LP tokens to withdraw single token (future feature)
 * 
 * Important Notes:
 * - All instruction discriminators and account orders MUST match the on-chain program exactly
 * - Instruction data uses little-endian byte order for all numeric values
 * - All amounts are represented as u64 (8 bytes) in the instruction data
 * - Account order is critical - incorrect order will cause transaction failures
 * 
 * @see {@link https://solana.com/docs/core/transactions Solana Transaction Documentation}
 * @module poolInstructions
 */

import {
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

/**
 * Instruction discriminators for the DEX smart contract
 * 
 * Smart Contract Program ID: 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z
 * 
 * ⚠️ CRITICAL WARNING: These discriminator values MUST match the on-chain program exactly.
 * Using incorrect discriminators will cause transactions to fail with "Feature Not Supported" 
 * or "Invalid Instruction" errors (error code 0xe).
 * 
 * Each discriminator is a single byte (u8) at offset 0 in the instruction data that tells
 * the smart contract which operation to perform.
 * 
 * Discriminator Values:
 * - 0 (INITIALIZE): Creates a new liquidity pool
 *   - Data format: [discriminator (1 byte)] + pool initialization parameters
 *   - Account count: Varies (not used in frontend - pools are pre-created)
 * 
 * - 1 (SWAP): Swaps one token for another in an existing pool
 *   - Data format: [discriminator (1 byte)][amount_in (8 bytes)][minimum_amount_out (8 bytes)]
 *   - Account count: 13 accounts
 *   - Status: ✅ Working correctly
 * 
 * - 2 (ADD_LIQUIDITY): Deposits both tokens to receive LP tokens
 *   - Data format: [discriminator (1 byte)][pool_token_amount (8 bytes)][max_token_a (8 bytes)][max_token_b (8 bytes)]
 *   - Total data size: 25 bytes
 *   - Account count: 14 accounts
 *   - pool_token_amount: Minimum LP tokens to receive (slippage protection)
 *   - max_token_a: Maximum token A to deposit (slippage protection)
 *   - max_token_b: Maximum token B to deposit (slippage protection)
 * 
 * - 3 (REMOVE_LIQUIDITY): Burns LP tokens to receive both tokens back
 *   - Data format: [discriminator (1 byte)][pool_token_amount (8 bytes)][min_token_a (8 bytes)][min_token_b (8 bytes)]
 *   - Total data size: 25 bytes
 *   - Account count: 15 accounts
 *   - pool_token_amount: LP tokens to burn
 *   - min_token_a: Minimum token A to receive (slippage protection)
 *   - min_token_b: Minimum token B to receive (slippage protection)
 * 
 * - 4 (ADD_SINGLE): Deposits single token to receive LP tokens (future feature)
 *   - Data format: [discriminator (1 byte)] + single token parameters
 *   - Account count: TBD
 *   - Status: Not yet implemented in frontend
 * 
 * - 5 (REMOVE_SINGLE): Burns LP tokens to receive single token (future feature)
 *   - Data format: [discriminator (1 byte)] + single token parameters
 *   - Account count: TBD
 *   - Status: Not yet implemented in frontend
 */
export const INSTRUCTION_DISCRIMINATORS = {
  INITIALIZE: 0,
  SWAP: 1,
  ADD_LIQUIDITY: 2,
  REMOVE_LIQUIDITY: 3,
  ADD_SINGLE: 4,
  REMOVE_SINGLE: 5,
} as const;

/**
 * Build add liquidity instruction data for the DEX smart contract
 * 
 * This function creates the binary instruction data required by the smart contract's
 * add liquidity operation (discriminator 2). The instruction data format must match
 * the on-chain program exactly or the transaction will fail with InvalidInstruction error.
 * 
 * Instruction Data Format (25 bytes total):
 * - Byte 0: Discriminator (value 2 for ADD_LIQUIDITY)
 * - Bytes 1-8: pool_token_amount (u64, little-endian) - Minimum LP tokens to receive
 * - Bytes 9-16: maximum_token_a_amount (u64, little-endian) - Maximum token A to deposit
 * - Bytes 17-24: maximum_token_b_amount (u64, little-endian) - Maximum token B to deposit
 * 
 * The pool_token_amount acts as slippage protection - if the pool cannot mint at least
 * this many LP tokens, the transaction will fail. The max amounts prevent depositing
 * more tokens than intended if pool ratios change.
 * 
 * @param poolTokenAmount - Minimum LP tokens to receive (slippage protection)
 * @param maxTokenA - Maximum token A amount to deposit (slippage protection)
 * @param maxTokenB - Maximum token B amount to deposit (slippage protection)
 * @returns Buffer containing the 25-byte instruction data
 * @throws Error if any amount is not positive (must be > 0)
 * 
 * @example
 * ```typescript
 * // Add liquidity: deposit up to 1000 USDC and 10 SOL, expect at least 100 LP tokens
 * const data = buildAddLiquidityInstructionData(
 *   BigInt(100_000_000_000),  // 100 LP tokens (9 decimals)
 *   BigInt(1_000_000_000),    // 1000 USDC (6 decimals)
 *   BigInt(10_000_000_000)    // 10 SOL (9 decimals)
 * );
 * ```
 */
export function buildAddLiquidityInstructionData(
  poolTokenAmount: bigint,
  maxTokenA: bigint,
  maxTokenB: bigint
): Buffer {
  // Input validation - all amounts must be positive
  if (poolTokenAmount <= BigInt(0)) {
    throw new Error('Pool token amount must be positive (> 0)');
  }
  if (maxTokenA <= BigInt(0)) {
    throw new Error('Maximum token A amount must be positive (> 0)');
  }
  if (maxTokenB <= BigInt(0)) {
    throw new Error('Maximum token B amount must be positive (> 0)');
  }

  // Allocate 25 bytes: 1 byte discriminator + 8 bytes pool_token_amount + 8 bytes max_token_a + 8 bytes max_token_b
  const data = Buffer.alloc(25);
  
  // Byte 0: Write discriminator (value 2 for ADD_LIQUIDITY)
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.ADD_LIQUIDITY, 0);
  
  // Bytes 1-8: Write pool_token_amount (EXPECTED/TARGET LP tokens to receive, NOT minimum)
  // The smart contract interprets this as "I want to receive THIS MANY LP tokens"
  // and calculates the required token A/B amounts, checking against the maximums
  data.writeBigUInt64LE(poolTokenAmount, 1);
  
  // Bytes 9-16: Write maximum_token_a_amount
  data.writeBigUInt64LE(maxTokenA, 9);
  
  // Bytes 17-24: Write maximum_token_b_amount
  data.writeBigUInt64LE(maxTokenB, 17);
  
  return data;
}

/**
 * Build remove liquidity instruction data for the DEX smart contract
 * 
 * This function creates the binary instruction data required by the smart contract's
 * remove liquidity operation (discriminator 3). The instruction data format must match
 * the on-chain program exactly or the transaction will fail with InvalidInstruction error.
 * 
 * Instruction Data Format (25 bytes total):
 * - Byte 0: Discriminator (value 3 for REMOVE_LIQUIDITY)
 * - Bytes 1-8: pool_token_amount (u64, little-endian) - LP tokens to burn
 * - Bytes 9-16: minimum_token_a_amount (u64, little-endian) - Minimum token A to receive
 * - Bytes 17-24: minimum_token_b_amount (u64, little-endian) - Minimum token B to receive
 * 
 * The pool_token_amount specifies how many LP tokens to burn. The min amounts act as
 * slippage protection - if the pool cannot return at least these amounts, the transaction
 * will fail. This prevents receiving less than expected if pool ratios change.
 * 
 * @param poolTokenAmount - LP tokens to burn (must be > 0)
 * @param minTokenA - Minimum token A amount to receive (slippage protection, must be >= 0)
 * @param minTokenB - Minimum token B amount to receive (slippage protection, must be >= 0)
 * @returns Buffer containing the 25-byte instruction data
 * @throws Error if poolTokenAmount is not positive or if min amounts are negative
 * 
 * @example
 * ```typescript
 * // Remove liquidity: burn 100 LP tokens, expect at least 950 USDC and 9.5 SOL
 * const data = buildRemoveLiquidityInstructionData(
 *   BigInt(100_000_000_000),  // 100 LP tokens (9 decimals)
 *   BigInt(950_000_000),      // 950 USDC minimum (6 decimals)
 *   BigInt(9_500_000_000)     // 9.5 SOL minimum (9 decimals)
 * );
 * ```
 */
export function buildRemoveLiquidityInstructionData(
  poolTokenAmount: bigint,
  minTokenA: bigint,
  minTokenB: bigint
): Buffer {
  // Input validation - pool token amount must be positive
  if (poolTokenAmount <= BigInt(0)) {
    throw new Error('Pool token amount must be positive (> 0)');
  }
  // Minimum amounts must be non-negative (can be 0 for no slippage protection)
  if (minTokenA < BigInt(0)) {
    throw new Error('Minimum token A amount cannot be negative (must be >= 0)');
  }
  if (minTokenB < BigInt(0)) {
    throw new Error('Minimum token B amount cannot be negative (must be >= 0)');
  }

  // Allocate 25 bytes: 1 byte discriminator + 8 bytes pool_token_amount + 8 bytes min_token_a + 8 bytes min_token_b
  const data = Buffer.alloc(25);
  
  // Byte 0: Write discriminator (value 3 for REMOVE_LIQUIDITY)
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.REMOVE_LIQUIDITY, 0);
  
  // Bytes 1-8: Write pool_token_amount (LP tokens to burn)
  data.writeBigUInt64LE(poolTokenAmount, 1);
  
  // Bytes 9-16: Write minimum_token_a_amount
  data.writeBigUInt64LE(minTokenA, 9);
  
  // Bytes 17-24: Write minimum_token_b_amount
  data.writeBigUInt64LE(minTokenB, 17);
  
  return data;
}

/**
 * Create instruction to add liquidity to a pool
 * 
 * ⚠️ CRITICAL: Account order MUST match the smart contract specification exactly.
 * Using incorrect account order will cause transactions to fail with InvalidInstruction error (0xe).
 * 
 * Account Order (14 accounts total):
 * 0. swap_account (read-only) - The token swap pool account
 * 1. swap_authority (read-only) - PDA authority of the swap
 * 2. user_transfer_authority (signer) - User's wallet that must sign the transaction
 * 3. user_token_a_account (writable) - User's token A account (source for deposit)
 * 4. user_token_b_account (writable) - User's token B account (source for deposit)
 * 5. pool_token_a_account (writable) - Pool's token A reserve account
 * 6. pool_token_b_account (writable) - Pool's token B reserve account
 * 7. pool_mint (writable) - LP token mint account (for minting new LP tokens)
 * 8. user_lp_token_account (writable) - User's LP token account (destination for LP tokens)
 * 9. token_a_mint (read-only) - Token A mint address
 * 10. token_b_mint (read-only) - Token B mint address
 * 11. token_a_program (read-only) - SPL Token program for token A
 * 12. token_b_program (read-only) - SPL Token program for token B
 * 13. pool_token_program (read-only) - SPL Token program for LP tokens
 * 
 * Total: 14 accounts
 * 
 * @param programId - The DEX smart contract program ID
 * @param poolAddress - The swap pool account address
 * @param poolAuthority - The PDA authority of the swap
 * @param poolTokenAccountA - Pool's token A reserve account
 * @param poolTokenAccountB - Pool's token B reserve account
 * @param lpTokenMint - LP token mint account
 * @param feeAccount - Pool fee account (not used in add liquidity, kept for compatibility)
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @param userAuthority - User's wallet public key (signer)
 * @param userTokenAccountA - User's token A account
 * @param userTokenAccountB - User's token B account
 * @param userLpTokenAccount - User's LP token account
 * @param amountA - Maximum token A amount to deposit
 * @param amountB - Maximum token B amount to deposit
 * @param minLpTokens - Minimum LP tokens to receive (slippage protection)
 * @returns TransactionInstruction for adding liquidity
 */
export function createAddLiquidityInstruction(
  programId: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  lpTokenMint: PublicKey,
  feeAccount: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  userAuthority: PublicKey,
  userTokenAccountA: PublicKey,
  userTokenAccountB: PublicKey,
  userLpTokenAccount: PublicKey,
  amountA: bigint,
  amountB: bigint,
  minLpTokens: bigint
): TransactionInstruction {
  const data = buildAddLiquidityInstructionData(minLpTokens, amountA, amountB);

  // Account order matching smart contract specification exactly (14 accounts)
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: false },           // 0. swap_account
    { pubkey: poolAuthority, isSigner: false, isWritable: false },         // 1. swap_authority
    { pubkey: userAuthority, isSigner: true, isWritable: false },          // 2. user_transfer_authority
    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },      // 3. user_token_a_account
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },      // 4. user_token_b_account
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },      // 5. pool_token_a_account
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },      // 6. pool_token_b_account
    { pubkey: lpTokenMint, isSigner: false, isWritable: true },            // 7. pool_mint
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },     // 8. user_lp_token_account
    { pubkey: tokenAMint, isSigner: false, isWritable: false },            // 9. token_a_mint
    { pubkey: tokenBMint, isSigner: false, isWritable: false },            // 10. token_b_mint
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 11. token_a_program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 12. token_b_program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 13. pool_token_program
  ];

  // Debug logging
  console.log('🔧 Add Liquidity Instruction:');
  console.log('  Discriminator:', INSTRUCTION_DISCRIMINATORS.ADD_LIQUIDITY);
  console.log('  Instruction data (hex):', data.toString('hex'));
  console.log('  Account count:', keys.length);
  console.log('  Program ID:', programId.toString());

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

/**
 * Create instruction to remove liquidity from a pool
 * 
 * ⚠️ CRITICAL: Account order MUST match the smart contract specification exactly.
 * Using incorrect account order will cause transactions to fail with InvalidInstruction error (0xe).
 * 
 * Account Order (15 accounts total):
 * 0. swap_account (read-only) - The token swap pool account
 * 1. swap_authority (read-only) - PDA authority of the swap
 * 2. user_transfer_authority (signer) - User's wallet that must sign the transaction
 * 3. pool_mint (writable) - LP token mint account (for burning LP tokens)
 * 4. user_lp_token_account (writable) - User's LP token account (source for burning)
 * 5. pool_token_a_account (writable) - Pool's token A reserve account
 * 6. pool_token_b_account (writable) - Pool's token B reserve account
 * 7. user_token_a_account (writable) - User's token A account (destination for withdrawal)
 * 8. user_token_b_account (writable) - User's token B account (destination for withdrawal)
 * 9. fee_account (writable) - Pool fee account for collecting withdrawal fees
 * 10. token_a_mint (read-only) - Token A mint address
 * 11. token_b_mint (read-only) - Token B mint address
 * 12. pool_token_program (read-only) - SPL Token program for LP tokens
 * 13. token_a_program (read-only) - SPL Token program for token A
 * 14. token_b_program (read-only) - SPL Token program for token B
 * 
 * Total: 15 accounts
 * 
 * @param programId - The DEX smart contract program ID
 * @param poolAddress - The swap pool account address
 * @param poolAuthority - The PDA authority of the swap
 * @param poolTokenAccountA - Pool's token A reserve account
 * @param poolTokenAccountB - Pool's token B reserve account
 * @param lpTokenMint - LP token mint account
 * @param feeAccount - Pool fee account for withdrawal fees
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @param userAuthority - User's wallet public key (signer)
 * @param userTokenAccountA - User's token A account
 * @param userTokenAccountB - User's token B account
 * @param userLpTokenAccount - User's LP token account
 * @param lpTokenAmount - LP tokens to burn
 * @param minTokenA - Minimum token A amount to receive (slippage protection)
 * @param minTokenB - Minimum token B amount to receive (slippage protection)
 * @returns TransactionInstruction for removing liquidity
 */
export function createRemoveLiquidityInstruction(
  programId: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  lpTokenMint: PublicKey,
  feeAccount: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  userAuthority: PublicKey,
  userTokenAccountA: PublicKey,
  userTokenAccountB: PublicKey,
  userLpTokenAccount: PublicKey,
  lpTokenAmount: bigint,
  minTokenA: bigint,
  minTokenB: bigint
): TransactionInstruction {
  const data = buildRemoveLiquidityInstructionData(lpTokenAmount, minTokenA, minTokenB);

  // Account order matching smart contract specification exactly (15 accounts)
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: false },           // 0. swap_account
    { pubkey: poolAuthority, isSigner: false, isWritable: false },         // 1. swap_authority
    { pubkey: userAuthority, isSigner: true, isWritable: false },          // 2. user_transfer_authority
    { pubkey: lpTokenMint, isSigner: false, isWritable: true },            // 3. pool_mint
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },     // 4. user_lp_token_account
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },      // 5. pool_token_a_account
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },      // 6. pool_token_b_account
    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },      // 7. user_token_a_account
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },      // 8. user_token_b_account
    { pubkey: feeAccount, isSigner: false, isWritable: true },             // 9. fee_account
    { pubkey: tokenAMint, isSigner: false, isWritable: false },            // 10. token_a_mint
    { pubkey: tokenBMint, isSigner: false, isWritable: false },            // 11. token_b_mint
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 12. pool_token_program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 13. token_a_program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 14. token_b_program
  ];

  // Debug logging
  console.log('🔧 Remove Liquidity Instruction:');
  console.log('  Discriminator:', INSTRUCTION_DISCRIMINATORS.REMOVE_LIQUIDITY);
  console.log('  Instruction data (hex):', data.toString('hex'));
  console.log('  Account count:', keys.length);
  console.log('  Program ID:', programId.toString());

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

