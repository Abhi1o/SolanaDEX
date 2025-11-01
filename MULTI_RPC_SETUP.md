# Multi-RPC Setup with Load Balancing

## Overview

To prevent rate limiting (429 errors) on devnet RPC endpoints, the application now uses a **connection pool** with automatic load balancing across multiple RPC providers.

## How It Works

### 1. Connection Pool Architecture

The `SolanaConnectionPool` class manages multiple RPC endpoints and distributes requests using round-robin load balancing:

```
Request 1 → api.devnet.solana.com
Request 2 → rpc.ankr.com/solana_devnet
Request 3 → devnet.helius-rpc.com
Request 4 → api.devnet.solana.com (back to first)
...
```

### 2. RPC Endpoints Used (Devnet)

The application automatically rotates between these free devnet RPC endpoints:

1. **Solana Official**: `https://api.devnet.solana.com`
2. **Ankr**: `https://rpc.ankr.com/solana_devnet`
3. **Helius (Public)**: `https://devnet.helius-rpc.com/?api-key=public`

### 3. Automatic Failover

When an endpoint fails or returns a rate limit error (429):

1. The endpoint is marked as unhealthy
2. The next request automatically uses the next endpoint in rotation
3. Failed endpoints are retried after a recovery period (30 seconds)
4. The system tracks health of each endpoint independently

### 4. Benefits

- **No more 429 errors**: Load is distributed across multiple providers
- **Better reliability**: If one endpoint goes down, others continue working
- **Automatic recovery**: Failed endpoints are retried periodically
- **Transparent**: Works automatically without code changes

## Usage

### Basic Usage (Automatic)

The connection pool is automatically used for all devnet connections:

```typescript
import { useSolanaConnection } from '@/hooks';

function MyComponent() {
  // Automatically uses connection pool for devnet
  const { connection } = useSolanaConnection();

  // Use connection normally - load balancing happens automatically
  const balance = await connection.getBalance(publicKey);
}
```

### Advanced Usage (With Failover)

For critical operations, use the connection pool directly with automatic failover:

```typescript
import { useConnectionPool } from '@/hooks';

function MyComponent() {
  const { executeWithFailover } = useConnectionPool();

  // Execute with automatic retry across multiple endpoints
  const balance = await executeWithFailover(async (conn) => {
    return await conn.getBalance(publicKey);
  }, 3); // max 3 retries
}
```

### Monitoring Endpoint Health

You can check the health status of all RPC endpoints:

```typescript
import { useConnectionPool } from '@/hooks';

function HealthMonitor() {
  const { getHealth, getCurrentEndpoint } = useConnectionPool();

  // Get current endpoint being used
  console.log('Current endpoint:', getCurrentEndpoint());

  // Get health status of all endpoints
  const health = getHealth();
  health.forEach(endpoint => {
    console.log(`${endpoint.url}:`);
    console.log(`  Healthy: ${endpoint.isHealthy}`);
    console.log(`  Failures: ${endpoint.consecutiveFailures}`);
  });
}
```

## Configuration

### Adding More Endpoints

To add more RPC endpoints, edit `/src/lib/solana/connectionPool.ts`:

```typescript
const DEVNET_ENDPOINTS: RpcEndpointConfig[] = [
  { url: 'https://api.devnet.solana.com' },
  { url: 'https://rpc.ankr.com/solana_devnet' },
  { url: 'https://devnet.helius-rpc.com/?api-key=public' },
  // Add your custom endpoint here:
  { url: 'https://your-custom-rpc.com' },
];
```

### Adjusting Failover Behavior

You can configure the connection pool behavior:

```typescript
new SolanaConnectionPool({
  endpoints: DEVNET_ENDPOINTS,
  failureThreshold: 3,      // Mark unhealthy after 3 failures
  recoveryTime: 30000,       // Retry after 30 seconds
  healthCheckInterval: 60000 // Check health every 60 seconds
});
```

## Files Modified

- **`src/lib/solana/connectionPool.ts`**: Connection pool implementation
- **`src/hooks/useSolanaConnection.ts`**: Updated to use connection pool for devnet
- **`src/hooks/useConnectionPool.ts`**: Hook for advanced pool usage
- **`src/hooks/useRpcFallback.ts`**: Enhanced with multiple devnet endpoints
- **`src/config/solana.ts`**: Added multiple RPC endpoints

## Troubleshooting

### Still Getting 429 Errors?

1. Check if all endpoints are healthy:
   ```typescript
   const { getHealth } = useConnectionPool();
   console.log(getHealth());
   ```

2. All endpoints might be rate-limited. Wait a few minutes or add more endpoints.

3. Consider using a paid RPC provider for higher limits:
   - [Helius](https://helius.dev/)
   - [QuickNode](https://quicknode.com/)
   - [Alchemy](https://alchemy.com/)

### Monitoring in Console

The connection pool logs helpful information:

- `🔗 Initialized connection pool with X endpoints` - Pool started
- `🔀 Rotating to RPC endpoint: <url>` - Switched to new endpoint
- `⚠️  Rate limit (429) hit on <url>` - Endpoint rate limited
- `✅ Endpoint <url> recovered` - Endpoint is healthy again

## Performance Impact

- **Minimal overhead**: Round-robin selection is O(1)
- **Better performance**: Load distribution prevents bottlenecks
- **Automatic optimization**: Unhealthy endpoints are skipped

## Future Enhancements

- [ ] Weighted load balancing (prioritize faster endpoints)
- [ ] Response time tracking
- [ ] Automatic endpoint discovery
- [ ] Support for mainnet and testnet pools
- [ ] Metrics dashboard for endpoint performance
