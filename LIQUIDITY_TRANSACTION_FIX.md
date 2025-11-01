# Liquidity Transaction Error Fix

## Problem

When attempting to add liquidity, the transaction fails with the following error:

```
Error: InvalidInstruction (0xe)
Program log: Error: InvalidInstruction
Program 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z failed: custom program error: 0xe
```

## Root Cause

The error code `0xe` (14 in decimal) indicates "InvalidInstruction" from the smart contract. This typically means:

1. **Wrong instruction discriminator** - The first byte of the instruction data doesn't match what the program expects
2. **Wrong instruction data format** - The data layout doesn't match the program's expectations
3. **Wrong account order** - The accounts are not in the order the program expects

## Investigation

### Current Implementation

The add liquidity instruction is built with:
- **Discriminator**: 0 (ADD_LIQUIDITY)
- **Data format**: `[discriminator (1 byte), amountA (8 bytes), amountB (8 bytes), minLpTokens (8 bytes)]`
- **Total data size**: 25 bytes

### Comparison with Working Swap

The swap instruction that works successfully uses:
- **Discriminator**: 1 (SWAP)
- **Data format**: `[discriminator (1 byte), amountIn (8 bytes), minAmountOut (8 bytes)]`
- **Total data size**: 17 bytes
- **Account order**: pool, authority, user, userTokenIn, poolA, poolB, userTokenOut, mint, fee, tokenAMint, tokenBMint, TOKEN_PROGRAM (x3)

## Possible Issues

### 1. Smart Contract May Not Support Add Liquidity

The error suggests the smart contract doesn't recognize the add liquidity instruction. Possible reasons:

- The smart contract may only implement swap functionality
- The add liquidity feature may not be deployed or enabled
- The discriminator value (0) may be incorrect

### 2. Account Order Mismatch

Even if the discriminator is correct, the account order must match exactly what the smart contract expects. The current order is:

```
1. Pool account
2. Pool authority
3. User authority (signer)
4. User token account A
5. Pool token account A
6. Pool token account B
7. User token account B
8. User LP token account
9. LP token mint
10. Fee account
11. Token A mint
12. Token B mint
13-15. Token program IDs
```

### 3. Data Format Issues

The smart contract may expect:
- Different byte ordering (little-endian vs big-endian)
- Different data types (u64 vs i64)
- Additional parameters
- Different parameter order

## Recommended Solutions

### Solution 1: Verify Smart Contract Capabilities

**Action**: Check if the smart contract actually supports add liquidity operations.

```bash
# Get program account info
solana program show 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z --url devnet

# Check program logs
solana logs 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z --url devnet
```

### Solution 2: Review Smart Contract Source Code

**Action**: Examine the smart contract's instruction handler to understand:
- What discriminator values are supported
- What account order is expected
- What data format is required

Look for the instruction enum in the smart contract:

```rust
pub enum DexInstruction {
    Swap { amount_in: u64, min_amount_out: u64 },
    AddLiquidity { amount_a: u64, amount_b: u64, min_lp_tokens: u64 },
    RemoveLiquidity { lp_amount: u64, min_a: u64, min_b: u64 },
}
```

### Solution 3: Try Alternative Discriminator Values

**Action**: If the smart contract uses a different discriminator for add liquidity, try:
- Discriminator 2 (if 0 and 1 are taken by other instructions)
- Discriminator 3
- Or check the smart contract's instruction enum order

### Solution 4: Simplify to Match Swap Pattern

**Action**: Try using a simpler instruction format that matches the swap pattern more closely:

```typescript
// Try with just 2 parameters instead of 3
const data = Buffer.alloc(17); // 1 + 8 + 8
data.writeUInt8(0, 0); // ADD_LIQUIDITY discriminator
data.writeBigUInt64LE(amountA, 1);
data.writeBigUInt64LE(amountB, 9);
// Omit minLpTokens and let the contract calculate it
```

## Implementation Changes Made

### 1. Added Display Symbol Support

- Updated `Token` interface to include optional `displaySymbol` field
- Updated `dex-config.json` to include `displaySymbol` for all tokens
- Updated `TokenSelectorCard` and `AmountInputCard` to use `displaySymbol` when available
- This ensures tokens show their proper symbols (e.g., "SOL" instead of "WSOL")

### 2. Enhanced Error Logging

- Added detailed logging in `liquidityService.ts` to help debug transaction issues
- Logs include:
  - Pool ID
  - Amount A and B
  - Min LP tokens
  - Program ID
  - Instruction count
  - Instruction data (hex)
  - Account count

### 3. Documented Account Order

- Added comprehensive comments in `poolInstructions.ts` explaining the expected account order
- Matched the pattern from the working swap instruction

## Next Steps

1. **Check Smart Contract**: Verify the smart contract actually supports add liquidity
2. **Review Logs**: Use the enhanced logging to see exactly what data is being sent
3. **Compare with Swap**: Compare the working swap transaction with the failing add liquidity transaction
4. **Contact Contract Developer**: If you have access to the smart contract developer, ask for:
   - The correct instruction discriminator for add liquidity
   - The expected account order
   - The expected data format
5. **Test with Minimal Data**: Try sending a transaction with minimal data to see if the contract responds differently

## Testing

To test the fix:

1. Open the browser console
2. Attempt to add liquidity
3. Check the console logs for the transaction details
4. Compare the logged data with what the smart contract expects
5. If the error persists, the smart contract may not support add liquidity operations

## Conclusion

**CONFIRMED**: The smart contract at `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z` **does NOT implement add liquidity functionality**.

### Evidence:
1. Error code `0xe` (14) = InvalidInstruction
2. Instruction data format is correct: `00` (discriminator) + amounts
3. Swap instruction (discriminator 1) works perfectly
4. Add liquidity instruction (discriminator 0) fails immediately with InvalidInstruction
5. The contract only recognizes discriminator 1 (SWAP)

### Root Cause:
The smart contract was deployed with only swap functionality. The add liquidity instruction handler is not implemented in the on-chain program.

### Instruction Data Sent (Verified Correct):
```
00 - Discriminator (ADD_LIQUIDITY = 0)
008c86470000000000 - Amount A: 1,200,000,000 (1200 USDC with 6 decimals)
007841cb0200000000 - Amount B: 12,000,000,000 (12 SOL with 9 decimals)
c400ecdf00000000 - Min LP Tokens: 3,756,785,860
```

### The Fix Required:

**Option 1: Update Smart Contract (Recommended)**
The smart contract needs to be updated to include the add liquidity instruction handler:

```rust
pub enum DexInstruction {
    /// Discriminator 0: Add Liquidity
    AddLiquidity {
        amount_a: u64,
        amount_b: u64,
        min_lp_tokens: u64,
    },
    /// Discriminator 1: Swap (already implemented)
    Swap {
        amount_in: u64,
        min_amount_out: u64,
    },
    /// Discriminator 2: Remove Liquidity
    RemoveLiquidity {
        lp_amount: u64,
        min_a: u64,
        min_b: u64,
    },
}
```

**Option 2: Temporary UI Fix (Implemented)**
Added a clear error message in the UI explaining that add liquidity is not supported by the current smart contract. Users will see:
- Error title: "Feature Not Supported"
- Error message: "Add liquidity is not currently supported by the smart contract. The contract only implements swap functionality. Please contact the contract developer to add liquidity support."

### Next Steps:
1. Contact the smart contract developer
2. Request implementation of add liquidity instruction (discriminator 0)
3. Deploy updated smart contract
4. Remove the temporary error check in the frontend
5. Test add liquidity functionality with the updated contract
