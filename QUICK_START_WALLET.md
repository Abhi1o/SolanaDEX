# Quick Start - Wallet Integration

## 🚀 Getting Started in 2 Minutes

### 1. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 2. Connect Your Wallet

1. Click **"Connect Wallet"** button in the top right
2. Select **Phantom** (or any Solana wallet)
3. Approve the connection in your wallet

### 3. View Your Account

1. Click **"Account"** in the navigation menu
2. See your wallet details, balance, and transaction history

### 4. Make a Swap

1. Go to **"Swap"** page
2. Select tokens (e.g., SOL → USDC)
3. Enter amount
4. Click **"Swap"** and approve
5. Transaction automatically appears in your account history

## 📱 Key Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page with quick actions |
| Swap | `/swap` | Token swap interface |
| Pools | `/pools` | Liquidity pools |
| Portfolio | `/portfolio` | Asset overview |
| **Account** | `/account` | **Wallet details & transaction history** |
| Transactions | `/transactions` | All transactions |

## 🔍 Account Page Features

### Wallet Information
- ✅ Full address with copy button
- ✅ Link to Solscan explorer
- ✅ Wallet type and network
- ✅ Real-time SOL balance
- ✅ Transaction count

### Transaction Statistics
- ✅ Total, confirmed, failed, pending counts
- ✅ Total swaps
- ✅ Total fees paid

### Transaction History
- ✅ Search by signature or token
- ✅ Filter by type (Swap, Add Liquidity, etc.)
- ✅ Filter by status (Confirmed, Failed, Pending)
- ✅ Filter by date (24h, 7d, 30d, All time)
- ✅ Pagination (20 per page)
- ✅ Direct links to explorer

## 🎯 Supported Wallets

### Popular Wallets
- ✅ **Phantom** (Desktop & Mobile)
- ✅ **Solflare** (Desktop & Mobile)
- ✅ **Backpack**

### Other Wallets
- ✅ Torus
- ✅ Ledger
- ✅ MathWallet
- ✅ Coin98
- ✅ Clover
- ✅ SafePal
- ✅ TokenPocket

## 🔧 Quick Troubleshooting

### Wallet Won't Connect?
```bash
# 1. Refresh the page
# 2. Check wallet extension is installed
# 3. Try a different wallet
# 4. Check browser console for errors
```

### Transactions Not Showing?
```bash
# 1. Ensure wallet is connected
# 2. Click refresh button on account page
# 3. Check transaction on Solscan
# 4. Wait a few seconds for confirmation
```

### Balance Not Updating?
```bash
# 1. Click refresh button (↻) on account page
# 2. Disconnect and reconnect wallet
# 3. Check RPC endpoint is responding
```

## 📊 Transaction Filters

### Search
Type signature or token symbol:
```
Example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
Example: "USDC"
```

### Type Filter
- All Types
- Swap
- Add Liquidity
- Remove Liquidity
- Create Pool

### Status Filter
- All Status
- Confirmed ✅
- Failed ❌
- Pending ⏳

### Date Range
- All Time
- Last 24 Hours
- Last 7 Days
- Last 30 Days

## 🎨 UI Features

### Responsive Design
- ✅ Desktop optimized
- ✅ Tablet friendly
- ✅ Mobile responsive
- ✅ Touch-friendly buttons

### Real-time Updates
- ✅ Balance updates every 30 seconds
- ✅ Transaction status updates
- ✅ WebSocket subscriptions for pending transactions

### User Feedback
- ✅ Loading spinners
- ✅ Success/error messages
- ✅ Copy confirmation
- ✅ Empty states

## 🔐 Security

### Best Practices
- ✅ Never share your private keys
- ✅ Always verify transaction details
- ✅ Use hardware wallets for large amounts
- ✅ Check URLs before connecting
- ✅ Keep wallet software updated

### What We Track
- ✅ Transaction signatures (public)
- ✅ Wallet addresses (anonymized in analytics)
- ✅ Transaction types and amounts
- ❌ Private keys (never)
- ❌ Seed phrases (never)

## 📈 Analytics & Monitoring

### Error Tracking (Optional)
Set up Sentry for error monitoring:
```bash
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```

### Analytics (Optional)
Enable analytics tracking:
```bash
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## 🛠️ Development

### Run Tests
```bash
npm run test
```

### Build for Production
```bash
npm run build
```

### Check for Errors
```bash
npm run lint
```

### Deploy
```bash
npm run deploy
```

## 📚 Documentation

- **Full Guide**: See `WALLET_INTEGRATION.md`
- **Deployment**: See `DEPLOYMENT.md`
- **Quick Deploy**: See `QUICK_DEPLOY.md`

## 💡 Tips

### For Best Experience
1. Use **Phantom** wallet for easiest setup
2. Start on **Devnet** for testing
3. Keep some **SOL** for transaction fees
4. Use **filters** to find specific transactions
5. **Bookmark** the account page for quick access

### Common Workflows

**Daily Trading**:
1. Connect wallet
2. Go to Swap
3. Make trades
4. Check account page for history

**Portfolio Review**:
1. Go to Portfolio page
2. View asset breakdown
3. Check account page for transaction details
4. Export data if needed

**Transaction Lookup**:
1. Go to Account page
2. Use search or filters
3. Click signature to view on Solscan
4. Check status and details

## 🎉 You're Ready!

Everything is set up and working:
- ✅ Wallet integration complete
- ✅ Account dashboard ready
- ✅ Transaction tracking active
- ✅ Filters and search working
- ✅ Error tracking enabled
- ✅ Analytics integrated

Start by connecting your wallet and exploring the account page!

---

**Need Help?**
- Check `WALLET_INTEGRATION.md` for detailed docs
- Review `WALLET_INTEGRATION_SUMMARY.md` for technical details
- See `DEPLOYMENT.md` for production setup

**Happy Trading! 🚀**
