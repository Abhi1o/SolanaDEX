# Implementation Plan

- [x] 1. Add utility functions for timeout and retry logic

  - Create `fetchWithTimeout()` wrapper function that wraps any promise with a timeout
  - Create `fetchWithRetry()` function that implements exponential backoff retry logic
  - Add error classification helper to categorize errors (timeout, network, invalid data, etc.)
  - _Requirements: 2.2, 2.3, 6.1_

- [x] 2. Refactor Pool Store with enhanced state management

  - [x] 2.1 Add new state fields to pool store

    - Add `isInitialLoad: boolean` to track initial page load
    - Add `isBackgroundRefresh: boolean` to track background refresh operations
    - Update `consecutiveFailures` tracking logic
    - _Requirements: 1.1, 3.1, 6.5_

  - [x] 2.2 Implement clearCache() function

    - Create `clearCache()` action that resets all pool data
    - Reset `lastFetchTime` to 0
    - Clear `error` state
    - Reset `consecutiveFailures` to 0
    - _Requirements: 1.3, 5.1_

  - [x] 2.3 Update fetchPools() to track load type

    - Add `isInitial` parameter to `fetchPools()`
    - Set `isInitialLoad` or `isBackgroundRefresh` based on parameter
    - Ensure proper state cleanup after fetch completes
    - _Requirements: 7.1, 7.2, 8.1_

  - [x] 2.4 Improve refreshPools() error handling
    - Keep existing pool data on refresh failure
    - Increment `consecutiveFailures` on error
    - Reset `consecutiveFailures` on success
    - Update `lastFetchTime` only on successful fetch
    - _Requirements: 2.5, 6.2, 6.6_

- [-] 3. Enhance blockchain fetcher with timeout and retry

  - [-] 3.1 Add timeout to RPC calls

    - Wrap `connection.getTokenAccountBalance()` with `fetchWithTimeout()`
    - Wrap `connection.getTokenSupply()` with `fetchWithTimeout()`
    - Set timeout to 5000ms (5 seconds)
    - _Requirements: 2.3, 7.4_

  - [ ] 3.2 Implement retry logic in fetcher

    - Use `fetchWithRetry()` for `fetchPoolReserves()`
    - Use `fetchWithRetry()` for `fetchLPTokenSupply()`
    - Configure max retries to 3 attempts
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Remove config data fallback

    - Remove fallback to config data in `enrichPoolWithBlockchainData()`
    - Throw errors instead of returning config data
    - Let store handle error recovery and caching
    - _Requirements: 1.2, 1.4_

  - [ ] 3.4 Add detailed error information
    - Classify errors by type (timeout, network, invalid data)
    - Include pool address in error messages
    - Add timestamp to errors
    - Mark errors as retryable or non-retryable
    - _Requirements: 6.1, 6.2_

- [ ] 4. Refactor usePoolRefresh hook

  - [ ] 4.1 Separate initial load from background refresh

    - Return `isInitialLoad` instead of generic `isRefreshing`
    - Return `isBackgroundRefresh` for background operations
    - Update `performRefresh()` to set appropriate loading state
    - _Requirements: 3.1, 3.2, 8.2_

  - [ ] 4.2 Implement proper exponential backoff

    - Calculate backoff delay: 1s, 2s, 4s, 8s, 16s, 30s (max)
    - Skip automatic refresh during backoff period
    - Allow manual refresh to bypass backoff with warning
    - _Requirements: 2.2, 2.3_

  - [ ] 4.3 Add clearAndRefresh() function

    - Create `clearAndRefresh()` that calls `poolStore.clearCache()`
    - Trigger immediate fetch after clearing cache
    - Set `isInitialLoad` to true for proper UI state
    - _Requirements: 1.3, 7.1_

  - [ ] 4.4 Improve error notification logic

    - Show no notification on first 2 failures
    - Show warning toast on 3rd failure
    - Show error banner on 4th+ failures
    - Show success toast on recovery after failures
    - _Requirements: 2.4, 6.2, 6.3, 6.6_

  - [ ] 4.5 Implement silent background refresh
    - Set `isBackgroundRefresh` during automatic refresh
    - Don't show prominent loading indicators during background refresh
    - Update data silently on success
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 5. Update Pools Page UI

  - [ ] 5.1 Remove hardcoded "Best shard" badges

    - Remove star emoji and "Best" badge from pool cards
    - Remove `isHighestLiquidity` highlighting logic
    - Remove special styling for "best" shards
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 5.2 Fix loading state display logic

    - Show skeleton only when `isInitialLoad && pools.length === 0`
    - Hide all loading overlays when pools are loaded
    - Remove "Updating pool data", "Refreshing", "Fetching blockchain data" text
    - _Requirements: 3.1, 3.2, 3.3, 7.3_

  - [ ] 5.3 Add subtle last updated indicator

    - Display "Last updated: [time]" in small text
    - Update timestamp on successful refresh
    - Hide timestamp during initial load
    - _Requirements: 8.5_

  - [ ] 5.4 Improve error banner display

    - Show error banner only when `consecutiveFailures >= 3`
    - Keep pool data visible below error banner
    - Add retry button to error banner
    - Show failure count in error message
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ] 5.5 Add manual refresh button

    - Create refresh button that calls `manualRefresh()`
    - Disable button during refresh
    - Show spinner icon during refresh
    - Position button in header area
    - _Requirements: 3.5, 6.4_

  - [ ] 5.6 Remove connection status component clutter
    - Remove or simplify ConnectionStatus component
    - Remove "Connecting", "Fetching blockchain data" messages
    - Remove backoff delay display
    - Keep only essential error information
    - _Requirements: 2.4, 3.2, 3.3_

- [ ] 6. Update PoolList component

  - [ ] 6.1 Fix loading state in PoolList

    - Show skeleton only when `loading && pools.length === 0`
    - Remove "Updating..." indicator during background refresh
    - Remove staleness indicator
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 6.2 Improve error display in PoolList

    - Show error banner only when `error && consecutiveFailures >= 3`
    - Keep pool list visible during errors
    - Simplify error message text
    - _Requirements: 6.2, 6.3_

  - [ ] 6.3 Remove data source badges
    - Remove or simplify DataSourceBadge component
    - Don't show "Live Data" or "Cached" indicators
    - All displayed data should be treated as current
    - _Requirements: 1.4, 1.5_

- [ ] 7. Update pool loader to remove config fallback

  - Remove synchronous `loadPoolsFromConfig()` usage
  - Always require connection parameter for blockchain fetch
  - Remove config-only loading path
  - Update `usePoolsFromConfig` hook to fetch from blockchain
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 8. Add hard refresh support

  - Detect page visibility changes
  - Call `clearAndRefresh()` on page focus after long absence
  - Add keyboard shortcut or button for manual hard refresh
  - Clear service worker cache if applicable
  - _Requirements: 1.3, 7.1_

- [ ] 9. Optimize caching strategy

  - [ ] 9.1 Implement staleness detection

    - Mark data as stale after 60 seconds
    - Trigger background refresh when data becomes stale
    - Continue displaying stale data during refresh
    - _Requirements: 5.2, 5.3_

  - [ ] 9.2 Update cache on successful fetch

    - Store fetched data with timestamp
    - Mark data as fresh (`isFresh: true`)
    - Update `lastFetchTime` in store
    - _Requirements: 5.1, 5.5_

  - [ ] 9.3 Retain cache on fetch failure
    - Don't clear pool data on fetch error
    - Keep displaying cached data
    - Mark data as stale if fetch fails
    - _Requirements: 5.4, 5.6_

- [ ] 10. Remove unnecessary UI elements
  - Remove "Best shade" text and references
  - Remove animated connection status indicators
  - Remove verbose loading messages
  - Simplify pool card styling (remove special highlighting)
  - _Requirements: 3.2, 3.3, 4.1, 4.5_
