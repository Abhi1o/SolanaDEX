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
            inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
            text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 
            focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200 ${className}
          `}
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Network Selector (if enabled) */}
      {showNetwork && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button
              disabled={isNetworkSwitching}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${getNetworkColor(network)}`} />
              <span className="capitalize">{network}</span>
              {isNetworkSwitching ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 ml-2"></div>
              ) : (
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              )}
            </Menu.Button>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                {['mainnet-beta', 'devnet', 'testnet'].map((net) => (
                  <Menu.Item key={net}>
                    {({ active }) => (
                      <button
                        onClick={() => handleNetworkSwitch(net)}
                        className={`${
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } ${
                          network === net ? 'bg-indigo-50 text-indigo-700' : ''
                        } group flex items-center w-full px-4 py-2 text-sm`}
                      >
                        <div className={`w-2 h-2 rounded-full mr-3 ${getNetworkColor(net)}`} />
                        <span className="capitalize">{net.replace('-beta', '')}</span>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}

      {/* Wallet Info */}
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <WalletIcon className="h-4 w-4 mr-2" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-500">{walletName}</span>
              <span className="font-mono">{shortenAddress(address || '')}</span>
            </div>
            {showBalance && (
              <div className="ml-3 text-right">
                <div className="text-xs text-gray-500">Balance</div>
                <div className="font-medium">{formattedSolBalance} SOL</div>
              </div>
            )}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div className="py-1">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">{walletName}</div>
                <div className="text-sm text-gray-500 font-mono">{address}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Balance: {formattedSolBalance} SOL
                </div>
              </div>
              
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => navigator.clipboard.writeText(address || '')}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } group flex items-center w-full px-4 py-2 text-sm`}
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
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } group flex items-center w-full px-4 py-2 text-sm`}
                  >
                    View on Solscan
                  </a>
                )}
              </Menu.Item>
              
              <div className="border-t border-gray-100">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleDisconnect}
                      className={`${
                        active ? 'bg-red-50 text-red-700' : 'text-red-600'
                      } group flex items-center w-full px-4 py-2 text-sm`}
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
      return 'bg-green-400';
    case 'devnet':
      return 'bg-yellow-400';
    case 'testnet':
      return 'bg-blue-400';
    default:
      return 'bg-gray-400';
  }
};