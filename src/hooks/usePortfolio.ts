import { useEffect, useCallback, useRef } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useWalletStore } from '@/stores/walletStore';
import { useSolanaConnection } from './useSolanaConnection';
import { UserPortfolio, Token } from '@/types';
import { PublicKey } from '@solana/web3.js';

interface UsePortfolioOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function usePortfolio(options: UsePortfolioOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  const { connection } = useSolanaConnection();
  const { address, isConnected, tokenAccounts, solBalance } = useWalletStore();
  const {
    portfolio,
    loading,
    error,
    setPortfolio,
    setLoading,
    setError,
    addHistoricalData,
    clearPortfolio,
  } = usePortfolioStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!connection || !address || !isConnected) {
      clearPortfolio();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate total SOL value
      const totalSolValue = solBalance;

      // Map token accounts to portfolio tokens
      const tokens = tokenAccounts.map((account) => ({
        token: {
          mint: account.mint.toString(),
          address: account.mint.toString(),
          symbol: 'UNKNOWN', // Would need token registry lookup
          name: 'Unknown Token',
          decimals: account.decimals,
        } as Token,
        balance: account.amount,
        tokenAccount: account.address,
        value: BigInt(0), // Would need price data
        valueUsd: undefined,
      }));

      // TODO: Fetch liquidity positions from AMM programs
      const liquidityPositions: UserPortfolio['liquidityPositions'] = [];

      // Calculate total portfolio value
      const totalValue = totalSolValue + tokens.reduce((sum, t) => sum + t.value, BigInt(0));

      const portfolioData: UserPortfolio = {
        totalValue,
        totalValueUsd: undefined, // Would need price data
        solBalance: totalSolValue,
        solValueUsd: undefined,
        tokens,
        liquidityPositions,
        lastUpdated: Date.now(),
      };

      setPortfolio(portfolioData);
      addHistoricalData(Date.now(), totalValue);
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  }, [
    connection,
    address,
    isConnected,
    solBalance,
    tokenAccounts,
    setPortfolio,
    setLoading,
    setError,
    addHistoricalData,
    clearPortfolio,
  ]);

  // Fetch liquidity positions
  const fetchLiquidityPositions = useCallback(async () => {
    if (!connection || !address) return [];

    try {
      // TODO: Implement fetching liquidity positions from AMM programs
      // This would involve:
      // 1. Finding all LP token accounts owned by the user
      // 2. Fetching pool data for each LP token
      // 3. Calculating position value and earnings
      return [];
    } catch (error) {
      console.error('Failed to fetch liquidity positions:', error);
      return [];
    }
  }, [connection, address]);

  // Calculate portfolio performance
  const calculatePerformance = useCallback(() => {
    // TODO: Implement performance calculation using historical data
    // This would compare current value to past values
    return null;
  }, []);

  // Export portfolio data for tax reporting
  const exportPortfolio = useCallback(
    (format: 'csv' | 'json' = 'csv') => {
      if (!portfolio) return;

      if (format === 'json') {
        const data = JSON.stringify(portfolio, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        );
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV format
        const headers = ['Asset', 'Balance', 'Value (SOL)', 'Value (USD)'];
        const rows = [
          ['SOL', (Number(portfolio.solBalance) / 1e9).toString(), '-', portfolio.solValueUsd?.toString() || '-'],
          ...portfolio.tokens.map((t) => [
            t.token.symbol,
            (Number(t.balance) / Math.pow(10, t.token.decimals)).toString(),
            (Number(t.value) / 1e9).toString(),
            t.valueUsd?.toString() || '-',
          ]),
        ];

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [portfolio]
  );

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isConnected) return;

    // Initial fetch
    fetchPortfolio();

    // Set up interval
    intervalRef.current = setInterval(() => {
      fetchPortfolio();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, isConnected, refreshInterval, fetchPortfolio]);

  // Clear portfolio when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      clearPortfolio();
    }
  }, [isConnected, clearPortfolio]);

  return {
    portfolio,
    loading,
    error,
    fetchPortfolio,
    fetchLiquidityPositions,
    calculatePerformance,
    exportPortfolio,
  };
}
