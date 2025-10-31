# Get Test Tokens for Devnet

You're seeing the "Insufficient balance" error because your wallet doesn't have the test tokens needed for swapping.

## Quick Fix

### Step 1: Check Your Current Balance

```bash
node scripts/check-balance.js YOUR_WALLET_ADDRESS
```

Replace `YOUR_WALLET_ADDRESS` with your actual wallet address (shown in the UI when connected).

### Step 2: Get SOL (if needed)

If you have zero SOL, get some from the Solana faucet:

🔗 **https://faucet.solana.com/**

You need at least 0.5 SOL for transaction fees.

### Step 3: Mint Test Tokens

Run this command to mint test tokens to your wallet:

```bash
node scripts/mint-test-tokens.js YOUR_WALLET_ADDRESS 10000
```

This will mint:
- 10,000 USDC
- 10,000 SOL (wrapped)
- 10,000 USDT
- 10,000 ETH (wrapped)

### Step 4: Verify Balance

Check your balance again:

```bash
node scripts/check-balance.js YOUR_WALLET_ADDRESS
```

### Step 5: Refresh the UI

Refresh your browser and the balances should update automatically.

---

## Understanding the Error

The error **"Attempt to debit an account but found no record of a prior credit"** means:

1. Your token account exists but has **zero balance**, OR
2. Your token account doesn't exist yet

The UI might show balances from:
- Cached data
- A different wallet
- Mock/placeholder data

Always verify your actual on-chain balance using the check-balance script.

---

## Token Addresses (Devnet)

These are the test token mints used by the DEX:

- **USDC**: `BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa`
- **SOL**: `7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r`
- **USDT**: `F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu`
- **ETH**: `7K7yLbVHtvcP6zUk6KCCyedDLFuLdNu1eawvsL13LPd`

---

## Troubleshooting

### "Error loading payer wallet"

You need to have a Solana CLI wallet configured:

```bash
solana-keygen new
```

### "Insufficient SOL for transaction fees"

Get more SOL from the faucet: https://faucet.solana.com/

### "Account does not exist"

The mint script will automatically create the token account for you.

### Balance shows in UI but swap fails

The UI might be showing cached data. Always verify with:

```bash
node scripts/check-balance.js YOUR_WALLET_ADDRESS
```

---

## Alternative: Use Your Working Script

You can also use your existing Node.js swap script which includes the `mintTo` function to mint tokens before swapping:

```javascript
// From your working script
if (Number(sourceCheck.amount) < swapAmount) {
  await mintTo(
    connection,
    payer,
    new PublicKey(pool.tokenA),
    userSourceAccount.address,
    payer,
    swapAmount
  );
}
```

This automatically mints tokens if you don't have enough balance.

---

## Need Help?

If you're still having issues:

1. Check the browser console for detailed error logs
2. Verify your wallet is connected to **Devnet** (not Mainnet)
3. Make sure you're using the correct wallet address
4. Try disconnecting and reconnecting your wallet

---

**Network**: Solana Devnet  
**Program ID**: `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z`
