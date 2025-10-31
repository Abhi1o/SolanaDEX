'use client';

import { useMemo } from 'react';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { SolanaCluster } from '@/types';

interface UseSolanaConnectionReturn {
  connection: Connection;
  cluster: SolanaCluster;
  endpoint: string;
}

export function useSolanaConnection(cluster?: SolanaCluster): UseSolanaConnectionReturn {
  // Get cluster from environment or use provided cluster or default to DEVNET
  const activeCluster = useMemo(() => {
    if (cluster) return cluster;
    
    const envNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
    if (envNetwork === 'mainnet-beta') return SolanaCluster.MAINNET;
    if (envNetwork === 'devnet') return SolanaCluster.DEVNET;
    if (envNetwork === 'testnet') return SolanaCluster.TESTNET;
    if (envNetwork === 'localnet') return SolanaCluster.LOCALNET;
    
    return SolanaCluster.DEVNET;
  }, [cluster]);

  const endpoint = useMemo(() => {
    // Use environment variables for custom RPC endpoints if available
    switch (activeCluster) {
      case SolanaCluster.MAINNET:
        // Try custom endpoint first, then use public RPC as fallback
        return (
          process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
          process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
          'https://api.mainnet-beta.solana.com'
        );
      case SolanaCluster.DEVNET:
        return process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
      case SolanaCluster.TESTNET:
        return process.env.NEXT_PUBLIC_SOLANA_RPC_TESTNET || 'https://api.testnet.solana.com';
      case SolanaCluster.LOCALNET:
        return process.env.NEXT_PUBLIC_SOLANA_RPC_LOCALNET || 'http://localhost:8899';
      default:
        return 'https://api.devnet.solana.com';
    }
  }, [activeCluster]);

  const connection = useMemo(() => {
    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      // Add fetch options for better error handling
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
          },
        });
      },
    });
  }, [endpoint]);

  return {
    connection,
    cluster: activeCluster,
    endpoint
  };
}
