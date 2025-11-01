# Design Document

## Overview

This design integrates the SAMM Router backend API into the existing sharded DEX swap mechanism. The backend API (http://saigreen.cloud:3000) provides intelligent shard selection by analyzing real-time pool states across all available shards and recommending the optimal route for each trade.

The integration will enhance the current local shard selection with backend-powered routing while maintaining backward compatibility through a fallback mechanism. The design prioritizes minimal disruption to existing code while adding robust API integration capabilities.

## Architecture

### High-Level Flow

```
User Input → Frontend Debounce → Backend API Request → Response Processing → Quote Display
                                         ↓ (on failure)
                                   Local Fallback Logic → Quote Display
```

### Component Interaction

```
ShardedSwapInterface (UI)
         ↓
    useShardedDex (Hook)
         ↓
  ShardedDexService (lib/shardedDex.ts)
         ↓
  ┌──────────────────┐
  │                  │
  ↓                  ↓
Backend API    Local Calculation
(Primary)         (Fallback)
```

## Components and Interfaces

### 1. Backend API Service

**New File:** `src/services/sammRouterService.ts`

This service encapsulates all backend API communication logic.

```typescript
export interface RouteRequest {
  tokenA: string;        // Token A mint address (base-58)
  tokenB: string;        // Token B mint address (base-58)
  inputToken: string;    // Which token is being input (tokenA or tokenB)
  inputAmount: string;   // Amount in base units (string to handle large numbers)
  trader: string;        // Trader wallet address (base-58)
}

export interface RouteResponse {
  success: boolean;
  data?: {
    shard: {
      id: string;
      address: string;
      tokenPair: {
        tokenA: string;
        tokenB: string;
      };
      reserves: {
        tokenA: string;
        tokenB: string;
      };
    };
    expectedOutput: string;  // In base units
    priceImpact: number;     // As decimal (e.g., 0.05 for 5%)
    reason: string;          // Explanation of shard selection
  };
  error?: string;
}

export class SammRouterService {
  private baseUrl: string;
  private timeout: number = 5000; // 5 second timeout
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 
      process.env.NEXT_PUBLIC_SAMM_ROUTER_API_URL || 
      'http://saigreen.cloud:3000';
  }
  
  async getRoute(request: RouteRequest): Promise<RouteResponse> {
    // Implementation with fetch, timeout, error handling
  }
  
  async healthCheck(): Promise<boolean> {
    // Check if API is available
  }
}
```

### 2. Enhanced ShardedDexService

**Modified File:** `src/lib/shardedDex.ts`

Add backend routing integration to the existing service.

```typescript
export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  estimatedOutput: number;
  priceImpact: number;
  route: ShardRoute[];
  totalFee: number;
  routingMethod: 'backend' | 'local';  // NEW: Track routing method
  backendReason?: string;               // NEW: Backend selection reason
}

class ShardedDexService {
  private sammRouter: SammRouterService;
  
  constructor() {
    // ... existing code ...
    this.sammRouter = new SammRouterService();
  }
  
  async getQuote(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number
  ): Promise<SwapQuote> {
    // Try backend routing first
    try {
      const backendQuote = await this.getQuoteFromBackend(
        inputTokenSymbol,
        outputTokenSymbol,
        inputAmount
      );
      return backendQuote;
    } catch (error) {
      console.warn('Backend routing failed, falling back to local:', error);
      // Fall back to existing local logic
      return this.getQuoteLocal(inputTokenSymbol, outputTokenSymbol, inputAmount);
    }
  }
  
  private async getQuoteFromBackend(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number
  ): Promise<SwapQuote> {
    // NEW: Backend routing implementation
  }
  
  private async getQuoteLocal(
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    inputAmount: number
  ): Promise<SwapQuote> {
    // REFACTORED: Existing getQuote logic moved here
  }
}
```

### 3. UI Enhancements

**Modified File:** `src/components/swap/ShardedSwapInterface.tsx`

Add routing method indicator to the quote display.

```typescript
{quote && !quoteLoading && (
  <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 rounded-2xl p-4 mb-4 space-y-2">
    {/* NEW: Routing Method Indicator */}
    <div className="flex justify-between text-sm mb-2 pb-2 border-b border-white/10">
      <span className="text-gray-400">Routing Method:</span>
      <span className={`font-medium px-2 py-1 rounded-full text-xs ${
        quote.routingMethod === 'backend' 
          ? 'bg-green-500/20 text-green-400' 
          : 'bg-yellow-500/20 text-yellow-400'
      }`}>
        {quote.routingMethod === 'backend' ? '✓ Backend Routing' : '⚠ Local Routing'}
      </span>
    </div>
    
    {/* Existing quote details */}
    {/* ... */}
    
    {/* NEW: Backend reason if available */}
    {quote.backendReason && (
      <div className="text-xs text-gray-400 italic mt-2">
        {quote.backendReason}
      </div>
    )}
  </div>
)}
```

## Data Models

### Environment Configuration

Add to `.env.example` and `.env.local`:

```bash
# SAMM Router Backend API
NEXT_PUBLIC_SAMM_ROUTER_API_URL=http://saigreen.cloud:3000
```

### API Request/Response Flow

**Request Example:**
```json
{
  "tokenA": "BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa",
  "tokenB": "F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu",
  "inputToken": "BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa",
  "inputAmount": "121000000",
  "trader": "HzkaW8LY5uDaDpSvEscSEcrTnngSgwAvsQZzVzCk6TvX"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "shard": {
      "id": "pool_id_here",
      "address": "PoolAddressBase58",
      "tokenPair": {
        "tokenA": "BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa",
        "tokenB": "F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu"
      },
      "reserves": {
        "tokenA": "1000000000",
        "tokenB": "1000000000"
      }
    },
    "expectedOutput": "120500000",
    "priceImpact": 0.0041,
    "reason": "Selected shard with lowest price impact"
  }
}
```

### Token Mint Address Mapping

The backend expects token mint addresses, but the UI works with symbols. We need to map between them:

```typescript
// In ShardedDexService
private getTokenMintBySymbol(symbol: string): string {
  const token = dexConfig.tokens.find(t => t.symbol === symbol);
  if (!token) {
    throw new Error(`Token ${symbol} not found in configuration`);
  }
  return token.mint;
}
```

## Error Handling

### Error Categories and Responses

1. **Network Errors** (timeout, connection refused)
   - Action: Fall back to local routing
   - User Message: "Using local routing (backend unavailable)"
   - Log: Full error details

2. **API Errors** (4xx, 5xx responses)
   - Action: Fall back to local routing
   - User Message: "Using local routing (backend error)"
   - Log: Response status and body

3. **Invalid Response** (malformed JSON, missing fields)
   - Action: Fall back to local routing
   - User Message: "Using local routing (invalid backend response)"
   - Log: Response parsing error

4. **Pool Not Found** (backend returns pool not in local config)
   - Action: Fall back to local routing
   - User Message: "Using local routing (pool mismatch)"
   - Log: Pool address mismatch details

### Error Handling Flow

```typescript
async getQuote(...): Promise<SwapQuote> {
  try {
    // Attempt backend routing
    const backendQuote = await this.getQuoteFromBackend(...);
    
    // Validate pool exists in local config
    const pool = dexConfig.pools.find(p => p.poolAddress === backendQuote.route[0].poolAddress);
    if (!pool) {
      throw new Error('Backend recommended pool not found in local configuration');
    }
    
    return backendQuote;
  } catch (error) {
    // Log error with context
    console.warn('Backend routing failed:', {
      error: error instanceof Error ? error.message : String(error),
      inputToken,
      outputToken,
      inputAmount,
      timestamp: new Date().toISOString()
    });
    
    // Fall back to local routing
    return this.getQuoteLocal(...);
  }
}
```

## Testing Strategy

### Unit Tests

1. **SammRouterService Tests**
   - Test successful API response parsing
   - Test timeout handling
   - Test network error handling
   - Test malformed response handling
   - Test health check functionality

2. **ShardedDexService Tests**
   - Test backend routing success path
   - Test fallback to local routing on API failure
   - Test pool validation after backend response
   - Test token mint address mapping
   - Test quote format consistency between backend and local

### Integration Tests

1. **End-to-End Quote Flow**
   - Mock backend API responses
   - Verify quote display shows correct routing method
   - Verify fallback behavior when API is unavailable
   - Verify swap execution uses correct pool address

2. **API Integration Tests**
   - Test against real backend API (in development environment)
   - Verify request format matches backend expectations
   - Verify response parsing handles all backend response variations
   - Test with different token pairs and amounts

### Manual Testing Checklist

- [ ] Quote displays "Backend Routing" indicator when API is available
- [ ] Quote displays "Local Routing" indicator when API fails
- [ ] Swap executes successfully with backend-selected shard
- [ ] Fallback works when backend is unreachable
- [ ] Environment variable configuration works correctly
- [ ] Error messages are user-friendly
- [ ] Console logs provide adequate debugging information
- [ ] Quote refresh maintains routing method consistency

## Performance Considerations

### API Request Optimization

1. **Debouncing**: Maintain existing 500ms debounce on user input
2. **Timeout**: Set 5-second timeout for backend requests to prevent hanging
3. **Caching**: Consider caching backend responses for identical requests within a short time window (optional enhancement)

### Fallback Performance

- Local routing should execute immediately if backend fails
- No additional delay should be introduced by attempting backend routing first
- Total quote time should not exceed: `backend_timeout (5s) + local_calculation_time (~100ms)`

### Monitoring

Log the following metrics for performance analysis:
- Backend API response time
- Backend API success/failure rate
- Fallback usage frequency
- Quote calculation time (backend vs local)

## Security Considerations

1. **API URL Validation**: Validate that the configured API URL uses HTTPS in production
2. **Input Sanitization**: Validate all user inputs before sending to backend API
3. **Response Validation**: Validate all backend responses match expected schema
4. **Wallet Address**: Never send private keys, only public wallet addresses
5. **CORS**: Ensure backend API has appropriate CORS headers configured

## Migration Strategy

### Phase 1: Add Backend Integration (Non-Breaking)
- Add SammRouterService
- Add backend routing to ShardedDexService with fallback
- Add routing method indicator to UI
- Deploy with feature flag (optional)

### Phase 2: Monitor and Optimize
- Monitor backend API performance
- Collect metrics on routing method usage
- Optimize timeout and retry logic based on real-world data

### Phase 3: Gradual Rollout
- Enable backend routing for all users
- Monitor error rates and fallback frequency
- Adjust configuration based on feedback

## Future Enhancements

1. **Multi-Shard Routing**: Support backend recommendations for split trades across multiple shards
2. **Route Caching**: Cache backend routes for identical requests to reduce API calls
3. **Predictive Routing**: Pre-fetch routes for common token pairs
4. **Analytics**: Track routing performance and user outcomes
5. **A/B Testing**: Compare backend vs local routing outcomes for optimization
