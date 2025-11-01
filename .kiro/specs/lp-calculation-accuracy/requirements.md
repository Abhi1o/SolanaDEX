# Requirements Document

## Introduction

This document outlines the requirements for fixing the LP (Liquidity Provider) token calculation logic in the frontend to match the exact formulas used by the SAMM DEX smart contract. The smart contract uses a constant product AMM formula (x × y = k) with specific rounding rules and proportional calculations. The frontend must replicate these calculations precisely to provide accurate estimates and prevent transaction failures due to slippage.

## Glossary

- **LP Tokens**: Liquidity Provider tokens that represent a user's proportional share of a liquidity pool
- **Pool Reserves**: The current amounts of token A and token B held in the pool's liquidity accounts
- **LP Supply**: The total supply of LP tokens currently minted for a specific pool/shard
- **Constant Product Formula**: The AMM invariant x × y = k, where x and y are token reserves
- **Proportional Calculation**: The method of calculating required token amounts based on the ratio of LP tokens to total LP supply
- **Rounding Direction**: Whether to round calculations up (Ceiling) or down (Floor) to protect the pool or user
- **Shard**: An independent pool instance with its own LP token mint and reserves
- **Initial Pool Supply**: The first LP token amount minted when a pool is created (1,000,000,000 tokens)
- **Slippage Tolerance**: The maximum acceptable difference between expected and actual amounts

## Requirements

### Requirement 1: Accurate LP Token to Trading Token Conversion

**User Story:** As a user, I want to see accurate estimates of how many tokens I need to deposit for a given LP token amount, so that I can make informed decisions and avoid transaction failures.

#### Acceptance Criteria

1. THE Liquidity Service SHALL calculate required token amounts using the formula: `token_amount = (lp_tokens / lp_supply) × reserve_amount`
2. THE Liquidity Service SHALL apply ceiling rounding when calculating required deposits to protect the pool from underpayment
3. WHEN the pool has zero LP supply (first deposit), THE Liquidity Service SHALL use the initial pool supply value of 1,000,000,000 as the denominator
4. THE Liquidity Service SHALL handle remainder calculations by adding 1 to the result when remainder > 0 and amount > 0
5. THE Liquidity Service SHALL validate that calculated amounts are non-zero before proceeding with transactions

### Requirement 2: Accurate Trading Token to LP Token Conversion

**User Story:** As a user, I want to see accurate estimates of how many LP tokens I will receive for my token deposits, so that I understand my pool share.

#### Acceptance Criteria

1. THE Liquidity Service SHALL calculate LP tokens using the formula: `lp_tokens = (token_amount / reserve_amount) × lp_supply`
2. THE Liquidity Service SHALL apply floor rounding when calculating LP tokens to receive to protect the pool from overpayment
3. WHEN the pool has zero LP supply (first deposit), THE Liquidity Service SHALL mint exactly 1,000,000,000 LP tokens regardless of deposit amounts
4. THE Liquidity Service SHALL ensure both token amounts maintain the pool's current ratio within acceptable precision
5. THE Liquidity Service SHALL validate that the calculated LP token amount is greater than zero

### Requirement 3: Per-Shard LP Token Tracking

**User Story:** As a user, I want to see my LP token balances for each shard separately, so that I understand my positions across different pools.

#### Acceptance Criteria

1. THE Liquidity Service SHALL query LP token balances using the shard-specific pool mint address
2. THE Liquidity Service SHALL display LP token balances separately for each shard in the UI
3. THE Liquidity Service SHALL fetch the current LP supply from the on-chain mint account for each shard
4. THE Liquidity Service SHALL NOT aggregate LP tokens across different shards
5. THE Liquidity Service SHALL display the user's percentage share of each pool based on their LP tokens

### Requirement 4: Reserve Amount Fetching

**User Story:** As a developer, I want to fetch accurate reserve amounts from the blockchain, so that calculations are based on current on-chain state.

#### Acceptance Criteria

1. THE Liquidity Service SHALL fetch token A reserve amount from the pool's token_a account
2. THE Liquidity Service SHALL fetch token B reserve amount from the pool's token_b account
3. THE Liquidity Service SHALL fetch LP supply from the pool_mint account's supply field
4. THE Liquidity Service SHALL refresh reserve data before each calculation to ensure accuracy
5. THE Liquidity Service SHALL handle cases where reserve accounts are not yet initialized

### Requirement 5: Slippage Protection Calculation

**User Story:** As a user, I want slippage protection to prevent my transaction from failing due to pool state changes, so that my deposits succeed even if the pool ratio shifts slightly.

#### Acceptance Criteria

1. THE Liquidity Service SHALL calculate maximum_token_a_amount as: `required_token_a × (1 + slippage_tolerance)`
2. THE Liquidity Service SHALL calculate maximum_token_b_amount as: `required_token_b × (1 + slippage_tolerance)`
3. THE Liquidity Service SHALL use ceiling rounding for maximum amounts to ensure sufficient allowance
4. THE Liquidity Service SHALL default to 1% slippage tolerance if not specified by the user
5. THE Liquidity Service SHALL allow users to adjust slippage tolerance between 0.1% and 5%

### Requirement 6: Initial Deposit Handling

**User Story:** As the first liquidity provider, I want to deposit tokens and receive the initial LP token supply, so that I can bootstrap a new pool.

#### Acceptance Criteria

1. WHEN the LP supply is zero, THE Liquidity Service SHALL recognize this as an initial deposit
2. THE Liquidity Service SHALL mint exactly 1,000,000,000 LP tokens for the initial deposit
3. THE Liquidity Service SHALL accept any ratio of token A to token B for the initial deposit
4. THE Liquidity Service SHALL set the pool's price ratio based on the initial deposit amounts
5. THE Liquidity Service SHALL validate that both token amounts are greater than zero for initial deposits

### Requirement 7: Proportional Deposit Calculation

**User Story:** As a user adding liquidity to an existing pool, I want the interface to automatically calculate the proportional amount of the second token, so that I maintain the pool's ratio.

#### Acceptance Criteria

1. WHEN the user enters an amount for token A, THE Liquidity Service SHALL calculate token B amount as: `token_b = (token_a / reserve_a) × reserve_b`
2. WHEN the user enters an amount for token B, THE Liquidity Service SHALL calculate token A amount as: `token_a = (token_b / reserve_b) × reserve_a`
3. THE Liquidity Service SHALL use ceiling rounding for the calculated amount to ensure sufficient deposit
4. THE Liquidity Service SHALL update the calculated amount in real-time as the user types
5. THE Liquidity Service SHALL display the calculated LP tokens the user will receive

### Requirement 8: Withdrawal Calculation Accuracy

**User Story:** As a user, I want to see accurate estimates of how many tokens I will receive when withdrawing liquidity, so that I understand what I'm getting back.

#### Acceptance Criteria

1. THE Liquidity Service SHALL calculate withdrawal amounts using the formula: `token_amount = (lp_tokens / lp_supply) × reserve_amount`
2. THE Liquidity Service SHALL apply floor rounding when calculating withdrawal amounts to protect the pool
3. THE Liquidity Service SHALL account for withdrawal fees by subtracting the fee from LP tokens before calculation
4. THE Liquidity Service SHALL calculate minimum_token_a_amount as: `expected_token_a × (1 - slippage_tolerance)`
5. THE Liquidity Service SHALL calculate minimum_token_b_amount as: `expected_token_b × (1 - slippage_tolerance)`

### Requirement 9: Precision and Overflow Handling

**User Story:** As a developer, I want calculations to handle large numbers and maintain precision, so that calculations are accurate for all token amounts.

#### Acceptance Criteria

1. THE Liquidity Service SHALL use BigInt or equivalent for all intermediate calculations to prevent overflow
2. THE Liquidity Service SHALL perform multiplication before division to maintain precision
3. THE Liquidity Service SHALL handle token decimals correctly by scaling amounts appropriately
4. THE Liquidity Service SHALL validate that final amounts fit within u64 range (0 to 18,446,744,073,709,551,615)
5. THE Liquidity Service SHALL throw descriptive errors when calculations overflow or underflow

### Requirement 10: Calculation Validation

**User Story:** As a user, I want the interface to validate my inputs before submitting transactions, so that I don't waste gas on failing transactions.

#### Acceptance Criteria

1. THE Liquidity Service SHALL validate that calculated token amounts do not exceed user balances
2. THE Liquidity Service SHALL validate that LP token amounts are greater than zero
3. THE Liquidity Service SHALL validate that token amounts are greater than zero
4. THE Liquidity Service SHALL validate that the pool has sufficient liquidity for withdrawals
5. THE Liquidity Service SHALL display clear error messages when validation fails

### Requirement 11: Pool Share Calculation

**User Story:** As a user, I want to see what percentage of the pool I will own after depositing, so that I understand my position size.

#### Acceptance Criteria

1. THE Liquidity Service SHALL calculate pool share as: `(user_lp_tokens / total_lp_supply) × 100`
2. THE Liquidity Service SHALL display pool share percentage with 2 decimal places
3. THE Liquidity Service SHALL update pool share in real-time as deposit amounts change
4. THE Liquidity Service SHALL show both current pool share and projected pool share after deposit
5. THE Liquidity Service SHALL handle the initial deposit case by showing 100% pool share

### Requirement 12: Single-Token Deposit Support

**User Story:** As a user, I want to deposit a single token type and receive LP tokens, so that I have flexibility in how I provide liquidity.

#### Acceptance Criteria

1. THE Liquidity Service SHALL support single-token deposits using the Balancer formula: `lp_tokens = lp_supply × (√(1 + ratio) - 1)`
2. THE Liquidity Service SHALL calculate ratio as: `ratio = source_amount / swap_source_amount`
3. THE Liquidity Service SHALL use the appropriate reserve amount based on which token is being deposited
4. THE Liquidity Service SHALL apply floor rounding for single-token deposit LP calculations
5. THE Liquidity Service SHALL validate that the calculated LP amount is greater than zero

### Requirement 13: Calculation Consistency Across Components

**User Story:** As a developer, I want all components to use the same calculation logic, so that estimates are consistent throughout the application.

#### Acceptance Criteria

1. THE Liquidity Service SHALL centralize all LP calculation logic in a single service module
2. THE Liquidity Service SHALL export reusable calculation functions for use across components
3. THE Liquidity Service SHALL ensure the AddLiquidity, RemoveLiquidity, and PoolDetails components use the same calculations
4. THE Liquidity Service SHALL maintain calculation constants (like INITIAL_SWAP_POOL_AMOUNT) in a shared configuration
5. THE Liquidity Service SHALL document all calculation formulas with references to the smart contract code

### Requirement 14: Real-Time Calculation Updates

**User Story:** As a user, I want calculations to update immediately as I type, so that I get instant feedback on my liquidity operations.

#### Acceptance Criteria

1. THE Liquidity Service SHALL debounce calculation updates to prevent excessive re-renders (max 100ms delay)
2. THE Liquidity Service SHALL update all dependent values when any input changes
3. THE Liquidity Service SHALL display loading states during calculation updates
4. THE Liquidity Service SHALL handle rapid input changes gracefully without calculation errors
5. THE Liquidity Service SHALL cancel pending calculations when new inputs are received

### Requirement 15: Error Handling and Edge Cases

**User Story:** As a user, I want the interface to handle edge cases gracefully, so that I don't encounter confusing errors or crashes.

#### Acceptance Criteria

1. WHEN reserves are zero, THE Liquidity Service SHALL display a message indicating the pool is not initialized
2. WHEN LP supply is zero, THE Liquidity Service SHALL recognize this as an initial deposit scenario
3. WHEN calculations result in zero amounts, THE Liquidity Service SHALL display an error message
4. WHEN calculations overflow, THE Liquidity Service SHALL display an error message about amount being too large
5. THE Liquidity Service SHALL log calculation errors with full context for debugging

### Requirement 16: Testing and Verification

**User Story:** As a developer, I want comprehensive tests for calculation logic, so that I can be confident the calculations match the smart contract.

#### Acceptance Criteria

1. THE Liquidity Service SHALL include unit tests for all calculation functions
2. THE Liquidity Service SHALL include test cases matching the smart contract's test suite
3. THE Liquidity Service SHALL test edge cases: zero amounts, maximum amounts, initial deposits
4. THE Liquidity Service SHALL test rounding behavior matches the smart contract (ceiling for deposits, floor for withdrawals)
5. THE Liquidity Service SHALL include integration tests that verify calculations against actual on-chain data

### Requirement 17: Documentation and Code Comments

**User Story:** As a developer, I want clear documentation of calculation logic, so that I can understand and maintain the code.

#### Acceptance Criteria

1. THE Liquidity Service SHALL include JSDoc comments for all calculation functions
2. THE Liquidity Service SHALL document the mathematical formulas used in each function
3. THE Liquidity Service SHALL include references to the corresponding smart contract code
4. THE Liquidity Service SHALL document rounding behavior and why it's necessary
5. THE Liquidity Service SHALL include examples of calculation inputs and expected outputs

### Requirement 18: Performance Optimization

**User Story:** As a user, I want calculations to be fast and responsive, so that the interface feels smooth and professional.

#### Acceptance Criteria

1. THE Liquidity Service SHALL complete all calculations in less than 50ms
2. THE Liquidity Service SHALL cache reserve data for 5 seconds to reduce RPC calls
3. THE Liquidity Service SHALL use memoization for expensive calculations
4. THE Liquidity Service SHALL avoid unnecessary re-calculations when inputs haven't changed
5. THE Liquidity Service SHALL profile calculation performance and optimize bottlenecks
