# Requirements Document

## Introduction

This document outlines the requirements for fixing the critical bug in the add/remove liquidity functionality where incorrect instruction discriminators are being used, causing transactions to fail with "Feature Not Supported" errors. The smart contract documentation clearly specifies discriminator 2 for adding liquidity and discriminator 3 for removing liquidity, but the frontend is currently using discriminators 0 and 2 respectively.

## Glossary

- **Discriminator**: A single-byte identifier at the start of instruction data that tells the smart contract which operation to perform
- **Instruction Data**: The binary data passed to a Solana program instruction that specifies the operation and parameters
- **Pool Instruction**: A Solana transaction instruction that interacts with the DEX pool smart contract
- **Smart Contract**: The on-chain Solana program at address `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z`
- **Account Order**: The specific sequence of accounts that must be passed to a Solana instruction
- **LP Tokens**: Liquidity Provider tokens that represent a user's share of a liquidity pool

## Requirements

### Requirement 1: Correct Add Liquidity Discriminator

**User Story:** As a user, I want to add liquidity to a pool successfully, so that I can earn trading fees from the pool.

#### Acceptance Criteria

1. THE Pool Instruction SHALL use discriminator value 2 for add liquidity operations
2. THE Pool Instruction SHALL NOT use discriminator value 0 for add liquidity operations
3. WHEN a user initiates an add liquidity transaction, THE Pool Instruction SHALL format instruction data with discriminator 2 as the first byte
4. THE Pool Instruction SHALL include pool_token_amount, maximum_token_a_amount, and maximum_token_b_amount in the instruction data after the discriminator
5. THE Pool Instruction SHALL format instruction data as 25 bytes total: 1 byte discriminator + 8 bytes pool_token_amount + 8 bytes max_token_a + 8 bytes max_token_b

### Requirement 2: Correct Remove Liquidity Discriminator

**User Story:** As a user, I want to remove liquidity from a pool successfully, so that I can withdraw my tokens and LP tokens.

#### Acceptance Criteria

1. THE Pool Instruction SHALL use discriminator value 3 for remove liquidity operations
2. THE Pool Instruction SHALL NOT use discriminator value 2 for remove liquidity operations
3. WHEN a user initiates a remove liquidity transaction, THE Pool Instruction SHALL format instruction data with discriminator 3 as the first byte
4. THE Pool Instruction SHALL include pool_token_amount, minimum_token_a_amount, and minimum_token_b_amount in the instruction data after the discriminator
5. THE Pool Instruction SHALL format instruction data as 25 bytes total: 1 byte discriminator + 8 bytes pool_token_amount + 8 bytes min_token_a + 8 bytes min_token_b

### Requirement 3: Correct Account Order for Add Liquidity

**User Story:** As a developer, I want the add liquidity instruction to pass accounts in the correct order, so that the smart contract can process the transaction successfully.

#### Acceptance Criteria

1. THE Pool Instruction SHALL pass accounts in the following order for add liquidity: swap_account, swap_authority, user_transfer_authority, user_token_a_account, user_token_b_account, pool_token_a_account, pool_token_b_account, pool_mint, user_lp_token_account, token_a_mint, token_b_mint, token_a_program, token_b_program, pool_token_program
2. THE Pool Instruction SHALL mark swap_account and swap_authority as read-only
3. THE Pool Instruction SHALL mark user_transfer_authority as a signer
4. THE Pool Instruction SHALL mark user_token_a_account, user_token_b_account, pool_token_a_account, pool_token_b_account, pool_mint, and user_lp_token_account as writable
5. THE Pool Instruction SHALL include exactly 14 accounts for add liquidity operations

### Requirement 4: Correct Account Order for Remove Liquidity

**User Story:** As a developer, I want the remove liquidity instruction to pass accounts in the correct order, so that the smart contract can process the transaction successfully.

#### Acceptance Criteria

1. THE Pool Instruction SHALL pass accounts in the following order for remove liquidity: swap_account, swap_authority, user_transfer_authority, pool_mint, user_lp_token_account, pool_token_a_account, pool_token_b_account, user_token_a_account, user_token_b_account, fee_account, token_a_mint, token_b_mint, pool_token_program, token_a_program, token_b_program
2. THE Pool Instruction SHALL mark swap_account and swap_authority as read-only
3. THE Pool Instruction SHALL mark user_transfer_authority as a signer
4. THE Pool Instruction SHALL mark pool_mint, user_lp_token_account, pool_token_a_account, pool_token_b_account, user_token_a_account, user_token_b_account, and fee_account as writable
5. THE Pool Instruction SHALL include exactly 15 accounts for remove liquidity operations

### Requirement 5: Instruction Data Validation

**User Story:** As a developer, I want to validate instruction data before sending transactions, so that I can catch errors early and provide better error messages.

#### Acceptance Criteria

1. THE Pool Instruction SHALL validate that discriminator values are within the valid range (0-5)
2. THE Pool Instruction SHALL validate that amount values are positive and non-zero
3. THE Pool Instruction SHALL validate that instruction data buffer is exactly 25 bytes for add and remove liquidity operations
4. WHEN validation fails, THE Pool Instruction SHALL throw an error with a descriptive message
5. THE Pool Instruction SHALL log instruction data in hexadecimal format for debugging purposes

### Requirement 6: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when liquidity operations fail, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN a transaction fails with InvalidInstruction error, THE Liquidity Service SHALL provide a user-friendly error message indicating the issue
2. WHEN discriminator 0 is detected in add liquidity operations, THE Liquidity Service SHALL log a warning about using the wrong discriminator
3. THE Liquidity Service SHALL distinguish between different error types: InvalidInstruction, InsufficientFunds, SlippageExceeded, CalculationFailure
4. THE Liquidity Service SHALL include transaction signature in error messages when available
5. THE Liquidity Service SHALL provide actionable guidance in error messages (e.g., "Try increasing slippage tolerance")

### Requirement 7: Backward Compatibility

**User Story:** As a developer, I want the fix to maintain compatibility with existing swap functionality, so that fixing liquidity doesn't break swaps.

#### Acceptance Criteria

1. THE Pool Instruction SHALL NOT modify the swap instruction discriminator (value 1)
2. THE Pool Instruction SHALL NOT modify the swap instruction account order
3. THE Pool Instruction SHALL maintain the same instruction builder pattern used by swap instructions
4. THE Pool Instruction SHALL use the same program ID for all operations
5. THE Pool Instruction SHALL maintain compatibility with existing pool configuration format in dex-config.json

### Requirement 8: Documentation and Comments

**User Story:** As a developer, I want clear documentation of discriminator values and account orders, so that future developers understand the smart contract interface.

#### Acceptance Criteria

1. THE Pool Instruction file SHALL include comments documenting all discriminator values: 0=Initialize, 1=Swap, 2=Add Liquidity, 3=Remove Liquidity, 4=Add Single Token, 5=Remove Single Token
2. THE Pool Instruction file SHALL include comments documenting the exact account order for each operation
3. THE Pool Instruction file SHALL include comments explaining the instruction data format for each operation
4. THE Pool Instruction file SHALL include a reference to the smart contract program ID
5. THE Pool Instruction file SHALL include examples of correct instruction data formatting

### Requirement 9: Testing and Verification

**User Story:** As a developer, I want to verify that the fix works correctly, so that users can successfully add and remove liquidity.

#### Acceptance Criteria

1. THE Pool Instruction SHALL be tested with actual add liquidity transactions on devnet
2. THE Pool Instruction SHALL be tested with actual remove liquidity transactions on devnet
3. THE Pool Instruction SHALL log instruction data and account details for verification
4. WHEN a transaction succeeds, THE Liquidity Service SHALL verify that LP tokens were minted or burned correctly
5. THE Liquidity Service SHALL verify that token balances changed as expected after liquidity operations
