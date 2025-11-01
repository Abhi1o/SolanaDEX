/**
 * Solana Connection Pool with Round-Robin Load Balancing
 *
 * This module provides a connection pool that automatically distributes
 * RPC requests across multiple endpoints using round-robin rotation.
 * This helps avoid rate limiting (429 errors) by spreading the load.
 *
 * Key Features:
 * - Round-robin load balancing across multiple RPC endpoints
 * - Automatic failover to next endpoint on errors
 * - Health tracking for each endpoint
 * - Automatic recovery of failed endpoints
 * - Special handling for rate limit (429) errors
 *
 * @module connectionPool
 */

import { Connection, ConnectionConfig } from '@solana/web3.js';

export interface RpcEndpointConfig {
  url: string;
  weight?: number; // For weighted load balancing (future enhancement)
}

export interface ConnectionPoolConfig {
  endpoints: RpcEndpointConfig[];
  connectionConfig?: ConnectionConfig;
  healthCheckInterval?: number; // ms between health checks
  failureThreshold?: number; // number of failures before marking unhealthy
  recoveryTime?: number; // ms before retrying a failed endpoint
}

interface EndpointHealth {
  url: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  connection: Connection;
}

/**
 * Connection pool that rotates requests across multiple RPC endpoints
 */
export class SolanaConnectionPool {
  private endpoints: EndpointHealth[] = [];
  private currentIndex = 0;
  private config: Required<ConnectionPoolConfig>;

  constructor(config: ConnectionPoolConfig) {
    this.config = {
      endpoints: config.endpoints,
      connectionConfig: config.connectionConfig || {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      },
      healthCheckInterval: config.healthCheckInterval || 60000, // 1 minute
      failureThreshold: config.failureThreshold || 3,
      recoveryTime: config.recoveryTime || 30000, // 30 seconds
    };

    this.initializeEndpoints();
  }

  private initializeEndpoints(): void {
    this.endpoints = this.config.endpoints.map((endpoint) => ({
      url: endpoint.url,
      isHealthy: true,
      consecutiveFailures: 0,
      lastFailureTime: 0,
      lastSuccessTime: Date.now(),
      connection: new Connection(endpoint.url, this.config.connectionConfig),
    }));

    console.log(`🔗 Initialized connection pool with ${this.endpoints.length} endpoints`);
    this.endpoints.forEach((ep, idx) => {
      console.log(`   ${idx + 1}. ${ep.url}`);
    });
  }

  /**
   * Get the next healthy endpoint using round-robin rotation
   */
  private getNextEndpoint(skipCurrent = false): EndpointHealth | null {
    const now = Date.now();

    // Allow recovery of failed endpoints after recovery time
    this.endpoints.forEach((endpoint) => {
      if (
        !endpoint.isHealthy &&
        now - endpoint.lastFailureTime > this.config.recoveryTime
      ) {
        console.log(`✅ Recovering endpoint: ${endpoint.url}`);
        endpoint.isHealthy = true;
        endpoint.consecutiveFailures = 0;
      }
    });

    // Filter to healthy endpoints
    const healthyEndpoints = this.endpoints.filter((ep) => ep.isHealthy);

    if (healthyEndpoints.length === 0) {
      console.error('❌ No healthy RPC endpoints available!');
      // Force recovery of least recently failed endpoint
      const leastRecentlyFailed = this.endpoints.reduce((prev, current) =>
        prev.lastFailureTime < current.lastFailureTime ? prev : current
      );
      leastRecentlyFailed.isHealthy = true;
      leastRecentlyFailed.consecutiveFailures = 0;
      return leastRecentlyFailed;
    }

    if (skipCurrent) {
      this.currentIndex++;
    }

    // Round-robin selection
    const selectedIndex = this.currentIndex % healthyEndpoints.length;
    const selected = healthyEndpoints[selectedIndex];

    this.currentIndex++;

    return selected;
  }

  /**
   * Mark an endpoint as failed
   */
  private markEndpointFailed(url: string, error: any): void {
    const endpoint = this.endpoints.find((ep) => ep.url === url);
    if (!endpoint) return;

    endpoint.consecutiveFailures++;
    endpoint.lastFailureTime = Date.now();

    const isRateLimitError =
      error?.message?.includes('429') ||
      error?.status === 429 ||
      error?.code === 429;

    if (isRateLimitError) {
      console.warn(`⚠️  Rate limit (429) hit on ${url}, rotating to next endpoint`);
      // Immediately mark as unhealthy for rate limits
      endpoint.isHealthy = false;
    } else if (endpoint.consecutiveFailures >= this.config.failureThreshold) {
      console.warn(
        `⚠️  Endpoint ${url} marked unhealthy after ${endpoint.consecutiveFailures} failures`
      );
      endpoint.isHealthy = false;
    }
  }

  /**
   * Mark an endpoint as successful
   */
  private markEndpointSuccess(url: string): void {
    const endpoint = this.endpoints.find((ep) => ep.url === url);
    if (!endpoint) return;

    endpoint.consecutiveFailures = 0;
    endpoint.lastSuccessTime = Date.now();

    if (!endpoint.isHealthy) {
      console.log(`✅ Endpoint ${url} recovered and marked healthy`);
      endpoint.isHealthy = true;
    }
  }

  /**
   * Get a connection using round-robin load balancing
   *
   * @returns Connection from the next endpoint in rotation
   */
  public getConnection(): Connection {
    const endpoint = this.getNextEndpoint();
    if (!endpoint) {
      throw new Error('No available RPC endpoints');
    }

    return endpoint.connection;
  }

  /**
   * Execute an RPC operation with automatic failover
   *
   * @param operation - Function that performs the RPC call
   * @param maxRetries - Maximum number of retry attempts
   * @returns Result of the operation
   */
  public async executeWithFailover<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: any;
    let attempts = 0;

    while (attempts < maxRetries) {
      const endpoint = this.getNextEndpoint(attempts > 0);

      if (!endpoint) {
        throw new Error('No available RPC endpoints');
      }

      try {
        const result = await operation(endpoint.connection);
        this.markEndpointSuccess(endpoint.url);
        return result;
      } catch (error: any) {
        lastError = error;
        attempts++;

        this.markEndpointFailed(endpoint.url, error);

        if (attempts >= maxRetries) {
          console.error(
            `❌ Operation failed after ${attempts} attempts across multiple endpoints`
          );
          throw lastError;
        }

        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
      }
    }

    throw lastError || new Error('Operation failed');
  }

  /**
   * Get the current endpoint URL being used
   */
  public getCurrentEndpoint(): string | null {
    const healthyEndpoints = this.endpoints.filter((ep) => ep.isHealthy);
    if (healthyEndpoints.length === 0) return null;

    const index = (this.currentIndex - 1) % healthyEndpoints.length;
    return healthyEndpoints[index]?.url || null;
  }

  /**
   * Get health status of all endpoints
   */
  public getHealth(): {
    url: string;
    isHealthy: boolean;
    consecutiveFailures: number;
    lastFailureTime: number;
    lastSuccessTime: number;
  }[] {
    return this.endpoints.map((ep) => ({
      url: ep.url,
      isHealthy: ep.isHealthy,
      consecutiveFailures: ep.consecutiveFailures,
      lastFailureTime: ep.lastFailureTime,
      lastSuccessTime: ep.lastSuccessTime,
    }));
  }
}

// Default devnet connection pool
// To add your own RPC providers:
// 1. Get API keys from providers (helius.dev, quicknode.com, alchemy.com)
// 2. Add them to .env.local (e.g., NEXT_PUBLIC_HELIUS_API_KEY=your-key)
// 3. Uncomment the lines below for the providers you want to use
const DEVNET_ENDPOINTS: RpcEndpointConfig[] = [
  // Free public endpoints (already included)
  { url: 'https://api.devnet.solana.com' },
  { url: 'https://rpc.ankr.com/solana_devnet' },
  { url: 'https://devnet.helius-rpc.com/?api-key=public' },

  // Helius with your API key (RECOMMENDED - get free key at helius.dev)
  // Uncomment after adding NEXT_PUBLIC_HELIUS_API_KEY to .env.local:
  // ...(process.env.NEXT_PUBLIC_HELIUS_API_KEY
  //   ? [{ url: `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` }]
  //   : []),

  // QuickNode (get endpoint at quicknode.com)
  // Uncomment after adding NEXT_PUBLIC_QUICKNODE_DEVNET_URL to .env.local:
  // ...(process.env.NEXT_PUBLIC_QUICKNODE_DEVNET_URL
  //   ? [{ url: process.env.NEXT_PUBLIC_QUICKNODE_DEVNET_URL }]
  //   : []),

  // Alchemy (get key at alchemy.com)
  // Uncomment after adding NEXT_PUBLIC_ALCHEMY_DEVNET_URL to .env.local:
  // ...(process.env.NEXT_PUBLIC_ALCHEMY_DEVNET_URL
  //   ? [{ url: process.env.NEXT_PUBLIC_ALCHEMY_DEVNET_URL }]
  //   : []),

  // Syndica (get key at syndica.io)
  // Uncomment after adding NEXT_PUBLIC_SYNDICA_API_KEY to .env.local:
  // ...(process.env.NEXT_PUBLIC_SYNDICA_API_KEY
  //   ? [{ url: `https://solana-devnet.syndica.io/access-token/${process.env.NEXT_PUBLIC_SYNDICA_API_KEY}` }]
  //   : []),

  // Custom RPC endpoint
  // Uncomment after adding NEXT_PUBLIC_CUSTOM_RPC_DEVNET to .env.local:
  // ...(process.env.NEXT_PUBLIC_CUSTOM_RPC_DEVNET
  //   ? [{ url: process.env.NEXT_PUBLIC_CUSTOM_RPC_DEVNET }]
  //   : []),
];

// Singleton instance for devnet
let devnetPool: SolanaConnectionPool | null = null;

/**
 * Get or create the default devnet connection pool
 */
export function getDevnetConnectionPool(): SolanaConnectionPool {
  if (!devnetPool) {
    devnetPool = new SolanaConnectionPool({
      endpoints: DEVNET_ENDPOINTS,
      connectionConfig: {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      },
    });
  }
  return devnetPool;
}

/**
 * Get a connection from the devnet pool with automatic load balancing
 */
export function getDevnetConnection(): Connection {
  return getDevnetConnectionPool().getConnection();
}
