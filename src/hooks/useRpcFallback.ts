'use client';

import { useState, useCallback, useRef } from 'react';
import { Connection } from '@solana/web3.js';
import { SolanaCluster } from '@/types';
import { useNotificationStore } from '@/stores/notificationStore';

interface RpcEndpoint {
  url: string;
  cluster: SolanaCluster;
  priority: number;
}

interface UseRpcFallbackOptions {
  cluster: SolanaCluster;
  maxRetries?: number;
  timeout?: number;
}

interface UseRpcFallbackReturn {
  connection: Connection | null;
  currentEndpoint: string | null;
  isHealthy: boolean;
  executeWithFallback: <T>(
    operation: (connection: Connection) => Promise<T>
  ) => Promise<T>;
  checkHealth: () => Promise<boolean>;
}

// Default RPC endpoints for each cluster
const DEFAULT_ENDPOINTS: Record<SolanaCluster, RpcEndpoint[]> = {
  [SolanaCluster.MAINNET]: [
    { url: 'https://api.mainnet-beta.solana.com', cluster: SolanaCluster.MAINNET, priority: 1 },
    { url: 'https://solana-api.projectserum.com', cluster: SolanaCluster.MAINNET, priority: 2 },
  ],
  [SolanaCluster.DEVNET]: [
    { url: 'https://api.devnet.solana.com', cluster: SolanaCluster.DEVNET, priority: 1 },
  ],
  [SolanaCluster.TESTNET]: [
    { url: 'https://api.testnet.solana.com', cluster: SolanaCluster.TESTNET, priority: 1 },
  ],
  [SolanaCluster.LOCALNET]: [
    { url: 'http://localhost:8899', cluster: SolanaCluster.LOCALNET, priority: 1 },
  ],
};

export function useRpcFallback(options: UseRpcFallbackOptions): UseRpcFallbackReturn {
  const { cluster, maxRetries = 3, timeout = 30000 } = options;
  
  const [connection, setConnection] = useState<Connection | null>(null);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);
  
  const endpointIndexRef = useRef(0);
  const failedEndpointsRef = useRef<Set<string>>(new Set());
  
  const { showWarning, showError } = useNotificationStore();

  const getNextEndpoint = useCallback((): RpcEndpoint | null => {
    const endpoints = DEFAULT_ENDPOINTS[cluster];
    
    // Filter out failed endpoints
    const availableEndpoints = endpoints.filter(
      (ep) => !failedEndpointsRef.current.has(ep.url)
    );

    if (availableEndpoints.length === 0) {
      // Reset failed endpoints if all have failed
      failedEndpointsRef.current.clear();
      return endpoints[0] || null;
    }

    // Get next endpoint in rotation
    const endpoint = availableEndpoints[endpointIndexRef.current % availableEndpoints.length];
    endpointIndexRef.current++;
    
    return endpoint;
  }, [cluster]);

  const createConnection = useCallback((endpoint: RpcEndpoint): Connection => {
    return new Connection(endpoint.url, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: timeout,
    });
  }, [timeout]);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!connection) return false;

    try {
      const startTime = Date.now();
      await connection.getLatestBlockhash();
      const responseTime = Date.now() - startTime;

      // Consider unhealthy if response time > 5 seconds
      const healthy = responseTime < 5000;
      setIsHealthy(healthy);
      
      return healthy;
    } catch (error) {
      console.error('RPC health check failed:', error);
      setIsHealthy(false);
      return false;
    }
  }, [connection]);

  const executeWithFallback = useCallback(
    async <T,>(operation: (connection: Connection) => Promise<T>): Promise<T> => {
      let lastError: unknown;
      let attempts = 0;

      while (attempts < maxRetries) {
        try {
          // Get or create connection
          let conn = connection;
          
          if (!conn || !isHealthy) {
            const endpoint = getNextEndpoint();
            
            if (!endpoint) {
              throw new Error('No available RPC endpoints');
            }

            conn = createConnection(endpoint);
            setConnection(conn);
            setCurrentEndpoint(endpoint.url);
            
            if (attempts > 0) {
              showWarning(
                'Switching RPC',
                `Trying alternative endpoint...`,
                true
              );
            }
          }

          // Execute operation with timeout
          const result = await Promise.race([
            operation(conn),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('RPC request timeout')), timeout)
            ),
          ]);

          // Success - mark as healthy
          setIsHealthy(true);
          return result;
        } catch (error) {
          lastError = error;
          attempts++;

          console.error(`RPC operation failed (attempt ${attempts}/${maxRetries}):`, error);

          // Mark current endpoint as failed
          if (currentEndpoint) {
            failedEndpointsRef.current.add(currentEndpoint);
          }

          setIsHealthy(false);

          // If not last attempt, try next endpoint
          if (attempts < maxRetries) {
            const nextEndpoint = getNextEndpoint();
            if (nextEndpoint) {
              const newConnection = createConnection(nextEndpoint);
              setConnection(newConnection);
              setCurrentEndpoint(nextEndpoint.url);
            }
          }
        }
      }

      // All attempts failed
      showError(
        'RPC Connection Failed',
        'Unable to connect to Solana network. Please check your internet connection and try again.',
        false
      );

      throw lastError || new Error('RPC operation failed after all retries');
    },
    [
      connection,
      isHealthy,
      currentEndpoint,
      maxRetries,
      timeout,
      getNextEndpoint,
      createConnection,
      showWarning,
      showError,
    ]
  );

  return {
    connection,
    currentEndpoint,
    isHealthy,
    executeWithFallback,
    checkHealth,
  };
}
