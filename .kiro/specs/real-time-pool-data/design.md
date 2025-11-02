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
- Separate `isInitialLoad` from `isBackgroundRefresh` for different UI states (Requirements 3.3, 3.4, 8.2)
- Add `clearCache()` to support hard refresh (Requirement 1.3)
- Remove reliance on config data as fallback (Requirement 1.4)
- Track fetch type (initial vs background) for appropriate UI feedback (Requirement 3.4)
- Track `consecutiveFailures` for error display logic (Requirement 6.3, 6.5)

**Design Rationale**: Centralizing state in the store ensures consistent behavior across all components using pool data. Separating initial and background loading states allows the UI to provide appropriate feedback without disrupting the user experience during updates.

### 2. usePoolRefresh Hook Refactor

**Purpose**: Manage refresh lifecycle with improved retry logic

**Interface**:
```typescript
interface UsePoolRefreshOptions {
  enabled: boolean;
  refreshInterval: number;        // Default: 30 seconds (Requirement 8.1)
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
- Distinguish between initial load and background refresh (Requirements 3.3, 3.4)
- Add `clearAndRefresh()` for hard refresh scenarios (Requirement 1.3)
- Implement proper exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max (Requirement 2.2)
- Only show errors after 3 consecutive failures (Requirement 6.3)
- Silent background refresh with no prominent indicators (Requirements 8.2, 8.3)
- Automatic retry on failure (Requirement 2.1)
- Reset failure count on manual retry (Requirement 6.4)

**Design Rationale**: The hook encapsulates all refresh logic, making it reusable across components. The 30-second refresh interval balances data freshness with RPC load. Silent background updates prevent UI disruption while keeping data current.

### 3. Blockchain Fetcher Improvements

**Purpose**: Reliable data fetching with timeout and retry handling

**Key Changes**:
- Add 5-second timeout for all RPC calls (prevents indefinite hangs)
- Implement retry logic at the service level (Requirement 2.1)
- Return detailed error information: timeout vs network vs invalid data (Requirement 6.1)
- Remove fallback to config data - let store handle fallbacks (Requirement 1.4)
- Batch fetch operations for efficiency (Requirement 7.4: prioritize pool reserves)
- Classify errors for appropriate handling (Requirements 2.3, 6.2)

**New Functions**:
```typescript
// Fetch with timeout
// Requirement 2.3: Handle fetch timeouts with automatic retry
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T>

// Retry with exponential backoff
// Requirement 2.2: Exponential backoff between 1-30 seconds
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T>
```

**Design Rationale**: Timeouts prevent the UI from hanging indefinitely on slow RPC endpoints. Service-level retry logic ensures consistent behavior across all data fetching operations. Error classification enables appropriate user feedback and debugging.

### 4. Pools Page UI Cleanup

**Purpose**: Clean, informative UI without misleading indicators

**Key Changes**:
- Show skeleton loader only during initial load when no data available (Requirements 3.4, 7.1)
- Remove all loading overlays when data is present (Requirement 3.1)
- Remove "Updating pool data", "Refreshing", "Fetching blockchain data" text (Requirement 3.2)
- Remove "Best shard" badges and star icons (Requirements 4.1, 4.2)
- Show small "Last updated" timestamp instead of prominent indicators (Requirement 8.5)
- Display error banner only after 3+ consecutive failures (Requirement 6.3)
- Keep data visible even during errors (Requirements 1.5, 2.5)
- Present all shards with equal visual weight (Requirement 4.3)
- Allow sorting/filtering by objective metrics (Requirement 4.4)
- Show subtle refresh indicator for manual refresh (Requirement 3.5)

**Design Rationale**: Removing misleading indicators and labels ensures users can make informed decisions based on actual data rather than arbitrary rankings. Silent background updates maintain data freshness without disrupting the user's workflow. Keeping data visible during errors ensures users can continue working even with intermittent connectivity.

**Loading States**:
```typescript
// Initial Load (no data yet)
// Requirement 3.4: Display loading indicators only during initial page load
// Requirement 7.1: Immediately display loading skeleton
if (isInitialLoad && pools.length === 0) {
  return <SkeletonLoader />;
}

// Background Refresh (data already present)
// Requirement 3.3: Update data silently without prominent loading overlays
// Requirement 8.2: No loading overlays during background refresh
if (isBackgroundRefresh && pools.length > 0) {
  // Show data normally, no loading indicators
  // Optional: small unobtrusive "last updated" timestamp (Requirement 8.5)
}

// Error State (with data)
// Requirement 1.5: Display cached data with clear visual indicators
// Requirement 6.3: Display error banner after 3+ consecutive failures
if (error && consecutiveFailures >= 3 && pools.length > 0) {
  return (
    <>
      <ErrorBanner 
        error={error} 
        onRetry={manualRefresh}
        message="Unable to fetch live data. Displaying cached information."
        showFailureCount={consecutiveFailures}
      />
      <PoolList pools={pools} dataSource="cached" /> {/* Visual indicator for cached data */}
    </>
  );
}

// Error State (no data)
// Requirement 7.5: Display error state with retry button within 5 seconds
if (error && pools.length === 0) {
  return <ErrorState error={error} onRetry={manualRefresh} />;
}

// Success State
// Requirement 3.1: Hide all loading indicators when data is loaded
return <PoolList pools={pools} dataSource="blockchain" />;
```

**Design Rationale**: Clear separation of loading states ensures users understand whether they're viewing fresh data, cached data, or waiting for initial load. The 3-failure threshold prevents alert fatigue while still informing users of persistent issues.

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
- Remove 'config' and 'hybrid' data sources (Requirement 1.4: no hardcoded values as live data)
- All data must come from blockchain (fresh) or cache (stale blockchain data)
- Track freshness explicitly with `isFresh` boolean (Requirement 5.2: 60-second staleness threshold)
- Store last error for debugging (Requirement 6.1: log error details)

**Design Rationale**: Eliminating config-based fallbacks ensures users always see real blockchain data or clearly marked cached data, preventing confusion about data accuracy. The 60-second freshness threshold balances data currency with RPC load.

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

### Visual Indicators for Data Source

To satisfy Requirement 1.5 (display cached data with clear visual indicators), the UI will distinguish between live and cached data:

```typescript
interface DataSourceIndicator {
  type: 'live' | 'cached';
  lastUpdate: number;
  displayText: string;
}

// Live data indicator
{
  type: 'live',
  lastUpdate: Date.now(),
  displayText: 'Updated just now'
}

// Cached data indicator (during errors)
{
  type: 'cached',
  lastUpdate: lastSuccessfulFetch,
  displayText: 'Cached data (updated 2 minutes ago)'
}
```

**Visual Design**:
- **Live Data**: Small green dot + "Last updated: X seconds ago" in subtle gray text
- **Cached Data**: Small amber dot + "Showing cached data (updated X minutes ago)" with slightly more prominent styling
- **Error State**: Error banner at top: "Unable to fetch live data. Displaying cached information." with retry button

**Design Rationale**: Clear visual distinction between live and cached data ensures users understand data freshness and can make informed decisions. The amber color for cached data draws attention without being alarming, while the error banner provides actionable recovery options.

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
// Aligns with Requirement 2.2: exponential backoff between 1-30 seconds
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.multiplier, attempt);
  return Math.min(delay, config.maxDelay);
}
```

**Design Rationale**: Exponential backoff prevents overwhelming the RPC endpoint during outages while providing quick recovery when connectivity is restored. The 1-30 second range balances responsiveness with server load.

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
   - Show success notification: "Connection restored" (Requirement 2.6)
   - Resume normal refresh interval (Requirement 6.6)
   - Reset consecutive failure count to 0

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
   - Fetch all pool data in parallel using `Promise.all()` (Requirement 7.2: optimize load time)
   - Batch RPC calls where possible
   - Don't block on individual pool failures (partial success handling)

2. **Caching**
   - Cache pool data in memory (Zustand store) - Requirement 5.1
   - Consider cached data fresh for 60 seconds - Requirement 5.2
   - Use cached data during background refresh failures - Requirements 2.5, 5.4, 5.6
   - Update display only after successful fetch - Requirement 5.5

3. **Debouncing**
   - Debounce manual refresh to prevent spam
   - Minimum 1 second between manual refreshes

4. **Lazy Loading**
   - Load pool list first
   - Load detailed pool data on demand
   - Defer loading of secondary metrics (volume, fees) - Requirement 7.4

**Design Rationale**: Parallel fetching minimizes total load time. In-memory caching reduces RPC load and provides fallback data during connectivity issues. Prioritizing core data (reserves) over secondary metrics ensures users can start trading quickly.

### Performance Metrics

- **Initial Load Time**: < 2 seconds (target) - Requirement 7.2
- **Background Refresh Time**: < 1 second (target)
- **Time to Interactive**: < 3 seconds (target)
- **RPC Call Timeout**: 5 seconds (hard limit) - Prevents indefinite hangs
- **Refresh Interval**: 30 seconds (configurable) - Requirement 8.1
- **Cache Staleness Threshold**: 60 seconds - Requirement 5.2
- **Error Display Threshold**: 3 consecutive failures - Requirement 6.3
- **Error State Display Time**: Within 5 seconds of initial fetch failure - Requirement 7.5

**Design Rationale**: These metrics balance responsiveness with server load. The 2-second initial load target ensures users can quickly access pool information. The 30-second refresh interval keeps data current without overwhelming RPC endpoints.

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

The implementation will be considered successful when all requirements are met:

1. ✅ No hardcoded pool data displayed as live data (Requirement 1.4)
2. ✅ No "not connected" errors during initial fetch attempt (Requirement 2.4)
3. ✅ No persistent loading indicators when data is loaded (Requirements 3.1, 3.2)
4. ✅ No "Best shard" labels or badges (Requirement 4.1)
5. ✅ Automatic retry on timeout with exponential backoff 1-30s (Requirements 2.1, 2.2, 2.3)
6. ✅ Error banner appears only after 3+ consecutive failures (Requirement 6.3)
7. ✅ Hard refresh clears cache and fetches fresh data (Requirement 1.3)
8. ✅ Background refresh is silent with no prominent indicators (Requirements 8.2, 8.3)
9. ✅ Initial load completes within 2 seconds (Requirement 7.2)
10. ✅ Data stays visible during error states with clear indicators (Requirements 1.5, 2.5)
11. ✅ Success notification shown on recovery (Requirement 2.6)
12. ✅ User-friendly error messages without technical jargon (Requirement 6.2)
13. ✅ Manual retry resets failure count (Requirement 6.4)
14. ✅ All shards presented with equal visual weight (Requirement 4.3)
15. ✅ Smooth value updates without jarring transitions (Requirement 8.3)
