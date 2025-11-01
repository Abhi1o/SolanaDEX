/**
 * Pool Loader - Loads pool data from dex-config.json and converts to Pool type
 */

import { PublicKey } from '@solana/web3.js';
import { Pool, Token } from '@/types';
import dexConfig from '@/config/dex-config.json';

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
 * Load all pools from dex-config.json
 */
export function loadPoolsFromConfig(): Pool[] {
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

  // Convert all pools
  const pools = dexConfig.pools.map(configPool =>
    convertDexConfigPool(configPool, tokens)
  );

  return pools;
}

/**
 * Get pool by address
 */
export function getPoolByAddress(poolAddress: string): Pool | null {
  const pools = loadPoolsFromConfig();
  return pools.find(pool => pool.id === poolAddress) || null;
}

/**
 * Get pools by token pair
 */
export function getPoolsByTokenPair(tokenAMint: string, tokenBMint: string): Pool[] {
  const pools = loadPoolsFromConfig();
  return pools.filter(pool =>
    (pool.tokenA.mint === tokenAMint && pool.tokenB.mint === tokenBMint) ||
    (pool.tokenA.mint === tokenBMint && pool.tokenB.mint === tokenAMint)
  );
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
