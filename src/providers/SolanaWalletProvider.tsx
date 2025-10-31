'use client';

import React, { FC, ReactNode, useMemo, useCallback, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { Adapter } from '@solana/wallet-adapter-base';

import {
  SolanaNetwork,
  solanaConnectionManager,
  getSolanaConnection,
  DEFAULT_SOLANA_CONFIG,
} from '../config/solana';
import {
  createWalletAdapters,
  getWalletAdapterNetwork,
} from '../config/wallets';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: ReactNode;
  network?: SolanaNetwork;
  autoConnect?: boolean;
  onError?: (error: WalletError) => void;
}

interface SolanaContextValue {
  network: SolanaNetwork;
  switchNetwork: (network: SolanaNetwork) => Promise<void>;
  isNetworkSwitching: boolean;
}

const SolanaContext = React.createContext<SolanaContextValue | undefined>(undefined);

export const useSolanaNetwork = () => {
  const context = React.useContext(SolanaContext);
  if (!context) {
    throw new Error('useSolanaNetwork must be used within SolanaWalletProvider');
  }
  return context;
};

const SolanaNetworkProvider: FC<{
  children: ReactNode;
  network: SolanaNetwork;
  onNetworkChange: (network: SolanaNetwork) => void;
}> = ({ children, network, onNetworkChange }) => {
  const [isNetworkSwitching, setIsNetworkSwitching] = React.useState(false);
  const { disconnect } = useWallet();

  const switchNetwork = useCallback(async (newNetwork: SolanaNetwork) => {
    if (newNetwork === network) return;

    setIsNetworkSwitching(true);
    try {
      // Disconnect wallet when switching networks to avoid conflicts
      await disconnect();
      
      // Switch the connection manager to new network
      await solanaConnectionManager.switchNetwork(newNetwork);
      
      // Update the network in parent component
      onNetworkChange(newNetwork);
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsNetworkSwitching(false);
    }
  }, [network, disconnect, onNetworkChange]);

  const contextValue = useMemo(() => ({
    network,
    switchNetwork,
    isNetworkSwitching,
  }), [network, switchNetwork, isNetworkSwitching]);

  return (
    <SolanaContext.Provider value={contextValue}>
      {children}
    </SolanaContext.Provider>
  );
};

export const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({
  children,
  network: initialNetwork = DEFAULT_SOLANA_CONFIG.network,
  autoConnect = true,
  onError,
}) => {
  const [currentNetwork, setCurrentNetwork] = React.useState<SolanaNetwork>(initialNetwork);
  
  // Memoize the connection endpoint
  const endpoint = useMemo(() => {
    const connection = getSolanaConnection(currentNetwork);
    return connection.rpcEndpoint;
  }, [currentNetwork]);

  // Memoize wallet adapters for current network
  const wallets = useMemo(() => {
    return createWalletAdapters(currentNetwork);
  }, [currentNetwork]);

  // Handle wallet errors
  const handleError = useCallback((error: WalletError) => {
    console.error('Wallet error:', error);
    
    // Handle specific error types
    if (error.name === 'WalletConnectionError') {
      console.error('Failed to connect wallet:', error.message);
    } else if (error.name === 'WalletDisconnectedError') {
      console.error('Wallet disconnected:', error.message);
    } else if (error.name === 'WalletSignTransactionError') {
      console.error('Failed to sign transaction:', error.message);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // Update connection manager when network changes
  useEffect(() => {
    solanaConnectionManager.switchNetwork(currentNetwork);
  }, [currentNetwork]);

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{
        commitment: DEFAULT_SOLANA_CONFIG.commitment,
        confirmTransactionInitialTimeout: 60000,
      }}
    >
      <WalletProvider 
        wallets={wallets} 
        autoConnect={autoConnect}
        onError={handleError}
      >
        <WalletModalProvider>
          <SolanaNetworkProvider
            network={currentNetwork}
            onNetworkChange={setCurrentNetwork}
          >
            {children}
          </SolanaNetworkProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Hook for accessing Solana connection with network awareness
export const useSolanaConnection = () => {
  const { connection } = useConnection();
  const { network } = useSolanaNetwork();
  
  return {
    connection,
    network,
    connectionManager: solanaConnectionManager,
  };
};

// Hook for wallet operations with enhanced error handling
export const useSolanaWallet = () => {
  const wallet = useWallet();
  const { network, switchNetwork, isNetworkSwitching } = useSolanaNetwork();
  
  const connectWallet = useCallback(async () => {
    try {
      if (!wallet.wallet) {
        throw new Error('No wallet selected');
      }
      
      await wallet.connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, [wallet]);

  const disconnectWallet = useCallback(async () => {
    try {
      await wallet.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }, [wallet]);

  return {
    ...wallet,
    network,
    switchNetwork,
    isNetworkSwitching,
    connectWallet,
    disconnectWallet,
  };
};