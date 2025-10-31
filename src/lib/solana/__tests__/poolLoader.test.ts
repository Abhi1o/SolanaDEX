/**
 * Tests for pool loader functionality
 */

import { loadPoolsFromConfig, getPoolByAddress, getPoolsByTokenPair, getTokenPairs } from '../poolLoader';

describe('Pool Loader', () => {
  describe('loadPoolsFromConfig', () => {
    it('should load all pools from config', () => {
      const pools = loadPoolsFromConfig();
      
      expect(pools).toBeDefined();
      expect(pools.length).toBeGreaterThan(0);
      expect(pools[0]).toHaveProperty('id');
      expect(pools[0]).toHaveProperty('tokenA');
      expect(pools[0]).toHaveProperty('tokenB');
      expect(pools[0]).toHaveProperty('reserveA');
      expect(pools[0]).toHaveProperty('reserveB');
    });

    it('should convert liquidity amounts correctly', () => {
      const pools = loadPoolsFromConfig();
      const pool = pools[0];
      
      // Reserves should be bigint
      expect(typeof pool.reserveA).toBe('bigint');
      expect(typeof pool.reserveB).toBe('bigint');
      
      // Should be greater than 0
      expect(pool.reserveA).toBeGreaterThan(BigInt(0));
      expect(pool.reserveB).toBeGreaterThan(BigInt(0));
    });

    it('should set correct pool properties', () => {
      const pools = loadPoolsFromConfig();
      const pool = pools[0];
      
      expect(pool.ammType).toBe('constant_product');
      expect(pool.isActive).toBe(true);
      expect(pool.feeRate).toBe(0.3);
      expect(pool.programId).toBeDefined();
    });
  });

  describe('getPoolByAddress', () => {
    it('should find pool by address', () => {
      const pools = loadPoolsFromConfig();
      const firstPool = pools[0];
      
      const foundPool = getPoolByAddress(firstPool.id);
      
      expect(foundPool).toBeDefined();
      expect(foundPool?.id).toBe(firstPool.id);
    });

    it('should return null for non-existent address', () => {
      const pool = getPoolByAddress('InvalidAddress123');
      expect(pool).toBeNull();
    });
  });

  describe('getPoolsByTokenPair', () => {
    it('should find pools by token pair', () => {
      const pools = loadPoolsFromConfig();
      const firstPool = pools[0];
      
      const pairPools = getPoolsByTokenPair(
        firstPool.tokenA.mint,
        firstPool.tokenB.mint
      );
      
      expect(pairPools.length).toBeGreaterThan(0);
      expect(pairPools[0].tokenA.mint).toBe(firstPool.tokenA.mint);
    });

    it('should find pools regardless of token order', () => {
      const pools = loadPoolsFromConfig();
      const firstPool = pools[0];
      
      const pairPools1 = getPoolsByTokenPair(
        firstPool.tokenA.mint,
        firstPool.tokenB.mint
      );
      
      const pairPools2 = getPoolsByTokenPair(
        firstPool.tokenB.mint,
        firstPool.tokenA.mint
      );
      
      expect(pairPools1.length).toBe(pairPools2.length);
    });
  });

  describe('getTokenPairs', () => {
    it('should return unique token pairs', () => {
      const pairs = getTokenPairs();
      
      expect(pairs).toBeDefined();
      expect(pairs.length).toBeGreaterThan(0);
      
      // Each pair should have tokenA, tokenB, and pools
      pairs.forEach(pair => {
        expect(pair.tokenA).toBeDefined();
        expect(pair.tokenB).toBeDefined();
        expect(pair.pools).toBeDefined();
        expect(pair.pools.length).toBeGreaterThan(0);
      });
    });

    it('should group pools by token pair', () => {
      const pairs = getTokenPairs();
      
      // Find USDC/SOL pair
      const usdcSolPair = pairs.find(pair => 
        (pair.tokenA.symbol === 'USDC' && pair.tokenB.symbol === 'SOL') ||
        (pair.tokenA.symbol === 'SOL' && pair.tokenB.symbol === 'USDC')
      );
      
      expect(usdcSolPair).toBeDefined();
      expect(usdcSolPair!.pools.length).toBeGreaterThan(0);
    });
  });
});
