/**
 * Sharded DEX Integration
 * Smart routing across multiple pool shards for optimal pricing
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import dexConfig from '../config/dex-config.json';

export interface ShardedPool {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  liquidityA: string;
  liquidityB: string;
  shardNumber: number;
  authority: string;
  poolTokenMint: string;
  feeAccount: string;
  tokenAccountA: string;
  tokenAccountB: string;
  deployedAt: string;
}

export interface TokenConfig {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
}

export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  estimatedOutput: number;
  priceImpact: number;
  route: ShardRoute[];
  totalFee: number;
}

export interface ShardRoute {
  poolAddress: string;
  shardNumber: number;
  inputAmount: number;
  outputAmount: number;
  price: number;
}

class ShardedDexService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    this.connection = new Connection(dexConfig.rpcUrl, 'confirmed');
    this.programId = new PublicKey(dexConfig.programId);
  }

  /**
   * Get all tokens supported by the DEX
   */
  getTokens(): TokenConfig[] {
    return dexConfig.tokens;
  }

  /**
   * Get all pools for a specific trading pair
   */
  getPoolsForPair(tokenA: string, tokenB: string): ShardedPool[] {
    return dexConfig.pools.filter(pool =>
      (pool.tokenA === tokenA && pool.tokenB === tokenB) ||
      (pool.tokenA === tokenB && pool.tokenB === tokenA)
    ).sort((a, b) => a.shardNumber - b.shardNumber);
  }

  /**
   * Get all shards for a trading pair by symbols
   */
  getShardsBySymbol(symbolA: string, symbolB: string): ShardedPool[] {
    return dexConfig.pools.filter(pool =>
      (pool.tokenASymbol === symbolA && pool.tokenBSymbol === symbolB) ||
      (pool.tokenASymbol === symbolB && pool.tokenBSymbol === symbolA)
    ).sort((a, b) => a.shardNumber - b.shardNumber);
  }

  /**
   * Calculate constant product AMM price
   * Price = reserveOut / reserveIn
   */
  private calculateAmmPrice(reserveIn: bigint, reserveOut: bigint): number {
    return Number(reserveOut) / Number(reserveIn);
  }

  /**
   * Calculate output amount using x*y=k formula with 0.3% fee
   * amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
   */
  private calculateSwapOutput(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): bigint {
    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;
    return numerator / denominator;
  }

  /**
   * Calculate price impact percentage
   */
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    const spotPrice = Number(reserveOut) / Number(reserveIn);
    const executionPrice = Number(amountOut) / Number(amountIn);
    return Math.abs((executionPrice - spotPrice) / spotPrice) * 100;
  }

  /**
   * Get optimal quote across all shards using smart routing
   */
  async getQuote(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number
  ): Promise<SwapQuote> {
    const shards = this.getShardsBySymbol(inputTokenSymbol, outputTokenSymbol);

    if (shards.length === 0) {
      throw new Error(`No pools found for ${inputTokenSymbol}/${outputTokenSymbol}`);
    }

    // Determine if we're swapping A->B or B->A
    const isForward = shards[0].tokenASymbol === inputTokenSymbol;

    // Get token decimals
    const inputToken = dexConfig.tokens.find(t => t.symbol === inputTokenSymbol);
    const outputToken = dexConfig.tokens.find(t => t.symbol === outputTokenSymbol);

    if (!inputToken || !outputToken) {
      throw new Error('Token configuration not found');
    }

    // Convert to base units
    const inputAmountBase = BigInt(Math.floor(inputAmount * Math.pow(10, inputToken.decimals)));

    // Simple strategy: Try each shard and pick the best single-shard route
    // TODO: Implement multi-shard split routing for larger trades
    let bestRoute: ShardRoute | null = null;
    let bestOutput = 0n;
    let bestPriceImpact = Infinity;

    for (const shard of shards) {
      // Use config values for reserves (simpler and faster)
      const reserveInHuman = parseFloat(isForward ? shard.liquidityA : shard.liquidityB);
      const reserveOutHuman = parseFloat(isForward ? shard.liquidityB : shard.liquidityA);
      
      // Convert reserves to base units
      const reserveInBase = BigInt(Math.floor(reserveInHuman * Math.pow(10, inputToken.decimals)));
      const reserveOutBase = BigInt(Math.floor(reserveOutHuman * Math.pow(10, outputToken.decimals)));

      const outputAmount = this.calculateSwapOutput(
        inputAmountBase,
        reserveInBase,
        reserveOutBase
      );

      const priceImpact = this.calculatePriceImpact(
        inputAmountBase,
        outputAmount,
        reserveInBase,
        reserveOutBase
      );

      if (outputAmount > bestOutput || (outputAmount === bestOutput && priceImpact < bestPriceImpact)) {
        bestOutput = outputAmount;
        bestPriceImpact = priceImpact;
        bestRoute = {
          poolAddress: shard.poolAddress,
          shardNumber: shard.shardNumber,
          inputAmount: inputAmount,
          outputAmount: Number(outputAmount) / Math.pow(10, outputToken.decimals),
          price: Number(outputAmount) / Number(inputAmountBase)
        };
      }
    }

    if (!bestRoute) {
      throw new Error('Unable to calculate route');
    }

    return {
      inputToken: inputToken.mint,
      outputToken: outputToken.mint,
      inputAmount,
      estimatedOutput: bestRoute.outputAmount,
      priceImpact: bestPriceImpact,
      route: [bestRoute],
      totalFee: inputAmount * 0.003 // 0.3% fee
    };
  }

  /**
   * Execute swap on the sharded DEX
   */
  async executeSwap(
    walletAdapter: any, // Wallet adapter with signTransaction
    quote: SwapQuote,
    slippageTolerance: number = 0.5
  ): Promise<string> {
    try {
      const wallet = walletAdapter.publicKey;

      // Get pool information
      const pool = dexConfig.pools.find(p => p.poolAddress === quote.route[0].poolAddress);
      if (!pool) {
        throw new Error('Pool not found');
      }

      // Get token information
      const inputTokenConfig = dexConfig.tokens.find(t => t.mint === quote.inputToken);
      const outputTokenConfig = dexConfig.tokens.find(t => t.mint === quote.outputToken);

      if (!inputTokenConfig || !outputTokenConfig) {
        throw new Error('Token configuration not found');
      }

      // Calculate minimum output with slippage
      const minOutput = quote.estimatedOutput * (1 - slippageTolerance / 100);
      
      console.log(`  Slippage tolerance: ${slippageTolerance}%`);
      console.log(`  Estimated output: ${quote.estimatedOutput} ${outputTokenConfig.symbol}`);
      console.log(`  Minimum output: ${minOutput} ${outputTokenConfig.symbol}`);

      console.log('🔄 Building Swap Transaction...');
      console.log(`  Pool: ${pool.poolAddress}`);
      console.log(`  Shard: ${pool.shardNumber}`);
      console.log(`  Input: ${quote.inputAmount} ${inputTokenConfig.symbol}`);
      console.log(`  Expected Output: ${quote.estimatedOutput.toFixed(6)} ${outputTokenConfig.symbol}`);
      console.log(`  Min Output (${slippageTolerance}% slippage): ${minOutput.toFixed(6)} ${outputTokenConfig.symbol}`);
      console.log(`  Price Impact: ${quote.priceImpact.toFixed(2)}%`);

      // Convert amounts to base units (lamports/smallest unit)
      const amountIn = BigInt(Math.floor(quote.inputAmount * Math.pow(10, inputTokenConfig.decimals)));
      const minimumAmountOut = BigInt(Math.floor(minOutput * Math.pow(10, outputTokenConfig.decimals)));

      // Optional: Check user's token balance before attempting swap
      // Commented out for now to see actual transaction errors
      console.log(`  Skipping balance check - will validate during transaction`);
      console.log(`  Swap amount: ${quote.inputAmount} ${inputTokenConfig.symbol}`);

      // Import swap instruction builder
      const { buildSimpleSwapTransaction } = await import('./swapInstructions');

      // Determine which token is A and which is B based on pool configuration
      const isInputTokenA = pool.tokenA === inputTokenConfig.mint;
      
      console.log(`  Swap direction: ${inputTokenConfig.symbol} → ${outputTokenConfig.symbol}`);
      console.log(`  Pool tokens: ${pool.tokenASymbol} (A) / ${pool.tokenBSymbol} (B)`);
      console.log(`  Is forward swap (A→B): ${isInputTokenA}`);
      
      // Build the transaction with all required accounts
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
        new PublicKey(pool.poolTokenMint),
        new PublicKey(pool.feeAccount),
        new PublicKey(pool.tokenA),
        new PublicKey(pool.tokenB),
        amountIn,
        minimumAmountOut
      );

      console.log('📝 Transaction built successfully');
      console.log('   Transaction details:', {
        instructions: transaction.instructions.length,
        feePayer: transaction.feePayer?.toBase58(),
        recentBlockhash: transaction.recentBlockhash
      });
      console.log('🔐 Requesting wallet signature...');

      // Sign the transaction with wallet
      const signedTransaction = await walletAdapter.signTransaction(transaction);

      console.log('✅ Transaction signed');
      console.log('📤 Sending transaction to Solana...');
      console.log('   Preflight checks enabled');

      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        }
      );
      
      console.log('✅ Transaction sent to network');

      console.log('⏳ Confirming transaction...');
      console.log(`   Signature: ${signature}`);

      // Confirm the transaction
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: transaction.recentBlockhash!,
          lastValidBlockHeight: transaction.lastValidBlockHeight!,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('✅ Swap completed successfully!');
      console.log(`   View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      return signature;

    } catch (error) {
      // Log the full error for debugging
      console.error('❌ Swap execution error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Provide helpful error messages
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('user rejected') || message.includes('cancelled')) {
          throw new Error('Transaction cancelled by user');
        } else if (message.includes('insufficient funds') || message.includes('insufficient lamports')) {
          throw new Error('Insufficient SOL for transaction fees');
        } else if (message.includes('no record of a prior credit') || message.includes('attempt to debit')) {
          throw new Error('Insufficient token balance or token account not found. Please ensure you have enough balance.');
        } else if (message.includes('tokenaccountnotfound') || message.includes('token account not found')) {
          throw new Error('Token account not found. Please ensure you have the input token.');
        } else if (message.includes('simulation failed')) {
          throw new Error('Transaction simulation failed. Please check your balance and try again.');
        }
      }

      // Re-throw the original error with more context
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolAddress: string): Promise<{
    tvl: number;
    volume24h: number;
    fees24h: number;
    apy: number;
  }> {
    // TODO: Fetch on-chain data and calculate stats
    const pool = dexConfig.pools.find(p => p.poolAddress === poolAddress);

    if (!pool) {
      throw new Error('Pool not found');
    }

    // Placeholder - implement actual on-chain data fetching
    return {
      tvl: parseFloat(pool.liquidityA) * 2, // Rough estimate
      volume24h: 0,
      fees24h: 0,
      apy: 0
    };
  }

  /**
   * Get all trading pairs
   */
  getTradingPairs(): Array<{ pair: string; shards: number }> {
    return dexConfig.summary.pairs;
  }

  /**
   * Get program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }
}

// Export singleton instance
export const shardedDex = new ShardedDexService();
export default shardedDex;
