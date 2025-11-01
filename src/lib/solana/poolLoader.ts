/**
 * Pool Loader - Loads pool metadata from dex-config.json and fetches real-time data from blockchain
 * 
 * This module provides functions to load pool metadata (addresses, token info) from configuration
 * and fetch real-time pool data from the Solana blockchain. All pool data must come from blockchain.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { Pool, Token } from '@/types';
import dexConfig from '@/config/dex-config.json';
import { enrichPoolsWithBlockchainData, enrichPoolWithBlockchainData } from './poolBlockchainFetcher';

/**
 * Convert dex-config pool to Pool skeleton (metadata only, no reserve data)
 * This creates a minimal pool object that must be enriched with blockchain data
 */
function convertDexConfigPoolToSkeleton(configPool: any, tokens: Token[]): Pool {
  // Find token objects
  const tokenA = tokens.find(t => t.mint === configPool.tokenA);
  const tokenB = tokens.find(t => t.mint === configPool.tokenB);

  if (!tokenA || !tokenB) {
    throw new Error(`Tokens not found for pool ${configPool.poolAddress}`);
  }

  // Create skeleton pool with zero reserves (must be fetched from blockchain)
  return {
    id: configPool.poolAddress,
    programId: dexConfig.programId,
    tokenA,
    tokenB,
    tokenAAccount: new PublicKey(configPool.tokenAccountA),
    tokenBAccount: new PublicKey(configPool.tokenAccountB),
    lpTokenMint: new PublicKey(configPool.poolTokenMint),
    reserveA: BigInt(0), // Must be fetched from blockchain
    reserveB: BigInt(0), // Must be fetched from blockchain
    totalLiquidity: BigInt(0), // Must be calculated from blockchain data
    lpTokenSupply: BigInt(0), // Must be fetched from blockchain
    volume24h: BigInt(0), // Mock data
    fees24h: BigInt(0), // Mock data
    feeRate: 0.3, // 0.3% fee
    isActive: true,
    createdAt: new Date(configPool.deployedAt).getTime(),
    lastUpdated: 0, // Will be set when blockchain data is fetched
    ammType: 'constant_product',
  };
}

/**
 * Load all pools from blockchain
 * 
 * Loads pool metadata from dex-config.json and fetches real-time data from blockchain.
 * This function ALWAYS requires a connection and fetches from blockchain.
 * 
 * @param connection - Solana connection instance (required)
 * @returns Promise resolving to array of pools with blockchain data
 * @throws Error if blockchain data cannot be fetched
 */
export async function loadPoolsFromBlockchain(connection: Connection): Promise<Pool[]> {
  console.log('🔄 Loading pools from blockchain');
  
  // Convert dex-config tokens to Token type
  const tokens: Token[] = dexConfig.tokens.map(token => ({
    mint: token.mint,
    address: token.mint,
    symbol: token.symbol,
    displaySymbol: (token as any).displaySymbol,
    name: token.name,
    decimals: token.decimals,
    logoURI: (token as any).logoURI,
    isNative: token.symbol === 'SOL',
  }));

  // Convert all pools from config to skeleton (metadata only)
  const poolSkeletons = dexConfig.pools.map(configPool =>
    convertDexConfigPoolToSkeleton(configPool, tokens)
  );

  console.log(`📋 Loaded ${poolSkeletons.length} pool definitions from config`);
  console.log('🔄 Fetching real-time data from blockchain...');

  // Fetch blockchain data for all pools (no fallback to config data)
  const enrichedPools = await enrichPoolsWithBlockchainData(connection, poolSkeletons);
  
  console.log(`✅ Loaded ${enrichedPools.length} pools with blockchain data`);
  return enrichedPools;
}

/**
 * Get pool by address from blockchain
 * 
 * Loads pool metadata from config and fetches real-time data from blockchain.
 * 
 * @param connection - Solana connection instance (required)
 * @param poolAddress - Pool address to find
 * @returns Promise resolving to pool object or null if not found
 * @throws Error if blockchain data cannot be fetched
 */
export async function getPoolByAddress(
  connection: Connection,
  poolAddress: string
): Promise<Pool | null> {
  console.log(`🔍 Looking up pool: ${poolAddress}`);
  
  // Convert dex-config tokens to Token type
  const tokens: Token[] = dexConfig.tokens.map(token => ({
    mint: token.mint,
    address: token.mint,
    symbol: token.symbol,
    displaySymbol: (token as any).displaySymbol,
    name: token.name,
    decimals: token.decimals,
    logoURI: (token as any).logoURI,
    isNative: token.symbol === 'SOL',
  }));

  // Find pool in config
  const configPool = dexConfig.pools.find(p => p.poolAddress === poolAddress);
  
  if (!configPool) {
    console.warn(`⚠️  Pool not found in config: ${poolAddress}`);
    return null;
  }

  // Convert to skeleton
  const poolSkeleton = convertDexConfigPoolToSkeleton(configPool, tokens);

  // Fetch blockchain data
  console.log('🔄 Fetching real-time data from blockchain...');
  const enrichedPool = await enrichPoolWithBlockchainData(connection, poolSkeleton);
  
  console.log(`✅ Loaded pool with blockchain data`);
  return enrichedPool;
}

/**
 * Get pools by token pair from blockchain
 * 
 * Loads pool metadata from config and fetches real-time data from blockchain.
 * 
 * @param connection - Solana connection instance (required)
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @returns Promise resolving to array of pools for the token pair
 * @throws Error if blockchain data cannot be fetched
 */
export async function getPoolsByTokenPair(
  connection: Connection,
  tokenAMint: string,
  tokenBMint: string
): Promise<Pool[]> {
  console.log(`🔍 Looking up pools for pair: ${tokenAMint}/${tokenBMint}`);
  
  // Convert dex-config tokens to Token type
  const tokens: Token[] = dexConfig.tokens.map(token => ({
    mint: token.mint,
    address: token.mint,
    symbol: token.symbol,
    displaySymbol: (token as any).displaySymbol,
    name: token.name,
    decimals: token.decimals,
    logoURI: (token as any).logoURI,
    isNative: token.symbol === 'SOL',
  }));

  // Find pools in config
  const configPools = dexConfig.pools.filter(pool =>
    (pool.tokenA === tokenAMint && pool.tokenB === tokenBMint) ||
    (pool.tokenA === tokenBMint && pool.tokenB === tokenAMint)
  );

  if (configPools.length === 0) {
    console.warn(`⚠️  No pools found for pair: ${tokenAMint}/${tokenBMint}`);
    return [];
  }

  // Convert to skeletons
  const poolSkeletons = configPools.map(configPool =>
    convertDexConfigPoolToSkeleton(configPool, tokens)
  );

  console.log(`📋 Found ${poolSkeletons.length} pool(s) in config`);
  console.log('🔄 Fetching real-time data from blockchain...');

  // Fetch blockchain data
  const enrichedPools = await enrichPoolsWithBlockchainData(connection, poolSkeletons);
  
  console.log(`✅ Loaded ${enrichedPools.length} pool(s) with blockchain data`);
  return enrichedPools;
}

/**
 * Get all unique token pairs from blockchain
 * 
 * Loads all pools from blockchain and groups them by token pair.
 * 
 * @param connection - Solana connection instance (required)
 * @returns Promise resolving to array of token pairs with their pools
 * @throws Error if blockchain data cannot be fetched
 */
export async function getTokenPairs(
  connection: Connection
): Promise<Array<{ tokenA: Token; tokenB: Token; pools: Pool[] }>> {
  console.log('🔍 Loading all token pairs from blockchain');
  
  const pools = await loadPoolsFromBlockchain(connection);
  const pairMap = new Map<string, { tokenA: Token; tokenB: Token; pools: Pool[] }>();

  pools.forEach(pool => {
    const pairKey = [pool.tokenA.mint, pool.tokenB.mint].sort().join('-');

    if (!pairMap.has(pairKey)) {
      pairMap.set(pairKey, {
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        pools: [],
      });
    }

    pairMap.get(pairKey)!.pools.push(pool);
  });

  const pairs = Array.from(pairMap.values());
  console.log(`✅ Found ${pairs.length} unique token pair(s)`);
  return pairs;
}
