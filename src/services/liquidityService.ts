import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Pool, TransactionStatus } from '@/types';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { calculateLiquidityTokens } from '@/utils/calculations';
import {
  createAddLiquidityInstruction,
  createRemoveLiquidityInstruction,
} from '@/lib/solana/poolInstructions';
import { findOrCreateATA } from '@/lib/swapInstructions';
import dexConfig from '@/config/dex-config.json';

export interface LiquidityExecutionResult {
  signature: string;
  status: TransactionStatus;
  error?: string;
}

export interface AddLiquidityParams {
  pool: Pool;
  amountA: bigint;
  amountB: bigint;
  minLpTokens?: bigint; // Minimum LP tokens to receive (slippage protection)
}

export interface RemoveLiquidityParams {
  pool: Pool;
  lpTokenAmount: bigint;
  minTokenA?: bigint; // Minimum token A to receive
  minTokenB?: bigint; // Minimum token B to receive
}

export class LiquidityService {
  private connection: Connection;
  private programId?: PublicKey; // AMM Program ID - to be configured

  constructor(connection: Connection, programId?: string) {
    this.connection = connection;
    if (programId) {
      try {
        this.programId = new PublicKey(programId);
      } catch (error) {
        console.warn('Invalid program ID:', error);
      }
    }
  }

  /**
   * Calculate expected LP tokens for adding liquidity
   */
  calculateExpectedLpTokens(
    pool: Pool,
    amountA: bigint,
    amountB: bigint
  ): bigint {
    return calculateLiquidityTokens(
      amountA,
      amountB,
      pool.reserveA,
      pool.reserveB,
      pool.lpTokenSupply
    );
  }

  /**
   * Calculate expected tokens for removing liquidity
   */
  calculateRemoveAmounts(
    pool: Pool,
    lpTokenAmount: bigint
  ): { tokenA: bigint; tokenB: bigint } {
    if (pool.lpTokenSupply === BigInt(0)) {
      return { tokenA: BigInt(0), tokenB: BigInt(0) };
    }

    const share = Number(lpTokenAmount) / Number(pool.lpTokenSupply);
    const tokenA = BigInt(Math.floor(Number(pool.reserveA) * share));
    const tokenB = BigInt(Math.floor(Number(pool.reserveB) * share));

    return { tokenA, tokenB };
  }

  /**
   * Build add liquidity transaction
   * Uses pool config directly (same pattern as swap)
   */
  async buildAddLiquidityTransaction(
    params: AddLiquidityParams,
    userPublicKey: PublicKey
  ): Promise<Transaction> {
    const { pool, amountA, amountB, minLpTokens = BigInt(0) } = params;
    
    if (!this.programId) {
      throw new Error('Program ID not configured. Use getLiquidityService(connection, programId).');
    }

    // Find pool config from dex-config.json (same as swap does)
    const poolConfig = dexConfig.pools.find(p => p.poolAddress === pool.id);
    if (!poolConfig) {
      throw new Error(`Pool config not found for ${pool.id}`);
    }

    const transaction = new Transaction();
    const poolAddress = new PublicKey(poolConfig.poolAddress);
    const poolAuthority = new PublicKey(poolConfig.authority);
    const poolTokenAccountA = new PublicKey(poolConfig.tokenAccountA);
    const poolTokenAccountB = new PublicKey(poolConfig.tokenAccountB);
    const lpTokenMint = new PublicKey(poolConfig.poolTokenMint);
    const feeAccount = new PublicKey(poolConfig.feeAccount);
    const tokenAMint = new PublicKey(poolConfig.tokenA);
    const tokenBMint = new PublicKey(poolConfig.tokenB);
    
    // Get or create user's token accounts (same pattern as swap)
    const userTokenAAccount = await findOrCreateATA(
      this.connection,
      userPublicKey,
      tokenAMint,
      userPublicKey,
      transaction
    );
    
    const userTokenBAccount = await findOrCreateATA(
      this.connection,
      userPublicKey,
      tokenBMint,
      userPublicKey,
      transaction
    );

    const userLpTokenAccount = await findOrCreateATA(
      this.connection,
      userPublicKey,
      lpTokenMint,
      userPublicKey,
      transaction
    );

    // Add the add liquidity instruction with all required accounts
    const addLiquidityIx = createAddLiquidityInstruction(
      this.programId,
      poolAddress,
      poolAuthority,
      poolTokenAccountA,
      poolTokenAccountB,
      lpTokenMint,
      feeAccount,
      tokenAMint,
      tokenBMint,
      userPublicKey,
      userTokenAAccount,
      userTokenBAccount,
      userLpTokenAccount,
      amountA,
      amountB,
      minLpTokens
    );

    transaction.add(addLiquidityIx);

    // Set recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    return transaction;
  }

  /**
   * Build remove liquidity transaction
   * Uses pool config directly (same pattern as swap)
   */
  async buildRemoveLiquidityTransaction(
    params: RemoveLiquidityParams,
    userPublicKey: PublicKey
  ): Promise<Transaction> {
    const { pool, lpTokenAmount, minTokenA = BigInt(0), minTokenB = BigInt(0) } = params;
    
    if (!this.programId) {
      throw new Error('Program ID not configured. Use getLiquidityService(connection, programId).');
    }

    // Find pool config from dex-config.json (same as swap does)
    const poolConfig = dexConfig.pools.find(p => p.poolAddress === pool.id);
    if (!poolConfig) {
      throw new Error(`Pool config not found for ${pool.id}`);
    }

    const transaction = new Transaction();
    const poolAddress = new PublicKey(poolConfig.poolAddress);
    const poolAuthority = new PublicKey(poolConfig.authority);
    const poolTokenAccountA = new PublicKey(poolConfig.tokenAccountA);
    const poolTokenAccountB = new PublicKey(poolConfig.tokenAccountB);
    const lpTokenMint = new PublicKey(poolConfig.poolTokenMint);
    const feeAccount = new PublicKey(poolConfig.feeAccount);
    const tokenAMint = new PublicKey(poolConfig.tokenA);
    const tokenBMint = new PublicKey(poolConfig.tokenB);
    
    // Get user's token accounts (they should exist if removing liquidity)
    const userTokenAAccount = await getAssociatedTokenAddress(
      tokenAMint,
      userPublicKey
    );
    
    const userTokenBAccount = await getAssociatedTokenAddress(
      tokenBMint,
      userPublicKey
    );
    
    const userLpTokenAccount = await getAssociatedTokenAddress(
      lpTokenMint,
      userPublicKey
    );

    // Add the remove liquidity instruction with all required accounts
    const removeLiquidityIx = createRemoveLiquidityInstruction(
      this.programId,
      poolAddress,
      poolAuthority,
      poolTokenAccountA,
      poolTokenAccountB,
      lpTokenMint,
      feeAccount,
      tokenAMint,
      tokenBMint,
      userPublicKey,
      userTokenAAccount,
      userTokenBAccount,
      userLpTokenAccount,
      lpTokenAmount,
      minTokenA,
      minTokenB
    );

    transaction.add(removeLiquidityIx);

    // Set recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    return transaction;
  }

  /**
   * Execute add liquidity transaction
   */
  async addLiquidity(
    params: AddLiquidityParams,
    wallet: WalletContextState,
    onStatusUpdate?: (status: TransactionStatus, signature?: string, error?: string) => void
  ): Promise<LiquidityExecutionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected or does not support transaction signing');
    }

    try {
      onStatusUpdate?.(TransactionStatus.PENDING);

      // Build transaction
      const transaction = await this.buildAddLiquidityTransaction(
        params,
        wallet.publicKey
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign transaction
      const signedTransaction = await wallet.signTransaction(transaction);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        }
      );

      onStatusUpdate?.(TransactionStatus.PENDING, signature);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        const error = `Transaction failed: ${JSON.stringify(confirmation.value.err)}`;
        onStatusUpdate?.(TransactionStatus.FAILED, signature, error);
        return {
          signature,
          status: TransactionStatus.FAILED,
          error,
        };
      }

      onStatusUpdate?.(TransactionStatus.CONFIRMED, signature);
      return {
        signature,
        status: TransactionStatus.CONFIRMED,
      };

    } catch (error) {
      const errorMessage = this.parseTransactionError(error);
      console.error('Add liquidity failed:', error);
      onStatusUpdate?.(TransactionStatus.FAILED, undefined, errorMessage);
      
      return {
        signature: '',
        status: TransactionStatus.FAILED,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute remove liquidity transaction
   */
  async removeLiquidity(
    params: RemoveLiquidityParams,
    wallet: WalletContextState,
    onStatusUpdate?: (status: TransactionStatus, signature?: string, error?: string) => void
  ): Promise<LiquidityExecutionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected or does not support transaction signing');
    }

    try {
      onStatusUpdate?.(TransactionStatus.PENDING);

      // Build transaction
      const transaction = await this.buildRemoveLiquidityTransaction(
        params,
        wallet.publicKey
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign transaction
      const signedTransaction = await wallet.signTransaction(transaction);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        }
      );

      onStatusUpdate?.(TransactionStatus.PENDING, signature);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        const error = `Transaction failed: ${JSON.stringify(confirmation.value.err)}`;
        onStatusUpdate?.(TransactionStatus.FAILED, signature, error);
        return {
          signature,
          status: TransactionStatus.FAILED,
          error,
        };
      }

      onStatusUpdate?.(TransactionStatus.CONFIRMED, signature);
      return {
        signature,
        status: TransactionStatus.CONFIRMED,
      };

    } catch (error) {
      const errorMessage = this.parseTransactionError(error);
      console.error('Remove liquidity failed:', error);
      onStatusUpdate?.(TransactionStatus.FAILED, undefined, errorMessage);
      
      return {
        signature: '',
        status: TransactionStatus.FAILED,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse transaction error for user-friendly message
   */
  parseTransactionError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      const message = error.message.toLowerCase();
      
      if (message.includes('insufficient funds') || message.includes('insufficient lamports')) {
        return 'Insufficient SOL balance to pay for transaction fees.';
      }
      
      if (message.includes('slippage tolerance exceeded') || message.includes('slippage')) {
        return 'Price moved beyond your slippage tolerance. Try increasing slippage or reducing the amount.';
      }
      
      if (message.includes('blockhash not found')) {
        return 'Transaction expired. Please try again.';
      }
      
      if (message.includes('user rejected')) {
        return 'Transaction was rejected by user.';
      }

      return error.message;
    }

    return 'An unknown error occurred during the liquidity operation.';
  }

  /**
   * Validate add liquidity parameters
   */
  validateAddLiquidity(
    pool: Pool,
    amountA: bigint,
    amountB: bigint,
    userTokenABalance: bigint,
    userTokenBBalance: bigint
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (amountA <= BigInt(0)) {
      errors.push(`${pool.tokenA.symbol} amount must be greater than 0`);
    }

    if (amountB <= BigInt(0)) {
      errors.push(`${pool.tokenB.symbol} amount must be greater than 0`);
    }

    if (amountA > userTokenABalance) {
      errors.push(`Insufficient ${pool.tokenA.symbol} balance`);
    }

    if (amountB > userTokenBBalance) {
      errors.push(`Insufficient ${pool.tokenB.symbol} balance`);
    }

    // Check if pool ratio is maintained (within tolerance)
    if (pool.reserveA > BigInt(0) && pool.reserveB > BigInt(0)) {
      const currentRatio = Number(pool.reserveA) / Number(pool.reserveB);
      const newRatio = Number(amountA) / Number(amountB);
      const ratioDiff = Math.abs(newRatio - currentRatio) / currentRatio;

      if (ratioDiff > 0.05) { // 5% tolerance
        errors.push('Amount ratio does not match pool ratio. Please adjust your amounts.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate remove liquidity parameters
   */
  validateRemoveLiquidity(
    pool: Pool,
    lpTokenAmount: bigint,
    userLpTokenBalance: bigint
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (lpTokenAmount <= BigInt(0)) {
      errors.push('LP token amount must be greater than 0');
    }

    if (lpTokenAmount > userLpTokenBalance) {
      errors.push('Insufficient LP token balance');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
let liquidityService: LiquidityService | null = null;

export const getLiquidityService = (connection: Connection, programId?: string): LiquidityService => {
  if (!liquidityService || liquidityService['connection'] !== connection) {
    liquidityService = new LiquidityService(connection, programId);
  }
  return liquidityService;
};

