# Implementation Plan

## ✅ Completed Tasks

All core implementation tasks have been completed successfully. The real-time pool data feature is fully functional with:

- ✅ Timeout and retry logic with exponential backoff
- ✅ Enhanced pool store with proper state management
- ✅ Blockchain fetcher with robust error handling
- ✅ Refactored usePoolRefresh hook with silent background updates
- ✅ Clean UI without misleading "Best shard" badges in PoolList component
- ✅ Proper loading states and error handling in PoolList component
- ✅ Optimized caching strategy
- ✅ Hard refresh support with page visibility detection

## 🔧 Remaining Tasks

### Task 1: Consolidate Pools Page with Infrastructure

The pools page (`src/app/pools/page.tsx`) currently implements its own custom data fetching, caching, and state management logic that duplicates functionality already provided by the pool store and usePoolRefresh hook. This task consolidates the implementation to use the centralized infrastructure.

- [ ] 1.1 Integrate usePoolRefresh hook in pools page
  - Replace custom `fetchPools()` and `fetchPoolsFromBlockchain()` functions with `usePoolRefresh()` hook
  - Remove duplicate state management (`loading`, `error`, `lastRefreshTime`, `isFromCache`)
  - Use hook's `isInitialLoad` and `isBackgroundRefresh` states for UI rendering
  - Replace manual refresh button logic with hook's `manualRefresh()` function
  - Replace "Clear Cache" button with hook's `clearAndRefresh()` function
  - _Requirements: 3.1, 3.2, 7.1, 8.1_

- [ ] 1.2 Remove custom caching logic from pools page
  - Remove all imports from `@/lib/utils/poolCache` (`loadPoolsFromCache`, `savePoolsToCache`, `clearPoolCache`, `isCacheValid`)
  - Remove cache-related state tracking (`isFromCache`)
  - Remove cache validation logic in auto-refresh interval
  - Let pool store and usePoolRefresh hook handle all caching automatically
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 1.3 Simplify pools page state management
  - Remove local `pools` state and use `usePoolStore()` directly to access pools
  - Remove local `loading` state and use `isInitialLoad` from usePoolRefresh hook
  - Remove local `error` state and use `error` from usePoolRefresh hook
  - Remove custom auto-refresh interval logic (usePoolRefresh handles this)
  - Remove `fetchPoolsFromBlockchain()` function entirely
  - _Requirements: 1.1, 3.1, 6.5_

- [ ] 1.4 Update pools page UI to match PoolList component patterns
  - Show error banner only when `consecutiveFailures >= 3` (consistent with PoolList)
  - Display "Last updated" timestamp using `lastRefreshTime` from hook
  - Use consistent loading skeleton pattern (show only when `isInitialLoad && pools.length === 0`)
  - Remove "Refreshing...", "Fetching blockchain data..." text during background refresh
  - Show pools data even during background refresh (silent updates)
  - Update refresh button to show spinner only during `isBackgroundRefresh`
  - _Requirements: 3.2, 3.4, 6.3, 8.2, 8.3, 8.5_

- [ ] 1.5 Remove hardcoded "Best shard" indicators from pools page
  - Verify no "Best" badges or star icons are displayed on pool cards
  - Ensure all shards are presented with equal visual weight
  - Display actual liquidity amounts without subjective rankings
  - _Requirements: 4.1, 4.2, 4.3_

### Task 2: Add Error Recovery Testing (Optional)

These tests validate the error recovery mechanisms implemented in the pool refresh system.

- [ ]* 2.1 Test network failure scenarios
  - Write test to verify exponential backoff works correctly (1s, 2s, 4s, 8s, 16s, 30s max)
  - Write test to verify cached data is retained during failures
  - Write test to verify error banner appears after 3 consecutive failures
  - Write test to verify recovery notification on success after failures
  - _Requirements: 2.2, 2.3, 6.2, 6.6_

- [ ]* 2.2 Test timeout scenarios
  - Write test to verify RPC calls timeout after 10 seconds
  - Write test to verify retry logic triggers on timeout
  - Write test to verify timeout errors are classified correctly
  - _Requirements: 2.3, 6.1, 7.4_

- [ ]* 2.3 Test hard refresh scenarios
  - Write test to verify cache is cleared on hard refresh
  - Write test to verify page visibility detection works (5 minute threshold)
  - Write test to verify `clearAndRefresh()` function clears cache and fetches fresh data
  - _Requirements: 1.3, 7.1_

## 📝 Notes

- **Task 1** is the primary remaining work - consolidating the pools page to use the centralized infrastructure
- The pools page currently has its own implementation that duplicates functionality in the pool store and usePoolRefresh hook
- **Task 2** represents optional testing that validates error recovery mechanisms
- The PoolList component already follows the correct patterns and can serve as a reference
- All core requirements from the design document have been addressed in the infrastructure (store, hook, fetcher)
