# Implementation Plan

- [x] 1. Add pool state interfaces and caching infrastructure

  - Create TypeScript interfaces for `PoolState` and `PoolStateCache` in shardedDex.ts
  - Add private cache property and TTL constant to ShardedDexService class
  - _Requirements: 1.5_

- [x] 2. Implement on-chain pool state fetching

  - [x] 2.1 Create `fetchPoolState` method to fetch token account balances

    - Use `connection.getTokenAccountBalance()` for both token accounts
    - Parse responses and construct PoolState object with BigInt values
    - Include timestamp for cache management
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Create `getPoolStateFromConfig` fallback method

    - Convert config liquidityA/liquidityB strings to BigInt with proper decimals
    - Return PoolState with lastUpdated = 0 to indicate stale data
    - _Requirements: 1.4_

  - [x] 2.3 Create `getPoolState` method with caching logic
    - Check cache for unexpired entry
    - Fetch from on-chain if cache miss or expired
    - Handle errors and fallback to config values
    - Update cache on successful fetch
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 3. Update quote calculation to use live reserves

  - [x] 3.1 Modify `getQuote` method to fetch pool states

    - Use `Promise.all()` to fetch states for all shards concurrently
    - Replace config-based reserve calculations with poolState reserves
    - Maintain existing AMM formula logic
    - _Requirements: 1.1, 1.2, 3.1_

  - [x] 3.2 Add enhanced logging for pool state
    - Log reserve values in both base units and human-readable format
    - Log data age (cache hit vs fresh fetch vs stale config)
    - Log warning when using stale config data
    - _Requirements: 4.1, 4.2_

- [x] 4. Enhance error handling and logging

  - [x] 4.1 Add RPC error handling in fetchPoolState

    - Catch and log specific RPC errors (timeout, rate limit, invalid account)
    - Provide helpful error messages for common failures
    - _Requirements: 1.4, 4.2_

  - [x] 4.2 Update executeSwap error logging
    - Log expected output, minimum output, and slippage tolerance
    - Include pool state data age in error context
    - Add transaction simulation logs to error messages
    - _Requirements: 4.1, 4.3, 4.4_

- [x] 5. Add price impact warnings

  - Update UI to display warnings when price impact exceeds thresholds
  - Show yellow warning for impact > 1%
  - Show red warning requiring confirmation for impact > 5%
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 6. Add comprehensive logging for debugging
  - Log all intermediate calculation values (reserves, amounts, decimals)
  - Log cache hit/miss statistics
  - Add performance timing logs for RPC calls
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
