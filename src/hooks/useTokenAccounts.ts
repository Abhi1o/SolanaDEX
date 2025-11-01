import { useEffect, useCallback, useState, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { useSolanaConnection } from './useSolanaConnection';
import { useWallet } from './useWallet';
import { useWalletStore } from '@/stores/walletStore';
import { SolanaTokenAccount } from '@/types';

interface UseTokenAccountsOptions {
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook to fetch and manage SPL token accounts for the connected wallet
 */
export function useTokenAccounts(options: UseTokenAccountsOptions = {}) {
  const { enabled = true, autoRefresh = true, refreshInterval = 60000 } = options; // Increased from 30s to 60s
  const { connection } = useSolanaConnection();
  const { isConnected, publicKey } = useWallet();
  const { updateTokenAccounts } = useWalletStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch all SPL token accounts owned by the wallet
   */
  const fetchTokenAccounts = useCallback(async () => {
    if (!enabled || !isConnected || !publicKey || !connection) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching token accounts for:', publicKey.toString());

      // Get all token accounts owned by the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID },
        'confirmed'
      );

      console.log(`Found ${tokenAccounts.value.length} token accounts`);

      // Parse and filter token accounts
      const accounts: SolanaTokenAccount[] = tokenAccounts.value
        .map((accountInfo) => {
          try {
            const parsedInfo = accountInfo.account.data.parsed?.info;
            
            if (!parsedInfo) return null;

            const mint = new PublicKey(parsedInfo.mint);
            const owner = new PublicKey(parsedInfo.owner);
            const amount = BigInt(parsedInfo.tokenAmount.amount);
            const decimals = parsedInfo.tokenAmount.decimals;

            // Skip accounts with zero balance (optional - you can remove this filter)
            // if (amount === BigInt(0)) return null;

            return {
              address: accountInfo.pubkey,
              mint,
              owner,
              amount,
              decimals,
              isAssociated: true, // Assume associated for now
            };
          } catch (err) {
            console.error('Failed to parse token account:', err);
            return null;
          }
        })
        .filter((account): account is SolanaTokenAccount => account !== null);

      console.log(`Parsed ${accounts.length} valid token accounts`);

      // Update store
      updateTokenAccounts(accounts);

    } catch (err: any) {
      console.error('Failed to fetch token accounts:', err);
      
      let errorMessage = 'Failed to fetch token accounts';
      
      if (err?.message?.includes('403') || err?.message?.includes('Forbidden')) {
        errorMessage = 'RPC endpoint access forbidden. Please configure a custom RPC endpoint.';
      } else if (err?.message?.includes('429') || err?.message?.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [enabled, isConnected, publicKey, connection, updateTokenAccounts]);

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh || !enabled || !isConnected) {
      return;
    }

    // Initial fetch
    fetchTokenAccounts();

    // Set up interval
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchTokenAccounts();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, enabled, isConnected, refreshInterval, fetchTokenAccounts]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    loading,
    error,
    fetchTokenAccounts,
  };
}
