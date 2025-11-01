# Requirements Document

## Introduction

This feature addresses critical issues with the pool data fetching and display system. Currently, the pools page shows hardcoded data, displays confusing loading states continuously, shows "not connected" errors inappropriately, and highlights "best shards" incorrectly. The system needs to reliably fetch real-time blockchain data, handle errors gracefully with automatic retries, eliminate unnecessary loading indicators, and remove hardcoded shard recommendations.

## Glossary

- **Pool System**: The liquidity pool data management system that fetches, caches, and displays pool information
- **Blockchain Fetcher**: The service responsible for retrieving real-time pool data from Solana blockchain
- **Connection Status**: The state of connectivity between the frontend and Solana RPC endpoints
- **Data Staleness**: The condition when cached pool data exceeds acceptable age thresholds
- **Loading State**: Visual indicators showing data fetch operations in progress
- **Shard**: A separate instance of a liquidity pool for the same token pair
- **Hard Refresh**: A browser refresh that clears cached data and forces new data fetch

## Requirements

### Requirement 1: Eliminate Hardcoded Pool Data

**User Story:** As a user, I want to see real-time blockchain data for all pools, so that I can make informed trading decisions based on current liquidity.

#### Acceptance Criteria

1. WHEN the pools page loads, THE Pool System SHALL fetch current pool data from the blockchain
2. WHEN blockchain data is successfully retrieved, THE Pool System SHALL display the fetched data without fallback to hardcoded values
3. WHEN a user performs a hard refresh, THE Pool System SHALL clear all cached data and fetch fresh blockchain data
4. THE Pool System SHALL NOT display hardcoded liquidity values from configuration files as live data
5. WHERE blockchain data fetch fails, THE Pool System SHALL display cached data with clear visual indicators distinguishing it from live data

### Requirement 2: Fix Connection Error Handling

**User Story:** As a user, I want the system to automatically retry failed connections, so that I don't see persistent "not connected" errors when blockchain data is temporarily unavailable.

#### Acceptance Criteria

1. WHEN a blockchain data fetch fails, THE Pool System SHALL automatically retry the fetch after a delay
2. WHEN consecutive fetch failures occur, THE Pool System SHALL implement exponential backoff with delays between 1 second and 30 seconds
3. IF a fetch timeout occurs, THEN THE Pool System SHALL wait for the configured backoff period and retry automatically
4. THE Pool System SHALL NOT display "not connected" errors during the initial fetch attempt
5. WHILE retrying failed fetches, THE Pool System SHALL display cached data if available
6. WHEN connection is restored after failures, THE Pool System SHALL display a success notification

### Requirement 3: Remove Persistent Loading Indicators

**User Story:** As a user, I want to see pool data without continuous loading indicators, so that I can focus on the actual pool information.

#### Acceptance Criteria

1. WHEN pool data is successfully loaded and displayed, THE Pool System SHALL hide all loading indicators
2. THE Pool System SHALL NOT display "Updating pool data", "Refreshing", or "Fetching blockchain data" messages when data is already loaded and current
3. WHEN background refresh occurs, THE Pool System SHALL update data silently without prominent loading overlays
4. THE Pool System SHALL display loading indicators only during initial page load when no data is available
5. WHERE a manual refresh is triggered, THE Pool System SHALL show a subtle refresh indicator that disappears upon completion

### Requirement 4: Remove Hardcoded "Best Shard" Labels

**User Story:** As a user, I want to see pool shards without misleading "best" labels, so that I can evaluate shards based on actual metrics.

#### Acceptance Criteria

1. THE Pool System SHALL NOT automatically label any shard as "Best" or display star badges
2. THE Pool System SHALL display actual liquidity amounts for each shard without subjective rankings
3. WHERE multiple shards exist for a token pair, THE Pool System SHALL present them with equal visual weight
4. THE Pool System SHALL allow users to sort and filter shards based on objective metrics like liquidity and volume
5. THE Pool System SHALL display all relevant shard metrics including liquidity, volume, and fees without highlighting specific shards

### Requirement 5: Improve Data Caching Strategy

**User Story:** As a developer, I want an efficient caching strategy, so that the application performs well while maintaining data freshness.

#### Acceptance Criteria

1. WHEN pool data is fetched from blockchain, THE Pool System SHALL cache the data with a timestamp
2. THE Pool System SHALL consider cached data stale after 60 seconds
3. WHEN cached data is stale, THE Pool System SHALL fetch fresh data in the background
4. WHILE fetching fresh data, THE Pool System SHALL continue displaying cached data
5. THE Pool System SHALL update the display only after fresh data is successfully retrieved
6. WHERE fetch fails, THE Pool System SHALL retain cached data and retry according to backoff strategy

### Requirement 6: Enhance Error Recovery

**User Story:** As a user, I want the system to recover gracefully from errors, so that I can continue using the application even when blockchain connectivity is intermittent.

#### Acceptance Criteria

1. WHEN blockchain fetch fails, THE Pool System SHALL log the error details for debugging
2. THE Pool System SHALL display user-friendly error messages without technical jargon
3. IF consecutive failures exceed 3 attempts, THEN THE Pool System SHALL display a persistent error banner with retry option
4. WHEN user manually triggers retry, THE Pool System SHALL reset the failure count and attempt immediate fetch
5. THE Pool System SHALL track consecutive failure count and display it in error messages for transparency
6. WHEN connection is restored, THE Pool System SHALL automatically resume normal refresh intervals

### Requirement 7: Optimize Initial Page Load

**User Story:** As a user, I want the pools page to load quickly, so that I can start viewing pool information without delay.

#### Acceptance Criteria

1. WHEN the pools page mounts, THE Pool System SHALL immediately display loading skeleton
2. THE Pool System SHALL fetch pool data from blockchain within 2 seconds of page load
3. WHEN blockchain fetch completes, THE Pool System SHALL replace loading skeleton with actual data
4. THE Pool System SHALL prioritize fetching pool reserves over secondary metrics like volume and fees
5. WHERE initial fetch fails, THE Pool System SHALL display error state with retry button within 5 seconds

### Requirement 8: Implement Silent Background Refresh

**User Story:** As a user, I want pool data to stay current without disruptive refresh indicators, so that I can monitor pools continuously.

#### Acceptance Criteria

1. THE Pool System SHALL refresh pool data every 30 seconds in the background
2. WHEN background refresh occurs, THE Pool System SHALL NOT display loading overlays or prominent indicators
3. THE Pool System SHALL update displayed values smoothly without jarring transitions
4. WHERE background refresh fails, THE Pool System SHALL retry silently without user notification
5. THE Pool System SHALL display a small, unobtrusive indicator showing last successful update time
