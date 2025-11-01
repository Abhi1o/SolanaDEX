# Implementation Plan

- [ ] 1. Create LP Calculation Service with core calculation logic
  - Create `src/services/lpCalculationService.ts` with TypeScript interfaces and types
  - Implement `calculateLPTokensForDeposit` method matching smart contract's proportional calculation with floor rounding
  - Implement `calculateTokensForLPAmount` method with ceiling/floor rounding support and remainder handling
  - Implement `calculateWithdrawalAmounts` method with withdrawal fee calculation
  - Implement `calculateSingleTokenDeposit` method using Balancer formula
  - Add `INITIAL_SWAP_POOL_AMOUNT` constant (1,000,000,000) for initial deposits
  - Implement `RoundDirection` enum (Floor, Ceiling) for rounding control
  - Add input validation for all calculation methods (positive amounts, non-zero reserves)
  - Implement overflow/underflow protection with MAX_U64 checks
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 2. Implement slippage protection and pool share calculations
  - Implement `applySlippageToDeposit` method calculating max token amounts with slippage buffer
  - Implement `applySlippageToWithdrawal` method calculating min token amounts with slippage protection
  - Implement `calculatePoolShare` method for current pool share percentage
  - Implement `calculateProjectedPoolShare` method for projected share after deposit
  - Add slippage tolerance validation (0.1% to 5% range)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 3. Add validation methods to LP Calculation Service
  - Implement `validateDepositAmounts` method checking amounts against balances and reserves
  - Implement `validateWithdrawalAmount` method checking LP token amount against balance
  - Add ratio validation for deposits (within 5% tolerance of pool ratio)
  - Implement error type enum `LPCalculationError` with descriptive error codes
  - Create `LPCalculationException` class with error context
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 4. Update calculations utility with helper functions
  - Add `INITIAL_SWAP_POOL_AMOUNT` constant to `src/utils/calculations.ts`
  - Implement `ceilingDivision` helper function for ceiling rounding
  - Implement `floorDivision` helper function for floor rounding
  - Add `MAX_U64` constant for overflow checks
  - Mark `calculateLiquidityTokens` as deprecated with migration note
  - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 5. Update Liquidity Service to use LP Calculation Service
  - Import `LPCalculationService` in `src/services/liquidityService.ts`
  - Add `lpCalculator` instance to `LiquidityService` class
  - Update `calculateExpectedLpTokens` to use `lpCalculator.calculateLPTokensForDeposit`
  - Update `calculateRemoveAmounts` to use `lpCalculator.calculateWithdrawalAmounts`
  - Pass withdrawal fee parameters (numerator: 1, denominator: 5) from smart contract
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 6. Update add liquidity transaction building with accurate calculations
  - Fetch fresh reserves from blockchain before building transaction in `buildAddLiquidityTransaction`
  - Use `lpCalculator.calculateTokensForLPAmount` with ceiling rounding to get required token amounts
  - Use `lpCalculator.applySlippageToDeposit` to calculate max amounts with slippage buffer
  - Update instruction parameters: maxTokenA, maxTokenB (with slippage), targetLpTokens (expected)
  - Add logging for fresh reserves, calculated amounts, and slippage-adjusted amounts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7. Update remove liquidity transaction building with accurate calculations
  - Use `lpCalculator.calculateWithdrawalAmounts` to get expected token amounts in `buildRemoveLiquidityTransaction`
  - Use `lpCalculator.applySlippageToWithdrawal` to calculate min amounts with slippage protection
  - Update instruction parameters: lpTokenAmount, minTokenA, minTokenB (with slippage)
  - Add logging for calculated withdrawal amounts and slippage-adjusted minimums
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Add LP supply tracking to Pool Store
  - Add `lpSupplyCache` Map to pool store state in `src/stores/poolStore.ts`
  - Implement `fetchLPSupply` method to fetch LP supply from blockchain with 5-second caching
  - Update pool interface to include `lpTokenMint` address for per-shard tracking
  - Add cache invalidation on transaction confirmation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9. Update Pool interface for per-shard LP tracking
  - Add `lpTokenMint` field to Pool interface in `src/types/index.ts`
  - Add `shardNumber` field to Pool interface for shard identification
  - Update pool loading logic to fetch LP supply per shard
  - Ensure LP token balances are displayed separately per shard in UI
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 10. Update AddLiquidity component with real-time calculations
  - Import `LPCalculationService` in `src/components/pools/AddLiquidity.tsx`
  - Update token amount calculation to use `lpCalculator.calculateTokensForLPAmount` with ceiling rounding
  - Add debounced calculation updates (100ms delay) when user types amounts
  - Display expected LP tokens using `lpCalculator.calculateLPTokensForDeposit`
  - Display projected pool share using `lpCalculator.calculateProjectedPoolShare`
  - Show loading state during calculation updates
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.1, 11.2, 11.3, 11.4, 11.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 11. Update RemoveLiquidity component with accurate withdrawal estimates
  - Import `LPCalculationService` in `src/components/pools/RemoveLiquidity.tsx`
  - Update withdrawal amount calculation to use `lpCalculator.calculateWithdrawalAmounts`
  - Display expected token A and token B amounts with withdrawal fees accounted for
  - Display current pool share using `lpCalculator.calculatePoolShare`
  - Add real-time updates when user adjusts LP token amount to withdraw
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.1, 11.2, 11.3, 11.4, 11.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 12. Update PoolDetails component to display accurate pool information
  - Display current pool reserves fetched from blockchain
  - Display total LP supply per shard
  - Display user's LP token balance per shard
  - Display user's pool share percentage
  - Add refresh button to fetch latest pool state
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 13. Write unit tests for LP Calculation Service
  - Create `src/services/__tests__/lpCalculationService.test.ts`
  - Test `calculateLPTokensForDeposit` with initial deposit (should return 1 billion)
  - Test `calculateLPTokensForDeposit` with proportional deposit (floor rounding)
  - Test `calculateTokensForLPAmount` with ceiling rounding and remainder handling
  - Test `calculateTokensForLPAmount` with floor rounding for withdrawals
  - Test `calculateWithdrawalAmounts` with withdrawal fees
  - Test `calculateSingleTokenDeposit` with Balancer formula
  - Test edge cases: zero amounts, maximum u64, overflow, underflow
  - Test validation methods with invalid inputs
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 14. Write smart contract parity tests
  - Create `src/services/__tests__/smartContractParity.test.ts`
  - Replicate test cases from smart contract's `processor.rs` test suite
  - Test deposit calculations match smart contract exactly
  - Test withdrawal calculations match smart contract exactly
  - Test rounding behavior matches smart contract (ceiling for deposits, floor for withdrawals)
  - Test remainder handling matches smart contract
  - Verify precision is maintained for all decimal places
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 15. Write integration tests for Liquidity Service
  - Create `src/services/__tests__/liquidityService.integration.test.ts`
  - Test add liquidity flow: fetch reserves, calculate LP tokens, build transaction
  - Test remove liquidity flow: calculate withdrawal amounts, build transaction
  - Test slippage protection: verify max/min amounts include slippage
  - Test instruction data validation: verify discriminators and amounts
  - Test error handling: invalid amounts, insufficient balances, calculation errors
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 16. Add JSDoc documentation to all calculation functions
  - Add JSDoc comments to all methods in `lpCalculationService.ts`
  - Document mathematical formulas with LaTeX notation
  - Add references to corresponding smart contract code (file and line numbers)
  - Document rounding behavior and why it's necessary
  - Add usage examples for each calculation method
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 17. Add comprehensive error handling and logging
  - Add try-catch blocks around all calculation methods
  - Log calculation inputs, intermediate steps, and results
  - Log errors with full context (inputs, stack trace, environment)
  - Add user-friendly error messages for common errors
  - Implement error recovery strategies (fallback to safe defaults)
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 18. Implement performance optimizations
  - Add memoization for expensive calculations (sqrt, division)
  - Implement reserve data caching with 5-second TTL
  - Add debouncing for UI calculation updates (100ms)
  - Use `getMultipleAccounts` for batch fetching reserves
  - Profile calculation performance and optimize bottlenecks
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 19. Update README with calculation logic documentation
  - Add section explaining LP token calculation formulas
  - Document rounding behavior (ceiling for deposits, floor for withdrawals)
  - Add examples of calculation inputs and outputs
  - Document initial deposit special case (1 billion LP tokens)
  - Add references to smart contract code
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 20. Test on devnet with real transactions
  - Deploy updated code to devnet environment
  - Test add liquidity with small amounts (verify LP tokens received match estimates)
  - Test remove liquidity (verify token amounts received match estimates)
  - Test initial deposit (verify 1 billion LP tokens minted)
  - Test slippage protection (verify transactions succeed with price changes)
  - Monitor transaction success rate and error logs
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
