'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDownIcon, WalletIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { SolanaWalletConnector } from './SolanaWalletConnector';
import { useWallet } from '../../hooks/useWallet';
import { useSolanaNetwork } from '../../providers/SolanaWalletProvider';
import { shortenAddress } from '../../utils/solana-programs';

interface WalletConnectButtonProps {
  className?: string;
  showBalance?: boolean;
  showNetwork?: boolean;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  className = '',
  showBalance = true,
  showNetwork = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { 
    isConnected, 
    address, 
    walletName, 
    formattedSolBalance, 
    disconnect,
    connectionError,
    isConnecting,
  } = useWallet();
  const { network, switchNetwork, isNetworkSwitching } = useSolanaNetwork();

  const handleConnect = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [disconnect]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleWalletConnected = useCallback((walletName: string) => {
    console.log(`Connected to ${walletName}`);
    setIsModalOpen(false);
  }, []);

  const handleConnectionError = useCallback((error: Error) => {
    console.error('Wallet connection error:', error);
  }, []);

  const handleNetworkSwitch = useCallback(async (newNetwork: string) => {
    try {
      await switchNetwork(newNetwork as any);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  }, [switchNetwork]);

  if (!isConnected) {
    return (
      <>
        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className={`
            inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
            text-white bg-white/10 hover:bg-white/20 border border-white/10
            focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 ${className}
          `}
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
              Connecting...
            </>
          ) : (
            <>
              <WalletIcon className="h-4 w-4 mr-2" />
              Connect Wallet
            </>
          )}
        </button>

        <SolanaWalletConnector
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onConnect={handleWalletConnected}
          onError={handleConnectionError}
        />
      </>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {/* Wallet Info */}
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex items-center px-4 py-2 border border-white/10 bg-white/10 hover:bg-white/20 text-sm font-medium rounded-lg text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black">
            <WalletIcon className="h-4 w-4 mr-2" />
            <span className="font-mono text-xs">{shortenAddress(address || '')}</span>
            <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-150"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 rounded-lg backdrop-blur-xl bg-black/90 border border-white/10 shadow-lg focus:outline-none z-50 overflow-hidden">
            <div className="py-1">
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-sm font-medium text-white mb-1">{walletName}</div>
                <div className="text-xs text-gray-400 font-mono break-all">{address}</div>
              </div>
              
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => navigator.clipboard.writeText(address || '')}
                    className={`${
                      active ? 'bg-white/10 text-white' : 'text-gray-300'
                    } group flex items-center w-full px-4 py-2 text-sm font-medium transition-all duration-200`}
                  >
                    Copy Address
                  </button>
                )}
              </Menu.Item>
              
              <Menu.Item>
                {({ active }) => (
                  <a
                    href={`https://solscan.io/account/${address}?cluster=${network}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${
                      active ? 'bg-white/10 text-white' : 'text-gray-300'
                    } group flex items-center w-full px-4 py-2 text-sm font-medium transition-all duration-200`}
                  >
                    View on Solscan
                  </a>
                )}
              </Menu.Item>
              
              <div className="border-t border-white/10 mt-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleDisconnect}
                      className={`${
                        active ? 'bg-white/10 text-red-400' : 'text-red-400'
                      } group flex items-center w-full px-4 py-2 text-sm font-medium transition-all duration-200`}
                    >
                      Disconnect
                    </button>
                  )}
                </Menu.Item>
              </div>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      {connectionError && (
        <div className="text-xs text-red-600 max-w-xs truncate" title={connectionError}>
          {connectionError}
        </div>
      )}
    </div>
  );
};

// Utility function to get network indicator color
const getNetworkColor = (network: string): string => {
  switch (network) {
    case 'mainnet-beta':
      return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]';
    case 'devnet':
      return 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
    case 'testnet':
      return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]';
    default:
      return 'bg-gray-400';
  }
};