/**
 * Tests for pool blockchain fetcher functionality
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
  fetchPoolReserves,
  fetchLPTokenSupply,
  fetchPoolAccountData,
  enrichPoolWithBlockchainData,
  enrichPoolsWithBlockchainData,
  PoolAccountData,
  BlockchainPoolData
} from '../poolBlockchainFetcher';
import { Pool } from '@/types';

// Mock Solana connection
vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn(),
  PublicKey: vi.fn((key: string) => ({ toBase58: () => key }))
}));

// Mock fetch utilities to avoid actual retries in tests
vi.mock('@/utils/fetchUtils', async () => {
  const actual = await vi.importActual('@/utils/fetchUtils');
  return {
    ...actual,
    fetchWithTimeout: vi.fn((promise: Promise<any>) => promise),
    fetchWithRetry: vi.fn((fn: () => Promise<any>) => fn()),
  };
});

describe('Pool Blockchain Fetcher', () => {
  let mockConnection: any;
  let mockPool: Pool;

  beforeEach(() => {
    // Create mock connection
    mockConnection = {
      getTokenAccountBalance: vi.fn(),
      getTokenSupply: vi.fn(),
      getAccountInfo: vi.fn()
    };

    // Create mock pool
    mockPool = {
      id: 'TestPoolAddress123',
      programId: 'TestProgramId123',
      tokenA: {
        mint: 'TokenAMint123',
        address: 'TokenAMint123',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        isNative: false
      },
      tokenB: {
        mint: 'TokenBMint123',
        address: 'TokenBMint123',
        symbol: 'SOL',
        name: 'Wrapped SOL',
        decimals: 9,
        isNative: false
      },
      tokenAAccount: new PublicKey('TokenAAccount123'),
      tokenBAccount: new PublicKey('TokenBAccount123'),
      lpTokenMint: new PublicKey('LPTokenMint123'),
      reserveA: BigInt(1000000),
      reserveB: BigInt(500000),
      totalLiquidity: BigInt(1500000),
      lpTokenSupply: BigInt(707106),
      volume24h: BigInt(0),
      fees24h: BigInt(0),
      feeRate: 0.3,
      isActive: true,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      ammType: 'constant_product' as const
    };
  });

  describe('fetchPoolReserves', () => {
    it('should fetch reserves from token accounts', async () => {
      // Mock successful token account balance fetches
      mockConnection.getTokenAccountBalance
        .mockResolvedValueOnce({
          value: { amount: '1000000', uiAmountString: '1.0' }
        })
        .mockResolvedValueOnce({
          value: { amount: '500000', uiAmountString: '0.5' }
        });

      const tokenAAccount = new PublicKey('TokenAAccount123');
      const tokenBAccount = new PublicKey('TokenBAccount123');

      const reserves = await fetchPoolReserves(
        mockConnection,
        tokenAAccount,
        tokenBAccount
      );

      expect(reserves.reserveA).toBe(BigInt(1000000));
      expect(reserves.reserveB).toBe(BigInt(500000));
      expect(mockConnection.getTokenAccountBalance).toHaveBeenCalledTimes(2);
    });

    it('should throw error on fetch failure', async () => {
      // Mock failed token account balance fetch
      mockConnection.getTokenAccountBalance.mockRejectedValue(
        new Error('RPC timeout')
      );

      const tokenAAccount = new PublicKey('TokenAAccount123');
      const tokenBAccount = new PublicKey('TokenBAccount123');

      await expect(
        fetchPoolReserves(mockConnection, tokenAAccount, tokenBAccount)
      ).rejects.toThrow();
    });
  });

  describe('fetchLPTokenSupply', () => {
    it('should fetch LP token supply', async () => {
      // Mock successful token supply fetch
      mockConnection.getTokenSupply.mockResolvedValue({
        value: { amount: '707106', uiAmountString: '0.707106' }
      });

      const lpTokenMint = new PublicKey('LPTokenMint123');

      const supply = await fetchLPTokenSupply(mockConnection, lpTokenMint);

      expect(supply).toBe(BigInt(707106));
      expect(mockConnection.getTokenSupply).toHaveBeenCalledWith(lpTokenMint);
    });

    it('should throw error on fetch failure', async () => {
      // Mock failed token supply fetch
      mockConnection.getTokenSupply.mockRejectedValue(
        new Error('Invalid mint account')
      );

      const lpTokenMint = new PublicKey('LPTokenMint123');

      await expect(
        fetchLPTokenSupply(mockConnection, lpTokenMint)
      ).rejects.toThrow();
    });
  });

  describe('fetchPoolAccountData', () => {
    it('should fetch complete pool account data', async () => {
      // Mock successful fetches
      mockConnection.getTokenAccountBalance
        .mockResolvedValueOnce({
          value: { amount: '1000000', uiAmountString: '1.0' }
        })
        .mockResolvedValueOnce({
          value: { amount: '500000', uiAmountString: '0.5' }
        });
      
      mockConnection.getTokenSupply.mockResolvedValue({
        value: { amount: '707106', uiAmountString: '0.707106' }
      });

      const poolAddress = new PublicKey('TestPoolAddress123');
      const tokenAAccount = new PublicKey('TokenAAccount123');
      const tokenBAccount = new PublicKey('TokenBAccount123');
      const lpTokenMint = new PublicKey('LPTokenMint123');

      const accountData = await fetchPoolAccountData(
        mockConnection,
        poolAddress,
        tokenAAccount,
        tokenBAccount,
        lpTokenMint
      );

      expect(accountData).not.toBeNull();
      expect(accountData?.reserveA).toBe(BigInt(1000000));
      expect(accountData?.reserveB).toBe(BigInt(500000));
      expect(accountData?.lpTokenSupply).toBe(BigInt(707106));
      expect(accountData?.feeRate).toBe(0.3);
      expect(accountData?.isActive).toBe(true);
    });

    it('should return null for non-existent account', async () => {
      // Mock account not found error
      mockConnection.getTokenAccountBalance.mockRejectedValue(
        new Error('could not find account')
      );

      const poolAddress = new PublicKey('TestPoolAddress123');
      const tokenAAccount = new PublicKey('TokenAAccount123');
      const tokenBAccount = new PublicKey('TokenBAccount123');
      const lpTokenMint = new PublicKey('LPTokenMint123');

      const accountData = await fetchPoolAccountData(
        mockConnection,
        poolAddress,
        tokenAAccount,
        tokenBAccount,
        lpTokenMint
      );

      expect(accountData).toBeNull();
    });
  });

  describe('enrichPoolWithBlockchainData', () => {
    it('should enrich pool with blockchain data', async () => {
      // Mock successful fetches
      mockConnection.getTokenAccountBalance
        .mockResolvedValueOnce({
          value: { amount: '2000000', uiAmountString: '2.0' }
        })
        .mockResolvedValueOnce({
          value: { amount: '1000000', uiAmountString: '1.0' }
        });
      
      mockConnection.getTokenSupply.mockResolvedValue({
        value: { amount: '1414213', uiAmountString: '1.414213' }
      });

      const enrichedPool = await enrichPoolWithBlockchainData(
        mockConnection,
        mockPool
      );

      expect(enrichedPool.reserveA).toBe(BigInt(2000000));
      expect(enrichedPool.reserveB).toBe(BigInt(1000000));
      expect(enrichedPool.lpTokenSupply).toBe(BigInt(1414213));
      expect(enrichedPool.dataSource).toBe('blockchain');
      expect(enrichedPool.lastBlockchainFetch).toBeDefined();
      expect(enrichedPool.blockchainFetchError).toBeNull();
    });

    it('should throw error on fetch failure', async () => {
      // Mock failed fetch
      mockConnection.getTokenAccountBalance.mockRejectedValue(
        new Error('RPC timeout')
      );

      // Should throw error instead of falling back to config data
      await expect(
        enrichPoolWithBlockchainData(mockConnection, mockPool)
      ).rejects.toThrow();
    });
  });

  describe('enrichPoolsWithBlockchainData', () => {
    it('should enrich multiple pools in parallel', async () => {
      // Mock successful fetches for all pools
      mockConnection.getTokenAccountBalance.mockResolvedValue({
        value: { amount: '1000000', uiAmountString: '1.0' }
      });
      
      mockConnection.getTokenSupply.mockResolvedValue({
        value: { amount: '707106', uiAmountString: '0.707106' }
      });

      const pools = [mockPool, { ...mockPool, id: 'TestPoolAddress456' }];

      const enrichedPools = await enrichPoolsWithBlockchainData(
        mockConnection,
        pools
      );

      expect(enrichedPools).toHaveLength(2);
      expect(enrichedPools[0].dataSource).toBe('blockchain');
      expect(enrichedPools[1].dataSource).toBe('blockchain');
    });

    it('should handle partial failures by throwing errors', async () => {
      // Mock first pool succeeds, second fails
      let callCount = 0;
      mockConnection.getTokenAccountBalance.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            value: { amount: '1000000', uiAmountString: '1.0' }
          });
        }
        return Promise.reject(new Error('RPC timeout'));
      });
      
      mockConnection.getTokenSupply.mockResolvedValue({
        value: { amount: '707106', uiAmountString: '0.707106' }
      });

      const pools = [mockPool, { ...mockPool, id: 'TestPoolAddress456' }];

      // Promise.all will reject if any promise rejects, so this should throw
      await expect(
        enrichPoolsWithBlockchainData(mockConnection, pools)
      ).rejects.toThrow();
    });
  });
});
