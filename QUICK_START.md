# Quick Start Guide - Liquidity Page Testing

## 🚀 Get Started in 5 Minutes

### Step 1: Setup Wallet (2 minutes)

1. Install Phantom wallet: https://phantom.app/
2. Create or import wallet
3. Switch to **Devnet**:
   - Click settings (gear icon)
   - Developer Settings
   - Change Network → Devnet

### Step 2: Get Test Tokens (2 minutes)

1. **Get SOL**:
   ```
   Visit: https://faucet.solana.com/
   Paste your wallet address
   Click "Confirm Airdrop"
   ```

2. **Get Test Tokens**:
   Your dex-config.json has these tokens:
   - USDC: `BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa`
   - SOL: `7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r`
   - USDT: `F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu`
   - ETH: `7K7yLbVHtvcP6zUk6KCCyedDLFuLdNu1eawvsL13LPd`

   Use Solana CLI or a token faucet to get these test tokens.

### Step 3: Test Add Liquidity (1 minute)

1. Open your DEX app
2. Click "Connect Wallet" → Select Phantom
3. Go to "Liquidity" page
4. Select "Add Liquidity" tab
5. Choose tokens (e.g., USDC + SOL)
6. Click "Add Liquidity"
7. Enter small amounts (e.g., 1 USDC + 0.01 SOL)
8. Click "Add Liquidity" in modal
9. Approve in wallet
10. Wait for confirmation ✅

### Step 4: Verify Position

- Check "Your Positions" panel on right
- Should show your LP tokens
- Should show your pool share %

### Step 5: Test Remove Liquidity

1. Select "Remove Liquidity" tab
2. Choose same token pair
3. Click "Remove Liquidity"
4. Select percentage (try 25%)
5. Click "Remove Liquidity" in modal
6. Approve in wallet
7. Verify tokens returned ✅

## 🔍 Quick Checks

### Is it working?

✅ **Good signs**:
- Pools load on page
- Token dropdowns populated
- "Available Pools" section shows pools
- Wallet balance displays
- Transaction succeeds

❌ **Issues**:
- "No pools available" → Check dex-config.json loaded
- "Insufficient balance" → Get more test tokens
- "Transaction failed" → Check console for details

### Debug Commands

**Check pools loaded**:
```javascript
// In browser console
localStorage.setItem('debug', '*');
// Refresh page and check console
```

**Check wallet connection**:
```javascript
// In browser console
console.log(window.solana.isConnected);
console.log(window.solana.publicKey.toString());
```

## 📊 What to Expect

### Add Liquidity Flow
```
Select tokens → See pool info → Click button → 
Enter amounts → See LP tokens → Confirm → 
Wait ~15 seconds → Success! → Position appears
```

### Remove Liquidity Flow
```
Select tokens → See position → Click button → 
Select % → See tokens to receive → Confirm → 
Wait ~15 seconds → Success! → Position updates
```

## 🎯 Test Scenarios

### Scenario 1: First Liquidity Provider
- Pool has no liquidity yet
- You add first liquidity
- LP tokens = sqrt(amountA * amountB)

### Scenario 2: Adding to Existing Pool
- Pool has liquidity
- You add proportional amounts
- LP tokens based on pool ratio

### Scenario 3: Partial Removal
- Remove 25% of position
- Receive 25% of your tokens back
- Position updates to 75%

### Scenario 4: Full Removal
- Remove 100% of position
- Receive all tokens back
- Position disappears

## 🐛 Common Issues & Fixes

### Issue: "Program ID not configured"
**Fix**: Check `dex-config.json` has `programId` field

### Issue: "Insufficient SOL for transaction fees"
**Fix**: Get more SOL from faucet (need ~0.001 SOL per tx)

### Issue: "Account not found"
**Fix**: 
- Ensure pool is deployed
- Check addresses in dex-config.json
- Verify you're on devnet

### Issue: "Transaction failed"
**Fix**:
1. Check browser console for details
2. Verify token accounts exist
3. Check pool is initialized
4. Try smaller amounts

### Issue: Pools not loading
**Fix**:
1. Check browser console for errors
2. Verify dex-config.json is valid JSON
3. Refresh page
4. Clear cache

## 📱 Mobile Testing

Works on mobile! Just:
1. Install Phantom mobile app
2. Switch to devnet in settings
3. Use in-app browser
4. Navigate to your DEX
5. Test same flows

## 🔗 Useful Links

- **Solana Devnet Faucet**: https://faucet.solana.com/
- **Solana Explorer (Devnet)**: https://explorer.solana.com/?cluster=devnet
- **Your Program ID**: `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z`

## 💡 Pro Tips

1. **Start small**: Test with tiny amounts first
2. **Check Explorer**: Paste transaction signature to see details
3. **Use console**: Browser console shows helpful debug info
4. **Save signatures**: Keep transaction signatures for reference
5. **Test all pairs**: Try USDC/SOL, USDC/USDT, ETH/SOL

## 📈 Success Metrics

After testing, you should have:
- ✅ Successfully added liquidity
- ✅ Received LP tokens
- ✅ Position showing in UI
- ✅ Successfully removed liquidity
- ✅ Received tokens back
- ✅ Pool reserves updated

## 🎉 Next Steps

Once basic testing works:
1. Test with larger amounts
2. Test all token pairs
3. Test with multiple users
4. Monitor pool reserves
5. Check LP token supply
6. Verify fee calculations

## 🆘 Need Help?

1. Check `LIQUIDITY_SETUP.md` for detailed guide
2. Check `INSTRUCTION_CUSTOMIZATION.md` if instructions need changes
3. Review browser console errors
4. Check transaction on Solana Explorer
5. Verify all addresses in dex-config.json

## ⚡ Quick Commands

**Start dev server**:
```bash
npm run dev
```

**Run tests**:
```bash
npm test
```

**Check for errors**:
```bash
npm run lint
```

**Build for production**:
```bash
npm run build
```

---

**Ready to test? Let's go! 🚀**

1. Connect wallet to devnet
2. Get test tokens
3. Open liquidity page
4. Add liquidity
5. Check your position
6. Remove liquidity
7. Success! 🎉
