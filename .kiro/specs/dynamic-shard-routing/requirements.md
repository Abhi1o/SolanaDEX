# Requirements Document

## Introduction

This feature integrates the SAMM Router backend API to enable dynamic shard selection for optimal swap execution. Currently, the frontend uses hardcoded pool configurations and performs local shard selection by calculating outputs for each available shard. The backend API provides intelligent routing that considers real-time pool states, liquidity depth, and price impact across all shards to recommend the optimal shard for each trade.

## Glossary

- **SAMM Router**: The backend routing service that analyzes all available shards and recommends the optimal shard for a given trade
- **Shard**: An individual liquidity pool instance for a token pair (e.g., USDC/USDT can have multiple shards)
- **Frontend Swap System**: The client-side swap interface that currently performs local shard selection
- **Route API**: The POST /api/route endpoint that accepts trade parameters and returns the optimal shard with expected output
- **Pool State**: Real-time reserve balances and liquidity information for a specific shard
- **Price Impact**: The percentage change in token price caused by executing a trade
- **Base Units**: The smallest denomination of a token (e.g., lamports for SOL, base units considering decimals for SPL tokens)

## Requirements

### Requirement 1

**User Story:** As a trader, I want the system to automatically select the best shard for my swap, so that I receive the most favorable exchange rate with minimal price impact.

#### Acceptance Criteria

1. WHEN the Frontend Swap System calculates a quote, THE Frontend Swap System SHALL call the SAMM Router Route API with token addresses, input amount, and trader wallet address
2. WHEN the SAMM Router Route API returns a successful response, THE Frontend Swap System SHALL use the recommended shard address for swap execution
3. THE Frontend Swap System SHALL display the expected output amount returned by the SAMM Router Route API to the user
4. THE Frontend Swap System SHALL display the price impact percentage returned by the SAMM Router Route API to the user
5. THE Frontend Swap System SHALL display the selected shard number in the quote information panel

### Requirement 2

**User Story:** As a trader, I want to see accurate swap quotes based on real-time backend calculations, so that I can make informed trading decisions.

#### Acceptance Criteria

1. WHEN the user enters a swap amount, THE Frontend Swap System SHALL debounce the input for 500 milliseconds before requesting a quote
2. WHEN requesting a quote, THE Frontend Swap System SHALL send token mint addresses in base-58 format to the SAMM Router Route API
3. WHEN requesting a quote, THE Frontend Swap System SHALL send the input amount in base units (considering token decimals) to the SAMM Router Route API
4. THE Frontend Swap System SHALL convert the expected output from base units to human-readable format using the output token's decimal configuration
5. THE Frontend Swap System SHALL handle API response errors gracefully and display user-friendly error messages

### Requirement 3

**User Story:** As a trader, I want the system to fall back to local shard selection if the backend API is unavailable, so that I can still execute swaps during API downtime.

#### Acceptance Criteria

1. IF the SAMM Router Route API request fails with a network error, THEN THE Frontend Swap System SHALL fall back to the existing local shard selection logic
2. IF the SAMM Router Route API request fails with a timeout error, THEN THE Frontend Swap System SHALL fall back to the existing local shard selection logic
3. WHEN using fallback mode, THE Frontend Swap System SHALL display a warning indicator to the user that backend routing is unavailable
4. WHEN using fallback mode, THE Frontend Swap System SHALL log the API error details to the console for debugging
5. THE Frontend Swap System SHALL set a timeout of 5 seconds for SAMM Router Route API requests

### Requirement 4

**User Story:** As a developer, I want the backend API integration to be configurable, so that I can easily switch between different API endpoints for development and production environments.

#### Acceptance Criteria

1. THE Frontend Swap System SHALL read the SAMM Router API base URL from environment variables
2. THE Frontend Swap System SHALL support a fallback API URL if the primary environment variable is not set
3. THE Frontend Swap System SHALL construct the full Route API endpoint URL by appending "/api/route" to the base URL
4. THE Frontend Swap System SHALL log the configured API base URL on application startup for verification
5. WHERE the environment variable NEXT_PUBLIC_SAMM_ROUTER_API_URL is defined, THE Frontend Swap System SHALL use that value as the API base URL

### Requirement 5

**User Story:** As a trader, I want the swap execution to use the exact shard recommended by the backend, so that I receive the expected output amount with minimal slippage.

#### Acceptance Criteria

1. WHEN executing a swap, THE Frontend Swap System SHALL use the pool address returned by the SAMM Router Route API
2. WHEN executing a swap, THE Frontend Swap System SHALL calculate the minimum output amount by applying the user's slippage tolerance to the expected output from the SAMM Router Route API
3. THE Frontend Swap System SHALL NOT recalculate the swap output locally before execution when using backend routing
4. THE Frontend Swap System SHALL pass the exact input amount used in the quote request to the swap execution function
5. IF the selected shard address from the SAMM Router Route API does not match any pool in the local configuration, THEN THE Frontend Swap System SHALL display an error message and prevent swap execution

### Requirement 6

**User Story:** As a trader, I want to see which routing method is being used (backend or local), so that I understand how my swap quote was calculated.

#### Acceptance Criteria

1. WHEN a quote is successfully retrieved from the SAMM Router Route API, THE Frontend Swap System SHALL display a "Backend Routing" indicator in the quote information panel
2. WHEN a quote is calculated using local fallback logic, THE Frontend Swap System SHALL display a "Local Routing" indicator in the quote information panel
3. THE Frontend Swap System SHALL use distinct visual styling for backend routing indicators (e.g., green badge) versus local routing indicators (e.g., yellow badge)
4. THE Frontend Swap System SHALL include a tooltip or help text explaining the difference between backend and local routing
5. THE Frontend Swap System SHALL log the routing method used for each quote to the browser console for debugging purposes
