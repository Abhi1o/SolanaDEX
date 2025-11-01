# Quick Guide: Add Custom RPC Provider (5 Minutes)

## 🎯 Goal: Add Helius Free API to Avoid 429 Errors

Follow these exact steps:

---

## Step 1: Get Free Helius API Key (2 minutes)

1. Open browser and go to: **https://helius.dev/**
2. Click **"Sign Up"** (top right)
3. Enter your email and create account
4. After login, click **"Create New Project"**
5. Name it: `My Solana DEX`
6. Click **"Create Project"**
7. You'll see your API key: `abc123xyz...` → **COPY IT!**

---

## Step 2: Add API Key to Your Project (1 minute)

1. **Open your project folder** in VS Code
2. **Look for file named** `.env.local` in the root
   - If it exists: Open it
   - If it doesn't: Create new file named `.env.local`

3. **Add this line** (replace with your actual key):

```bash
NEXT_PUBLIC_HELIUS_API_KEY=abc123xyz789yourkey
```

4. **Save the file** (Cmd+S or Ctrl+S)

**Your `.env.local` should look like:**
```bash
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_HELIUS_API_KEY=abc123xyz789yourkey
```

---

## Step 3: Enable Helius in Code (1 minute)

1. **Open file:** `src/lib/solana/connectionPool.ts`

2. **Find this section** (around line 271-275):

```typescript
// Helius with your API key (RECOMMENDED - get free key at helius.dev)
// Uncomment after adding NEXT_PUBLIC_HELIUS_API_KEY to .env.local:
// ...(process.env.NEXT_PUBLIC_HELIUS_API_KEY
//   ? [{ url: `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` }]
//   : []),
```

3. **Remove the `//` from lines 273-275** so it looks like:

```typescript
// Helius with your API key (RECOMMENDED - get free key at helius.dev)
// Uncomment after adding NEXT_PUBLIC_HELIUS_API_KEY to .env.local:
...(process.env.NEXT_PUBLIC_HELIUS_API_KEY
  ? [{ url: `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` }]
  : []),
```

4. **Save the file** (Cmd+S or Ctrl+S)

---

## Step 4: Restart Your Dev Server (1 minute)

1. **In your terminal**, press `Ctrl+C` to stop the current server

2. **Start it again:**
```bash
npm run dev
```

3. **Wait for it to start**, then check the console

---

## Step 5: Verify It's Working (30 seconds)

**Open browser console** (F12 or Right-click → Inspect → Console)

**Look for this message:**
```
🔗 Initialized connection pool with 4 endpoints
   1. https://api.devnet.solana.com
   2. https://rpc.ankr.com/solana_devnet
   3. https://devnet.helius-rpc.com/?api-key=public
   4. https://devnet.helius-rpc.com/?api-key=abc123... ✅ YOUR NEW ENDPOINT!
```

**You should also see:**
```
🔀 Rotating to RPC endpoint: https://devnet.helius-rpc.com/?api-key=abc123...
```

---

## ✅ Success!

You now have 4 RPC endpoints rotating automatically:
- 3 free public endpoints
- 1 personal Helius endpoint (100K requests/day)

**No more 429 errors!** 🎉

---

## 🚀 Want Even More Endpoints? (Optional)

Repeat the same process for other providers:

### QuickNode (50 req/sec free)
```bash
# 1. Sign up at quicknode.com
# 2. Create Solana Devnet endpoint
# 3. Add to .env.local:
NEXT_PUBLIC_QUICKNODE_DEVNET_URL=https://your-endpoint.devnet.solana.quiknode.pro/token/

# 4. Uncomment lines 279-281 in connectionPool.ts
```

### Alchemy (300M compute units/month)
```bash
# 1. Sign up at alchemy.com
# 2. Create Solana Devnet app
# 3. Add to .env.local:
NEXT_PUBLIC_ALCHEMY_DEVNET_URL=https://solana-devnet.g.alchemy.com/v2/your-key

# 4. Uncomment lines 285-287 in connectionPool.ts
```

---

## 📋 Checklist

- [ ] Created Helius account and got API key
- [ ] Added API key to `.env.local`
- [ ] Uncommented Helius lines in `connectionPool.ts`
- [ ] Restarted dev server (`npm run dev`)
- [ ] Verified 4 endpoints in browser console
- [ ] No more 429 errors! 🎉

---

## ❓ Troubleshooting

**Problem: Still seeing 3 endpoints, not 4**
- Solution: Make sure you saved `.env.local` and restarted the server

**Problem: Getting error "cannot find module"**
- Solution: Run `npm install` then `npm run dev`

**Problem: API key not working**
- Solution: Check if you copied the full key (no spaces before/after)
- Solution: Make sure the line starts with `NEXT_PUBLIC_HELIUS_API_KEY=` (no spaces)

**Problem: Still getting 429 errors**
- Solution: Wait 1-2 minutes for the changes to take effect
- Solution: Clear browser cache and reload

---

## 🎓 What You Learned

- ✅ How to add RPC providers to avoid rate limits
- ✅ How to use environment variables securely
- ✅ How the connection pool rotates between endpoints
- ✅ How to verify your setup is working

**Need help?** Check the full guides:
- `RPC_PROVIDERS_GUIDE.md` - Detailed provider comparison
- `MULTI_RPC_SETUP.md` - Complete technical documentation
