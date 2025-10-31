# Solana RPC Endpoint Setup Guide

## Problem
If you're seeing `403 Forbidden` errors when fetching transactions, it means the default Solana RPC endpoint has rate limits or restrictions.

## Solution: Configure a Custom RPC Endpoint

### Option 1: Use Helius (Recommended - Free Tier Available)

1. Sign up at [Helius](https://www.helius.dev/)
2. Create a new project and get your API key
3. Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### Option 2: Use QuickNode (Free Tier Available)

1. Sign up at [QuickNode](https://www.quicknode.com/)
2. Create an endpoint
3. Add to `.env.local`:

```bash
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://YOUR_ENDPOINT.quiknode.pro/YOUR_API_KEY/
```

### Option 3: Use Alchemy

1. Sign up at [Alchemy](https://www.alchemy.com/)
2. Create a Solana app
3. Add to `.env.local`:

```bash
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### Option 4: Use Infura (Free Tier Available)

1. Sign up at [Infura](https://www.infura.io/)
2. Create a new project
3. Select Solana as the network
4. Get your Project ID
5. Add to `.env.local`:

```bash
# For Mainnet
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://solana-mainnet.infura.io/v3/YOUR_PROJECT_ID

# For Devnet
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://solana-devnet.infura.io/v3/YOUR_PROJECT_ID
```

### Option 5: Use Triton One

1. Sign up at [Triton One](https://triton.one/)
2. Get your RPC URL
3. Add to `.env.local`:

```bash
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://your-endpoint.triton.one/YOUR_API_KEY
```

## Free Public Endpoints (Limited)

If you need a quick solution for testing, these public endpoints work but have rate limits:

```bash
# Solana Foundation public RPC (rate limited)
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://api.mainnet-beta.solana.com

# Genoapay RPC (has some rate limits)
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://rpc.ankr.com/solana
```

## After Configuration

1. Save the `.env.local` file
2. **Restart your development server** (important!)
3. The transaction history should now load properly

## Verify Configuration

Check that your endpoint is being used by:
1. Opening browser DevTools
2. Going to the Network tab
3. Looking for requests to your configured RPC endpoint

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SOLANA_RPC_MAINNET` | Mainnet RPC endpoint |
| `NEXT_PUBLIC_SOLANA_RPC_DEVNET` | Devnet RPC endpoint |
| `NEXT_PUBLIC_SOLANA_RPC_TESTNET` | Testnet RPC endpoint |
| `NEXT_PUBLIC_HELIUS_RPC_URL` | Helius RPC endpoint (alternative) |

## Recommended Providers

**Free Tier Available:**
- ✅ Helius (100K requests/day free)
- ✅ QuickNode (free tier available)
- ✅ Infura (free tier available)
- ✅ Alchemy (generous free tier)

**Paid/Enterprise:**
- Triton One
- Custom RPC nodes

## Troubleshooting

- **Still getting 403 errors?** Make sure you restarted the dev server after adding `.env.local`
- **Rate limited?** Upgrade to a paid tier or try a different provider
- **Can't find transactions?** Make sure you're on the correct network (mainnet/devnet)
- **Infura not working?** Make sure your Project ID is correct and you've selected Solana as the network type

