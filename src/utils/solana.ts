import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Solana utility functions
export const getSolanaConnection = (cluster: 'mainnet-beta' | 'devnet' | 'testnet' = 'devnet') => {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(cluster);
  return new Connection(endpoint, 'confirmed');
};

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};