/**
 * Sharded DEX Integration
 * 
 * This service provides smart routing across multiple pool shards for optimal pricing.
 * It integrates with the SAMM Router backend API for intelligent shard selection and
 * falls back to local calculation when the backend is unavailable.
 * 
 * Key Features:
 * - Backend-first routing with automatic fallback to local calculation
 * - Real-time pool state fetching with caching
 * - Performance metrics tracking
 * - Comprehensive error handling and logging
 * 
 * Routing Flow:
 * 1. Try backend API for optimal shard selection (primary)
 * 2. On failure, fall back to local calculation (secondary)
 * 3. Cache pool states to reduce RPC calls
 * 4. Track performance metrics for monitoring
 * 
 * @module shardedDex
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import dexConfig from '../config/dex-config.json';
import { SammRouterService } from '../services/sammRouterService';

/**
 * Configuration for a sharded liquidity pool
 */
export interface ShardedPool {
  /** Pool account address on Solana */
  poolAddress: string;
  /** Token A mint address */
  tokenA: string;
  /** Token B mint address */
  tokenB: string;
  /** Token A symbol (e.g., 'USDC') */
  tokenASymbol: string;
  /** Token B symbol (e.g., 'USDT') */
  tokenBSymbol: string;
  /** Initial liquidity for token A (human-readable) */
  liquidityA: string;
  /** Initial liquidity for token B (human-readable) */
  liquidityB: string;
  /** Shard number for this pool instance */
  shardNumber: number;
  /** Pool authority address */
  authority: string;
  /** LP token mint address */
  poolTokenMint: string;
  /** Fee collection account address */
  feeAccount: string;
  /** Token A account address (holds pool's token A) */
  tokenAccountA: string;
  /** Token B account address (holds pool's token B) */
  tokenAccountB: string;
  /** Deployment timestamp */
  deployedAt: string;
}

/**
 * Token configuration
 */
export interface TokenConfig {
  /** Token symbol (e.g., 'USDC') */
  symbol: string;
  /** Full token name */
  name: string;
  /** Token mint address on Solana */
  mint: string;
  /** Number of decimal places */
  decimals: number;
}

/**
 * Swap quote with routing information
 * 
 * Contains all information needed to execute a swap, including:
 * - Input/output amounts
 * - Price impact
 * - Selected route (pool shard)
 * - Routing method (backend or local)
 * - Backend selection reason (if applicable)
 */
export interface SwapQuote {
  /** Input token mint address */
  inputToken: string;
  /** Output token mint address */
  outputToken: string;
  /** Input amount (human-readable) */
  inputAmount: number;
  /** Estimated output amount (human-readable) */
  estimatedOutput: number;
  /** Price impact as percentage (e.g., 0.5 for 0.5%) */
  priceImpact: number;
  /** Route information (currently single-shard) */
  route: ShardRoute[];
  /** Total fee amount (human-readable) */
  totalFee: number;
  /** Routing method used to generate this quote */
  routingMethod: 'backend' | 'local';
  /** Explanation from backend API (only present for backend routing) */
  backendReason?: string;
}

/**
 * Route through a specific shard
 */
export interface ShardRoute {
  /** Pool address for this route segment */
  poolAddress: string;
  /** Shard number */
  shardNumber: number;
  /** Input amount for this segment */
  inputAmount: number;
  /** Output amount for this segment */
  outputAmount: number;
  /** Execution price for this segment */
  price: number;
}

/**
 * Real-time pool state fetched from on-chain data
 * 
 * Represents the current state of a liquidity pool, including:
 * - Token reserves (in base units)
 * - Fee configuration
 * - Last update timestamp
 */
export interface PoolState {
  /** Current reserve of token A in base units */
  reserveA: bigint;
  /** Current reserve of token B in base units */
  reserveB: bigint;
  /** Fee numerator (e.g., 3 for 0.3%) */
  feeNumerator: bigint;
  /** Fee denominator (e.g., 1000) */
  feeDenominator: bigint;
  /** Timestamp of fetch (0 indicates stale/config data) */
  lastUpdated: number;
}

/**
 * Cache for pool states to reduce RPC calls
 */
export interface PoolStateCache {
  [poolAddress: string]: {
    /** Cached pool state */
    state: PoolState;
    /** Expiration timestamp */
    expiresAt: number;
  };
}

/**
 * Performance metrics for monitoring routing behavior
 * 
 * Tracks:
 * - Backend API success/failure rates
 * - Response times
 * - Fallback frequency
 * - Overall quote generation performance
 */
interface PerformanceMetrics {
  /** Total backend API requests made */
  backendRequests: number;
  /** Successful backend API responses */
  backendSuccesses: number;
  /** Failed backend API requests */
  backendFailures: number;
  /** Number of times fallback to local routing was used */
  fallbackCount: number;
  /** Cumulative backend API response time in milliseconds */
  totalBackendResponseTime: number;
  /** Cumulative local calculation time in milliseconds */
  totalLocalCalculationTime: number;
  /** Cumulative total quote generation time in milliseconds */
  totalQuoteGenerationTime: number;
  /** Timestamp when metrics were last reset */
  lastResetTime: number;
}

/**
 * Service for interacting with the sharded DEX
 * 
 * This service provides:
 * - Smart routing across multiple pool shards
 * - Backend API integration with automatic fallback
 * - Pool state caching to reduce RPC calls
 * - Performance metrics tracking
 * - Swap execution with comprehensive error handling
 * 
 * @class ShardedDexService
 */
class ShardedDexService {
  private connection: Connection;
  private programId: PublicKey;
  private poolStateCache: PoolStateCache = {};
  private readonly CACHE_TTL_MS = 30000; // 30 seconds - longer cache to reduce RPC calls
  private sammRouter: SammRouterService;

  // Cache statistics for debugging
  private cacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalFetches: 0
  };

  // Performance metrics for monitoring
  private performanceMetrics: PerformanceMetrics = {
    backendRequests: 0,
    backendSuccesses: 0,
    backendFailures: 0,
    fallbackCount: 0,
    totalBackendResponseTime: 0,
    totalLocalCalculationTime: 0,
    totalQuoteGenerationTime: 0,
    lastResetTime: Date.now()
  };

  /**
   * Creates a new ShardedDexService instance
   * 
   * Initializes:
   * - Solana connection to configured RPC endpoint
   * - DEX program ID from configuration
   * - SAMM Router service for backend API calls
   */
  constructor() {
    this.connection = new Connection(dexConfig.rpcUrl, 'confirmed');
    this.programId = new PublicKey(dexConfig.programId);
    this.sammRouter = new SammRouterService();
  }

  /**
   * Get token mint address by symbol
   * @param symbol - Token symbol (e.g., 'USDC', 'SOL')
   * @returns Token mint address in base-58 format
   * @throws Error if token not found in configuration
   */
  private getTokenMintBySymbol(symbol: string): string {
    const token = dexConfig.tokens.find(t => t.symbol === symbol);
    if (!token) {
      throw new Error(`Token ${symbol} not found in configuration`);
    }
    return token.mint;
  }

  /**
   * Get current connected wallet address
   * @param walletAdapter - Wallet adapter instance
   * @returns Wallet address in base-58 format
   * @throws Error if wallet not connected
   */
  private getWalletAddress(walletAdapter: any): string {
    if (!walletAdapter?.publicKey) {
      throw new Error('Wallet not connected');
    }
    return walletAdapter.publicKey.toBase58();
  }

  /**
   * Get cache statistics for debugging
   * 
   * Returns cache hit/miss statistics and calculated hit rate.
   * Useful for monitoring cache effectiveness and optimizing TTL.
   * 
   * @returns Cache statistics including hits, misses, errors, and hit rate
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
   * 
   * Clears all cache statistics counters. Useful for testing or
   * starting fresh monitoring periods.
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
   * Get performance metrics for monitoring
   * 
   * Returns comprehensive performance metrics including:
   * - Backend API success rate and response times
   * - Local calculation times
   * - Fallback frequency
   * - Overall quote generation performance
   * 
   * @returns Performance metrics with calculated averages and rates
   */
  getPerformanceMetrics() {
    const sessionDuration = Date.now() - this.performanceMetrics.lastResetTime;
    const backendSuccessRate = this.performanceMetrics.backendRequests > 0
      ? (this.performanceMetrics.backendSuccesses / this.performanceMetrics.backendRequests * 100).toFixed(2)
      : '0.00';
    const avgBackendResponseTime = this.performanceMetrics.backendSuccesses > 0
      ? (this.performanceMetrics.totalBackendResponseTime / this.performanceMetrics.backendSuccesses).toFixed(2)
      : '0.00';
    const avgLocalCalculationTime = this.performanceMetrics.fallbackCount > 0
      ? (this.performanceMetrics.totalLocalCalculationTime / this.performanceMetrics.fallbackCount).toFixed(2)
      : '0.00';
    const totalQuotes = this.performanceMetrics.backendSuccesses + this.performanceMetrics.fallbackCount;
    const avgQuoteGenerationTime = totalQuotes > 0
      ? (this.performanceMetrics.totalQuoteGenerationTime / totalQuotes).toFixed(2)
      : '0.00';

    return {
      ...this.performanceMetrics,
      backendSuccessRate: `${backendSuccessRate}%`,
      avgBackendResponseTime: `${avgBackendResponseTime}ms`,
      avgLocalCalculationTime: `${avgLocalCalculationTime}ms`,
      avgQuoteGenerationTime: `${avgQuoteGenerationTime}ms`,
      sessionDuration: `${(sessionDuration / 1000).toFixed(2)}s`,
      totalQuotes
    };
  }

  /**
   * Reset performance metrics
   * 
   * Clears all performance metrics and resets the session start time.
   * Useful for starting fresh monitoring periods or testing.
   */
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      backendRequests: 0,
      backendSuccesses: 0,
      backendFailures: 0,
      fallbackCount: 0,
      totalBackendResponseTime: 0,
      totalLocalCalculationTime: 0,
      totalQuoteGenerationTime: 0,
      lastResetTime: Date.now()
    };
    console.log('[ShardedDexService] Performance metrics reset');
  }

  /**
   * Log performance metrics summary
   * 
   * Outputs a formatted summary of performance metrics to the console.
   * Includes backend routing statistics, local routing statistics,
   * and overall performance metrics.
   */
  logPerformanceMetrics() {
    const metrics = this.getPerformanceMetrics();
    console.log('\n📊 Performance Metrics Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Session Duration: ${metrics.sessionDuration}`);
    console.log(`Total Quotes Generated: ${metrics.totalQuotes}`);
    console.log('\nBackend Routing:');
    console.log(`  Requests: ${metrics.backendRequests}`);
    console.log(`  Successes: ${metrics.backendSuccesses}`);
    console.log(`  Failures: ${metrics.backendFailures}`);
    console.log(`  Success Rate: ${metrics.backendSuccessRate}`);
    console.log(`  Avg Response Time: ${metrics.avgBackendResponseTime}`);
    console.log('\nLocal Routing:');
    console.log(`  Fallback Count: ${metrics.fallbackCount}`);
    console.log(`  Avg Calculation Time: ${metrics.avgLocalCalculationTime}`);
    console.log('\nOverall:');
    console.log(`  Avg Quote Generation Time: ${metrics.avgQuoteGenerationTime}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Fetch current pool state from on-chain token accounts
   * 
   * Fetches real-time reserve balances directly from the pool's token accounts.
   * This provides the most accurate data for swap calculations.
   * 
   * @param pool - Pool configuration
   * @returns Promise resolving to current pool state
   * @throws Error if RPC call fails or accounts are invalid
   * @private
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
   * 
   * Uses static liquidity values from configuration when on-chain fetch fails.
   * Returns PoolState with lastUpdated = 0 to indicate stale data.
   * 
   * WARNING: This data may be outdated and cause slippage errors.
   * 
   * @param pool - Pool configuration
   * @returns Pool state with stale data from configuration
   * @private
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
   * 
   * Implements a caching layer to reduce RPC calls:
   * 1. Check cache for unexpired entry
   * 2. Return cached state if valid
   * 3. Fetch fresh state from on-chain if cache miss or expired
   * 4. Update cache with fresh state
   * 5. Fall back to config values if fetch fails
   * 
   * @param pool - Pool configuration
   * @returns Promise resolving to pool state (cached or fresh)
   * @private
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
   * 
   * @returns Array of token configurations
   */
  getTokens(): TokenConfig[] {
    return dexConfig.tokens;
  }

  /**
   * Get all pools for a specific trading pair
   * 
   * @param tokenA - Token A mint address
   * @param tokenB - Token B mint address
   * @returns Array of pools for the pair, sorted by shard number
   */
  getPoolsForPair(tokenA: string, tokenB: string): ShardedPool[] {
    return dexConfig.pools.filter(pool =>
      (pool.tokenA === tokenA && pool.tokenB === tokenB) ||
      (pool.tokenA === tokenB && pool.tokenB === tokenA)
    ).sort((a, b) => a.shardNumber - b.shardNumber);
  }

  /**
   * Get all shards for a trading pair by symbols
   * 
   * @param symbolA - Token A symbol (e.g., 'USDC')
   * @param symbolB - Token B symbol (e.g., 'USDT')
   * @returns Array of pools for the pair, sorted by shard number
   */
  getShardsBySymbol(symbolA: string, symbolB: string): ShardedPool[] {
    return dexConfig.pools.filter(pool =>
      (pool.tokenASymbol === symbolA && pool.tokenBSymbol === symbolB) ||
      (pool.tokenASymbol === symbolB && pool.tokenBSymbol === symbolA)
    ).sort((a, b) => a.shardNumber - b.shardNumber);
  }

  /**
   * Calculate constant product AMM price
   * 
   * Calculates the spot price using the constant product formula.
   * Price = reserveOut / reserveIn
   * 
   * @param reserveIn - Input token reserve in base units
   * @param reserveOut - Output token reserve in base units
   * @returns Spot price as a decimal number
   * @private
   */
  private calculateAmmPrice(reserveIn: bigint, reserveOut: bigint): number {
    return Number(reserveOut) / Number(reserveIn);
  }

  /**
   * Calculate output amount using x*y=k formula with 0.3% fee
   * 
   * Implements the constant product AMM formula with fee:
   * amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
   * 
   * The 997/1000 factor represents a 0.3% fee (3/1000).
   * 
   * @param amountIn - Input amount in base units
   * @param reserveIn - Input token reserve in base units
   * @param reserveOut - Output token reserve in base units
   * @returns Output amount in base units
   * @private
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
   * 
   * Compares the execution price to the spot price to determine
   * how much the trade affects the pool's price.
   * 
   * Formula: |((amountOut/amountIn) - (reserveOut/reserveIn)) / (reserveOut/reserveIn)| * 100
   * 
   * @param amountIn - Input amount in base units
   * @param amountOut - Output amount in base units
   * @param reserveIn - Input token reserve in base units
   * @param reserveOut - Output token reserve in base units
   * @returns Price impact as percentage (e.g., 0.5 for 0.5%)
   * @private
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
   * Get quote from backend API routing service
   * 
   * Calls the SAMM Router backend API to get the optimal shard selection
   * based on real-time pool analysis. The backend considers:
   * - Current pool reserves across all shards
   * - Liquidity depth
   * - Price impact
   * - Historical performance
   * 
   * Request Format:
   * - Converts token symbols to mint addresses
   * - Converts input amount to base units
   * - Determines token order (A vs B)
   * - Includes trader wallet address
   * 
   * Response Processing:
   * - Validates backend response
   * - Checks that recommended pool exists in local config
   * - Converts amounts from base units to human-readable
   * - Builds SwapQuote with routing method 'backend'
   * 
   * @param inputTokenSymbol - Input token symbol (e.g., 'USDC')
   * @param outputTokenSymbol - Output token symbol (e.g., 'USDT')
   * @param inputAmount - Input amount (human-readable)
   * @param walletAdapter - Optional wallet adapter for trader address
   * @returns Promise resolving to swap quote with backend routing
   * @throws Error if backend API fails or returns invalid data
   * @private
   */
  private async getQuoteFromBackend(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number,
    walletAdapter?: any
  ): Promise<SwapQuote> {
    const timestamp = new Date().toISOString();
    const backendStartTime = performance.now();

    // Track backend request
    this.performanceMetrics.backendRequests++;

    console.log(`\n🌐 Backend Routing Request`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Input: ${inputAmount} ${inputTokenSymbol} → ${outputTokenSymbol}`);

    // Get token mint addresses
    const inputTokenMint = this.getTokenMintBySymbol(inputTokenSymbol);
    const outputTokenMint = this.getTokenMintBySymbol(outputTokenSymbol);

    // Get token configs for decimals
    const inputToken = dexConfig.tokens.find(t => t.symbol === inputTokenSymbol);
    const outputToken = dexConfig.tokens.find(t => t.symbol === outputTokenSymbol);

    if (!inputToken || !outputToken) {
      throw new Error('Token configuration not found');
    }

    console.log(`   Input Token: ${inputTokenSymbol} (${inputTokenMint})`);
    console.log(`   Output Token: ${outputTokenSymbol} (${outputTokenMint})`);

    // Determine token order (tokenA vs tokenB)
    // We need to check which token comes first in the pool configuration
    const pools = this.getShardsBySymbol(inputTokenSymbol, outputTokenSymbol);
    if (pools.length === 0) {
      throw new Error(`No pools found for ${inputTokenSymbol}/${outputTokenSymbol}`);
    }

    const firstPool = pools[0];
    const tokenAMint = firstPool.tokenA;
    const tokenBMint = firstPool.tokenB;

    // Determine which token is the input token
    const isInputTokenA = inputTokenMint === tokenAMint;
    const inputTokenField = isInputTokenA ? tokenAMint : tokenBMint;

    console.log(`   Token A: ${tokenAMint} (${firstPool.tokenASymbol})`);
    console.log(`   Token B: ${tokenBMint} (${firstPool.tokenBSymbol})`);
    console.log(`   Input is Token ${isInputTokenA ? 'A' : 'B'}`);

    // Convert input amount to base units
    const inputAmountBase = BigInt(Math.floor(inputAmount * Math.pow(10, inputToken.decimals)));
    console.log(`   Input Amount (base units): ${inputAmountBase.toString()}`);

    // Get trader wallet address (use a placeholder if not provided)
    let traderAddress: string;
    try {
      traderAddress = walletAdapter ? this.getWalletAddress(walletAdapter) : 'HzkaW8LY5uDaDpSvEscSEcrTnngSgwAvsQZzVzCk6TvX';
      console.log(`   Trader Address: ${traderAddress}`);
    } catch (error) {
      // If wallet not connected, use placeholder address
      traderAddress = 'HzkaW8LY5uDaDpSvEscSEcrTnngSgwAvsQZzVzCk6TvX';
      console.log(`   Trader Address (placeholder): ${traderAddress}`);
    }

    // Build route request
    const routeRequest = {
      tokenA: tokenAMint,
      tokenB: tokenBMint,
      inputToken: inputTokenField,
      inputAmount: inputAmountBase.toString(),
      trader: traderAddress
    };

    console.log(`   Route Request:`, routeRequest);

    // Call backend API and measure response time
    const apiStartTime = performance.now();
    const response = await this.sammRouter.getRoute(routeRequest);
    const apiResponseTime = performance.now() - apiStartTime;

    // Track backend API response time
    this.performanceMetrics.totalBackendResponseTime += apiResponseTime;

    // Log backend API response time
    console.log(`   Backend API Response Time: ${apiResponseTime.toFixed(2)}ms`);

    // Validate response
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Backend API returned unsuccessful response');
    }

    const { shard, expectedOutput, priceImpact, reason } = response.data;

    // Log selected shard and reason
    console.log(`   Selected Shard Address: ${shard.address}`);
    console.log(`   Shard ID: ${shard.id}`);
    console.log(`   Expected Output (base units): ${expectedOutput}`);
    console.log(`   Price Impact (decimal): ${priceImpact}`);
    console.log(`   Selection Reason: ${reason}`);

    // Validate that shard exists in local configuration
    const localPool = dexConfig.pools.find(p => p.poolAddress === shard.address);
    if (!localPool) {
      throw new Error(`Backend recommended pool ${shard.address} not found in local configuration`);
    }

    console.log(`   ✅ Pool validated in local config (Shard ${localPool.shardNumber})`);

    // Convert expected output from base units to human-readable format
    const expectedOutputHuman = Number(expectedOutput) / Math.pow(10, outputToken.decimals);

    // Convert price impact from decimal to percentage
    const priceImpactPercent = priceImpact * 100;

    console.log(`   Expected Output (human readable): ${expectedOutputHuman.toFixed(6)} ${outputToken.symbol}`);
    console.log(`   Price Impact: ${priceImpactPercent.toFixed(4)}%`);

    // Calculate total fee
    const totalFee = inputAmount * 0.003;

    // Build SwapQuote object
    const quote: SwapQuote = {
      inputToken: inputTokenMint,
      outputToken: outputTokenMint,
      inputAmount,
      estimatedOutput: expectedOutputHuman,
      priceImpact: priceImpactPercent,
      route: [{
        poolAddress: shard.address,
        shardNumber: localPool.shardNumber,
        inputAmount: inputAmount,
        outputAmount: expectedOutputHuman,
        price: expectedOutputHuman / inputAmount
      }],
      totalFee,
      routingMethod: 'backend',
      backendReason: reason
    };

    // Track successful backend routing
    this.performanceMetrics.backendSuccesses++;
    const totalBackendTime = performance.now() - backendStartTime;

    // Log successful backend routing
    console.log(`✅ Backend Routing Successful`);
    console.log(`   Shard Number: ${localPool.shardNumber}`);
    console.log(`   Output: ${expectedOutputHuman.toFixed(6)} ${outputToken.symbol}`);
    console.log(`   Price Impact: ${priceImpactPercent.toFixed(4)}%`);
    console.log(`   Fee: ${totalFee.toFixed(6)} ${inputToken.symbol}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Total Backend Time: ${totalBackendTime.toFixed(2)}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return quote;
  }

  /**
   * Get optimal quote across all shards using smart routing
   * 
   * Implements a backend-first routing strategy with automatic fallback:
   * 
   * 1. **Primary**: Try backend API routing
   *    - Calls SAMM Router API for optimal shard selection
   *    - Uses real-time pool analysis
   *    - Returns quote with routing method 'backend'
   * 
   * 2. **Fallback**: Use local calculation on error
   *    - Triggered by network errors, timeouts, or API failures
   *    - Calculates locally using cached/fresh pool states
   *    - Returns quote with routing method 'local'
   *    - Logs comprehensive error details for debugging
   * 
   * Error Handling:
   * - Categorizes errors (network, timeout, API, validation)
   * - Logs fallback events with full context
   * - Tracks performance metrics
   * - Ensures user always gets a quote
   * 
   * Performance Tracking:
   * - Measures backend API response time
   * - Measures local calculation time
   * - Tracks success/failure rates
   * - Logs metrics periodically
   * 
   * @param inputTokenSymbol - Input token symbol (e.g., 'USDC')
   * @param outputTokenSymbol - Output token symbol (e.g., 'USDT')
   * @param inputAmount - Input amount (human-readable)
   * @param walletAdapter - Optional wallet adapter for trader address
   * @returns Promise resolving to swap quote (backend or local)
   */
  async getQuote(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number,
    walletAdapter?: any
  ): Promise<SwapQuote> {
    const quoteStartTime = performance.now();

    // Try backend routing first
    try {
      console.log(`\n🎯 Attempting backend routing...`);
      const backendQuote = await this.getQuoteFromBackend(
        inputTokenSymbol,
        outputTokenSymbol,
        inputAmount,
        walletAdapter
      );

      // Track total quote generation time
      const totalQuoteTime = performance.now() - quoteStartTime;
      this.performanceMetrics.totalQuoteGenerationTime += totalQuoteTime;

      console.log(`✅ Backend routing successful`);
      console.log(`   Total Quote Generation Time: ${totalQuoteTime.toFixed(2)}ms\n`);

      // Log metrics periodically (every 10 quotes)
      if ((this.performanceMetrics.backendSuccesses + this.performanceMetrics.fallbackCount) % 10 === 0) {
        this.logPerformanceMetrics();
      }

      return backendQuote;
    } catch (error) {
      // Track backend failure
      this.performanceMetrics.backendFailures++;

      // Determine error type for categorization
      const errorMessage = error instanceof Error ? error.message : String(error);
      let errorType = 'unknown';

      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorType = 'network-timeout';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
        errorType = 'network';
      } else if (errorMessage.includes('HTTP') || errorMessage.includes('API')) {
        errorType = 'API';
      } else if (errorMessage.includes('not found') || errorMessage.includes('validation')) {
        errorType = 'validation';
      }

      // Log fallback event with comprehensive error details
      console.warn(`\n⚠️  Backend Routing Failed - Falling Back to Local Calculation`);
      console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.warn(`📊 Fallback Event Details:`);
      console.warn(`   Timestamp: ${new Date().toISOString()}`);
      console.warn(`   Error Type: ${errorType}`);
      console.warn(`   Error Message: ${errorMessage}`);
      console.warn(`   Input Token: ${inputTokenSymbol}`);
      console.warn(`   Output Token: ${outputTokenSymbol}`);
      console.warn(`   Input Amount: ${inputAmount}`);
      if (error instanceof Error && error.stack) {
        console.warn(`   Stack Trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Fall back to local routing
      const localQuote = await this.getQuoteLocal(inputTokenSymbol, outputTokenSymbol, inputAmount);

      // Track total quote generation time including fallback
      const totalQuoteTime = performance.now() - quoteStartTime;
      this.performanceMetrics.totalQuoteGenerationTime += totalQuoteTime;

      console.log(`   Total Quote Generation Time (with fallback): ${totalQuoteTime.toFixed(2)}ms\n`);

      // Log metrics periodically (every 10 quotes)
      if ((this.performanceMetrics.backendSuccesses + this.performanceMetrics.fallbackCount) % 10 === 0) {
        this.logPerformanceMetrics();
      }

      return localQuote;
    }
  }

  /**
   * Get optimal quote across all shards using local calculation
   * 
   * Calculates swap quotes locally without backend API:
   * 
   * Process:
   * 1. Find all shards for the token pair
   * 2. Fetch/retrieve pool states (with caching)
   * 3. Calculate output for each shard using AMM formula
   * 4. Calculate price impact for each route
   * 5. Select shard with best output and lowest price impact
   * 
   * Features:
   * - Uses real-time on-chain data when available
   * - Falls back to config data if RPC fails
   * - Implements caching to reduce RPC calls
   * - Comprehensive logging for debugging
   * - Tracks performance metrics
   * 
   * @param inputTokenSymbol - Input token symbol (e.g., 'USDC')
   * @param outputTokenSymbol - Output token symbol (e.g., 'USDT')
   * @param inputAmount - Input amount (human-readable)
   * @returns Promise resolving to swap quote with local routing
   * @throws Error if no pools found or calculation fails
   * @private
   */
  private async getQuoteLocal(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number
  ): Promise<SwapQuote> {
    const localCalcStartTime = performance.now();

    // Track fallback usage
    this.performanceMetrics.fallbackCount++;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔄 Getting LOCAL quote for ${inputAmount} ${inputTokenSymbol} → ${outputTokenSymbol}`);
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

    // Track local calculation time
    const localCalcDuration = performance.now() - localCalcStartTime;
    this.performanceMetrics.totalLocalCalculationTime += localCalcDuration;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Quote Calculation Complete`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Final Quote Summary:`);
    console.log(`   Best Shard: ${bestRoute.shardNumber}`);
    console.log(`   Input: ${inputAmount} ${inputTokenSymbol}`);
    console.log(`   Output: ${bestRoute.outputAmount.toFixed(6)} ${outputTokenSymbol}`);
    console.log(`   Price Impact: ${bestPriceImpact.toFixed(4)}%`);
    console.log(`   Fee: ${(inputAmount * 0.003).toFixed(6)} ${inputTokenSymbol} (0.3%)`);
    console.log(`   Local Calculation Time: ${localCalcDuration.toFixed(2)}ms`);
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
      totalFee: inputAmount * 0.003, // 0.3% fee
      routingMethod: 'local',
      backendReason: undefined
    };
  }

  /**
   * Execute swap on the sharded DEX
   * 
   * Executes a swap transaction using the provided quote:
   * 
   * Process:
   * 1. Validate pool exists in configuration
   * 2. Force fresh pool state fetch (clears cache)
   * 3. Recalculate output with fresh reserves
   * 4. Calculate minimum output with slippage tolerance
   * 5. Build swap transaction instruction
   * 6. Sign transaction with wallet
   * 7. Send and confirm transaction
   * 
   * Safety Features:
   * - Fresh pool state to avoid stale data
   * - Slippage protection with minimum output
   * - Comprehensive error handling
   * - Detailed logging for debugging
   * 
   * Error Handling:
   * - User rejection
   * - Insufficient funds
   * - Token account errors
   * - Slippage errors
   * - Transaction simulation failures
   * 
   * @param walletAdapter - Wallet adapter with signTransaction method
   * @param quote - Swap quote from getQuote()
   * @param slippageTolerance - Slippage tolerance percentage (default: 0.5%)
   * @returns Promise resolving to transaction signature
   * @throws Error if validation fails, transaction fails, or user rejects
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

      // Get pool information with enhanced validation
      const requestedPoolAddress = quote.route[0].poolAddress;
      const pool = dexConfig.pools.find(p => p.poolAddress === requestedPoolAddress);

      if (!pool) {
        // Log detailed information for debugging
        console.error('❌ Pool Validation Failed');
        console.error(`   Requested Pool Address: ${requestedPoolAddress}`);
        console.error(`   Available Pools (${dexConfig.pools.length}):`);
        dexConfig.pools.forEach((p, idx) => {
          console.error(`     ${idx + 1}. ${p.poolAddress} (${p.tokenASymbol}/${p.tokenBSymbol} - Shard ${p.shardNumber})`);
        });
        console.error(`   Routing Method: ${quote.routingMethod}`);
        if (quote.backendReason) {
          console.error(`   Backend Reason: ${quote.backendReason}`);
        }
        throw new Error('Selected pool not found in configuration');
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
   * 
   * TODO: Implement actual on-chain data fetching and calculations
   * 
   * @param poolAddress - Pool address to get statistics for
   * @returns Promise resolving to pool statistics
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
   * 
   * @returns Array of trading pairs with shard counts
   */
  getTradingPairs(): Array<{ pair: string; shards: number }> {
    return dexConfig.summary.pairs;
  }

  /**
   * Get program ID
   * 
   * @returns DEX program ID as PublicKey
   */
  getProgramId(): PublicKey {
    return this.programId;
  }

  /**
   * Get connection
   * 
   * @returns Solana connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
}

// Export singleton instance
export const shardedDex = new ShardedDexService();
export default shardedDex;
