# Liquidity Smart Contract Fix Design Document

## Overview

This design document outlines the fix for the critical bug where incorrect instruction discriminators are being used for add and remove liquidity operations. The bug causes all liquidity operations to fail with "Feature Not Supported" errors because the frontend is sending discriminator 0 (Initialize/Create Pool) instead of discriminator 2 (Add Liquidity).

The fix involves:
1. Updating the discriminator constants to match the smart contract specification
2. Correcting the account order for both add and remove liquidity operations
3. Adding validation and better error handling
4. Maintaining backward compatibility with existing swap functionality

## Architecture

### Current (Broken) Implementation

```typescript
// ❌ WRONG - Current discriminators
export const INSTRUCTION_DISCRIMINATORS = {
  ADD_LIQUIDITY: 0,      // This is actually Initialize (create pool)
  REMOVE_LIQUIDITY: 2,   // This is actually Add Liquidity
  SWAP: 1,               // This is correct
};
```

### Fixed Implementation

```typescript
// ✅ CORRECT - Fixed discriminators matching smart contract
export const INSTRUCTION_DISCRIMINATORS = {
  INITIALIZE: 0,         // Create new pool (not used in frontend)
  SWAP: 1,               // Swap tokens (already working)
  ADD_LIQUIDITY: 2,      // Add liquidity (both tokens)
  REMOVE_LIQUIDITY: 3,   // Remove liquidity (both tokens)
  ADD_SINGLE: 4,         // Add liquidity (single token) - future feature
  REMOVE_SINGLE: 5,      // Remove liquidity (single token) - future feature
};
```

### Smart Contract Interface

Based on the provided documentation, the smart contract at `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z` expects:

**Add Liquidity (Discriminator 2):**
- Instruction Data: `[2][pool_token_amount: 8 bytes][max_token_a: 8 bytes][max_token_b: 8 bytes]`
- Total: 25 bytes
- 14 accounts in specific order

**Remove Liquidity (Discriminator 3):**
- Instruction Data: `[3][pool_token_amount: 8 bytes][min_token_a: 8 bytes][min_token_b: 8 bytes]`
- Total: 25 bytes
- 15 accounts in specific order

## Components and Interfaces

### 1. Instruction Discriminators (Constants)

```typescript
/**
 * Instruction discriminators for the DEX smart contract
 * Program ID: 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z
 * 
 * CRITICAL: These values MUST match the on-chain program exactly
 */
export const INSTRUCTION_DISCRIMINATORS = {
  /**
   * Discriminator 0: Initialize
   * Creates a new liquidity pool
   * NOT used in frontend - pools are pre-created
   */
  INITIALIZE: 0,
  
  /**
   * Discriminator 1: Swap
   * Swaps one token for another
   * Already implemented and working correctly
   */
  SWAP: 1,
  
  /**
   * Discriminator 2: Add Liquidity (Both Tokens)
   * Deposits both tokens to receive LP tokens
   * Data format: [discriminator][pool_token_amount][max_token_a][max_token_b]
   * Accounts: 14 total
   */
  ADD_LIQUIDITY: 2,
  
  /**
   * Discriminator 3: Remove Liquidity (Both Tokens)
   * Burns LP tokens to receive both tokens back
   * Data format: [discriminator][pool_token_amount][min_token_a][min_token_b]
   * Accounts: 15 total
   */
  REMOVE_LIQUIDITY: 3,
  
  /**
   * Discriminator 4: Add Liquidity (Single Token)
   * Deposits single token to receive LP tokens
   * Future feature - not yet implemented
   */
  ADD_SINGLE: 4,
  
  /**
   * Discriminator 5: Remove Liquidity (Single Token)
   * Burns LP tokens to receive single token
   * Future feature - not yet implemented
   */
  REMOVE_SINGLE: 5,
} as const;
```

### 2. Instruction Data Builders

#### Add Liquidity Instruction Data

```typescript
/**
 * Build add liquidity instruction data
 * 
 * Format: [discriminator (1 byte)][pool_token_amount (8 bytes)][max_token_a (8 bytes)][max_token_b (8 bytes)]
 * Total: 25 bytes
 * 
 * @param poolTokenAmount - Minimum LP tokens to receive (slippage protection)
 * @param maxTokenA - Maximum token A to deposit (slippage protection)
 * @param maxTokenB - Maximum token B to deposit (slippage protection)
 * @returns Buffer containing the instruction data
 */
export function buildAddLiquidityInstructionData(
  poolTokenAmount: bigint,
  maxTokenA: bigint,
  maxTokenB: bigint
): Buffer {
  // Validate inputs
  if (poolTokenAmount <= BigInt(0)) {
    throw new Error('Pool token amount must be positive');
  }
  if (maxTokenA <= BigInt(0)) {
    throw new Error('Max token A amount must be positive');
  }
  if (maxTokenB <= BigInt(0)) {
    throw new Error('Max token B amount must be positive');
  }

  const data = Buffer.alloc(25);
  
  // Write discriminator (1 byte)
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.ADD_LIQUIDITY, 0);
  
  // Write pool token amount (8 bytes, little-endian)
  data.writeBigUInt64LE(poolTokenAmount, 1);
  
  // Write max token A (8 bytes, little-endian)
  data.writeBigUInt64LE(maxTokenA, 9);
  
  // Write max token B (8 bytes, little-endian)
  data.writeBigUInt64LE(maxTokenB, 17);
  
  return data;
}
```

#### Remove Liquidity Instruction Data

```typescript
/**
 * Build remove liquidity instruction data
 * 
 * Format: [discriminator (1 byte)][pool_token_amount (8 bytes)][min_token_a (8 bytes)][min_token_b (8 bytes)]
 * Total: 25 bytes
 * 
 * @param poolTokenAmount - LP tokens to burn
 * @param minTokenA - Minimum token A to receive (slippage protection)
 * @param minTokenB - Minimum token B to receive (slippage protection)
 * @returns Buffer containing the instruction data
 */
export function buildRemoveLiquidityInstructionData(
  poolTokenAmount: bigint,
  minTokenA: bigint,
  minTokenB: bigint
): Buffer {
  // Validate inputs
  if (poolTokenAmount <= BigInt(0)) {
    throw new Error('Pool token amount must be positive');
  }
  if (minTokenA < BigInt(0)) {
    throw new Error('Min token A amount cannot be negative');
  }
  if (minTokenB < BigInt(0)) {
    throw new Error('Min token B amount cannot be negative');
  }

  const data = Buffer.alloc(25);
  
  // Write discriminator (1 byte)
  data.writeUInt8(INSTRUCTION_DISCRIMINATORS.REMOVE_LIQUIDITY, 0);
  
  // Write pool token amount (8 bytes, little-endian)
  data.writeBigUInt64LE(poolTokenAmount, 1);
  
  // Write min token A (8 bytes, little-endian)
  data.writeBigUInt64LE(minTokenA, 9);
  
  // Write min token B (8 bytes, little-endian)
  data.writeBigUInt64LE(minTokenB, 17);
  
  return data;
}
```

### 3. Account Order for Add Liquidity

Based on the smart contract documentation, the account order for add liquidity is:

```typescript
/**
 * Create instruction to add liquidity to a pool
 * 
 * Account order (MUST match smart contract exactly):
 * 0. swap_account (read-only) - The token swap pool account
 * 1. swap_authority (read-only) - PDA authority of the swap
 * 2. user_transfer_authority (signer) - User's wallet (must sign)
 * 3. user_token_a_account (writable) - User's token A account (source)
 * 4. user_token_b_account (writable) - User's token B account (source)
 * 5. pool_token_a_account (writable) - Pool's token A reserve
 * 6. pool_token_b_account (writable) - Pool's token B reserve
 * 7. pool_mint (writable) - LP token mint
 * 8. user_lp_token_account (writable) - User's LP token account (destination)
 * 9. token_a_mint (read-only) - Token A mint address
 * 10. token_b_mint (read-only) - Token B mint address
 * 11. token_a_program (read-only) - SPL Token program (Token A)
 * 12. token_b_program (read-only) - SPL Token program (Token B)
 * 13. pool_token_program (read-only) - SPL Token program (LP tokens)
 * 
 * Total: 14 accounts
 */
export function createAddLiquidityInstruction(
  programId: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  lpTokenMint: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  userAuthority: PublicKey,
  userTokenAccountA: PublicKey,
  userTokenAccountB: PublicKey,
  userLpTokenAccount: PublicKey,
  poolTokenAmount: bigint,
  maxTokenA: bigint,
  maxTokenB: bigint
): TransactionInstruction {
  // Build instruction data
  const data = buildAddLiquidityInstructionData(
    poolTokenAmount,
    maxTokenA,
    maxTokenB
  );

  // Build accounts array in exact order
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: false },           // 0
    { pubkey: poolAuthority, isSigner: false, isWritable: false },         // 1
    { pubkey: userAuthority, isSigner: true, isWritable: false },          // 2
    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },      // 3
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },      // 4
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },      // 5
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },      // 6
    { pubkey: lpTokenMint, isSigner: false, isWritable: true },            // 7
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },     // 8
    { pubkey: tokenAMint, isSigner: false, isWritable: false },            // 9
    { pubkey: tokenBMint, isSigner: false, isWritable: false },            // 10
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 11
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 12
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 13
  ];

  // Log for debugging
  console.log('🔧 Add Liquidity Instruction:');
  console.log('  Discriminator:', INSTRUCTION_DISCRIMINATORS.ADD_LIQUIDITY);
  console.log('  Instruction data (hex):', data.toString('hex'));
  console.log('  Accounts:', keys.length);
  console.log('  Program ID:', programId.toString());

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
```

### 4. Account Order for Remove Liquidity

```typescript
/**
 * Create instruction to remove liquidity from a pool
 * 
 * Account order (MUST match smart contract exactly):
 * 0. swap_account (read-only) - The token swap pool account
 * 1. swap_authority (read-only) - PDA authority of the swap
 * 2. user_transfer_authority (signer) - User's wallet (must sign)
 * 3. pool_mint (writable) - LP token mint
 * 4. user_lp_token_account (writable) - User's LP token account (source)
 * 5. pool_token_a_account (writable) - Pool's token A reserve
 * 6. pool_token_b_account (writable) - Pool's token B reserve
 * 7. user_token_a_account (writable) - User's token A account (destination)
 * 8. user_token_b_account (writable) - User's token B account (destination)
 * 9. fee_account (writable) - Pool fee account
 * 10. token_a_mint (read-only) - Token A mint address
 * 11. token_b_mint (read-only) - Token B mint address
 * 12. pool_token_program (read-only) - SPL Token program (LP tokens)
 * 13. token_a_program (read-only) - SPL Token program (Token A)
 * 14. token_b_program (read-only) - SPL Token program (Token B)
 * 
 * Total: 15 accounts
 */
export function createRemoveLiquidityInstruction(
  programId: PublicKey,
  poolAddress: PublicKey,
  poolAuthority: PublicKey,
  poolTokenAccountA: PublicKey,
  poolTokenAccountB: PublicKey,
  lpTokenMint: PublicKey,
  feeAccount: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  userAuthority: PublicKey,
  userTokenAccountA: PublicKey,
  userTokenAccountB: PublicKey,
  userLpTokenAccount: PublicKey,
  poolTokenAmount: bigint,
  minTokenA: bigint,
  minTokenB: bigint
): TransactionInstruction {
  // Build instruction data
  const data = buildRemoveLiquidityInstructionData(
    poolTokenAmount,
    minTokenA,
    minTokenB
  );

  // Build accounts array in exact order
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: false },           // 0
    { pubkey: poolAuthority, isSigner: false, isWritable: false },         // 1
    { pubkey: userAuthority, isSigner: true, isWritable: false },          // 2
    { pubkey: lpTokenMint, isSigner: false, isWritable: true },            // 3
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },     // 4
    { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },      // 5
    { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },      // 6
    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },      // 7
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },      // 8
    { pubkey: feeAccount, isSigner: false, isWritable: true },             // 9
    { pubkey: tokenAMint, isSigner: false, isWritable: false },            // 10
    { pubkey: tokenBMint, isSigner: false, isWritable: false },            // 11
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 12
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 13
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // 14
  ];

  // Log for debugging
  console.log('🔧 Remove Liquidity Instruction:');
  console.log('  Discriminator:', INSTRUCTION_DISCRIMINATORS.REMOVE_LIQUIDITY);
  console.log('  Instruction data (hex):', data.toString('hex'));
  console.log('  Accounts:', keys.length);
  console.log('  Program ID:', programId.toString());

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
```

### 5. Updated Liquidity Service

The liquidity service needs minor updates to pass the correct parameters:

```typescript
// In buildAddLiquidityTransaction method
const addLiquidityIx = createAddLiquidityInstruction(
  this.programId,
  poolAddress,
  poolAuthority,
  poolTokenAccountA,
  poolTokenAccountB,
  lpTokenMint,
  tokenAMint,
  tokenBMint,
  userPublicKey,
  userTokenAccountA,
  userTokenAccountB,
  userLpTokenAccount,
  minLpTokens,        // pool_token_amount (min LP tokens to receive)
  amountA,            // maximum_token_a_amount
  amountB             // maximum_token_b_amount
);
```

**Key Change:** The parameter order in the service call needs to match the new function signature. The first amount parameter is now `poolTokenAmount` (min LP tokens), not `amountA`.

## Data Models

### Instruction Data Format

```typescript
interface AddLiquidityInstructionData {
  discriminator: 2;
  poolTokenAmount: bigint;    // Minimum LP tokens to receive
  maximumTokenA: bigint;      // Maximum token A to deposit
  maximumTokenB: bigint;      // Maximum token B to deposit
}

interface RemoveLiquidityInstructionData {
  discriminator: 3;
  poolTokenAmount: bigint;    // LP tokens to burn
  minimumTokenA: bigint;      // Minimum token A to receive
  minimumTokenB: bigint;      // Minimum token B to receive
}
```

### Binary Layout

```
Add Liquidity (25 bytes):
┌──────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Discriminator│ Pool Token Amount│ Max Token A      │ Max Token B      │
│ 1 byte       │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │
│ Value: 2     │                  │                  │                  │
└──────────────┴──────────────────┴──────────────────┴──────────────────┘

Remove Liquidity (25 bytes):
┌──────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Discriminator│ Pool Token Amount│ Min Token A      │ Min Token B      │
│ 1 byte       │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │ 8 bytes (u64 LE) │
│ Value: 3     │                  │                  │                  │
└──────────────┴──────────────────┴──────────────────┴──────────────────┘
```

## Error Handling

### Error Detection

```typescript
/**
 * Parse transaction error for user-friendly message
 */
parseTransactionError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Check for discriminator-related errors
    if (message.includes('invalid instruction') || message.includes('0xe')) {
      return 'Invalid instruction format. This may be due to incorrect discriminator or account order. Please contact support.';
    }
    
    if (message.includes('insufficient funds') || message.includes('insufficient lamports')) {
      return 'Insufficient SOL balance to pay for transaction fees.';
    }
    
    if (message.includes('slippage tolerance exceeded') || message.includes('slippage')) {
      return 'Price moved beyond your slippage tolerance. Try increasing slippage or reducing the amount.';
    }
    
    if (message.includes('blockhash not found')) {
      return 'Transaction expired. Please try again.';
    }
    
    if (message.includes('user rejected')) {
      return 'Transaction was rejected by user.';
    }

    return error.message;
  }

  return 'An unknown error occurred during the liquidity operation.';
}
```

### Validation Before Transaction

```typescript
/**
 * Validate instruction data before sending
 */
function validateInstructionData(data: Buffer, expectedDiscriminator: number): void {
  if (data.length !== 25) {
    throw new Error(`Invalid instruction data length: expected 25 bytes, got ${data.length}`);
  }
  
  const discriminator = data.readUInt8(0);
  if (discriminator !== expectedDiscriminator) {
    throw new Error(`Invalid discriminator: expected ${expectedDiscriminator}, got ${discriminator}`);
  }
  
  const poolTokenAmount = data.readBigUInt64LE(1);
  const tokenA = data.readBigUInt64LE(9);
  const tokenB = data.readBigUInt64LE(17);
  
  if (poolTokenAmount <= BigInt(0)) {
    throw new Error('Pool token amount must be positive');
  }
  
  if (tokenA <= BigInt(0) || tokenB <= BigInt(0)) {
    throw new Error('Token amounts must be positive');
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('poolInstructions', () => {
  describe('buildAddLiquidityInstructionData', () => {
    it('should create correct instruction data with discriminator 2', () => {
      const data = buildAddLiquidityInstructionData(
        BigInt(100_000_000_000),  // 100 LP tokens
        BigInt(1_200_000_000),    // 1200 USDC
        BigInt(12_000_000_000)    // 12 SOL
      );
      
      expect(data.length).toBe(25);
      expect(data.readUInt8(0)).toBe(2); // Discriminator
      expect(data.readBigUInt64LE(1)).toBe(BigInt(100_000_000_000));
      expect(data.readBigUInt64LE(9)).toBe(BigInt(1_200_000_000));
      expect(data.readBigUInt64LE(17)).toBe(BigInt(12_000_000_000));
    });
    
    it('should throw error for zero amounts', () => {
      expect(() => {
        buildAddLiquidityInstructionData(BigInt(0), BigInt(100), BigInt(100));
      }).toThrow('Pool token amount must be positive');
    });
  });
  
  describe('createAddLiquidityInstruction', () => {
    it('should create instruction with 14 accounts', () => {
      const instruction = createAddLiquidityInstruction(/* params */);
      expect(instruction.keys.length).toBe(14);
    });
    
    it('should have correct account flags', () => {
      const instruction = createAddLiquidityInstruction(/* params */);
      expect(instruction.keys[0].isWritable).toBe(false); // swap_account
      expect(instruction.keys[2].isSigner).toBe(true);    // user_authority
      expect(instruction.keys[3].isWritable).toBe(true);  // user_token_a
    });
  });
});
```

### Integration Tests

```typescript
describe('Add Liquidity Integration', () => {
  it('should successfully add liquidity to a pool', async () => {
    const result = await liquidityService.addLiquidity({
      pool: testPool,
      amountA: BigInt(1000_000_000),
      amountB: BigInt(10_000_000_000),
      minLpTokens: BigInt(3_000_000_000),
    }, wallet);
    
    expect(result.status).toBe(TransactionStatus.CONFIRMED);
    expect(result.signature).toBeDefined();
    
    // Verify LP tokens were received
    const lpBalance = await connection.getTokenAccountBalance(userLpTokenAccount);
    expect(BigInt(lpBalance.value.amount)).toBeGreaterThan(BigInt(0));
  });
});
```

### Manual Testing Checklist

1. **Add Liquidity Test:**
   - [ ] Connect wallet on devnet
   - [ ] Select a pool with sufficient balances
   - [ ] Enter amounts for both tokens
   - [ ] Verify instruction data shows discriminator 2
   - [ ] Submit transaction
   - [ ] Verify transaction succeeds
   - [ ] Verify LP tokens received
   - [ ] Verify token balances decreased

2. **Remove Liquidity Test:**
   - [ ] Connect wallet on devnet
   - [ ] Select a pool where user has LP tokens
   - [ ] Enter LP token amount to burn
   - [ ] Verify instruction data shows discriminator 3
   - [ ] Submit transaction
   - [ ] Verify transaction succeeds
   - [ ] Verify LP tokens burned
   - [ ] Verify tokens received

3. **Error Handling Test:**
   - [ ] Test with insufficient balance
   - [ ] Test with high slippage
   - [ ] Test with invalid amounts
   - [ ] Verify error messages are user-friendly

## Migration Plan

### Phase 1: Fix Core Bug (Immediate)

1. Update `INSTRUCTION_DISCRIMINATORS` constants
2. Update `buildAddLiquidityInstructionData` function
3. Update `buildRemoveLiquidityInstructionData` function
4. Update `createAddLiquidityInstruction` account order
5. Update `createRemoveLiquidityInstruction` account order

### Phase 2: Update Service Layer

1. Update `LiquidityService.buildAddLiquidityTransaction` to pass correct parameters
2. Update `LiquidityService.buildRemoveLiquidityTransaction` to pass correct parameters
3. Add validation before sending transactions
4. Improve error messages

### Phase 3: Testing and Verification

1. Test on devnet with real transactions
2. Verify instruction data format
3. Verify account order
4. Verify LP token minting/burning
5. Verify token balance changes

### Phase 4: Documentation

1. Add comments to all functions
2. Document discriminator values
3. Document account orders
4. Add examples to code

## Backward Compatibility

The fix maintains backward compatibility with:
- **Swap functionality**: Discriminator 1 remains unchanged
- **Pool configuration**: No changes to dex-config.json format
- **Service interfaces**: Public API of LiquidityService remains the same
- **Component interfaces**: No changes to React component props

## Performance Considerations

- **No performance impact**: The fix only changes constant values and account order
- **Same transaction size**: Instruction data remains 25 bytes
- **Same account count**: 14 accounts for add, 15 for remove (unchanged)
- **No additional RPC calls**: No changes to network requests

## Security Considerations

- **Input validation**: Added validation for all amounts before creating instructions
- **Slippage protection**: Maintains existing slippage protection with min/max amounts
- **Error handling**: Improved error messages without exposing sensitive information
- **Logging**: Added debug logging without exposing private keys or sensitive data

## Conclusion

This fix addresses the critical bug by:
1. Correcting discriminator values to match the smart contract (2 for add, 3 for remove)
2. Ensuring account order matches the smart contract specification exactly
3. Adding validation and better error handling
4. Maintaining backward compatibility with existing functionality

The fix is minimal, focused, and low-risk. It only changes the values that were incorrect and adds safety checks. No existing functionality is broken, and the swap feature continues to work as before.
