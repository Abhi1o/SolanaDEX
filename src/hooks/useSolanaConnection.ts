'use client';

import { useMemo } from 'react';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { SolanaCluster } from '@/types';

interface UseSolanaConnectionReturn {
  connection: Connection;
  cluster: SolanaCluster;
  endpoint: string;
}

export function useSolanaConnection(cluster: SolanaCluster = SolanaCluster.MAINNET): UseSolanaConnectionReturn {
  const endpoint = useMemo(() => {
    // Use environment variables for custom RPC endpoints if available
    switch (cluster) {
      case SolanaCluster.MAINNET:
        return process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || clusterApiUrl('mainnet-beta');
      case SolanaCluster.DEVNET:
        return process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || clusterApiUrl('devnet');
      case SolanaCluster.TESTNET:
        return process.env.NEXT_PUBLIC_SOLANA_RPC_TESTNET || clusterApiUrl('testnet');
      case SolanaCluster.LOCALNET:
        return process.env.NEXT_PUBLIC_SOLANA_RPC_LOCALNET || 'http://localhost:8899';
      default:
        return clusterApiUrl('mainnet-beta');
    }
  }, [cluster]);

  const connection = useMemo(() => {
    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }, [endpoint]);

  return {
    connection,
    cluster,
    endpoint
  };
}