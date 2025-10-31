'use client';

import React, { FC, ReactNode, useEffect, useCallback, createContext, useContext } from 'react';
import { useWalletManager } from '../hooks/useWalletManager';
import { walletPersistence } from '../services/walletPersistence';
import { SolanaWalletProvider } from './SolanaWalletProvider';
import { SolanaNetwork } from '../config/solana';

interface EnhancedWalletContextValue {
  // Wallet manager functions
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (network: string) => Promise<void>;
  
  // Auto-reconnect controls
  enableAutoReconnect: () => void;
  disableAutoReconnect: () => void;
  isAutoReconnectEnabled: boolean;
  
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  canReconnect: boolean;
  reconnectAttempts: number;
  
  // Wallet info
  address: string | null;
  walletName: string | null;
  formattedSolBalance: string;
  network: string;
  cluster: string;
}

const EnhancedWalletContext = createContext<EnhancedWalletContextValue | undefined>(undefined);

export const useEnhancedWallet = () => {
  const context = useContext(EnhancedWalletContext);
  if (!context) {
    throw new Error('useEnhancedWallet must be used within EnhancedWalletProvider');
  }
  return context;
};

interface EnhancedWalletProviderProps {
  children: ReactNode;
  network?: SolanaNetwork;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
}

const EnhancedWalletProviderInner: FC<{ children: ReactNode }> = ({ children }) => {
  const walletManager = useWalletManager({
    autoReconnect: true,
    balanceUpdateInterval: 30000,
    maxReconnectAttempts: 3,
  });

  // Handle auto-reconnect preference
  const enableAutoReconnect = useCallback(() => {
    walletPersistence.setAutoReconnect(true);
  }, []);

  const disableAutoReconnect = useCallback(() => {
    walletPersistence.setAutoReconnect(false);
  }, []);

  const isAutoReconnectEnabled = walletPersistence.shouldAutoReconnect();

  // Enhanced connect function that saves persistence data
  const enhancedConnect = useCallback(async (walletName?: string) => {
    try {
      await walletManager.connect(walletName);
      
      // Save connection data for persistence
      if (walletManager.address && walletManager.walletName) {
        walletPersistence.saveWalletConnection({
          walletName: walletManager.walletName as any,
          address: walletManager.address,
          cluster: walletManager.network,
          autoReconnect: true,
        });
      }
    } catch (error) {
      console.error('Enhanced connect failed:', error);
      throw error;
    }
  }, [walletManager]);

  // Enhanced disconnect function that clears persistence data
  const enhancedDisconnect = useCallback(async () => {
    try {
      await walletManager.disconnect();
      walletPersistence.clearWalletConnection();
    } catch (error) {
      console.error('Enhanced disconnect failed:', error);
      throw error;
    }
  }, [walletManager]);

  // Enhanced network switch function
  const enhancedSwitchNetwork = useCallback(async (network: string) => {
    try {
      await walletManager.switchNetwork(network);
      
      // Update persistence data with new network
      const persistedData = walletPersistence.getWalletConnection();
      if (persistedData) {
        walletPersistence.saveWalletConnection({
          ...persistedData,
          cluster: network,
        });
      }
    } catch (error) {
      console.error('Enhanced network switch failed:', error);
      throw error;
    }
  }, [walletManager]);

  // Update persistence timestamp when wallet connects
  useEffect(() => {
    if (walletManager.isConnected) {
      walletPersistence.updateLastConnected();
    }
  }, [walletManager.isConnected]);

  const contextValue: EnhancedWalletContextValue = {
    // Wallet manager functions
    connect: enhancedConnect,
    disconnect: enhancedDisconnect,
    switchNetwork: enhancedSwitchNetwork,
    
    // Auto-reconnect controls
    enableAutoReconnect,
    disableAutoReconnect,
    isAutoReconnectEnabled,
    
    // Connection state
    isConnected: walletManager.isConnected,
    isConnecting: walletManager.isConnecting,
    connectionError: walletManager.connectionError,
    canReconnect: walletManager.canReconnect,
    reconnectAttempts: walletManager.reconnectAttempts,
    
    // Wallet info
    address: walletManager.address,
    walletName: walletManager.walletName,
    formattedSolBalance: walletManager.formattedSolBalance,
    network: walletManager.network,
    cluster: walletManager.cluster,
  };

  return (
    <EnhancedWalletContext.Provider value={contextValue}>
      {children}
    </EnhancedWalletContext.Provider>
  );
};

export const EnhancedWalletProvider: FC<EnhancedWalletProviderProps> = ({
  children,
  network,
  autoConnect = true,
  onError,
}) => {
  return (
    <SolanaWalletProvider
      network={network}
      autoConnect={autoConnect}
      onError={onError}
    >
      <EnhancedWalletProviderInner>
        {children}
      </EnhancedWalletProviderInner>
    </SolanaWalletProvider>
  );
};