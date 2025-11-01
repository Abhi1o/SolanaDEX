# Implementation Plan

- [x] 1. Fix instruction discriminators in poolInstructions.ts

  - Update the INSTRUCTION_DISCRIMINATORS constant to use correct values matching the smart contract
  - Add comprehensive documentation comments explaining each discriminator
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 8.1_

- [x] 1.1 Update INSTRUCTION_DISCRIMINATORS constant

  - Change ADD_LIQUIDITY from 0 to 2
  - Change REMOVE_LIQUIDITY from 2 to 3
  - Add INITIALIZE constant with value 0
  - Add ADD_SINGLE constant with value 4
  - Add REMOVE_SINGLE constant with value 5
  - Keep SWAP constant at value 1 (already correct)
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 7.1, 7.2_

- [x] 1.2 Add documentation comments to discriminators

  - Add JSDoc comment block explaining the discriminator values
  - Document the smart contract program ID
  - Add warning about matching on-chain program exactly
  - Document data format for each operation
  - Document account count for each operation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Fix buildAddLiquidityInstructionData function

  - Update function to use correct discriminator value 2
  - Add input validation for all parameters
  - Add detailed documentation comments
  - _Requirements: 1.3, 1.4, 1.5, 5.2, 5.3, 8.2, 8.3, 8.5_

- [x] 2.1 Update discriminator value in buildAddLiquidityInstructionData

  - Change writeUInt8 call to use INSTRUCTION_DISCRIMINATORS.ADD_LIQUIDITY (value 2)
  - Verify buffer allocation is correct (25 bytes)
  - Verify byte offsets: discriminator at 0, pool_token_amount at 1, max_token_a at 9, max_token_b at 17
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 2.2 Add input validation to buildAddLiquidityInstructionData

  - Validate poolTokenAmount is positive (> 0)
  - Validate maxTokenA is positive (> 0)
  - Validate maxTokenB is positive (> 0)
  - Throw descriptive errors for invalid inputs
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 2.3 Add documentation to buildAddLiquidityInstructionData

  - Add JSDoc comment explaining the function purpose
  - Document the instruction data format
  - Document parameter meanings
  - Add example of correct usage
  - _Requirements: 8.2, 8.3, 8.5_

- [x] 3. Fix buildRemoveLiquidityInstructionData function

  - Update function to use correct discriminator value 3
  - Add input validation for all parameters
  - Add detailed documentation comments
  - _Requirements: 2.3, 2.4, 2.5, 5.2, 5.3, 8.2, 8.3, 8.5_

- [x] 3.1 Update discriminator value in buildRemoveLiquidityInstructionData

  - Change writeUInt8 call to use INSTRUCTION_DISCRIMINATORS.REMOVE_LIQUIDITY (value 3)
  - Verify buffer allocation is correct (25 bytes)
  - Verify byte offsets: discriminator at 0, pool_token_amount at 1, min_token_a at 9, min_token_b at 17
  - _Requirements: 2.1, 2.3, 2.5_

- [x] 3.2 Add input validation to buildRemoveLiquidityInstructionData

  - Validate poolTokenAmount is positive (> 0)
  - Validate minTokenA is non-negative (>= 0)
  - Validate minTokenB is non-negative (>= 0)
  - Throw descriptive errors for invalid inputs
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 3.3 Add documentation to buildRemoveLiquidityInstructionData

  - Add JSDoc comment explaining the function purpose
  - Document the instruction data format
  - Document parameter meanings
  - Add example of correct usage
  - _Requirements: 8.2, 8.3, 8.5_

- [x] 4. Fix createAddLiquidityInstruction account order

  - Update account order to match smart contract specification exactly
  - Add comprehensive documentation for each account
  - Add debug logging
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.2, 8.4_

- [x] 4.1 Update account order in createAddLiquidityInstruction

  - Reorder accounts to match smart contract: swap_account, swap_authority, user_transfer_authority, user_token_a_account, user_token_b_account, pool_token_a_account, pool_token_b_account, pool_mint, user_lp_token_account, token_a_mint, token_b_mint, token_a_program, token_b_program, pool_token_program
  - Verify total account count is 14
  - Set correct isSigner and isWritable flags for each account
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.2 Add documentation to createAddLiquidityInstruction

  - Add JSDoc comment with complete account order list
  - Document each account's purpose and flags
  - Add note about matching smart contract exactly
  - Document the total account count (14)
  - _Requirements: 8.2, 8.4_

- [x] 4.3 Add debug logging to createAddLiquidityInstruction

  - Log discriminator value
  - Log instruction data in hexadecimal format
  - Log account count
  - Log program ID
  - Use console.log with clear prefixes for easy debugging
  - _Requirements: 5.5, 9.3_

- [x] 5. Fix createRemoveLiquidityInstruction account order

  - Update account order to match smart contract specification exactly
  - Add comprehensive documentation for each account
  - Add debug logging
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.2, 8.4_

- [x] 5.1 Update account order in createRemoveLiquidityInstruction

  - Reorder accounts to match smart contract: swap_account, swap_authority, user_transfer_authority, pool_mint, user_lp_token_account, pool_token_a_account, pool_token_b_account, user_token_a_account, user_token_b_account, fee_account, token_a_mint, token_b_mint, pool_token_program, token_a_program, token_b_program
  - Verify total account count is 15
  - Set correct isSigner and isWritable flags for each account
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.2 Add documentation to createRemoveLiquidityInstruction

  - Add JSDoc comment with complete account order list
  - Document each account's purpose and flags
  - Add note about matching smart contract exactly
  - Document the total account count (15)
  - _Requirements: 8.2, 8.4_

- [x] 5.3 Add debug logging to createRemoveLiquidityInstruction

  - Log discriminator value
  - Log instruction data in hexadecimal format
  - Log account count
  - Log program ID
  - Use console.log with clear prefixes for easy debugging
  - _Requirements: 5.5, 9.3_

- [x] 6. Update LiquidityService to use corrected instructions

  - Update buildAddLiquidityTransaction to pass parameters in correct order
  - Update buildRemoveLiquidityTransaction to pass parameters in correct order
  - Enhance error handling with better messages
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.3, 7.4, 7.5_

- [x] 6.1 Fix parameter order in buildAddLiquidityTransaction

  - Update createAddLiquidityInstruction call to pass poolTokenAmount (minLpTokens) as first amount parameter
  - Pass maxTokenA (amountA) as second amount parameter
  - Pass maxTokenB (amountB) as third amount parameter
  - Verify all PublicKey parameters are passed correctly
  - _Requirements: 1.4, 1.5, 7.3, 7.4_

- [x] 6.2 Fix parameter order in buildRemoveLiquidityTransaction

  - Update createRemoveLiquidityInstruction call to pass poolTokenAmount (lpTokenAmount) as first amount parameter
  - Pass minTokenA as second amount parameter
  - Pass minTokenB as third amount parameter
  - Verify all PublicKey parameters are passed correctly
  - _Requirements: 2.4, 2.5, 7.3, 7.4_

- [x] 6.3 Enhance error handling in parseTransactionError

  - Add specific handling for InvalidInstruction errors (error code 0xe)
  - Add specific handling for discriminator-related errors
  - Improve error messages to be more user-friendly
  - Add actionable guidance in error messages
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.4 Add validation before sending transactions

  - Validate instruction data length is 25 bytes
  - Validate discriminator value is correct
  - Validate all amounts are positive
  - Log validation results for debugging
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Test the fix on devnet

  - Verify add liquidity transactions succeed
  - Verify remove liquidity transactions succeed
  - Verify LP tokens are minted/burned correctly
  - Verify token balances change as expected
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7.1 Test add liquidity on devnet

  - Connect wallet to devnet
  - Select a pool with sufficient token balances
  - Enter amounts for both tokens
  - Review transaction logs for correct discriminator (2)
  - Submit transaction and verify it succeeds
  - Verify LP tokens were received in user's account
  - Verify token A and B balances decreased correctly
  - _Requirements: 9.1, 9.3, 9.4_

- [x] 7.2 Test remove liquidity on devnet

  - Connect wallet to devnet
  - Select a pool where user has LP tokens
  - Enter LP token amount to burn
  - Review transaction logs for correct discriminator (3)
  - Submit transaction and verify it succeeds
  - Verify LP tokens were burned from user's account
  - Verify token A and B were received correctly
  - _Requirements: 9.2, 9.3, 9.5_

- [x] 7.3 Test error scenarios

  - Test add liquidity with insufficient token balance
  - Test remove liquidity with insufficient LP tokens
  - Test with invalid amounts (zero, negative)
  - Verify error messages are clear and helpful
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7.4 Verify swap functionality still works

  - Test a swap transaction to ensure it still works correctly
  - Verify discriminator 1 is still used for swaps
  - Verify no regression in swap functionality
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Update documentation and comments

  - Ensure all code has clear documentation
  - Add examples where helpful
  - Document the smart contract interface
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8.1 Add file-level documentation to poolInstructions.ts

  - Add file header comment explaining the purpose
  - Document the smart contract program ID
  - Add reference to smart contract documentation
  - List all available operations
  - _Requirements: 8.1, 8.4_

- [x] 8.2 Review and enhance all function documentation

  - Ensure all functions have JSDoc comments
  - Document all parameters with @param tags
  - Document return values with @returns tags
  - Add @throws tags for error conditions
  - _Requirements: 8.2, 8.3, 8.5_

- [x] 8.3 Add inline comments for complex logic

  - Add comments explaining byte offsets in instruction data
  - Add comments explaining account order requirements
  - Add comments for validation logic
  - _Requirements: 8.2, 8.3_

- [x] 8.4 Create or update README with smart contract interface
  - Document all discriminator values
  - Document instruction data formats
  - Document account orders
  - Add examples of correct usage
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
