'use client';

import React, { useState } from 'react';
import { WalletIcon, Cog6ToothIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWallet } from '../hooks/useWallet';
import { useSolanaNetwork } from '../providers/SolanaWalletProvider';
import { shortenAddress } from '../utils/solana-programs';
import { WalletConnectButton } from './wallet/WalletConnectButton';
import { NetworkSwitcher } from './NetworkSwitcher';

interface WalletStatusProps {
  showNetworkSwitcher?: boolean;
  showBalance?: boolean;
  className?: string;
}

export const WalletStatus: React.FC<WalletStatusProps> = ({
  showNetworkSwitcher = true,
  showBalance = true,
  className = '',
}) => {
  const { 
    isConnected, 
    isConnecting, 
    address, 
    walletName, 
    formattedSolBalance,
    connectionError,
    connectionAttempts,
    canReconnect,
  } = useWallet();
  const { network } = useSolanaNetwork();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={`flex flex-col space-y-4 p-6 bg-white rounded-lg shadow-md ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <WalletIcon className="h-6 w-6 mr-2" />
          Wallet Status
        </h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Advanced settings"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-3">
        {/* Network Information */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Network:</span>
          {showNetworkSwitcher ? (
            <NetworkSwitcher />
          ) : (
            <span className="text-sm text-gray-900 capitalize">{network}</span>
          )}
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-400' : isConnecting ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-600' : isConnecting ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {/* Wallet Information */}
        {walletName && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Wallet:</span>
            <span className="text-sm text-gray-900">{walletName}</span>
          </div>
        )}
        
        {/* Address */}
        {address && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Address:</span>
            <button
              onClick={() => navigator.clipboard.writeText(address)}
              className="text-sm text-gray-900 font-mono hover:text-indigo-600 transition-colors"
              title="Click to copy"
            >
              {shortenAddress(address)}
            </button>
          </div>
        )}

        {/* Balance */}
        {isConnected && showBalance && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">SOL Balance:</span>
            <span className="text-sm text-gray-900 font-mono">{formattedSolBalance}</span>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-md">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Connection Error</p>
              <p className="text-xs text-red-600 mt-1">{connectionError}</p>
              {connectionAttempts > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Reconnect attempts: {connectionAttempts}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Advanced Information */}
        {showAdvanced && (
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Can Reconnect:</span>
              <span className="text-xs text-gray-700">{canReconnect ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Reconnect Attempts:</span>
              <span className="text-xs text-gray-700">{connectionAttempts}</span>
            </div>
            {address && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Full Address:</span>
                <span className="text-xs text-gray-700 font-mono break-all">{address}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Connection Button */}
      <div className="pt-2">
        <WalletConnectButton 
          className="w-full justify-center"
          showBalance={false}
          showNetwork={false}
        />
      </div>

      {/* Explorer Link */}
      {isConnected && address && (
        <div className="pt-2 border-t border-gray-200">
          <a
            href={`https://solscan.io/account/${address}?cluster=${network}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View on Solscan →
          </a>
        </div>
      )}
    </div>
  );
};