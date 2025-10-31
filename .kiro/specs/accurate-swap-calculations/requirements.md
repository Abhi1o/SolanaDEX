# Requirements Document

## Introduction

This feature addresses critical issues with swap calculations in the DEX where off-chain estimates don't match on-chain execution results, causing transactions to fail with slippage errors even with high tolerance settings. The system currently uses stale reserve data from configuration files instead of fetching live on-chain pool state, leading to inaccurate output estimates and minimum amount calculations.

## Glossary

- **DEX_System**: The decentralized exchange frontend application that facilitates token swaps
- **Pool_State**: The on-chain account containing current reserve balances and pool parameters
- **Reserve_Balance**: The actual amount of tokens currently held in a pool's token accounts
- **Output_Estimate**: The calculated amount of tokens a user will receive from a swap
- **Minimum_Output**: The lowest acceptable output amount accounting for slippage tolerance
- **AMM_Formula**: The constant product formula (x * y = k) used to calculate swap amounts
- **Slippage_Tolerance**: The maximum acceptable difference between estimated and actual output

## Requirements

### Requirement 1

**User Story:** As a trader, I want swap output estimates to accurately reflect on-chain pool state, so that my transactions succeed without requiring excessive slippage tolerance

#### Acceptance Criteria

1. WHEN the DEX_System calculates a swap quote, THE DEX_System SHALL fetch current Reserve_Balance values from on-chain Pool_State accounts
2. WHEN calculating Output_Estimate, THE DEX_System SHALL use the fetched Reserve_Balance values in the AMM_Formula
3. THE DEX_System SHALL complete the Reserve_Balance fetch operation within 2 seconds
4. WHEN Reserve_Balance data is unavailable, THE DEX_System SHALL display an error message to the user
5. THE DEX_System SHALL cache fetched Reserve_Balance data for a maximum of 5 seconds to reduce RPC calls

### Requirement 2

**User Story:** As a trader, I want minimum output calculations to match on-chain program expectations, so that my swaps execute successfully with reasonable slippage settings

#### Acceptance Criteria

1. WHEN calculating Minimum_Output, THE DEX_System SHALL apply Slippage_Tolerance to the Output_Estimate derived from current Reserve_Balance values
2. THE DEX_System SHALL convert Minimum_Output to base units using the correct token decimals before transaction submission
3. WHEN the on-chain program calculates actual output, THE actual output SHALL be greater than or equal to the submitted Minimum_Output value
4. THE DEX_System SHALL log both human-readable and base-unit values for debugging purposes

### Requirement 3

**User Story:** As a trader, I want to see accurate price impact calculations, so that I can make informed decisions about my trades

#### Acceptance Criteria

1. WHEN displaying a swap quote, THE DEX_System SHALL calculate price impact using current Reserve_Balance values
2. THE DEX_System SHALL display price impact as a percentage with 2 decimal places
3. WHEN price impact exceeds 1 percent, THE DEX_System SHALL display a warning to the user
4. WHEN price impact exceeds 5 percent, THE DEX_System SHALL display a prominent warning requiring user confirmation

### Requirement 4

**User Story:** As a developer, I want clear error messages when swap calculations fail, so that I can quickly diagnose and fix issues

#### Acceptance Criteria

1. WHEN a swap transaction fails with slippage error, THE DEX_System SHALL log the expected output, minimum output, and actual on-chain calculation
2. WHEN Reserve_Balance fetch fails, THE DEX_System SHALL log the specific RPC error and pool address
3. THE DEX_System SHALL include transaction simulation logs in error messages
4. WHEN decimal conversion errors occur, THE DEX_System SHALL log the original value, decimals used, and resulting base units
