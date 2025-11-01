# Design Document

## Overview

This design addresses the pool data fetching and display issues by refactoring the data flow architecture, improving error handling, optimizing caching strategies, and cleaning up UI indicators. The solution focuses on making blockchain data the primary source, implementing robust retry logic, removing misleading UI elements, and ensuring smooth user experience during data updates.

## Architecture

### Current Issues

1. **Data Flow Problems**
   - Config data is treated as live data
   - Blockchain fetcher doesn't properly override config values
   - Hard refresh doesn't clear cached state
   - Multiple data sources create confusion

2. **Error Handling Gaps**
   - "Not connected" errors shown prematurely
   - No automatic retry on timeout
   - Exponential backoff not working correctly
   - Error states persist even when data is available

3. **UI/UX Issues**
   - Loading indicators never disappear
   - "Best shard" labels are hardcoded and misleading
   - Background refresh is too prominent
   - No clear distinction between live and cached data

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Pools Page                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Initial Load: Show skeleton                           │ │
│  │  Data Loaded: Show pools (hide all loading indicators) │ │
│  │  Background Refresh: Silent update                     │ │
│  │  Error: Show banner with retry (keep showing data)     │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    usePoolRefresh Hook                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - Manages refresh lifecycle                           │ │
│  │  - Implements retry logic with exponential backoff     │ │
│  │  - Tracks loading states (initial vs background)       │ │
│  │  - Provides manual refresh function                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Pool Store                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  State:                                                 │ │
│  │  - pools: Pool[]                                        │ │
│  │  - isInitialLoad: boolean                               │ │
│  │  - isBackgroundRefresh: boolean                         │ │
│  │  - error: Error | null                                  │ │
│  │  - lastFetchTime: number                                │ │
│  │  - consecutiveFailures: number                          │ │
│  │                                                          │ │
│  │  Actions:                                                │ │
│  │  - fetchPools(connection, isInitial)                    │ │
│  │  - refreshPools(connection)                             │ │
│  │  - clearCache()                                         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Blockchain Fetcher Service                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - fetchPoolData(connection, poolAddress)              │ │
│  │  - fetchPoolReserves(connection, tokenAccounts)        │ │
│  │  - enrichPoolsWithBlockchainData(connection, pools)    │ │
│  │  - Timeout handling (5 seconds)                        │ │
│  │  - Retry logic with exponential backoff                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Pool Store Enhancements

**Purpose**: Centralized state management for pool data with clear loading states

**Interface**:
```typescript
interface PoolStore {
  // State
  pools: Pool[];
  isInitialLoad: boolean;        // NEW: Track initial vs background load
  isBackgroundRefresh: boolean;  // NEW: Track background refresh
  error: Error | null;
  lastFetchTime: number;
  consecutiveFailures: number;
  
  // Actions
  fetchPools(connection: Connection, isInitial: boolean): Promise<void>;
  refreshPools(connection: Connection): Promise<void>;
  clearCache(): void;             // NEW: Clear all cached data
  resetErrors(): void;            // NEW: Reset error state
}
```

**Key Changes**:
- Separate `isInitialLoad` from `isBackgroundRefresh` for different UI states
- Add `clearCache()` to support hard refresh
- Remove reliance on config data as fallback
- Track fetch type (initial vs background) for appropriate UI feedback

### 2. usePoolRefresh Hook Refactor

**Purpose**: Manage refresh lifecycle with improved retry logic

**Interface**:
```typescript
interface UsePoolRefreshOptions {
  enabled: boolean;
  refreshInterval: number;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

interface UsePoolRefreshReturn {
  isInitialLoad: boolean;         // NEW: Initial load in progress
  isBackgroundRefresh: boolean;   // NEW: Background refresh in progress
  lastRefreshTime: number;
  error: Error | null;
  consecutiveFailures: number;
  manualRefresh: () => Promise<void>;
  clearAndRefresh: () => Promise<void>; // NEW: For hard refresh
}
```

**Key Changes**:
- Distinguish between initial load and background refresh
- Add `clearAndRefresh()` for hard refresh scenarios
- Implement proper exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- Only show errors after 3 consecutive failures
- Silent background refresh (no prominent indicators)

### 3. Blockchain Fetcher Improvements

**Purpose**: Reliable data fetching with timeout and retry handling

**Key Changes**:
- Add 5-second timeout for all RPC calls
- Implement retry logic at the service level
- Return detailed error information (timeout vs network vs invalid data)
- Remove fallback to config data (let store handle fallbacks)
- Batch fetch operations for efficiency

**New Functions**:
```typescript
// Fetch with timeout
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T>

// Retry with exponential backoff
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number
): Promise<T>
```

### 4. Pools Page UI Cleanup

**Purpose**: Clean, informative UI without misleading indicators

**Key Changes**:
- Show skeleton loader only during initial load (`isInitialLoad === true`)
- Remove all loading overlays when data is present
- Remove "Updating pool data", "Refreshing", "Fetching blockchain data" text
- Remove "Best shard" badges and star icons
- Show small "Last updated" timestamp instead of prominent indicators
- Display error banner only after 3+ consecutive failures
- Keep data visible even during errors

**Loading States**:
```typescript
// Initial Load (no data yet)
if (isInitialLoad && pools.length === 0) {
  return <SkeletonLoader />;
}

// Background Refresh (data already present)
if (isBackgroundRefresh && pools.length > 0) {
  // Show data normally, no loading indicators
  // Optional: small spinner in corner
}

// Error State (with data)
if (error && consecutiveFailures >= 3 && pools.length > 0) {
  return (
    <>
      <ErrorBanner error={error} onRetry={manualRefresh} />
      <PoolList pools={pools} /> {/* Keep showing data */}
    </>
  );
}

// Error State (no data)
if (error && pools.length === 0) {
  return <ErrorState error={error} onRetry={manualRefresh} />;
}

// Success State
return <PoolList pools={pools} />;
```

## Data Models

### Pool Data Source Tracking

```typescript
interface Pool {
  // ... existing fields ...
  
  // Data source tracking
  dataSource: 'blockchain' | 'cached';  // Simplified: only blockchain or cached
  lastBlockchainFetch: number;          // Timestamp of last successful fetch
  blockchainFetchError: string | null;  // Last error message if any
  isFresh: boolean;                     // True if fetched within last 60 seconds
}
```

**Changes**:
- Remove 'config' and 'hybrid' data sources
- All data must come from blockchain (fresh) or cache (stale blockchain data)
- Track freshness explicitly with `isFresh` boolean
- Store last error for debugging

### Loading State Model

```typescript
interface LoadingState {
  type: 'initial' | 'background' | 'manual' | 'idle';
  startTime: number;
  poolsToFetch: number;
  poolsFetched: number;
}
```

**Purpose**: Track different types of loading operations for appropriate UI feedback

## Error Handling

### Error Classification

```typescript
enum PoolFetchErrorType {
  TIMEOUT = 'timeout',           // RPC call exceeded timeout
  NETWORK = 'network',           // Network connectivity issue
  INVALID_DATA = 'invalid_data', // Pool account data is invalid
  RPC_ERROR = 'rpc_error',       // RPC returned error response
  UNKNOWN = 'unknown'            // Unclassified error
}

interface PoolFetchError extends Error {
  type: PoolFetchErrorType;
  poolAddress?: string;
  retryable: boolean;
  timestamp: number;
}
```

### Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;        // 5 attempts
  baseDelay: number;         // 1000ms (1 second)
  maxDelay: number;          // 30000ms (30 seconds)
  multiplier: number;        // 2 (exponential)
  timeoutMs: number;         // 5000ms (5 seconds per attempt)
}

// Retry delays: 1s, 2s, 4s, 8s, 16s, 30s (capped)
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.multiplier, attempt);
  return Math.min(delay, config.maxDelay);
}
```

### Error Display Strategy

1. **First Failure** (attempt 1):
   - Log to console
   - No user notification
   - Retry after 1 second

2. **Second Failure** (attempt 2):
   - Log to console
   - No user notification
   - Retry after 2 seconds

3. **Third Failure** (attempt 3):
   - Log to console
   - Show subtle warning toast: "Having trouble connecting..."
   - Retry after 4 seconds

4. **Fourth+ Failures** (attempts 4+):
   - Log to console
   - Show error banner: "Unable to fetch live data. Displaying cached information."
   - Continue retrying with exponential backoff
   - Provide manual retry button

5. **Recovery**:
   - Clear error banner
   - Show success toast: "Connection restored"
   - Resume normal refresh interval

## Testing Strategy

### Unit Tests

1. **Pool Store Tests**
   - Test `fetchPools()` with successful response
   - Test `fetchPools()` with timeout error
   - Test `fetchPools()` with network error
   - Test `clearCache()` clears all state
   - Test `refreshPools()` doesn't clear existing data on failure
   - Test consecutive failure tracking

2. **usePoolRefresh Hook Tests**
   - Test initial load triggers fetch
   - Test background refresh at interval
   - Test manual refresh
   - Test hard refresh clears cache
   - Test exponential backoff delays
   - Test error state after 3 failures
   - Test recovery after success

3. **Blockchain Fetcher Tests**
   - Test `fetchWithTimeout()` respects timeout
   - Test `fetchWithRetry()` implements exponential backoff
   - Test `fetchPoolReserves()` handles invalid accounts
   - Test `enrichPoolsWithBlockchainData()` handles partial failures
   - Test error classification

### Integration Tests

1. **Pool Page Load Flow**
   - Test initial page load shows skeleton
   - Test successful data fetch shows pools
   - Test failed fetch shows error state
   - Test hard refresh clears and refetches

2. **Background Refresh Flow**
   - Test background refresh updates data silently
   - Test background refresh failure doesn't clear data
   - Test background refresh shows error banner after 3 failures

3. **Error Recovery Flow**
   - Test retry after timeout
   - Test exponential backoff delays
   - Test error banner appears after 3 failures
   - Test manual retry resets failure count
   - Test success after failures shows recovery message

### Manual Testing Scenarios

1. **Normal Operation**
   - Load pools page → Should show skeleton then pools
   - Wait 30 seconds → Should refresh silently
   - Check console → Should see successful fetch logs

2. **Network Issues**
   - Disconnect network → Should show error after 3 attempts
   - Reconnect network → Should recover automatically
   - Check data → Should still show cached pools during outage

3. **Hard Refresh**
   - Load pools page with cached data
   - Perform browser hard refresh (Cmd+Shift+R)
   - Should clear cache and fetch fresh data
   - Should show skeleton during initial load

4. **Manual Retry**
   - Trigger error state (disconnect network)
   - Wait for error banner to appear
   - Click retry button
   - Should attempt immediate fetch

## Performance Considerations

### Optimization Strategies

1. **Parallel Fetching**
   - Fetch all pool data in parallel using `Promise.all()`
   - Batch RPC calls where possible
   - Don't block on individual pool failures

2. **Caching**
   - Cache pool data in memory (Zustand store)
   - Consider cached data fresh for 60 seconds
   - Use cached data during background refresh failures

3. **Debouncing**
   - Debounce manual refresh to prevent spam
   - Minimum 1 second between manual refreshes

4. **Lazy Loading**
   - Load pool list first
   - Load detailed pool data on demand
   - Defer loading of secondary metrics (volume, fees)

### Performance Metrics

- **Initial Load Time**: < 2 seconds (target)
- **Background Refresh Time**: < 1 second (target)
- **Time to Interactive**: < 3 seconds (target)
- **RPC Call Timeout**: 5 seconds (hard limit)
- **Refresh Interval**: 30 seconds (configurable)

## Migration Plan

### Phase 1: Store and Hook Refactor
1. Update `poolStore.ts` with new state fields
2. Refactor `usePoolRefresh.ts` with loading state tracking
3. Add `clearCache()` and `resetErrors()` functions
4. Update tests

### Phase 2: Blockchain Fetcher Improvements
1. Add timeout wrapper function
2. Implement retry logic with exponential backoff
3. Add error classification
4. Remove config fallback logic
5. Update tests

### Phase 3: UI Cleanup
1. Remove "Best shard" badges and logic
2. Update loading state conditions
3. Remove persistent loading indicators
4. Add error banner component
5. Add "Last updated" timestamp
6. Update tests

### Phase 4: Testing and Validation
1. Run unit tests
2. Run integration tests
3. Perform manual testing scenarios
4. Monitor error logs
5. Gather user feedback

## Rollback Plan

If issues arise:
1. Revert UI changes (Phase 3) - restore previous loading indicators
2. Revert blockchain fetcher changes (Phase 2) - restore config fallback
3. Revert store changes (Phase 1) - restore previous state structure
4. Monitor for stability
5. Investigate root cause before re-attempting

## Success Criteria

1. ✅ No hardcoded pool data displayed as live data
2. ✅ No "not connected" errors during normal operation
3. ✅ No persistent loading indicators when data is loaded
4. ✅ No "Best shard" labels or badges
5. ✅ Automatic retry on timeout with exponential backoff
6. ✅ Error banner appears only after 3+ consecutive failures
7. ✅ Hard refresh clears cache and fetches fresh data
8. ✅ Background refresh is silent (no prominent indicators)
9. ✅ Initial load completes within 2 seconds
10. ✅ Data stays visible during error states
