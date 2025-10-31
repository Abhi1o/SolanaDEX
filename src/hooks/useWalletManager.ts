import { useCallback, useEffect, useRef } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWalletStore } from '../stores/walletStore';
import { useSolanaNetwork } from '../providers/SolanaWalletProvider';
import { SolanaCluster, WalletType } from '../types';

interface WalletManagerOptions {
  autoReconnect?: boolean;
  balanceUpdateInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWalletManager = (options: WalletManagerOptions = {}) => {
  const {
    autoReconnect = true,
    balanceUpdateInterval = 30000, // 30 seconds
    maxReconnectAttempts = 3,
  } = options;

  const walletStore = useWalletStore();
  const { 
    publicKey, 
    connected, 
    connecting, 
    disconnect: disconnectWallet,
    connect: connectWallet,
    wallet: solanaWallet,
    select,
    wallets,
  } = useSolanaWallet();
  const { connection } = useConnection();
  const { network, switchNetwork } = useSolanaNetwork();

  // Refs for cleanup
  const balanceIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Convert network string to SolanaCluster enum
  const getCurrentCluster = useCallback((): SolanaCluster => {
    switch (network) {
      case 'mainnet-beta':
        return SolanaCluster.MAINNET;
      case 'devnet':
        return SolanaCluster.DEVNET;
      case 'testnet':
        return SolanaCluster.TESTNET;
      // 'localnet' is not part of SolanaNetwork in config; no case needed
      default:
        return SolanaCluster.DEVNET;
    }
  }, [network]);

  // Get wallet type from adapter name
  const getWalletType = useCallback((adapterName: string): WalletType => {
    switch (adapterName.toLowerCase()) {
      case 'phantom':
        return WalletType.PHANTOM;
      case 'solflare':
        return WalletType.SOLFLARE;
      case 'backpack':
        return WalletType.BACKPACK;
      case 'sollet':
        return WalletType.SOLLET;
      case 'ledger':
        return WalletType.LEDGER;
      default:
        return WalletType.PHANTOM;
    }
  }, []);

  // Update SOL balance
  const updateBalance = useCallback(async (pubKey?: PublicKey) => {
    const targetPublicKey = pubKey || publicKey;
    if (!targetPublicKey || !connection) return;

    try {
      const balance = await connection.getBalance(targetPublicKey);
      walletStore.updateBalance(BigInt(balance));
    } catch (error) {
      console.error('Failed to update SOL balance:', error);
    }
  }, [publicKey, connection, walletStore]);

  // Update token accounts
  const updateTokenAccounts = useCallback(async (pubKey?: PublicKey) => {
    const targetPublicKey = pubKey || publicKey;
    if (!targetPublicKey || !connection) return;

    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        targetPublicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const formattedAccounts = tokenAccounts.value.map(account => ({
        address: account.pubkey,
        mint: new PublicKey(account.account.data.parsed.info.mint),
        owner: new PublicKey(account.account.data.parsed.info.owner),
        amount: BigInt(account.account.data.parsed.info.tokenAmount.amount),
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
        isAssociated: true, // Assume associated token accounts for now
      }));

      walletStore.updateTokenAccounts(formattedAccounts);
    } catch (error) {
      console.error('Failed to update token accounts:', error);
    }
  }, [publicKey, connection, walletStore]);

  // Handle wallet connection
  const handleConnect = useCallback(async (walletName?: string) => {
    try {
      walletStore.setConnecting(true);
      walletStore.setConnectionError(null);

      if (walletName) {
        // Select specific wallet
        const targetWallet = wallets.find(w => w.adapter.name === walletName);
        if (targetWallet) {
          select(targetWallet.adapter.name);
          // Wait for selection to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await connectWallet();
      walletStore.resetConnectionAttempts();
    } catch (error) {
      console.error('Wallet connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      walletStore.setConnectionError(errorMessage);
      walletStore.incrementConnectionAttempts();
      throw error;
    } finally {
      walletStore.setConnecting(false);
    }
  }, [wallets, select, connectWallet, walletStore]);

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      // Clear intervals
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      await disconnectWallet();
      walletStore.disconnect();
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      // Force disconnect in store even if wallet disconnect fails
      walletStore.disconnect();
    }
  }, [disconnectWallet, walletStore]);

  // Handle network switching
  const handleNetworkSwitch = useCallback(async (newNetwork: string) => {
    try {
      // Disconnect wallet before switching networks to avoid conflicts
      if (connected) {
        await handleDisconnect();
      }

      // Switch network
      await switchNetwork(newNetwork as any);
      
      // Update cluster in store
      walletStore.setCluster(getCurrentCluster());
    } catch (error) {
      console.error('Network switch failed:', error);
      throw error;
    }
  }, [connected, handleDisconnect, switchNetwork, walletStore, getCurrentCluster]);

  // Auto-reconnect functionality
  const attemptReconnect = useCallback(async () => {
    if (!autoReconnect || walletStore.connectionAttempts >= maxReconnectAttempts) {
      return;
    }

    const { walletName } = walletStore;
    if (!walletName) return;

    try {
      console.log(`Attempting to reconnect to ${walletName}...`);
      await handleConnect(walletName);
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      
      // Schedule next reconnect attempt with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, walletStore.connectionAttempts), 30000);
      reconnectTimeoutRef.current = setTimeout(attemptReconnect, delay);
    }
  }, [autoReconnect, maxReconnectAttempts, walletStore, handleConnect]);

  // Sync wallet state with store
  useEffect(() => {
    if (connected && publicKey && solanaWallet) {
      const walletType = getWalletType(solanaWallet.adapter.name);
      
      walletStore.setWallet({
        publicKey,
        address: publicKey.toString(),
        isConnected: true,
        isConnecting: false,
        cluster: getCurrentCluster(),
        walletType,
        walletName: solanaWallet.adapter.name,
      });

      // Update balance and token accounts
      updateBalance(publicKey);
      updateTokenAccounts(publicKey);

      // Set up periodic balance updates
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
      balanceIntervalRef.current = setInterval(() => {
        updateBalance(publicKey);
        updateTokenAccounts(publicKey);
      }, balanceUpdateInterval);

    } else if (!connected && !connecting) {
      // Handle disconnection
      if (walletStore.isConnected) {
        walletStore.setWallet({
          publicKey: null,
          address: null,
          isConnected: false,
          isConnecting: false,
        });

        // Clear balance update interval
        if (balanceIntervalRef.current) {
          clearInterval(balanceIntervalRef.current);
        }

        // Attempt auto-reconnect if enabled and not manually disconnected
        if (autoReconnect && walletStore.walletName) {
          reconnectTimeoutRef.current = setTimeout(attemptReconnect, 2000);
        }
      }
    }
  }, [
    connected, 
    publicKey, 
    solanaWallet, 
    connecting, 
    walletStore, 
    getWalletType, 
    getCurrentCluster, 
    updateBalance, 
    updateTokenAccounts, 
    balanceUpdateInterval,
    autoReconnect,
    attemptReconnect
  ]);

  // Update connecting state
  useEffect(() => {
    walletStore.setConnecting(connecting);
  }, [connecting, walletStore]);

  // Update cluster when network changes
  useEffect(() => {
    walletStore.setCluster(getCurrentCluster());
  }, [network, walletStore, getCurrentCluster]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Auto-reconnect on page load if wallet was previously connected
  useEffect(() => {
    const { walletName, isConnected } = walletStore;
    
    // Only attempt auto-reconnect if:
    // 1. Auto-reconnect is enabled
    // 2. Wallet was previously connected (stored in persistence)
    // 3. Not currently connected
    // 4. Not currently connecting
    // 5. Can still attempt reconnection
    if (
      autoReconnect && 
      walletName && 
      !isConnected && 
      !connected && 
      !connecting &&
      walletStore.connectionAttempts < maxReconnectAttempts
    ) {
      // Delay auto-reconnect to allow wallet adapters to initialize
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, 1000);
    }
  }, []); // Only run on mount

  return {
    // Wallet state
    ...walletStore,
    
    // Computed properties
    isConnected: walletStore.isConnected && !!walletStore.address,
    formattedSolBalance: (Number(walletStore.solBalance) / LAMPORTS_PER_SOL).toFixed(4),
    
    // Actions
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchNetwork: handleNetworkSwitch,
    updateBalance,
    updateTokenAccounts,
    
    // Network info
    network,
    cluster: getCurrentCluster(),
    
    // Reconnection info
    canReconnect: walletStore.connectionAttempts < maxReconnectAttempts,
    reconnectAttempts: walletStore.connectionAttempts,
  };
};