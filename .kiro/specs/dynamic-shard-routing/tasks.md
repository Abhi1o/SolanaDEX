# Implementation Plan

- [x] 1. Set up environment configuration for backend API

  - Add NEXT_PUBLIC_SAMM_ROUTER_API_URL to .env.example with default value http://saigreen.cloud:3000
  - Add NEXT_PUBLIC_SAMM_ROUTER_API_URL to .env.local with the same default value
  - Document the environment variable in project documentation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Create SAMM Router API service
- [x] 2.1 Implement SammRouterService class with TypeScript interfaces

  - Create src/services/sammRouterService.ts file
  - Define RouteRequest interface with tokenA, tokenB, inputToken, inputAmount, and trader fields
  - Define RouteResponse interface matching backend API response structure
  - Define ShardData interface for shard information from backend
  - Implement SammRouterService class constructor with configurable base URL
  - Read base URL from NEXT_PUBLIC_SAMM_ROUTER_API_URL environment variable with fallback
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 2.2 Implement getRoute method with timeout and error handling

  - Implement getRoute method that accepts RouteRequest and returns Promise<RouteResponse>
  - Use fetch API to POST to /api/route endpoint
  - Set Content-Type header to application/json
  - Implement 5-second timeout using AbortController
  - Parse JSON response and validate response structure
  - Handle network errors (timeout, connection refused) with descriptive error messages
  - Handle HTTP error responses (4xx, 5xx) with status code and body logging
  - Handle JSON parsing errors for malformed responses
  - _Requirements: 2.5, 3.1, 3.2, 3.5_

- [x] 2.3 Implement health check method

  - Implement healthCheck method that returns Promise<boolean>
  - Make GET request to /api/health endpoint
  - Return true if response is successful (200 status)
  - Return false for any errors without throwing
  - Log health check results to console
  - _Requirements: 3.1, 3.2_

- [x] 2.4 Write unit tests for SammRouterService

  - Test successful route request with mocked fetch response
  - Test timeout handling with delayed mock response
  - Test network error handling with rejected fetch promise
  - Test malformed JSON response handling
  - Test health check success and failure scenarios
  - Test environment variable configuration reading
  - _Requirements: 2.5, 3.1, 3.2, 3.5_

- [x] 3. Enhance ShardedDexService with backend routing
- [x] 3.1 Add backend routing infrastructure to ShardedDexService

  - Import SammRouterService in src/lib/shardedDex.ts
  - Add sammRouter property to ShardedDexService class
  - Initialize sammRouter in constructor
  - Add routingMethod field to SwapQuote interface ('backend' | 'local')
  - Add optional backendReason field to SwapQuote interface
  - Add helper method getTokenMintBySymbol to map symbols to mint addresses
  - Add helper method getWalletAddress to get current connected wallet address
  - _Requirements: 1.1, 6.1, 6.2, 6.5_

- [x] 3.2 Implement getQuoteFromBackend method

  - Create private getQuoteFromBackend method in ShardedDexService
  - Get token mint addresses for input and output tokens using getTokenMintBySymbol
  - Determine which token is the input token (tokenA or tokenB)
  - Convert input amount to base units using token decimals
  - Get trader wallet address from wallet adapter
  - Build RouteRequest object with all required fields
  - Call sammRouter.getRoute with request object
  - Validate response success field
  - Extract shard address from response data
  - Validate that shard address exists in local dexConfig.pools
  - Convert expectedOutput from base units to human-readable format
  - Convert priceImpact from decimal to percentage
  - Find shard number from local pool configuration
  - Build SwapQuote object with routingMethod='backend' and backendReason from response
  - Calculate totalFee as inputAmount \* 0.003
  - Log successful backend routing with shard details
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 5.5_

- [x] 3.3 Refactor existing getQuote logic into getQuoteLocal method

  - Rename current getQuote implementation to getQuoteLocal (make it private)
  - Keep all existing local calculation logic unchanged
  - Add routingMethod='local' to returned SwapQuote
  - Set backendReason to undefined for local quotes
  - Preserve all existing logging and error handling
  - _Requirements: 3.1, 3.2, 3.3, 6.2, 6.5_

- [x] 3.4 Implement new getQuote method with backend-first routing

  - Create new public getQuote method that tries backend first
  - Wrap getQuoteFromBackend call in try-catch block
  - On success, return backend quote directly
  - On error, log warning with error details, input parameters, and timestamp
  - On error, call getQuoteLocal as fallback
  - Return fallback quote with routingMethod='local'
  - Ensure error logging includes error type (network, API, validation)
  - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 6.5_

- [ ]\* 3.5 Write unit tests for enhanced ShardedDexService

  - Test getQuoteFromBackend with successful backend response
  - Test getQuoteFromBackend with pool validation failure
  - Test getQuote fallback behavior when backend fails
  - Test token mint address mapping
  - Test base unit conversion for different token decimals
  - Test SwapQuote format consistency between backend and local routing
  - _Requirements: 1.1, 1.2, 1.3, 2.4, 3.1, 3.2, 5.5_

- [x] 4. Update swap execution to use backend-selected shard
- [x] 4.1 Verify executeSwap uses pool address from quote

  - Review executeSwap method in ShardedDexService
  - Confirm it uses quote.route[0].poolAddress to find pool configuration
  - Confirm it does not recalculate output amounts locally
  - Confirm minimum output is calculated from quote.estimatedOutput with slippage tolerance
  - Ensure no changes are needed (existing implementation should work)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.2 Add pool validation before swap execution

  - In executeSwap method, verify pool exists in dexConfig.pools before building transaction
  - If pool not found, throw error with message "Selected pool not found in configuration"
  - Log pool address and available pools for debugging
  - _Requirements: 5.5_

- [ ]\* 4.3 Write integration tests for swap execution with backend routing

  - Test swap execution with backend-selected shard
  - Test swap execution fails gracefully when pool not found
  - Test minimum output calculation uses backend expectedOutput
  - Mock wallet adapter and connection for transaction building
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Update UI to display routing method indicator
- [x] 5.1 Add routing method badge to quote display

  - In ShardedSwapInterface component, add routing method indicator section
  - Display "Backend Routing" with green badge when quote.routingMethod === 'backend'
  - Display "Local Routing" with yellow badge when quote.routingMethod === 'local'
  - Position indicator at top of quote information panel
  - Use consistent styling with existing quote display elements
  - Add checkmark icon (✓) for backend routing
  - Add warning icon (⚠) for local routing
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5.2 Add backend reason display

  - Below routing method indicator, conditionally display quote.backendReason if present
  - Style as italic text with gray color
  - Use smaller font size (text-xs)
  - Only show when routingMethod is 'backend' and backendReason exists
  - _Requirements: 1.1, 6.4_

- [x] 5.3 Add tooltip explaining routing methods

  - Add info icon next to routing method indicator
  - Implement tooltip on hover showing explanation
  - Backend routing tooltip: "Optimal shard selected by backend API based on real-time analysis"
  - Local routing tooltip: "Shard selected by local calculation (backend unavailable)"
  - Use accessible tooltip implementation with proper ARIA attributes
  - _Requirements: 6.4_

- [x] 6. Add logging and monitoring
- [x] 6.1 Implement comprehensive logging for backend routing

  - Log backend API request details (tokens, amount, trader)
  - Log backend API response time
  - Log selected shard and reason
  - Log fallback events with error details
  - Use console.log for successful operations
  - Use console.warn for fallback events
  - Use console.error for unexpected errors
  - Include timestamps in all logs
  - _Requirements: 3.4, 6.5_

- [x] 6.2 Add performance metrics logging

  - Track and log backend API response time for each request
  - Track and log local calculation time
  - Log total quote generation time
  - Calculate and log backend success rate periodically
  - Log fallback usage frequency
  - Store metrics in memory for session-based analysis
  - _Requirements: 3.4, 6.5_

- [ ]\* 6.3 Create monitoring dashboard component (optional)

  - Create admin/debug component to display routing metrics
  - Show backend API success rate
  - Show average response times
  - Show fallback frequency
  - Add button to clear metrics
  - Add button to test backend health check
  - _Requirements: 6.5_

- [x] 7. Update documentation and configuration
- [x] 7.1 Update README with backend API configuration

  - Document NEXT_PUBLIC_SAMM_ROUTER_API_URL environment variable
  - Explain backend routing vs local routing
  - Document fallback behavior
  - Add troubleshooting section for backend API issues
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.2 Add inline code comments

  - Add JSDoc comments to SammRouterService methods
  - Add JSDoc comments to new ShardedDexService methods
  - Document backend API request/response format
  - Document fallback logic and error handling
  - _Requirements: 3.4, 6.5_

- [x] 8. Manual testing and validation
- [x] 8.1 Test backend routing with live API

  - Test quote generation with backend API available
  - Verify routing method shows "Backend Routing"
  - Verify backend reason is displayed
  - Verify selected shard matches backend recommendation
  - Test swap execution completes successfully
  - Verify transaction uses correct pool address
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 6.1, 6.2_

- [x] 8.2 Test fallback behavior

  - Temporarily disable backend API (change URL to invalid endpoint)
  - Verify quote generation falls back to local routing
  - Verify routing method shows "Local Routing"
  - Verify warning is logged to console
  - Verify swap execution still works with local routing
  - Restore correct backend API URL
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.2_

- [x] 8.3 Test error scenarios

  - Test with invalid token pair (should fall back to local)
  - Test with very large amounts (should handle properly)
  - Test with network timeout (should fall back within 5 seconds)
  - Test with malformed backend response (should fall back gracefully)
  - Verify all error messages are user-friendly
  - Verify all errors are logged with adequate detail
  - _Requirements: 2.5, 3.1, 3.2, 3.4, 3.5_

- [x] 8.4 Test different token pairs and amounts
  - Test USDC → USDT swap with various amounts
  - Test USDC → SOL swap with various amounts
  - Test reverse swaps (SOL → USDC, USDT → USDC)
  - Verify backend selects different shards for different amounts
  - Verify price impact calculations are accurate
  - Compare backend vs local routing results
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_
