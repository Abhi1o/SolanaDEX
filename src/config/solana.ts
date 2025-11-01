import { Connection, clusterApiUrl } from '@solana/web3.js';

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

export interface SolanaConfig {
  network: SolanaNetwork;
  rpcUrl: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
}

// RPC endpoint configuration with fallbacks
export const RPC_ENDPOINTS: Record<SolanaNetwork, string[]> = {
  'mainnet-beta': [
    process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com',
    clusterApiUrl('mainnet-beta'),
  ],
  devnet: [
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com',
    'https://solana-devnet.g.alchemy.com/v2/-f0lKfodonOgvqviPDgyB',
    'https://devnet.helius-rpc.com/?api-key=f4d5ea3d-bea6-48f6-ba0f-323908a8f19b',
    clusterApiUrl('devnet'),
  ],
  testnet: [
    process.env.NEXT_PUBLIC_SOLANA_RPC_TESTNET || 'https://api.testnet.solana.com',
    clusterApiUrl('testnet'),
  ],
};

// Default configuration
export const DEFAULT_SOLANA_CONFIG: SolanaConfig = {
  network: (process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork) || 'devnet',
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || RPC_ENDPOINTS.devnet[0],
  commitment: 'confirmed',
};

// Connection manager class for handling multiple RPC endpoints
export class SolanaConnectionManager {
  private connections: Map<SolanaNetwork, Connection> = new Map();
  private currentNetwork: SolanaNetwork;
  private currentEndpointIndex: Map<SolanaNetwork, number> = new Map();

  constructor(initialNetwork: SolanaNetwork = DEFAULT_SOLANA_CONFIG.network) {
    this.currentNetwork = initialNetwork;
    this.initializeConnections();
  }

  private initializeConnections(): void {
    Object.keys(RPC_ENDPOINTS).forEach((network) => {
      const networkKey = network as SolanaNetwork;
      this.currentEndpointIndex.set(networkKey, 0);
      this.createConnection(networkKey);
    });
  }

  private createConnection(network: SolanaNetwork): Connection {
    const endpoints = RPC_ENDPOINTS[network];
    const endpointIndex = this.currentEndpointIndex.get(network) || 0;
    const rpcUrl = endpoints[endpointIndex];
    
    const connection = new Connection(rpcUrl, {
      commitment: DEFAULT_SOLANA_CONFIG.commitment,
      confirmTransactionInitialTimeout: 60000,
    });
    
    this.connections.set(network, connection);
    return connection;
  }

  public getConnection(network?: SolanaNetwork): Connection {
    const targetNetwork = network || this.currentNetwork;
    const connection = this.connections.get(targetNetwork);
    
    if (!connection) {
      return this.createConnection(targetNetwork);
    }
    
    return connection;
  }

  public async switchNetwork(network: SolanaNetwork): Promise<Connection> {
    this.currentNetwork = network;
    return this.getConnection(network);
  }

  public getCurrentNetwork(): SolanaNetwork {
    return this.currentNetwork;
  }

  public async testConnection(network?: SolanaNetwork): Promise<boolean> {
    try {
      const connection = this.getConnection(network);
      await connection.getLatestBlockhash();
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${network || this.currentNetwork}:`, error);
      return false;
    }
  }

  public async switchToFallbackEndpoint(network?: SolanaNetwork): Promise<Connection> {
    const targetNetwork = network || this.currentNetwork;
    const endpoints = RPC_ENDPOINTS[targetNetwork];
    const currentIndex = this.currentEndpointIndex.get(targetNetwork) || 0;
    const nextIndex = (currentIndex + 1) % endpoints.length;
    
    this.currentEndpointIndex.set(targetNetwork, nextIndex);
    return this.createConnection(targetNetwork);
  }
}

// Global connection manager instance
export const solanaConnectionManager = new SolanaConnectionManager();

// Utility functions
export const getSolanaConnection = (network?: SolanaNetwork): Connection => {
  return solanaConnectionManager.getConnection(network);
};

export const switchSolanaNetwork = async (network: SolanaNetwork): Promise<Connection> => {
  return solanaConnectionManager.switchNetwork(network);
};