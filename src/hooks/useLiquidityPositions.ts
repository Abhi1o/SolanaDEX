'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Pool, UserPortfolio } from '@/types';
import { usePoolStore } from '@/stores/poolStore';

interface LiquidityPosition {
  pool: Pool;
  lpTokenBalance: bigint;
  lpTokenAccount: PublicKey;
  shareOfPool: number;
  tokenAAmount: bigint;
  tokenBAmount: bigint;
  value: bigint; // Total position value in lamports
  valueUsd?: number;
  feesEarned24h?: bigint;
  impermanentLoss?: number; // Percentage
}

interface UseLiquidityPositionsReturn {
  positions: LiquidityPosition[];
  totalValue: bigint;
  totalValueUsd?: number;
  loading: boolean;
  error: string | null;
  refreshPositions: () => Promise<void>;
  refreshAfterOperation: () => Promise<void>; // Refresh after liquidity operations
}

export function useLiquidityPositions(): UseLiquidityPositionsReturn {
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [totalValue, setTotalValue] = useState<bigint>(BigInt(0));
  const [totalValueUsd, setTotalValueUsd] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { pools, lastFetchTime } = usePoolStore();

  // Fetch LP token balance for a specific pool using real blockchain data
  const fetchLpTokenBalance = useCallback(async (pool: Pool): Promise<bigint> => {
    if (!publicKey || !connection) return BigInt(0);

    try {
      const lpTokenAccount = await getAssociatedTokenAddress(
        pool.lpTokenMint,
        publicKey
      );

      // Fetch actual balance from blockchain
      const accountInfo = await connection.getTokenAccountBalance(lpTokenAccount);
      const balance = accountInfo.value ? BigInt(accountInfo.value.amount) : BigInt(0);
      
      console.log(`📊 Fetched LP token balance for ${pool.tokenA.symbol}/${pool.tokenB.symbol}`);
      console.log(`   Balance: ${balance.toString()} (${accountInfo.value?.uiAmountString || '0'} UI)`);
      
      return balance;
    } catch (error) {
      // Account doesn't exist or other error - balance is 0
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.toLowerCase().includes('could not find')) {
        console.warn(`⚠️  Failed to fetch LP balance for ${pool.tokenA.symbol}/${pool.tokenB.symbol}:`, errorMessage);
      }
      return BigInt(0);
    }
  }, [publicKey, connection]);

  // Calculate position details from LP token balance using fetched pool reserves
  const calculatePositionDetails = useCallback((pool: Pool, lpTokenBalance: bigint): Omit<LiquidityPosition, 'pool' | 'lpTokenBalance' | 'lpTokenAccount'> => {
    if (lpTokenBalance === BigInt(0) || pool.lpTokenSupply === BigInt(0)) {
      return {
        shareOfPool: 0,
        tokenAAmount: BigInt(0),
        tokenBAmount: BigInt(0),
        value: BigInt(0),
        valueUsd: 0,
        feesEarned24h: BigInt(0),
        impermanentLoss: 0,
      };
    }

    // Calculate share of pool using actual LP token supply from blockchain
    const shareOfPool = Number(lpTokenBalance) / Number(pool.lpTokenSupply);

    // Calculate token amounts based on actual pool reserves from blockchain
    // Use BigInt arithmetic for precision
    const tokenAAmount = (pool.reserveA * lpTokenBalance) / pool.lpTokenSupply;
    const tokenBAmount = (pool.reserveB * lpTokenBalance) / pool.lpTokenSupply;

    console.log(`💰 Calculated position for ${pool.tokenA.symbol}/${pool.tokenB.symbol}`);
    console.log(`   Share of pool: ${(shareOfPool * 100).toFixed(4)}%`);
    console.log(`   Token A amount: ${tokenAAmount.toString()}`);
    console.log(`   Token B amount: ${tokenBAmount.toString()}`);

    // Calculate position value (simplified - using SOL as base)
    // In real implementation, would use price feeds
    const value = tokenAAmount + tokenBAmount; // Simplified calculation

    // Calculate fees earned (simplified)
    const feesEarned24h = pool.fees24h 
      ? BigInt(Math.floor(Number(pool.fees24h) * shareOfPool))
      : BigInt(0);

    // TODO: Calculate impermanent loss
    // This requires historical price data and initial deposit amounts
    const impermanentLoss = 0;

    return {
      shareOfPool: shareOfPool * 100, // Convert to percentage
      tokenAAmount,
      tokenBAmount,
      value,
      feesEarned24h,
      impermanentLoss,
    };
  }, []);

  // Fetch all liquidity positions
  const fetchPositions = useCallback(async () => {
    if (!connected || !publicKey || pools.length === 0) {
      setPositions([]);
      setTotalValue(BigInt(0));
      setTotalValueUsd(0);
      setLoading(false);
      return;
    }

    console.log(`🔍 Fetching LP positions for ${pools.length} pools`);
    setLoading(true);
    setError(null);

    try {
      const positionPromises = pools.map(async (pool): Promise<LiquidityPosition | null> => {
        const lpTokenBalance = await fetchLpTokenBalance(pool);
        
        if (lpTokenBalance === BigInt(0)) {
          return null; // No position in this pool
        }

        const lpTokenAccount = await getAssociatedTokenAddress(
          pool.lpTokenMint,
          publicKey
        );

        const positionDetails = calculatePositionDetails(pool, lpTokenBalance);

        return {
          pool,
          lpTokenBalance,
          lpTokenAccount,
          ...positionDetails,
        };
      });

      const allPositions = await Promise.all(positionPromises);
      const validPositions = allPositions.filter((pos): pos is LiquidityPosition => pos !== null);

      // Calculate total value
      const totalVal = validPositions.reduce((sum, pos) => sum + pos.value, BigInt(0));

      setPositions(validPositions);
      setTotalValue(totalVal);
      
      // TODO: Calculate USD value using price feeds
      setTotalValueUsd(Number(totalVal) / 1e9 * 100); // Mock USD price

      console.log(`✅ Fetched ${validPositions.length} LP positions`);
      console.log(`   Total value: ${totalVal.toString()}`);

    } catch (err) {
      console.error('❌ Failed to fetch liquidity positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, pools, fetchLpTokenBalance, calculatePositionDetails]);

  // Refresh positions
  const refreshPositions = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  // Refresh positions after liquidity operations (add/remove liquidity)
  const refreshAfterOperation = useCallback(async () => {
    console.log('🔄 Refreshing LP positions after liquidity operation');
    setLoading(true);
    
    // Wait a moment for blockchain to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fetchPositions();
  }, [fetchPositions]);

  // Fetch positions when dependencies change or when pool data updates
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions, lastFetchTime]); // Re-fetch when pool data is refreshed

  // Refresh positions when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey) {
      console.log('👛 Wallet connected, refreshing LP positions');
      fetchPositions();
    } else {
      console.log('👛 Wallet disconnected, clearing LP positions');
      setPositions([]);
      setTotalValue(BigInt(0));
      setTotalValueUsd(0);
    }
  }, [connected, publicKey]); // Trigger on wallet connection changes

  // Set up periodic refresh
  useEffect(() => {
    if (!connected || positions.length === 0) return;

    const interval = setInterval(refreshPositions, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [connected, positions.length, refreshPositions]);

  return {
    positions,
    totalValue,
    totalValueUsd,
    loading,
    error,
    refreshPositions,
    refreshAfterOperation,
  };
}

// Hook for a specific pool position
export function usePoolPosition(poolId: string | null) {
  const { positions, loading, error } = useLiquidityPositions();
  
  const position = useMemo(() => {
    if (!poolId) return null;
    return positions.find(pos => pos.pool.id === poolId) || null;
  }, [positions, poolId]);

  return {
    position,
    loading,
    error,
  };
}

// Hook for portfolio summary
export function useLiquidityPortfolio() {
  const { positions, totalValue, totalValueUsd, loading, error } = useLiquidityPositions();

  const portfolio = useMemo((): Partial<UserPortfolio> => {
    const liquidityPositions = positions.map(pos => ({
      pool: pos.pool,
      lpTokenBalance: pos.lpTokenBalance,
      lpTokenAccount: pos.lpTokenAccount,
      shareOfPool: pos.shareOfPool,
      tokenAAmount: pos.tokenAAmount,
      tokenBAmount: pos.tokenBAmount,
      value: pos.value,
      valueUsd: pos.valueUsd,
      feesEarned24h: pos.feesEarned24h,
    }));

    return {
      liquidityPositions,
      lastUpdated: Date.now(),
    };
  }, [positions]);

  const stats = useMemo(() => {
    const totalFeesEarned24h = positions.reduce(
      (sum, pos) => sum + (pos.feesEarned24h || BigInt(0)), 
      BigInt(0)
    );

    const averageApr = positions.length > 0 
      ? positions.reduce((sum, pos) => {
          // Mock APR calculation
          const poolLiquidity = Number(pos.pool.totalLiquidity);
          const fees24h = Number(pos.pool.fees24h);
          const apr = poolLiquidity > 0 ? (fees24h * 365 / poolLiquidity) * 100 : 0;
          return sum + apr;
        }, 0) / positions.length
      : 0;

    return {
      totalPositions: positions.length,
      totalFeesEarned24h,
      averageApr,
    };
  }, [positions]);

  return {
    portfolio,
    totalValue,
    totalValueUsd,
    stats,
    loading,
    error,
  };
}