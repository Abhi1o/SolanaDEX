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

export interface PoolState {
  reserveA: bigint;        // Current reserve of token A in base units
  reserveB: bigint;        // Current reserve of token B in base units
  feeNumerator: bigint;    // Fee numerator (e.g., 3 for 0.3%)
  feeDenominator: bigint;  // Fee denominator (e.g., 1000)
  lastUpdated: number;     // Timestamp of fetch
}

export interface PoolStateCache {
  [poolAddress: string]: {
    state: PoolState;
    expiresAt: number;
  };
}

class ShardedDexService {
  private connection: Connection;
  private programId: PublicKey;
  private poolStateCache: PoolStateCache = {};
  private readonly CACHE_TTL_MS = 30000; // 30 seconds - longer cache to reduce RPC calls
  
  // Cache statistics for debugging
  private cacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalFetches: 0
  };

  constructor() {
    this.connection = new Connection(dexConfig.rpcUrl, 'confirmed');
    this.programId = new PublicKey(dexConfig.programId);
  }
  
  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : '0.00';
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalFetches: 0
    };
  }

  /**
   * Fetch current pool state from on-chain token accounts
   * Uses token account balances as source of truth
   */
  private async fetchPoolState(pool: ShardedPool): Promise<PoolState> {
    const startTime = performance.now();
    
    console.log(`🔍 Fetching pool state for Shard ${pool.shardNumber} (${pool.tokenASymbol}/${pool.tokenBSymbol})`);
    console.log(`   Pool Address: ${pool.poolAddress}`);
    console.log(`   Token Account A: ${pool.tokenAccountA}`);
    console.log(`   Token Account B: ${pool.tokenAccountB}`);
    
    try {
      // Fetch token account balances directly
      const rpcStartTime = performance.now();
      const [tokenAccountAInfo, tokenAccountBInfo] = await Promise.all([
        this.connection.getTokenAccountBalance(new PublicKey(pool.tokenAccountA)),
        this.connection.getTokenAccountBalance(new PublicKey(pool.tokenAccountB))
      ]);
      const rpcDuration = performance.now() - rpcStartTime;
      
      const reserveA = BigInt(tokenAccountAInfo.value.amount);
      const reserveB = BigInt(tokenAccountBInfo.value.amount);
      
      // Get token configs for human-readable logging
      const tokenA = dexConfig.tokens.find(t => t.mint === pool.tokenA);
      const tokenB = dexConfig.tokens.find(t => t.mint === pool.tokenB);
      
      console.log(`✅ Pool state fetched successfully in ${rpcDuration.toFixed(2)}ms`);
      console.log(`   Reserve A (${pool.tokenASymbol}):`);
      console.log(`     - Base units: ${reserveA.toString()}`);
      console.log(`     - Human readable: ${tokenA ? (Number(reserveA) / Math.pow(10, tokenA.decimals)).toFixed(6) : 'N/A'}`);
      console.log(`     - Decimals: ${tokenA?.decimals || 'N/A'}`);
      console.log(`   Reserve B (${pool.tokenBSymbol}):`);
      console.log(`     - Base units: ${reserveB.toString()}`);
      console.log(`     - Human readable: ${tokenB ? (Number(reserveB) / Math.pow(10, tokenB.decimals)).toFixed(6) : 'N/A'}`);
      console.log(`     - Decimals: ${tokenB?.decimals || 'N/A'}`);
      console.log(`   RPC call duration: ${rpcDuration.toFixed(2)}ms`);
      console.log(`   Total fetch duration: ${(performance.now() - startTime).toFixed(2)}ms`);
      
      this.cacheStats.totalFetches++;

      return {
        reserveA,
        reserveB,
        feeNumerator: 3n,      // 0.3% fee
        feeDenominator: 1000n,
        lastUpdated: Date.now()
      };
    } catch (error) {
      this.cacheStats.errors++;
      const errorDuration = performance.now() - startTime;
      // Enhanced RPC error handling with specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorLower = errorMessage.toLowerCase();
      
      console.error(`❌ Failed to fetch pool state for pool ${pool.poolAddress} (${errorDuration.toFixed(2)}ms)`);
      console.error(`   Pool: ${pool.tokenASymbol}/${pool.tokenBSymbol} (Shard ${pool.shardNumber})`);
      console.error(`   Token Account A: ${pool.tokenAccountA}`);
      console.error(`   Token Account B: ${pool.tokenAccountB}`);
      console.error(`   Error occurred after: ${errorDuration.toFixed(2)}ms`);
      
      // Provide specific error messages for common RPC failures
      if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
        console.error('   Error Type: RPC Timeout');
        console.error('   Suggestion: The RPC endpoint is slow or unresponsive. Try again or use a different RPC endpoint.');
        throw new Error(`RPC timeout while fetching pool state for ${pool.poolAddress}. Please try again.`);
      } else if (errorLower.includes('429') || errorLower.includes('rate limit')) {
        console.error('   Error Type: Rate Limit Exceeded');
        console.error('   Suggestion: Too many requests to the RPC endpoint. Wait a moment before retrying.');
        throw new Error('RPC rate limit exceeded. Please wait a moment and try again.');
      } else if (errorLower.includes('invalid') || errorLower.includes('could not find account')) {
        console.error('   Error Type: Invalid Account');
        console.error('   Suggestion: The token account address may be incorrect or the account does not exist.');
        throw new Error(`Invalid token account for pool ${pool.poolAddress}. The pool may not be properly initialized.`);
      } else if (errorLower.includes('network') || errorLower.includes('fetch failed')) {
        console.error('   Error Type: Network Error');
        console.error('   Suggestion: Check your internet connection or RPC endpoint availability.');
        throw new Error('Network error while connecting to Solana RPC. Please check your connection.');
      } else {
        // Generic RPC error
        console.error('   Error Type: Unknown RPC Error');
        console.error('   Error Details:', errorMessage);
        throw new Error(`Failed to fetch pool state: ${errorMessage}`);
      }
    }
  }

  /**
   * Fallback: Convert config reserves to PoolState
   * Returns PoolState with lastUpdated = 0 to indicate stale data
   */
  private getPoolStateFromConfig(pool: ShardedPool): PoolState {
    console.log(`⚠️  Using fallback config data for Shard ${pool.shardNumber}`);
    
    const tokenA = dexConfig.tokens.find(t => t.mint === pool.tokenA);
    const tokenB = dexConfig.tokens.find(t => t.mint === pool.tokenB);

    if (!tokenA || !tokenB) {
      throw new Error('Token configuration not found');
    }
    
    const liquidityAFloat = parseFloat(pool.liquidityA);
    const liquidityBFloat = parseFloat(pool.liquidityB);
    const reserveA = BigInt(Math.floor(liquidityAFloat * Math.pow(10, tokenA.decimals)));
    const reserveB = BigInt(Math.floor(liquidityBFloat * Math.pow(10, tokenB.decimals)));
    
    console.log(`   Config Liquidity A: ${liquidityAFloat} ${pool.tokenASymbol}`);
    console.log(`   Config Liquidity B: ${liquidityBFloat} ${pool.tokenBSymbol}`);
    console.log(`   Converted Reserve A: ${reserveA.toString()} (${tokenA.decimals} decimals)`);
    console.log(`   Converted Reserve B: ${reserveB.toString()} (${tokenB.decimals} decimals)`);
    console.log(`   ⚠️  WARNING: This data may be stale and cause slippage errors`);

    return {
      reserveA,
      reserveB,
      feeNumerator: 3n,
      feeDenominator: 1000n,
      lastUpdated: 0 // Indicates stale data
    };
  }

  /**
   * Get pool state with caching logic
   * Checks cache for unexpired entry, fetches from on-chain if needed
   */
  private async getPoolState(pool: ShardedPool): Promise<PoolState> {
    const cached = this.poolStateCache[pool.poolAddress];
    const now = Date.now();

    // Return cached state if still valid
    if (cached && cached.expiresAt > now) {
      this.cacheStats.hits++;
      const age = now - cached.state.lastUpdated;
      console.log(`💾 Cache HIT for Shard ${pool.shardNumber} (${pool.tokenASymbol}/${pool.tokenBSymbol})`);
      console.log(`   Cache age: ${age}ms`);
      console.log(`   Expires in: ${cached.expiresAt - now}ms`);
      console.log(`   Cache stats: ${this.cacheStats.hits} hits, ${this.cacheStats.misses} misses (${this.getCacheStats().hitRate} hit rate)`);
      return cached.state;
    }

    // Cache miss - need to fetch
    this.cacheStats.misses++;
    console.log(`❌ Cache MISS for Shard ${pool.shardNumber} (${pool.tokenASymbol}/${pool.tokenBSymbol})`);
    console.log(`   Reason: ${!cached ? 'No cached entry' : 'Cache expired'}`);
    console.log(`   Cache stats: ${this.cacheStats.hits} hits, ${this.cacheStats.misses} misses (${this.getCacheStats().hitRate} hit rate)`);

    try {
      // Fetch fresh state from on-chain
      const state = await this.fetchPoolState(pool);
      
      // Update cache
      this.poolStateCache[pool.poolAddress] = {
        state,
        expiresAt: now + this.CACHE_TTL_MS
      };
      
      console.log(`✅ Cache updated for Shard ${pool.shardNumber}, expires in ${this.CACHE_TTL_MS}ms`);
      
      return state;
    } catch (error) {
      console.warn(`⚠️  Failed to fetch pool state for ${pool.poolAddress}, falling back to config values:`, error);
      // Fallback to config values
      return this.getPoolStateFromConfig(pool);
    }
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
    console.log(`🧮 Calculating swap output using AMM formula:`);
    console.log(`   Input amount: ${amountIn.toString()}`);
    console.log(`   Reserve in: ${reserveIn.toString()}`);
    console.log(`   Reserve out: ${reserveOut.toString()}`);
    
    const amountInWithFee = amountIn * 997n;
    console.log(`   Amount in with fee (0.3%): ${amountInWithFee.toString()}`);
    
    const numerator = amountInWithFee * reserveOut;
    console.log(`   Numerator (amountInWithFee * reserveOut): ${numerator.toString()}`);
    
    const denominator = reserveIn * 1000n + amountInWithFee;
    console.log(`   Denominator (reserveIn * 1000 + amountInWithFee): ${denominator.toString()}`);
    
    const output = numerator / denominator;
    console.log(`   Output amount: ${output.toString()}`);
    
    return output;
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
    console.log(`📊 Calculating price impact:`);
    console.log(`   Amount in: ${amountIn.toString()}`);
    console.log(`   Amount out: ${amountOut.toString()}`);
    console.log(`   Reserve in: ${reserveIn.toString()}`);
    console.log(`   Reserve out: ${reserveOut.toString()}`);
    
    const spotPrice = Number(reserveOut) / Number(reserveIn);
    console.log(`   Spot price (reserveOut/reserveIn): ${spotPrice}`);
    
    const executionPrice = Number(amountOut) / Number(amountIn);
    console.log(`   Execution price (amountOut/amountIn): ${executionPrice}`);
    
    const priceImpact = Math.abs((executionPrice - spotPrice) / spotPrice) * 100;
    console.log(`   Price impact: ${priceImpact.toFixed(4)}%`);
    
    return priceImpact;
  }

  /**
   * Get optimal quote across all shards using smart routing
   */
  async getQuote(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number
  ): Promise<SwapQuote> {
    const quoteStartTime = performance.now();
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔄 Getting quote for ${inputAmount} ${inputTokenSymbol} → ${outputTokenSymbol}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    const shards = this.getShardsBySymbol(inputTokenSymbol, outputTokenSymbol);

    if (shards.length === 0) {
      throw new Error(`No pools found for ${inputTokenSymbol}/${outputTokenSymbol}`);
    }
    
    console.log(`📋 Found ${shards.length} shard(s) for this pair`);

    // Determine if we're swapping A->B or B->A
    const isForward = shards[0].tokenASymbol === inputTokenSymbol;
    console.log(`   Swap direction: ${isForward ? 'Forward (A→B)' : 'Reverse (B→A)'}`);

    // Get token decimals
    const inputToken = dexConfig.tokens.find(t => t.symbol === inputTokenSymbol);
    const outputToken = dexConfig.tokens.find(t => t.symbol === outputTokenSymbol);

    if (!inputToken || !outputToken) {
      throw new Error('Token configuration not found');
    }
    
    console.log(`\n📝 Token Configuration:`);
    console.log(`   Input Token: ${inputToken.symbol} (${inputToken.name})`);
    console.log(`     - Mint: ${inputToken.mint}`);
    console.log(`     - Decimals: ${inputToken.decimals}`);
    console.log(`   Output Token: ${outputToken.symbol} (${outputToken.name})`);
    console.log(`     - Mint: ${outputToken.mint}`);
    console.log(`     - Decimals: ${outputToken.decimals}`);

    // Convert to base units
    const inputAmountBase = BigInt(Math.floor(inputAmount * Math.pow(10, inputToken.decimals)));
    console.log(`\n💱 Amount Conversion:`);
    console.log(`   Human readable: ${inputAmount} ${inputToken.symbol}`);
    console.log(`   Base units: ${inputAmountBase.toString()}`);
    console.log(`   Conversion: ${inputAmount} × 10^${inputToken.decimals} = ${inputAmountBase.toString()}`);

    // Fetch live pool states for all shards concurrently
    console.log(`\n🔍 Fetching pool states for ${shards.length} shard(s)...`);
    const fetchStartTime = performance.now();
    const poolStates = await Promise.all(
      shards.map(shard => this.getPoolState(shard))
    );
    const fetchDuration = performance.now() - fetchStartTime;
    console.log(`✅ All pool states fetched in ${fetchDuration.toFixed(2)}ms`);

    // Simple strategy: Try each shard and pick the best single-shard route
    // TODO: Implement multi-shard split routing for larger trades
    console.log(`\n🎯 Evaluating routes across ${shards.length} shard(s)...\n`);
    
    let bestRoute: ShardRoute | null = null;
    let bestOutput = 0n;
    let bestPriceImpact = Infinity;

    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      const poolState = poolStates[i];
      
      console.log(`\n━━━ Shard ${shard.shardNumber} Evaluation ━━━`);
      
      // Log pool state information
      console.log(`📊 Pool State:`);
      console.log(`   Reserve A (${shard.tokenASymbol}):`);
      console.log(`     - Base units: ${poolState.reserveA.toString()}`);
      console.log(`     - Human readable: ${(Number(poolState.reserveA) / Math.pow(10, inputToken.decimals)).toFixed(6)}`);
      console.log(`   Reserve B (${shard.tokenBSymbol}):`);
      console.log(`     - Base units: ${poolState.reserveB.toString()}`);
      console.log(`     - Human readable: ${(Number(poolState.reserveB) / Math.pow(10, outputToken.decimals)).toFixed(6)}`);
      
      // Log data age
      const now = Date.now();
      if (poolState.lastUpdated === 0) {
        console.warn('   ⚠️  Data Source: STALE (from config) - quotes may be inaccurate');
      } else {
        const age = now - poolState.lastUpdated;
        const dataSource = age < this.CACHE_TTL_MS ? 'cached' : 'fresh fetch';
        console.log(`   Data Source: ${dataSource} (age: ${age}ms)`);
      }
      
      // Use live pool state reserves instead of config values
      const reserveInBase = isForward ? poolState.reserveA : poolState.reserveB;
      const reserveOutBase = isForward ? poolState.reserveB : poolState.reserveA;
      
      console.log(`\n   Selected Reserves for ${isForward ? 'A→B' : 'B→A'} swap:`);
      console.log(`     Reserve In: ${reserveInBase.toString()}`);
      console.log(`     Reserve Out: ${reserveOutBase.toString()}`);

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
      
      const outputHumanReadable = Number(outputAmount) / Math.pow(10, outputToken.decimals);
      console.log(`\n   📈 Route Results:`);
      console.log(`     Output (base units): ${outputAmount.toString()}`);
      console.log(`     Output (human readable): ${outputHumanReadable.toFixed(6)} ${outputToken.symbol}`);
      console.log(`     Price Impact: ${priceImpact.toFixed(4)}%`);

      if (outputAmount > bestOutput || (outputAmount === bestOutput && priceImpact < bestPriceImpact)) {
        console.log(`     ✅ NEW BEST ROUTE!`);
        bestOutput = outputAmount;
        bestPriceImpact = priceImpact;
        bestRoute = {
          poolAddress: shard.poolAddress,
          shardNumber: shard.shardNumber,
          inputAmount: inputAmount,
          outputAmount: outputHumanReadable,
          price: Number(outputAmount) / Number(inputAmountBase)
        };
      } else {
        console.log(`     ❌ Not better than current best`);
      }
    }

    if (!bestRoute) {
      throw new Error('Unable to calculate route');
    }
    
    const quoteDuration = performance.now() - quoteStartTime;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Quote Calculation Complete`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Final Quote Summary:`);
    console.log(`   Best Shard: ${bestRoute.shardNumber}`);
    console.log(`   Input: ${inputAmount} ${inputTokenSymbol}`);
    console.log(`   Output: ${bestRoute.outputAmount.toFixed(6)} ${outputTokenSymbol}`);
    console.log(`   Price Impact: ${bestPriceImpact.toFixed(4)}%`);
    console.log(`   Fee: ${(inputAmount * 0.003).toFixed(6)} ${inputTokenSymbol} (0.3%)`);
    console.log(`   Total Duration: ${quoteDuration.toFixed(2)}ms`);
    console.log(`\n📈 Cache Performance:`);
    const stats = this.getCacheStats();
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Hit Rate: ${stats.hitRate}`);
    console.log(`   Total Fetches: ${stats.totalFetches}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
    // Store pool state data age for error logging
    let poolStateDataAge: string = 'unknown';
    
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

      // CRITICAL: Force fresh pool state fetch before swap to avoid stale data
      // Clear cache for this pool to ensure we get the latest reserves
      console.log('🔄 Forcing fresh pool state fetch for swap execution...');
      delete this.poolStateCache[pool.poolAddress];
      
      // Fetch fresh pool state
      const poolState = await this.getPoolState(pool);
      const now = Date.now();
      if (poolState.lastUpdated === 0) {
        poolStateDataAge = 'STALE (from config)';
      } else {
        const age = now - poolState.lastUpdated;
        poolStateDataAge = `${age}ms (FRESH - just fetched for swap)`;
      }

      // Recalculate the swap output with fresh reserves to ensure accuracy
      console.log('🔄 Recalculating swap output with fresh reserves...');
      const isForward = pool.tokenA === inputTokenConfig.mint;
      const inputAmountBase = BigInt(Math.floor(quote.inputAmount * Math.pow(10, inputTokenConfig.decimals)));
      const reserveInBase = isForward ? poolState.reserveA : poolState.reserveB;
      const reserveOutBase = isForward ? poolState.reserveB : poolState.reserveA;
      
      // Recalculate output with fresh reserves
      const freshOutputAmount = this.calculateSwapOutput(
        inputAmountBase,
        reserveInBase,
        reserveOutBase
      );
      
      const freshOutputHumanReadable = Number(freshOutputAmount) / Math.pow(10, outputTokenConfig.decimals);
      
      console.log(`📊 Fresh calculation results:`);
      console.log(`   Original quote output: ${quote.estimatedOutput.toFixed(6)} ${outputTokenConfig.symbol}`);
      console.log(`   Fresh output: ${freshOutputHumanReadable.toFixed(6)} ${outputTokenConfig.symbol}`);
      console.log(`   Difference: ${((freshOutputHumanReadable - quote.estimatedOutput) / quote.estimatedOutput * 100).toFixed(4)}%`);
      
      // Use the fresh output for minimum calculation
      const minOutput = freshOutputHumanReadable * (1 - slippageTolerance / 100);
      
      console.log(`\n🔄 Building Swap Transaction...`);
      console.log(`  Pool: ${pool.poolAddress}`);
      console.log(`  Shard: ${pool.shardNumber}`);
      console.log(`  Input: ${quote.inputAmount} ${inputTokenConfig.symbol}`);
      console.log(`  Original Quote Output: ${quote.estimatedOutput.toFixed(6)} ${outputTokenConfig.symbol}`);
      console.log(`  Fresh Calculated Output: ${freshOutputHumanReadable.toFixed(6)} ${outputTokenConfig.symbol}`);
      console.log(`  Min Output (${slippageTolerance}% slippage): ${minOutput.toFixed(6)} ${outputTokenConfig.symbol}`);
      console.log(`  Price Impact: ${quote.priceImpact.toFixed(2)}%`);
      console.log(`  Pool state data age: ${poolStateDataAge}`);

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
      
      // Log transaction simulation details
      console.log('📋 Transaction Simulation Details:');
      console.log(`   Input Amount (base units): ${amountIn.toString()}`);
      console.log(`   Minimum Output (base units): ${minimumAmountOut.toString()}`);
      console.log(`   Input Token Decimals: ${inputTokenConfig.decimals}`);
      console.log(`   Output Token Decimals: ${outputTokenConfig.decimals}`);
      
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
      // Enhanced error logging with comprehensive context
      console.error('❌ Swap execution error:', error);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('📊 Swap Context at Time of Failure:');
      console.error(`   Original Quote Output: ${quote.estimatedOutput.toFixed(6)} ${dexConfig.tokens.find(t => t.mint === quote.outputToken)?.symbol || 'tokens'}`);
      
      // Try to get fresh output if available
      const pool = dexConfig.pools.find(p => p.poolAddress === quote.route[0].poolAddress);
      const inputTokenConfig = dexConfig.tokens.find(t => t.mint === quote.inputToken);
      const outputTokenConfig = dexConfig.tokens.find(t => t.mint === quote.outputToken);
      
      if (pool && inputTokenConfig && outputTokenConfig) {
        try {
          const poolState = this.poolStateCache[pool.poolAddress]?.state;
          if (poolState) {
            const isForward = pool.tokenA === inputTokenConfig.mint;
            const inputAmountBase = BigInt(Math.floor(quote.inputAmount * Math.pow(10, inputTokenConfig.decimals)));
            const reserveInBase = isForward ? poolState.reserveA : poolState.reserveB;
            const reserveOutBase = isForward ? poolState.reserveB : poolState.reserveA;
            const freshOutput = this.calculateSwapOutput(inputAmountBase, reserveInBase, reserveOutBase);
            const freshOutputHuman = Number(freshOutput) / Math.pow(10, outputTokenConfig.decimals);
            console.error(`   Fresh Calculated Output: ${freshOutputHuman.toFixed(6)} ${outputTokenConfig.symbol}`);
          }
        } catch (e) {
          // Ignore calculation errors in error handler
        }
      }
      
      console.error(`   Minimum Output: ${(quote.estimatedOutput * (1 - slippageTolerance / 100)).toFixed(6)} ${dexConfig.tokens.find(t => t.mint === quote.outputToken)?.symbol || 'tokens'}`);
      console.error(`   Slippage Tolerance: ${slippageTolerance}%`);
      console.error(`   Pool State Data Age: ${poolStateDataAge}`);
      console.error(`   Price Impact: ${quote.priceImpact.toFixed(2)}%`);
      
      // Log base unit values for debugging (reuse variables from above)
      if (inputTokenConfig && outputTokenConfig) {
        const amountIn = BigInt(Math.floor(quote.inputAmount * Math.pow(10, inputTokenConfig.decimals)));
        const minimumAmountOut = BigInt(Math.floor(quote.estimatedOutput * (1 - slippageTolerance / 100) * Math.pow(10, outputTokenConfig.decimals)));
        console.error('📋 Base Unit Values:');
        console.error(`   Input Amount: ${amountIn.toString()} (${inputTokenConfig.decimals} decimals)`);
        console.error(`   Minimum Output: ${minimumAmountOut.toString()} (${outputTokenConfig.decimals} decimals)`);
      }
      
      console.error('🔍 Error Details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      
      // Log transaction simulation logs if available
      if (error instanceof Error && error.message.includes('simulation')) {
        console.error('⚠️  Transaction Simulation Failed');
        console.error('   This usually indicates:');
        console.error('   - Insufficient token balance');
        console.error('   - Slippage tolerance too low for current market conditions');
        console.error('   - Pool reserves changed significantly since quote was generated');
        console.error(`   - Pool state was ${poolStateDataAge}`);
      }
      
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
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
          throw new Error(`Transaction simulation failed. Pool state age: ${poolStateDataAge}. Please refresh the quote and try again with higher slippage tolerance.`);
        } else if (message.includes('slippage') || message.includes('minimum')) {
          throw new Error(`Slippage error: Expected ${quote.estimatedOutput.toFixed(6)}, minimum ${(quote.estimatedOutput * (1 - slippageTolerance / 100)).toFixed(6)}. Pool state: ${poolStateDataAge}. Try increasing slippage tolerance or refreshing the quote.`);
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
