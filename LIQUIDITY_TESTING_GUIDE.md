# Liquidity Smart Contract Fix - Testing Guide

## Overview

This guide provides step-by-step instructions for testing the liquidity smart contract fix on devnet. The fix corrects the instruction discriminators and account orders for add/remove liquidity operations.

## What Was Fixed

### Before (Broken)
- **Add Liquidity**: Used discriminator 0 (INITIALIZE) ❌
- **Remove Liquidity**: Used discriminator 2 (ADD_LIQUIDITY) ❌
- Result: All liquidity operations failed with "Feature Not Supported" or "InvalidInstruction" errors

### After (Fixed)
- **Add Liquidity**: Uses discriminator 2 (ADD_LIQUIDITY) ✅
- **Remove Liquidity**: Uses discriminator 3 (REMOVE_LIQUIDITY) ✅
- **Account Orders**: Corrected to match smart contract specification exactly
- **Validation**: Added input validation and better error messages
- **Logging**: Added debug logging for troubleshooting

## Automated Tests Results

✅ **All automated tests passed:**
- Discriminator values are correct (0-5)
- ADD_LIQUIDITY uses discriminator 2
- REMOVE_LIQUIDITY uses discriminator 3
- Instruction data format is correct (25 bytes)
- Account orders are documented (14 for add, 15 for remove)
- Input validation is implemented
- Debug logging is in place

## Manual Testing on Devnet

### Prerequisites

1. **Wallet Setup**
   - Install a Solana wallet (Phantom, Solflare, etc.)
   - Switch to Devnet network
   - Get devnet SOL from faucet: https://faucet.solana.com/

2. **Test Tokens**
   - You need devnet test tokens (USDC, SOL, USDT, or ETH)
   - Use the mint script: `npm run mint-tokens`
   - Or request from devnet faucets

3. **Check Balances**
   - Run: `node scripts/check-balance.js`
   - Ensure you have sufficient tokens for testing

### Test 1: Add Liquidity (Discriminator 2)

#### Steps:

1. **Navigate to Liquidity Page**
   - Open the app: http://localhost:3000/liquidity
   - Connect your wallet
   - Ensure you're on Devnet

2. **Select Token Pair**
   - Click "Add Liquidity" tab
   - Select first token (e.g., USDC)
   - Select second token (e.g., SOL)
   - Verify pool information appears

3. **Enter Amounts**
   - Enter amount for first token (e.g., 10 USDC)
   - Second token amount should auto-calculate based on pool ratio
   - Verify the calculated amounts match the pool ratio

4. **Review Transaction Details**
   - Check LP tokens to receive
   - Check share of pool percentage
   - Check price impact (should be < 15%)
   - Verify slippage tolerance

5. **Open Browser Console**
   - Press F12 to open DevTools
   - Go to Console tab
   - Look for debug logs starting with "🔧 Add Liquidity Instruction:"

6. **Submit Transaction**
   - Click "Add Liquidity" button
   - Review transaction in wallet popup
   - Approve the transaction

7. **Verify in Console**
   ```
   Expected logs:
   🔧 Add Liquidity Instruction:
     Discriminator: 2
     Instruction data (hex): 02[pool_token_amount][max_token_a][max_token_b]
     Account count: 14
     Program ID: 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z
   
   ✅ Instruction data validation passed for Add Liquidity:
     Data length: 25 bytes
     Discriminator: 2
     Pool token amount: [value]
     Token A amount: [value]
     Token B amount: [value]
   ```

8. **Verify Transaction Success**
   - Wait for transaction confirmation
   - Check for success notification
   - Verify transaction signature is displayed

9. **Verify LP Tokens Received**
   - Check "Your Positions" section
   - Verify LP token balance increased
   - Verify share of pool percentage is correct

10. **Verify Token Balances**
    - Check token A balance decreased by deposited amount
    - Check token B balance decreased by deposited amount
    - Run: `node scripts/check-balance.js` to verify on-chain

11. **Check Transaction on Explorer**
    - Copy transaction signature
    - View on Solana Explorer (devnet): https://explorer.solana.com/?cluster=devnet
    - Verify instruction data shows discriminator 2
    - Verify all 14 accounts are present

#### Expected Results:
- ✅ Transaction succeeds without errors
- ✅ LP tokens are minted to user's account
- ✅ Token A and B balances decrease correctly
- ✅ Console shows discriminator 2
- ✅ Console shows 14 accounts
- ✅ Console shows 25-byte instruction data

#### Common Issues:
- ❌ "Insufficient balance" → Get more test tokens
- ❌ "Insufficient SOL" → Get more devnet SOL
- ❌ "Slippage exceeded" → Increase slippage tolerance
- ❌ "InvalidInstruction" → Check discriminator in console (should be 2)

---

### Test 2: Remove Liquidity (Discriminator 3)

#### Steps:

1. **Navigate to Liquidity Page**
   - Open the app: http://localhost:3000/liquidity
   - Connect your wallet
   - Click "Remove Liquidity" tab

2. **Select Pool**
   - Select the same token pair you added liquidity to
   - Verify your LP token balance is shown
   - Verify pool information appears

3. **Enter LP Token Amount**
   - Enter amount of LP tokens to burn (e.g., 50% of balance)
   - Verify estimated tokens to receive
   - Check minimum amounts (slippage protection)

4. **Open Browser Console**
   - Press F12 to open DevTools
   - Go to Console tab
   - Look for debug logs starting with "🔧 Remove Liquidity Instruction:"

5. **Submit Transaction**
   - Click "Remove Liquidity" button
   - Review transaction in wallet popup
   - Approve the transaction

6. **Verify in Console**
   ```
   Expected logs:
   🔧 Remove Liquidity Instruction:
     Discriminator: 3
     Instruction data (hex): 03[pool_token_amount][min_token_a][min_token_b]
     Account count: 15
     Program ID: 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z
   
   ✅ Instruction data validation passed for Remove Liquidity:
     Data length: 25 bytes
     Discriminator: 3
     Pool token amount: [value]
     Token A amount: [value]
     Token B amount: [value]
   ```

7. **Verify Transaction Success**
   - Wait for transaction confirmation
   - Check for success notification
   - Verify transaction signature is displayed

8. **Verify LP Tokens Burned**
   - Check "Your Positions" section
   - Verify LP token balance decreased
   - Verify share of pool percentage decreased

9. **Verify Tokens Received**
    - Check token A balance increased
    - Check token B balance increased
    - Amounts should match estimated values (within slippage)
    - Run: `node scripts/check-balance.js` to verify on-chain

10. **Check Transaction on Explorer**
    - Copy transaction signature
    - View on Solana Explorer (devnet)
    - Verify instruction data shows discriminator 3
    - Verify all 15 accounts are present

#### Expected Results:
- ✅ Transaction succeeds without errors
- ✅ LP tokens are burned from user's account
- ✅ Token A and B are received correctly
- ✅ Console shows discriminator 3
- ✅ Console shows 15 accounts
- ✅ Console shows 25-byte instruction data

#### Common Issues:
- ❌ "Insufficient LP tokens" → Add liquidity first
- ❌ "Insufficient SOL" → Get more devnet SOL
- ❌ "Slippage exceeded" → Increase slippage tolerance
- ❌ "InvalidInstruction" → Check discriminator in console (should be 3)

---

### Test 3: Error Scenarios

#### Test 3.1: Insufficient Token Balance

1. Try to add liquidity with more tokens than you have
2. Expected: Clear error message "Insufficient [TOKEN] balance"
3. Transaction should not be submitted

#### Test 3.2: Insufficient LP Tokens

1. Try to remove more LP tokens than you have
2. Expected: Clear error message "Insufficient LP token balance"
3. Transaction should not be submitted

#### Test 3.3: Invalid Amounts (Zero)

1. Try to add liquidity with zero amount
2. Expected: Validation error before submission
3. Button should be disabled

#### Test 3.4: High Price Impact

1. Try to add very large amount (> 15% price impact)
2. Expected: Warning message about high price impact
3. Consider reducing amount

#### Test 3.5: Insufficient SOL for Fees

1. Try transaction with < 0.001 SOL balance
2. Expected: Error message "Insufficient SOL for transaction fees"
3. Get more devnet SOL from faucet

---

### Test 4: Verify Swap Still Works

#### Purpose: Ensure the fix didn't break existing swap functionality

1. **Navigate to Swap Page**
   - Open: http://localhost:3000/swap
   - Connect wallet

2. **Perform a Swap**
   - Select token pair (e.g., USDC → SOL)
   - Enter amount
   - Submit swap transaction

3. **Verify in Console**
   - Discriminator should be 1 (SWAP)
   - Account count should be 13
   - Transaction should succeed

4. **Expected Results**
   - ✅ Swap works correctly
   - ✅ Discriminator is 1 (unchanged)
   - ✅ No regression in swap functionality

---

## Verification Checklist

### Code-Level Verification
- [x] Discriminator values are correct (0-5)
- [x] ADD_LIQUIDITY uses discriminator 2
- [x] REMOVE_LIQUIDITY uses discriminator 3
- [x] Instruction data format is 25 bytes
- [x] Account orders match smart contract (14 for add, 15 for remove)
- [x] Input validation is implemented
- [x] Debug logging is in place

### Manual Testing on Devnet
- [ ] Add liquidity transaction succeeds
- [ ] LP tokens are minted correctly
- [ ] Token balances decrease correctly after add
- [ ] Console shows discriminator 2 for add liquidity
- [ ] Console shows 14 accounts for add liquidity
- [ ] Remove liquidity transaction succeeds
- [ ] LP tokens are burned correctly
- [ ] Tokens are received correctly after remove
- [ ] Console shows discriminator 3 for remove liquidity
- [ ] Console shows 15 accounts for remove liquidity
- [ ] Error messages are clear and helpful
- [ ] Swap functionality still works (discriminator 1)

## Troubleshooting

### Transaction Fails with "InvalidInstruction" (0xe)

**Possible Causes:**
1. Wrong discriminator value
2. Incorrect account order
3. Invalid instruction data format

**How to Debug:**
1. Check console logs for discriminator value
2. Verify instruction data hex dump
3. Count accounts in transaction
4. Compare with smart contract specification

### Transaction Fails with "Feature Not Supported"

**Possible Causes:**
1. Using old discriminator values (0 or 2)
2. Smart contract doesn't support the operation

**How to Debug:**
1. Check discriminator in console (should be 2 for add, 3 for remove)
2. Verify you're using the latest code
3. Clear browser cache and reload

### LP Tokens Not Showing

**Possible Causes:**
1. Transaction not confirmed yet
2. LP token account not created
3. Balance not refreshed

**How to Debug:**
1. Wait for transaction confirmation
2. Check transaction on explorer
3. Refresh the page
4. Run balance check script

## Success Criteria

The fix is considered successful if:

1. ✅ All automated tests pass
2. ✅ Add liquidity transactions succeed on devnet
3. ✅ Remove liquidity transactions succeed on devnet
4. ✅ LP tokens are minted/burned correctly
5. ✅ Token balances change as expected
6. ✅ Console logs show correct discriminators (2 and 3)
7. ✅ Console logs show correct account counts (14 and 15)
8. ✅ Error messages are clear and helpful
9. ✅ Swap functionality still works (no regression)
10. ✅ No "InvalidInstruction" or "Feature Not Supported" errors

## Next Steps After Testing

Once all tests pass:

1. **Document Results**
   - Take screenshots of successful transactions
   - Save transaction signatures
   - Note any issues encountered

2. **Update Task Status**
   - Mark all testing tasks as complete
   - Update implementation plan

3. **Prepare for Production**
   - Test on mainnet-beta (with small amounts)
   - Update documentation
   - Notify users of the fix

4. **Monitor**
   - Watch for any issues in production
   - Monitor transaction success rates
   - Collect user feedback

## Support

If you encounter issues during testing:

1. Check the console logs for detailed error messages
2. Verify discriminator values in console output
3. Check transaction on Solana Explorer
4. Review this guide for troubleshooting steps
5. Contact the development team with:
   - Transaction signature
   - Console logs
   - Screenshots
   - Steps to reproduce

---

**Last Updated:** 2025-11-01
**Version:** 1.0
**Status:** Ready for Testing
