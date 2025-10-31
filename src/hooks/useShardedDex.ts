/**
 * React Hook for Sharded DEX Operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { shardedDex, SwapQuote, TokenConfig, ShardedPool } from '../lib/shardedDex';

export function useShardedDex() {
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<TokenConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tokens on mount
  useEffect(() => {
    setTokens(shardedDex.getTokens());
  }, []);

  /**
   * Get quote for a swap
   */
  const getQuote = useCallback(async (
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number
  ): Promise<SwapQuote | null> => {
    if (!inputAmount || inputAmount <= 0) {
      setError('Invalid input amount');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const quote = await shardedDex.getQuote(
        inputTokenSymbol,
        outputTokenSymbol,
        inputAmount
      );
      return quote;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Execute a swap
   */
  const executeSwap = useCallback(async (
    quote: SwapQuote,
    slippageTolerance: number = 0.5
  ): Promise<string | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const signature = await shardedDex.executeSwap(
        publicKey,
        quote,
        slippageTolerance
      );
      return signature;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Swap failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  /**
   * Get pools for a trading pair
   */
  const getPoolsForPair = useCallback((
    tokenASymbol: string,
    tokenBSymbol: string
  ): ShardedPool[] => {
    return shardedDex.getShardsBySymbol(tokenASymbol, tokenBSymbol);
  }, []);

  /**
   * Get all trading pairs
   */
  const getTradingPairs = useCallback(() => {
    return shardedDex.getTradingPairs();
  }, []);

  /**
   * Get token by symbol
   */
  const getTokenBySymbol = useCallback((symbol: string): TokenConfig | undefined => {
    return tokens.find(t => t.symbol === symbol);
  }, [tokens]);

  return {
    tokens,
    loading,
    error,
    getQuote,
    executeSwap,
    getPoolsForPair,
    getTradingPairs,
    getTokenBySymbol,
    programId: shardedDex.getProgramId(),
    connection: shardedDex.getConnection()
  };
}
