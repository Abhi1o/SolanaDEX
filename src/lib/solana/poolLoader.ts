/**
 * Pool Loader - Loads pool data from dex-config.json and converts to Pool type
 * 
 * This module provides functions to load pool data from the static configuration
 * and optionally enrich it with real-time blockchain data.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { Pool, Token } from '@/types';
import dexConfig from '@/config/dex-config.json';
import { enrichPoolsWithBlockchainData, enrichPoolWithBlockchainData } from './poolBlockchainFetcher';

/**
 * Convert dex-config pool to Pool type
 */
export function convertDexConfigPool(configPool: any, tokens: Token[]): Pool {
  // Find token objects
  const tokenA = tokens.find(t => t.mint === configPool.tokenA);
  const tokenB = tokens.find(t => t.mint === configPool.tokenB);

  if (!tokenA || !tokenB) {
    throw new Error(`Tokens not found for pool ${configPool.poolAddress}`);
  }

  // Convert liquidity amounts to bigint (adjust for decimals)
  const liquidityABigInt = BigInt(Math.floor(parseFloat(configPool.liquidityA) * Math.pow(10, tokenA.decimals)));
  const liquidityBBigInt = BigInt(Math.floor(parseFloat(configPool.liquidityB) * Math.pow(10, tokenB.decimals)));

  // Calculate total liquidity (simplified - sum of both reserves)
  const totalLiquidity = liquidityABigInt + liquidityBBigInt;

  // Mock LP token supply (in real implementation, this would be fetched from chain)
  const lpTokenSupply = BigInt(Math.floor(Math.sqrt(Number(liquidityABigInt) * Number(liquidityBBigInt))));

  return {
    id: configPool.poolAddress,
    programId: dexConfig.programId,
    tokenA,
    tokenB,
    tokenAAccount: new PublicKey(configPool.tokenAccountA),
    tokenBAccount: new PublicKey(configPool.tokenAccountB),
    lpTokenMint: new PublicKey(configPool.poolTokenMint),
    reserveA: liquidityABigInt,
    reserveB: liquidityBBigInt,
    totalLiquidity,
    lpTokenSupply,
    volume24h: BigInt(0), // Mock data
    fees24h: BigInt(0), // Mock data
    feeRate: 0.3, // 0.3% fee
    isActive: true,
    createdAt: new Date(configPool.deployedAt).getTime(),
    lastUpdated: Date.now(),
    ammType: 'constant_product',
  };
}

/**
 * Options for loading pools
 */
export interface LoadPoolsOptions {
  /** Whether to enrich pools with blockchain data */
  enrichWithBlockchain?: boolean;
  /** Solana connection instance (required if enrichWithBlockchain is true) */
  connection?: Connection;
}

/**
 * Load all pools from dex-config.json
 * 
 * @param options - Options for loading pools
 * @returns Promise resolving to array of pools (or synchronous array if not enriching)
 */
export function loadPoolsFromConfig(): Pool[];
export function loadPoolsFromConfig(options: LoadPoolsOptions & { enrichWithBlockchain: true; connection: Connection }): Promise<Pool[]>;
export function loadPoolsFromConfig(options: LoadPoolsOptions & { enrichWithBlockchain?: false }): Pool[];
export function loadPoolsFromConfig(options?: LoadPoolsOptions): Pool[] | Promise<Pool[]> {
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

  // Convert all pools from config
  const pools = dexConfig.pools.map(configPool =>
    convertDexConfigPool(configPool, tokens)
  );

  // If blockchain enrichment is requested, enrich and return promise
  if (options?.enrichWithBlockchain && options.connection) {
    console.log('🔄 Loading pools from config with blockchain enrichment');
    return enrichPoolsWithBlockchainData(options.connection, pools)
      .catch(error => {
        console.error('❌ Failed to enrich pools with blockchain data:', error);
        console.warn('⚠️  Falling back to config data');
        return pools;
      });
  }

  // Otherwise return config data synchronously
  console.log(`📋 Loaded ${pools.length} pools from config`);
  return pools;
}

/**
 * Get pool by address
 * 
 * @param poolAddress - Pool address to find
 * @param options - Options for loading pool
 * @returns Pool object or null if not found (or Promise if enriching)
 */
export function getPoolByAddress(poolAddress: string): Pool | null;
export function getPoolByAddress(poolAddress: string, options: LoadPoolsOptions & { enrichWithBlockchain: true; connection: Connection }): Promise<Pool | null>;
export function getPoolByAddress(poolAddress: string, options: LoadPoolsOptions & { enrichWithBlockchain?: false }): Pool | null;
export function getPoolByAddress(poolAddress: string, options?: LoadPoolsOptions): Pool | null | Promise<Pool | null> {
  const pools = loadPoolsFromConfig();
  const pool = pools.find(pool => pool.id === poolAddress) || null;

  // If no pool found, return null
  if (!pool) {
    return null;
  }

  // If blockchain enrichment is requested, enrich and return promise
  if (options?.enrichWithBlockchain && options.connection) {
    return enrichPoolWithBlockchainData(options.connection, pool)
      .catch(error => {
        console.error('❌ Failed to enrich pool with blockchain data:', error);
        console.warn('⚠️  Falling back to config data');
        return pool;
      });
  }

  // Otherwise return config data synchronously
  return pool;
}

/**
 * Get pools by token pair
 * 
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @param options - Options for loading pools
 * @returns Array of pools for the token pair (or Promise if enriching)
 */
export function getPoolsByTokenPair(tokenAMint: string, tokenBMint: string): Pool[];
export function getPoolsByTokenPair(tokenAMint: string, tokenBMint: string, options: LoadPoolsOptions & { enrichWithBlockchain: true; connection: Connection }): Promise<Pool[]>;
export function getPoolsByTokenPair(tokenAMint: string, tokenBMint: string, options: LoadPoolsOptions & { enrichWithBlockchain?: false }): Pool[];
export function getPoolsByTokenPair(tokenAMint: string, tokenBMint: string, options?: LoadPoolsOptions): Pool[] | Promise<Pool[]> {
  const pools = loadPoolsFromConfig();
  const filteredPools = pools.filter(pool =>
    (pool.tokenA.mint === tokenAMint && pool.tokenB.mint === tokenBMint) ||
    (pool.tokenA.mint === tokenBMint && pool.tokenB.mint === tokenAMint)
  );

  // If blockchain enrichment is requested, enrich and return promise
  if (options?.enrichWithBlockchain && options.connection) {
    return enrichPoolsWithBlockchainData(options.connection, filteredPools)
      .catch(error => {
        console.error('❌ Failed to enrich pools with blockchain data:', error);
        console.warn('⚠️  Falling back to config data');
        return filteredPools;
      });
  }

  // Otherwise return config data synchronously
  return filteredPools;
}

/**
 * Get all unique token pairs
 */
export function getTokenPairs(): Array<{ tokenA: Token; tokenB: Token; pools: Pool[] }> {
  const pools = loadPoolsFromConfig();
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

  return Array.from(pairMap.values());
}
