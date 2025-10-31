/**
 * Swap Instruction Builder for Sharded DEX
 * Handles transaction building for on-chain swaps
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
/**
 * Instruction discriminators for the DEX program
 * These are typically the first 8 bytes of the instruction data
 */
const INSTRUCTION_DISCRIMINATORS = {
  SWAP: 0, // Swap instruction discriminator
  ADD_LIQUIDITY: 1,
  REMOVE_LIQUIDITY: 2,
};

/**
 * Find or create associated token account
 */
export async function findOrCreateATA(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  transaction: Transaction
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID);

  try {
    // Check if account exists
    await getAccount(connection, ata, 'confirmed', TOKEN_PROGRAM_ID);
    return ata;
  } catch (error) {
    // Account doesn't exist, add instruction to create it
    const createATAInstruction = createAssociatedTokenAccountInstruction(
      payer,
      ata,
      owner,
      mint,
      TOKEN_PROGRAM_ID
    );
    transaction.add(createATAInstruction);
    return ata;
  }
}

/**
 * Build swap instruction data
 * Uses a simple Buffer-based encoding instead of borsh for compatibility
 */
export function buildSwapInstructionData(amountIn: bigint, minimumAmountOut: bigint): Buffer {
  // Simple instruction data: [discriminator (1 byte), amountIn (8 bytes), minAmountOut (8 bytes)]
  const data = Buffer.alloc(17);
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.SWAP, 0);
  data.writeBigUInt64LE(amountIn, 1);
  data.writeBigUInt64LE(minimumAmountOut, 9);
  return data;
}

/**
 * Create swap instruction
 */
export function createSwapInstruction(
  programId: PublicKey,
  user: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  userTokenAccountIn: PublicKey,
  userTokenAccountOut: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  poolTokenMint: PublicKey,
  feeAccount: PublicKey,
  amountIn: bigint,
  minimumAmountOut: bigint
): TransactionInstruction {
  const instructionData = buildSwapInstructionData(amountIn, minimumAmountOut);

  const keys = [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: poolAddress, isSigner: false, isWritable: true },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userTokenAccountIn, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountOut, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: poolTokenMint, isSigner: false, isWritable: false },
    { pubkey: feeAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data: instructionData,
  });
}

/**
 * Build complete swap transaction
 */
export async function buildSwapTransaction(
  connection: Connection,
  programId: PublicKey,
  user: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  inputMint: PublicKey,
  outputMint: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  poolTokenMint: PublicKey,
  feeAccount: PublicKey,
  amountIn: bigint,
  minimumAmountOut: bigint
): Promise<Transaction> {
  const transaction = new Transaction();

  // Get or create user's token accounts
  const userTokenAccountIn = await findOrCreateATA(
    connection,
    user,
    inputMint,
    user,
    transaction
  );

  const userTokenAccountOut = await findOrCreateATA(
    connection,
    user,
    outputMint,
    user,
    transaction
  );

  // Create swap instruction
  const swapInstruction = createSwapInstruction(
    programId,
    user,
    poolAddress,
    poolAuthority,
    userTokenAccountIn,
    userTokenAccountOut,
    poolTokenAccountA,
    poolTokenAccountB,
    poolTokenMint,
    feeAccount,
    amountIn,
    minimumAmountOut
  );

  transaction.add(swapInstruction);

  // Set recent blockhash and fee payer
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = user;
  transaction.lastValidBlockHeight = lastValidBlockHeight;

  return transaction;
}

/**
 * Alternative: Simple swap instruction builder for testing
 * Uses a more basic instruction format that might match simpler AMM programs
 */
export function createSimpleSwapInstruction(
  programId: PublicKey,
  user: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  userTokenAccountIn: PublicKey,
  userTokenAccountOut: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  amountIn: bigint,
  minimumAmountOut: bigint
): TransactionInstruction {
  // Simple instruction data: [discriminator (1 byte), amountIn (8 bytes), minAmountOut (8 bytes)]
  const data = Buffer.alloc(17);
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.SWAP, 0);
  data.writeBigUInt64LE(amountIn, 1);
  data.writeBigUInt64LE(minimumAmountOut, 9);

  const keys = [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: poolAddress, isSigner: false, isWritable: true },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userTokenAccountIn, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountOut, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

/**
 * Build simple swap transaction (for testing with basic AMM programs)
 */
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
  amountIn: bigint,
  minimumAmountOut: bigint
): Promise<Transaction> {
  const transaction = new Transaction();

  // Get or create user's token accounts
  const userTokenAccountIn = await findOrCreateATA(
    connection,
    user,
    inputMint,
    user,
    transaction
  );

  const userTokenAccountOut = await findOrCreateATA(
    connection,
    user,
    outputMint,
    user,
    transaction
  );

  // Create simple swap instruction
  const swapInstruction = createSimpleSwapInstruction(
    programId,
    user,
    poolAddress,
    poolAuthority,
    userTokenAccountIn,
    userTokenAccountOut,
    poolTokenAccountA,
    poolTokenAccountB,
    amountIn,
    minimumAmountOut
  );

  transaction.add(swapInstruction);

  // Set recent blockhash and fee payer
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = user;
  transaction.lastValidBlockHeight = lastValidBlockHeight;

  return transaction;
}
