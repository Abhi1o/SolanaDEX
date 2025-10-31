import { useCallback, useEffect, useState, useMemo } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWalletStore } from '@/stores/walletStore';
import { useSolanaNetwork } from '@/providers/SolanaWalletProvider';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token } from '@/types';

export const useWallet = () => {
  const walletStore = useWalletStore();
  const walletContext = useSolanaWallet();
  const { 
    publicKey, 
    connected, 
    connecting, 
    disconnect: disconnectWallet,
    wallet: solanaWallet 
  } = walletContext;
  const { connection } = useConnection();
  const { network } = useSolanaNetwork();

  // Token balances and prices state
  const [tokenBalances, setTokenBalances] = useState<Record<string, bigint>>({});
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Sync Solana wallet state with our store
  useEffect(() => {
    if (connected && publicKey && solanaWallet) {
      // Only update if the values have actually changed
      const currentAddress = publicKey.toString();
      if (walletStore.address !== currentAddress || 
          walletStore.isConnected !== true ||
          walletStore.walletName !== solanaWallet.adapter.name) {
        walletStore.setWallet({
          publicKey,
          address: currentAddress,
          isConnected: true,
          isConnecting: false,
          walletName: solanaWallet.adapter.name,
        });
        walletStore.resetConnectionAttempts();
      }
    } else if (!connected && !connecting) {
      // Only disconnect store if wallet is actually disconnected (not just connecting)
      if (walletStore.isConnected) {
        walletStore.setWallet({
          publicKey: null,
          address: null,
          isConnected: false,
          isConnecting: false,
          walletName: null,
          walletType: null,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, solanaWallet?.adapter.name, connecting]);

  // Sync connecting state
  useEffect(() => {
    // Only update if the value has actually changed
    if (walletStore.isConnecting !== connecting) {
      walletStore.setConnecting(connecting);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting]);

  // Fetch token balances for a list of tokens
  const fetchTokenBalances = useCallback(async (tokens: Token[]) => {
    if (!connected || !publicKey || !connection) return;

    setBalancesLoading(true);
    try {
      const balances: Record<string, bigint> = {};
      
      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      balances['So11111111111111111111111111111111111111112'] = BigInt(solBalance); // SOL mint

      // Fetch SPL token balances
      const tokenAccountPromises = tokens
        .filter(token => !token.isNative) // Skip SOL as we already have it
        .map(async (token) => {
          try {
            const mintPubkey = new PublicKey(token.mint);
            const associatedTokenAddress = await getAssociatedTokenAddress(
              mintPubkey,
              publicKey
            );

            const accountInfo = await connection.getTokenAccountBalance(associatedTokenAddress);
            if (accountInfo.value) {
              balances[token.mint] = BigInt(accountInfo.value.amount);
            }
          } catch (error) {
            // Token account doesn't exist or other error - balance is 0
            balances[token.mint] = BigInt(0);
          }
        });

      await Promise.all(tokenAccountPromises);
      setTokenBalances(balances);
    } catch (error) {
      console.error('Failed to fetch token balances:', error);
    } finally {
      setBalancesLoading(false);
    }
  }, [connected, publicKey, connection]);

  // Fetch token prices from Jupiter API
  const fetchTokenPrices = useCallback(async (tokens: Token[]) => {
    try {
      const mintAddresses = tokens.map(token => token.mint).join(',');
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mintAddresses}`);
      
      if (response.ok) {
        const data = await response.json();
        const prices: Record<string, number> = {};
        
        Object.entries(data.data || {}).forEach(([mint, priceData]: [string, any]) => {
          if (priceData && typeof priceData.price === 'number') {
            prices[mint] = priceData.price;
          }
        });
        
        setTokenPrices(prices);
      }
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
    }
  }, []);

  // Update SOL balance when wallet connects or network changes
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateBalance = async () => {
      if (connected && publicKey && connection) {
        try {
          const balance = await connection.getBalance(publicKey);
          walletStore.updateBalance(BigInt(balance));
          
          // Update SOL balance in token balances as well
          setTokenBalances(prev => ({
            ...prev,
            'So11111111111111111111111111111111111111112': BigInt(balance)
          }));
        } catch (error) {
          console.error('Failed to fetch SOL balance:', error);
        }
      }
    };

    if (connected && publicKey) {
      // Update balance immediately
      updateBalance();
      
      // Set up periodic balance updates every 30 seconds
      intervalId = setInterval(updateBalance, 30000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, connection]);

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      walletStore.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      // Force disconnect in store even if wallet disconnect fails
      walletStore.disconnect();
    }
  }, [disconnectWallet, walletStore]);

  // Get formatted SOL balance
  const getFormattedSolBalance = useCallback(() => {
    const balance = Number(walletStore.solBalance) / LAMPORTS_PER_SOL;
    return balance.toFixed(4);
  }, [walletStore.solBalance]);

  // Check if wallet can reconnect (for auto-reconnect functionality)
  // Use useMemo to compute based on store values without causing re-renders
  const canReconnectValue = useMemo(() => {
    const { connectionAttempts, lastConnectionAttempt } = walletStore;
    const maxAttempts = 3;
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    
    if (connectionAttempts >= maxAttempts && lastConnectionAttempt) {
      const timeSinceLastAttempt = Date.now() - lastConnectionAttempt;
      return timeSinceLastAttempt > cooldownPeriod;
    }
    
    return connectionAttempts < maxAttempts;
  }, [walletStore.connectionAttempts, walletStore.lastConnectionAttempt]);

  return {
    // Wallet state from store
    ...walletStore,
    
    // Computed properties
    isConnected: walletStore.isConnected && !!walletStore.address,
    formattedSolBalance: getFormattedSolBalance(),
    canReconnect: canReconnectValue,
    
    // Token balances and prices
    tokenBalances,
    tokenPrices,
    balancesLoading,
    
    // Actions
    disconnect: handleDisconnect,
    fetchTokenBalances,
    fetchTokenPrices,
    
    // Network info
    network,
    
    // Raw Solana wallet adapter data (for advanced use cases)
    // Full wallet adapter context for advanced operations
    solanaWallet: walletContext,
  };
};