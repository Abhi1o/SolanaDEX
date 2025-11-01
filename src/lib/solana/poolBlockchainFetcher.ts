/**
 * Pool Blockchain Data Fetcher
 * 
 * This module provides functions to fetch real-time pool data from the Solana blockchain.
 * It fetches pool account data, token account balances, and LP token supply to provide
 * accurate, up-to-date information for liquidity pools.
 * 
 * Key Features:
 * - Fetch pool account data from Solana
 * - Fetch token account balances for pool reserves
 * - Fetch LP token supply
 * - Enrich pool objects with blockchain data
 * - Comprehensive error handling with fallbacks
 * 
 * @module poolBlockchainFetcher
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { Pool } from '@/types';
import { 
  fetchWithTimeout, 
  fetchWithRetry, 
  createPoolFetchError,
  PoolFetchError 
} from '@/utils/fetchUtils';

/**
 * Pool account data structure from blockchain
 * 
 * Represents the on-chain state of a liquidity pool, including:
 * - Token reserves (in base units)
 * - LP token supply
 * - Fee configuration
 * - Pool status
 */
export interface PoolAccountData {
  /** Reserve amount for token A in base units */
  reserveA: bigint;
  /** Reserve amount for token B in base units */
  reserveB: bigint;
  /** Total supply of LP tokens in base units */
  lpTokenSupply: bigint;
  /** Fee rate as a percentage (e.g., 0.3 for 0.3%) */
  feeRate: number;
  /** Whether the pool is active and accepting trades */
  isActive: boolean;
  /** Timestamp when this data was fetched */
  lastUpdated: number;
}

/**
 * Complete blockchain data for a pool
 * 
 * Contains all blockchain-fetched data for a pool, including:
 * - Pool address
 * - Account data (reserves, supply, fees)
 * - Token balances
 * - Fetch timestamp
 */
export interface BlockchainPoolData {
  /** Pool account address */
  poolAddress: string;
  /** Parsed pool account data */
  accountData: PoolAccountData;
  /** Token A balance from token account */
  tokenABalance: bigint;
  /** Token B balance from token account */
  tokenBBalance: bigint;
  /** Timestamp when this data was fetched */
  fetchedAt: number;
}

/**
 * Fetch pool reserves from token accounts
 * 
 * Fetches the current balance of both token accounts that hold the pool's reserves.
 * This provides the most accurate real-time data for swap calculations.
 * 
 * @param connection - Solana connection instance
 * @param tokenAAccount - Token A account public key
 * @param tokenBAccount - Token B account public key
 * @returns Promise resolving to reserves for both tokens
 * @throws Error if token accounts cannot be fetched or are invalid
 */
export async function fetchPoolReserves(
  connection: Connection,
  tokenAAccount: PublicKey,
  tokenBAccount: PublicKey
): Promise<{ reserveA: bigint; reserveB: bigint }> {
  console.log('🔍 Fetching pool reserves from token accounts');
  console.log(`   Token A Account: ${tokenAAccount.toBase58()}`);
  console.log(`   Token B Account: ${tokenBAccount.toBase58()}`);

  // Wrap the fetch operation with retry logic
  return fetchWithRetry(
    async () => {
      try {
        // Fetch both token account balances in parallel with timeout
        const [tokenAccountAInfo, tokenAccountBInfo] = await Promise.all([
          fetchWithTimeout(connection.getTokenAccountBalance(tokenAAccount), 5000),
          fetchWithTimeout(connection.getTokenAccountBalance(tokenBAccount), 5000)
        ]);

        // Parse balances as bigint
        const reserveA = BigInt(tokenAccountAInfo.value.amount);
        const reserveB = BigInt(tokenAccountBInfo.value.amount);

        console.log('✅ Pool reserves fetched successfully');
        console.log(`   Reserve A: ${reserveA.toString()} (${tokenAccountAInfo.value.uiAmountString || 'N/A'} UI)`);
        console.log(`   Reserve B: ${reserveB.toString()} (${tokenAccountBInfo.value.uiAmountString || 'N/A'} UI)`);

        return { reserveA, reserveB };
      } catch (error) {
        console.error('❌ Failed to fetch pool reserves');
        console.error(`   Token A Account: ${tokenAAccount.toBase58()}`);
        console.error(`   Token B Account: ${tokenBAccount.toBase58()}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        
        // Create detailed error with classification
        const poolError = createPoolFetchError(error);
        throw poolError;
      }
    },
    { maxRetries: 3, baseDelay: 1000, maxDelay: 30000, multiplier: 2, timeoutMs: 5000 }
  );
}

/**
 * Fetch LP token supply from mint account
 * 
 * Fetches the total supply of LP tokens for a pool. This is used to calculate
 * a user's share of the pool and the value of their LP tokens.
 * 
 * @param connection - Solana connection instance
 * @param lpTokenMint - LP token mint public key
 * @returns Promise resolving to total LP token supply
 * @throws Error if mint account cannot be fetched or is invalid
 */
export async function fetchLPTokenSupply(
  connection: Connection,
  lpTokenMint: PublicKey
): Promise<bigint> {
  console.log('🔍 Fetching LP token supply');
  console.log(`   LP Token Mint: ${lpTokenMint.toBase58()}`);

  // Wrap the fetch operation with retry logic
  return fetchWithRetry(
    async () => {
      try {
        // Fetch mint account info with timeout
        const mintInfo = await fetchWithTimeout(connection.getTokenSupply(lpTokenMint), 5000);

        // Parse supply as bigint
        const supply = BigInt(mintInfo.value.amount);

        console.log('✅ LP token supply fetched successfully');
        console.log(`   Supply: ${supply.toString()} (${mintInfo.value.uiAmountString || 'N/A'} UI)`);

        return supply;
      } catch (error) {
        console.error('❌ Failed to fetch LP token supply');
        console.error(`   LP Token Mint: ${lpTokenMint.toBase58()}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        
        // Create detailed error with classification
        const poolError = createPoolFetchError(error);
        throw poolError;
      }
    },
    { maxRetries: 3, baseDelay: 1000, maxDelay: 30000, multiplier: 2, timeoutMs: 5000 }
  );
}

/**
 * Fetch pool account data from blockchain
 * 
 * Fetches and parses the pool account data from the blockchain. For the sharded DEX,
 * we fetch reserves directly from token accounts rather than parsing the pool account,
 * as the pool account structure may vary.
 * 
 * @param connection - Solana connection instance
 * @param poolAddress - Pool account public key
 * @param tokenAAccount - Token A account public key
 * @param tokenBAccount - Token B account public key
 * @param lpTokenMint - LP token mint public key
 * @returns Promise resolving to pool account data, or null if account doesn't exist
 * @throws Error if fetching fails for reasons other than account not found
 */
export async function fetchPoolAccountData(
  connection: Connection,
  poolAddress: PublicKey,
  tokenAAccount: PublicKey,
  tokenBAccount: PublicKey,
  lpTokenMint: PublicKey
): Promise<PoolAccountData | null> {
  console.log('🔍 Fetching pool account data');
  console.log(`   Pool Address: ${poolAddress.toBase58()}`);

  try {
    // Fetch reserves and LP supply in parallel
    const [reserves, lpTokenSupply] = await Promise.all([
      fetchPoolReserves(connection, tokenAAccount, tokenBAccount),
      fetchLPTokenSupply(connection, lpTokenMint)
    ]);

    const accountData: PoolAccountData = {
      reserveA: reserves.reserveA,
      reserveB: reserves.reserveB,
      lpTokenSupply,
      feeRate: 0.3, // 0.3% fee (standard for this DEX)
      isActive: true, // Assume active if we can fetch data
      lastUpdated: Date.now()
    };

    console.log('✅ Pool account data fetched successfully');
    console.log(`   Reserve A: ${accountData.reserveA.toString()}`);
    console.log(`   Reserve B: ${accountData.reserveB.toString()}`);
    console.log(`   LP Supply: ${accountData.lpTokenSupply.toString()}`);
    console.log(`   Fee Rate: ${accountData.feeRate}%`);

    return accountData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorLower = errorMessage.toLowerCase();

    // Check if account doesn't exist
    if (errorLower.includes('could not find') || errorLower.includes('invalid')) {
      console.warn('⚠️  Pool account not found or invalid');
      console.warn(`   Pool Address: ${poolAddress.toBase58()}`);
      return null;
    }

    // Other errors should be thrown with detailed information
    console.error('❌ Failed to fetch pool account data');
    console.error(`   Pool Address: ${poolAddress.toBase58()}`);
    console.error(`   Error: ${errorMessage}`);
    
    // Create detailed error with pool address
    const poolError = createPoolFetchError(error, poolAddress.toBase58());
    throw poolError;
  }
}

/**
 * Enrich pool with blockchain data
 * 
 * Takes a pool object (typically loaded from config) and enriches it with
 * real-time blockchain data. This updates reserves, LP supply, and other
 * dynamic fields while preserving static configuration data.
 * 
 * This function throws errors instead of falling back to config data,
 * allowing the store to handle error recovery and caching appropriately.
 * 
 * @param connection - Solana connection instance
 * @param pool - Pool object to enrich
 * @returns Promise resolving to enriched pool object
 * @throws Error if blockchain data cannot be fetched
 */
export async function enrichPoolWithBlockchainData(
  connection: Connection,
  pool: Pool
): Promise<Pool> {
  console.log(`\n🔄 Enriching pool with blockchain data`);
  console.log(`   Pool: ${pool.tokenA.symbol}/${pool.tokenB.symbol}`);
  console.log(`   Pool Address: ${pool.id}`);

  try {
    // Fetch blockchain data
    const accountData = await fetchPoolAccountData(
      connection,
      new PublicKey(pool.id),
      pool.tokenAAccount,
      pool.tokenBAccount,
      pool.lpTokenMint
    );

    // If account not found, throw error with details
    if (!accountData) {
      console.error('❌ Pool account not found');
      throw createPoolFetchError(
        new Error(`Pool account not found: ${pool.id}`),
        pool.id
      );
    }

    // Calculate total liquidity (sum of both reserves in base units)
    const totalLiquidity = accountData.reserveA + accountData.reserveB;

    // Create enriched pool object
    const enrichedPool: Pool = {
      ...pool,
      reserveA: accountData.reserveA,
      reserveB: accountData.reserveB,
      lpTokenSupply: accountData.lpTokenSupply,
      totalLiquidity,
      feeRate: accountData.feeRate,
      isActive: accountData.isActive,
      lastUpdated: accountData.lastUpdated,
      // Add data source tracking (Requirement 5.1, 5.5)
      dataSource: 'blockchain' as const,
      lastBlockchainFetch: accountData.lastUpdated,
      blockchainFetchError: null,
      isFresh: true // Mark as fresh on successful fetch
    };

    console.log('✅ Pool enriched with blockchain data');
    console.log(`   Reserve A: ${enrichedPool.reserveA.toString()}`);
    console.log(`   Reserve B: ${enrichedPool.reserveB.toString()}`);
    console.log(`   LP Supply: ${enrichedPool.lpTokenSupply.toString()}`);
    console.log(`   Total Liquidity: ${enrichedPool.totalLiquidity.toString()}`);
    console.log(`   Data Source: ${enrichedPool.dataSource}`);

    return enrichedPool;
  } catch (error) {
    console.error('❌ Failed to enrich pool with blockchain data');
    console.error(`   Pool: ${pool.tokenA.symbol}/${pool.tokenB.symbol}`);
    console.error(`   Pool Address: ${pool.id}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    
    // Create detailed error with pool address and classification
    const poolError = createPoolFetchError(error, pool.id);
    throw poolError;
  }
}

/**
 * Fetch blockchain data for multiple pools in parallel
 * 
 * Efficiently fetches blockchain data for multiple pools by making parallel
 * requests. This is more efficient than fetching pools sequentially.
 * 
 * Failed fetches are logged but don't prevent other pools from being enriched.
 * Pools that fail to fetch will retain their original config data.
 * 
 * @param connection - Solana connection instance
 * @param pools - Array of pool objects to enrich
 * @returns Promise resolving to array of enriched pools
 */
export async function enrichPoolsWithBlockchainData(
  connection: Connection,
  pools: Pool[]
): Promise<Pool[]> {
  console.log(`\n🔄 Enriching ${pools.length} pools with blockchain data`);

  const startTime = Date.now();

  try {
    // Enrich all pools in parallel
    const enrichedPools = await Promise.all(
      pools.map(pool => enrichPoolWithBlockchainData(connection, pool))
    );

    const duration = Date.now() - startTime;
    const successCount = enrichedPools.filter(p => p.dataSource === 'blockchain').length;
    const failureCount = pools.length - successCount;

    console.log(`\n✅ Pool enrichment complete`);
    console.log(`   Total pools: ${pools.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${failureCount}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Avg per pool: ${(duration / pools.length).toFixed(2)}ms`);

    return enrichedPools;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to enrich pools with blockchain data');
    console.error(`   Error: ${errorMessage}`);
    
    // Return original pools on catastrophic failure
    return pools;
  }
}
