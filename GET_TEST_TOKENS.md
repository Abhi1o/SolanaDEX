# 🪙 Getting Test Tokens for Devnet Swaps

## The Problem

The error you're seeing means your wallet doesn't have the tokens you're trying to swap. On Solana devnet, you need to manually get test tokens before you can swap.

**Error**: "Attempt to debit an account but found no record of a prior credit"
**Meaning**: Your wallet has 0 balance of the input token (USDC in your case)

## Solution: Get Devnet Test Tokens

### Step 1: Get Devnet SOL

First, you need SOL to pay for transaction fees:

1. Visit [Solana Faucet](https://faucet.solana.com/)
2. Paste your wallet address
3. Click "Confirm Airdrop"
4. Wait a few seconds
5. You should receive 1-2 SOL

**Via CLI:**
```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### Step 2: Get Your Wallet Address

Your wallet address should be displayed in your wallet (Phantom/Solflare). It looks like:
```
7yVqZ2...4kL9a
```

### Step 3: Get Test Tokens

Since the tokens in your DEX config are custom devnet tokens, you have two options:

#### Option A: Mint Tokens to Your Wallet (Recommended)

If you control the token mints, use Solana CLI:

```bash
# Set to devnet
solana config set --url devnet

# Mint USDC to your wallet (example)
spl-token mint BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa 1000 YOUR_WALLET_ADDRESS

# Mint SOL wrapped token
spl-token mint 7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r 10 YOUR_WALLET_ADDRESS

# Mint USDT
spl-token mint F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu 1000 YOUR_WALLET_ADDRESS

# Mint ETH
spl-token mint 7K7yLbVHtvcP6zUk6KCCyedDLFuLdNu1eawvsL13LPd 5 YOUR_WALLET_ADDRESS
```

#### Option B: Use Well-Known Devnet Tokens

Alternatively, update your `dex-config.json` to use standard devnet tokens that are easier to get:

**Standard Devnet Tokens:**
- **USDC**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Official Devnet USDC)
- **SOL**: Native SOL (no mint needed)

You can get these from various devnet faucets:
- [SPL Token Faucet](https://spl-token-faucet.com/?network=devnet)
- [Solana Cookbook Faucet](https://faucet.solana.com/)

### Step 4: Create Token Accounts

Before you can hold SPL tokens, you need token accounts:

```bash
# Create USDC token account
spl-token create-account BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa

# Create SOL wrapped token account
spl-token create-account 7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r

# Create USDT token account
spl-token create-account F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu

# Create ETH token account
spl-token create-account 7K7yLbVHtvcP6zUk6KCCyedDLFuLdNu1eawvsL13LPd
```

### Step 5: Verify Your Balances

Check your balances via CLI:

```bash
spl-token accounts
```

Or via Solana Explorer:
```
https://explorer.solana.com/address/YOUR_WALLET_ADDRESS?cluster=devnet
```

## Quick Setup Script

Here's a complete script to set up everything:

```bash
#!/bin/bash

# Your wallet address
WALLET="YOUR_WALLET_ADDRESS_HERE"

# Token mints from your DEX
USDC_MINT="BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa"
SOL_MINT="7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r"
USDT_MINT="F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu"
ETH_MINT="7K7yLbVHtvcP6zUk6KCCyedDLFuLdNu1eawvsL13LPd"

# Set to devnet
solana config set --url devnet

# Get SOL for fees
echo "Getting SOL..."
solana airdrop 2 $WALLET

# Create token accounts
echo "Creating token accounts..."
spl-token create-account $USDC_MINT
spl-token create-account $SOL_MINT
spl-token create-account $USDT_MINT
spl-token create-account $ETH_MINT

# Mint tokens (requires mint authority)
echo "Minting tokens..."
spl-token mint $USDC_MINT 1000 $WALLET
spl-token mint $SOL_MINT 10 $WALLET
spl-token mint $USDT_MINT 1000 $WALLET
spl-token mint $ETH_MINT 5 $WALLET

echo "Setup complete! Check balances:"
spl-token accounts
```

Save as `setup-devnet-tokens.sh`, replace `YOUR_WALLET_ADDRESS_HERE`, and run:
```bash
chmod +x setup-devnet-tokens.sh
./setup-devnet-tokens.sh
```

## Testing Without Real Tokens (Alternative)

If you can't get the actual tokens, you can update your DEX to use demo tokens:

1. **Create new test tokens**:
```bash
# Create new token mints you control
spl-token create-token
# Note the token address, e.g., "9x7Tk..."

# Create accounts and mint
spl-token create-account 9x7Tk...
spl-token mint 9x7Tk... 10000
```

2. **Update your pool addresses** in `dex-config.json` to use these new mints

## Troubleshooting

### "Token account not found"
- You need to create the token account first: `spl-token create-account MINT_ADDRESS`
- The app will auto-create it during swap, but you need tokens first

### "Insufficient balance"
- You don't have enough of the input token
- Mint more: `spl-token mint MINT_ADDRESS AMOUNT YOUR_WALLET`

### "Mint authority not found"
- You don't have permission to mint these tokens
- Either get the mint authority's private key, or use different test tokens

### "Invalid mint"
- The token mint address in your config might not exist on devnet
- Create new test tokens or use standard devnet tokens

## For Your Specific Setup

Based on your pool configuration, you need:

**For USDC/SOL swaps:**
- USDC: `BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa`
- SOL: `7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r`

**For USDC/USDT swaps:**
- USDC: `BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa`
- USDT: `F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu`

**For ETH/SOL swaps:**
- ETH: `7K7yLbVHtvcP6zUk6KCCyedDLFuLdNu1eawvsL13LPd`
- SOL: `7YGTPNq1Xw1AWt4BfDqd82DAvmyNLEC1RdHzJX9PDB5r`

## Check If Program Exists

Also verify your DEX program is deployed:

```bash
solana account 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z --url devnet
```

If it says "Account does not exist", your program isn't deployed to devnet yet.

## Next Steps

Once you have tokens:

1. ✅ Check balance in wallet
2. ✅ Try small swap (e.g., 0.1 USDC → SOL)
3. ✅ Verify transaction on Explorer
4. ✅ Check updated balances

The app will now show helpful error messages if:
- Token account doesn't exist
- Insufficient balance
- Amount required vs available

---

**Need Help?**
- Check Solana Discord: https://discord.gg/solana
- Solana Cookbook: https://solanacookbook.com/
- SPL Token Guide: https://spl.solana.com/token
