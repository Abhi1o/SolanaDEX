'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { useSolanaWallet, useSolanaNetwork } from '../../providers/SolanaWalletProvider';
import { useWalletStore } from '../../stores/walletStore';
import { WALLET_CONFIGS, getPopularWallets, getMobileWallets, isMobileDevice } from '../../config/wallets';
import { WalletType, SolanaCluster } from '../../types';

interface SolanaWalletConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (walletName: string) => void;
  onError?: (error: Error) => void;
}

interface WalletOption {
  name: string;
  icon: string;
  description: string;
  adapter: any;
  installed: boolean;
  popular?: boolean;
  mobile?: boolean;
}

export const SolanaWalletConnector: React.FC<SolanaWalletConnectorProps> = ({
  isOpen,
  onClose,
  onConnect,
  onError,
}) => {
  const { wallets, select, connect, connecting, connected, wallet, publicKey } = useWallet();
  const { network } = useSolanaNetwork();
  const { setWallet } = useWalletStore();
  
  const [selectedWallet, setSelectedWallet] = useState<WalletName | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Get available wallet options
  const getWalletOptions = useCallback((): WalletOption[] => {
    const isMobile = isMobileDevice();
    const availableWallets = wallets.map(wallet => {
      const config = WALLET_CONFIGS[wallet.adapter.name];
      return {
        name: wallet.adapter.name,
        icon: config?.icon || '',
        description: config?.description || 'Solana wallet',
        adapter: wallet.adapter,
        installed: wallet.readyState === 'Installed',
        popular: config?.popular || false,
        mobile: config?.mobile || false,
      };
    });

    // Filter wallets based on device type
    if (isMobile) {
      return availableWallets.filter(wallet => wallet.mobile || wallet.installed);
    }

    return availableWallets;
  }, [wallets]);

  // Handle wallet selection and connection
  const handleWalletSelect = useCallback(async (walletName: WalletName) => {
    try {
      setConnectionError(null);
      setIsConnecting(true);
      setSelectedWallet(walletName);

      // Select the wallet
      select(walletName);
      
      // Wait a bit for the wallet to be selected
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Connect to the wallet
      await connect();
      
    } catch (error) {
      console.error('Wallet connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setConnectionError(errorMessage);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    } finally {
      setIsConnecting(false);
      setSelectedWallet(null);
    }
  }, [select, connect, onError]);

  // Handle successful connection
  useEffect(() => {
    if (connected && publicKey && wallet) {
      const walletType = getWalletType(wallet.adapter.name);
      
      // Update wallet store
      setWallet({
        publicKey,
        address: publicKey.toString(),
        isConnected: true,
        isConnecting: false,
        cluster: getClusterFromNetwork(network),
        walletType,
        walletName: wallet.adapter.name,
      });

      // Notify parent component
      if (onConnect) {
        onConnect(wallet.adapter.name);
      }

      // Close modal
      onClose();
    }
  }, [connected, publicKey, wallet, network, setWallet, onConnect, onClose]);

  // Handle connection state changes
  useEffect(() => {
    setIsConnecting(connecting);
  }, [connecting]);

  // Clear error when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConnectionError(null);
      setSelectedWallet(null);
    }
  }, [isOpen]);

  const walletOptions = getWalletOptions();
  const popularWallets = walletOptions.filter(w => w.popular);
  const otherWallets = walletOptions.filter(w => !w.popular);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Connect Wallet
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Connect your Solana wallet to start trading on {network}
                  </p>
                </div>

                {connectionError && (
                  <div className="mb-4 rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Connection Failed
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{connectionError}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Popular Wallets */}
                  {popularWallets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Popular Wallets
                      </h4>
                      <div className="space-y-2">
                        {popularWallets.map((walletOption) => (
                          <WalletOptionButton
                            key={walletOption.name}
                            wallet={walletOption}
                            isConnecting={isConnecting && selectedWallet === walletOption.name}
                            onClick={() => handleWalletSelect(walletOption.name as WalletName)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Wallets */}
                  {otherWallets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Other Wallets
                      </h4>
                      <div className="space-y-2">
                        {otherWallets.map((walletOption) => (
                          <WalletOptionButton
                            key={walletOption.name}
                            wallet={walletOption}
                            isConnecting={isConnecting && selectedWallet === walletOption.name}
                            onClick={() => handleWalletSelect(walletOption.name as WalletName)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-xs text-gray-500 text-center">
                    By connecting a wallet, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Wallet option button component
interface WalletOptionButtonProps {
  wallet: WalletOption;
  isConnecting: boolean;
  onClick: () => void;
}

const WalletOptionButton: React.FC<WalletOptionButtonProps> = ({
  wallet,
  isConnecting,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
        wallet.installed
          ? 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
      } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={wallet.installed && !isConnecting ? onClick : undefined}
      disabled={!wallet.installed || isConnecting}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 w-8 h-8 mr-3">
          {wallet.icon ? (
            <img
              src={wallet.icon}
              alt={`${wallet.name} icon`}
              className="w-8 h-8 rounded"
              onError={(e) => {
                // Fallback to text if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {wallet.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {wallet.name}
          </div>
          <div className="text-xs text-gray-500">
            {wallet.description}
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        {isConnecting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        ) : !wallet.installed ? (
          <span className="text-xs text-gray-400">Not installed</span>
        ) : (
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        )}
      </div>
    </button>
  );
};

// Utility functions
const getWalletType = (walletName: string): WalletType => {
  switch (walletName.toLowerCase()) {
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
      return WalletType.PHANTOM; // Default fallback
  }
};

const getClusterFromNetwork = (network: string): SolanaCluster => {
  switch (network) {
    case 'mainnet-beta':
      return SolanaCluster.MAINNET;
    case 'devnet':
      return SolanaCluster.DEVNET;
    case 'testnet':
      return SolanaCluster.TESTNET;
    case 'localnet':
      return SolanaCluster.LOCALNET;
    default:
      return SolanaCluster.DEVNET;
  }
};