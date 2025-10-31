/**
 * Solana Pool Program Instructions
 * This file contains the instruction builders for interacting with the DEX smart contract
 */

import {
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Instruction discriminators (these should match your on-chain program)
// Based on swapInstructions.ts: SWAP=1, ADD_LIQUIDITY=0, REMOVE_LIQUIDITY=2
export const INSTRUCTION_DISCRIMINATORS = {
  ADD_LIQUIDITY: 0,
  REMOVE_LIQUIDITY: 2,
  SWAP: 1,
};

/**
 * Build add liquidity instruction data
 * Format: [discriminator (1 byte), amountA (8 bytes), amountB (8 bytes), minLpTokens (8 bytes)]
 */
export function buildAddLiquidityInstructionData(
  amountA: bigint,
  amountB: bigint,
  minLpTokens: bigint
): Buffer {
  const data = Buffer.alloc(25); // 1 + 8 + 8 + 8
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.ADD_LIQUIDITY, 0);
  data.writeBigUInt64LE(amountA, 1);
  data.writeBigUInt64LE(amountB, 9);
  data.writeBigUInt64LE(minLpTokens, 17);
  return data;
}

/**
 * Build remove liquidity instruction data
 * Format: [discriminator (1 byte), lpTokenAmount (8 bytes), minTokenA (8 bytes), minTokenB (8 bytes)]
 */
export function buildRemoveLiquidityInstructionData(
  lpTokenAmount: bigint,
  minTokenA: bigint,
  minTokenB: bigint
): Buffer {
  const data = Buffer.alloc(25); // 1 + 8 + 8 + 8
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.REMOVE_LIQUIDITY, 0);
  data.writeBigUInt64LE(lpTokenAmount, 1);
  data.writeBigUInt64LE(minTokenA, 9);
  data.writeBigUInt64LE(minTokenB, 17);
  return data;
}

/**
 * Create instruction to add liquidity to a pool
 * Account order MUST match the on-chain program exactly (similar to swap)
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
  const data = buildAddLiquidityInstructionData(amountA, amountB, minLpTokens);

  // Account order MUST match on-chain program exactly
  // Matching swap pattern that works: pool, authority, user, userTokenIn, poolA, poolB, userTokenOut, mint, fee, mints, token programs
  // For add liquidity: user sends tokenA and tokenB, receives LP tokens
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: false },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userAuthority, isSigner: true, isWritable: false },
    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },  // User sends token A
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },  // User sends token B
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },  // User receives LP (similar to userTokenOut in swap)
    { pubkey: lpTokenMint, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: true },
    { pubkey: tokenAMint, isSigner: false, isWritable: false },
    { pubkey: tokenBMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

/**
 * Create instruction to remove liquidity from a pool
 * Account order MUST match the on-chain program exactly (similar to swap)
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

  // Account order matching the swap instruction pattern
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: false },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userAuthority, isSigner: true, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: lpTokenMint, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: true },
    { pubkey: tokenAMint, isSigner: false, isWritable: false },
    { pubkey: tokenBMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

