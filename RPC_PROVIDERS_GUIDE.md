# RPC Providers Guide

## 📍 Where to Add RPC Endpoints

### Option 1: Using Environment Variables (Recommended)

**Step 1:** Create/edit `.env.local` file in your project root:

```bash
# Helius (Recommended - Get free API key at helius.dev)
NEXT_PUBLIC_HELIUS_API_KEY=your-helius-api-key-here

# QuickNode (Get free tier at quicknode.com)
NEXT_PUBLIC_QUICKNODE_DEVNET_URL=https://your-endpoint.devnet.solana.quiknode.pro/your-token/

# Alchemy (Get free API key at alchemy.com)
NEXT_PUBLIC_ALCHEMY_DEVNET_URL=https://solana-devnet.g.alchemy.com/v2/your-api-key

# Custom RPC
NEXT_PUBLIC_CUSTOM_RPC_DEVNET=https://your-custom-rpc.com
```

**Step 2:** Update `src/lib/solana/connectionPool.ts`:

```typescript
// Around line 260-265
const DEVNET_ENDPOINTS: RpcEndpointConfig[] = [
  { url: 'https://api.devnet.solana.com' },
  { url: 'https://rpc.ankr.com/solana_devnet' },
  { url: 'https://devnet.helius-rpc.com/?api-key=public' },

  // Add your custom endpoints here:
  ...(process.env.NEXT_PUBLIC_HELIUS_API_KEY
    ? [{ url: `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` }]
    : []),
  ...(process.env.NEXT_PUBLIC_QUICKNODE_DEVNET_URL
    ? [{ url: process.env.NEXT_PUBLIC_QUICKNODE_DEVNET_URL }]
    : []),
  ...(process.env.NEXT_PUBLIC_ALCHEMY_DEVNET_URL
    ? [{ url: process.env.NEXT_PUBLIC_ALCHEMY_DEVNET_URL }]
    : []),
  ...(process.env.NEXT_PUBLIC_CUSTOM_RPC_DEVNET
    ? [{ url: process.env.NEXT_PUBLIC_CUSTOM_RPC_DEVNET }]
    : []),
];
```

### Option 2: Direct Code Configuration

Edit `src/lib/solana/connectionPool.ts` (lines 260-265):

```typescript
const DEVNET_ENDPOINTS: RpcEndpointConfig[] = [
  // Free Public Endpoints
  { url: 'https://api.devnet.solana.com' },
  { url: 'https://rpc.ankr.com/solana_devnet' },
  { url: 'https://devnet.helius-rpc.com/?api-key=public' },

  // Add your paid/custom endpoints here:
  { url: 'https://your-helius-endpoint.com' },
  { url: 'https://your-quicknode-endpoint.com' },
  { url: 'https://your-alchemy-endpoint.com' },
];
```

---

## 🚀 Recommended RPC Providers

### 1. **Helius** (Best for Solana) ⭐ RECOMMENDED

**Why Choose:** Built specifically for Solana, fastest, most reliable

**Free Tier:**
- 100,000 requests/day
- Devnet & Mainnet support
- Enhanced APIs included

**Setup:**
1. Sign up: https://helius.dev/
2. Create a new project
3. Copy your API key
4. Add to `.env.local`:
```bash
NEXT_PUBLIC_HELIUS_API_KEY=your-api-key-here
```

**Endpoints:**
- Devnet: `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`
- Mainnet: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

**Pricing:**
- Free: 100K requests/day
- Developer: $49/month (1M requests/day)
- Professional: $249/month (10M requests/day)

---

### 2. **QuickNode** (Good Balance)

**Why Choose:** Easy setup, good documentation, reliable

**Free Tier:**
- 50 requests/second
- 5GB data transfer/month
- Devnet & Mainnet support

**Setup:**
1. Sign up: https://quicknode.com/
2. Create endpoint → Select Solana Devnet
3. Copy your endpoint URL
4. Add to `.env.local`:
```bash
NEXT_PUBLIC_QUICKNODE_DEVNET_URL=https://your-endpoint.devnet.solana.quiknode.pro/your-token/
```

**Pricing:**
- Discover (Free): 50 req/sec
- Build: $49/month (100 req/sec)
- Scale: $299/month (500 req/sec)

---

### 3. **Alchemy** (Multi-Chain Support)

**Why Choose:** If you need multi-chain support (Ethereum + Solana)

**Free Tier:**
- 300M compute units/month
- Devnet & Mainnet support
- Enhanced APIs

**Setup:**
1. Sign up: https://alchemy.com/
2. Create app → Select Solana Devnet
3. Copy your HTTP URL
4. Add to `.env.local`:
```bash
NEXT_PUBLIC_ALCHEMY_DEVNET_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY
```

**Endpoints:**
- Devnet: `https://solana-devnet.g.alchemy.com/v2/YOUR_KEY`
- Mainnet: `https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY`

**Pricing:**
- Free: 300M compute units/month
- Growth: $49/month (additional compute units)

---

### 4. **Ankr** (Free Public)

**Why Choose:** Free, no signup required

**Current:** Already included in your setup

**Limits:**
- Rate limited on free tier
- Not recommended as primary endpoint
- Good as fallback

**Endpoint:**
```
https://rpc.ankr.com/solana_devnet
```

---

### 5. **Syndica** (High Performance)

**Why Choose:** Very fast, enterprise-grade

**Free Tier:**
- 1000 requests/second
- Devnet & Mainnet

**Setup:**
1. Sign up: https://syndica.io/
2. Create API token
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_SYNDICA_API_KEY=your-api-key
```

**Endpoints:**
- Devnet: `https://solana-devnet.syndica.io/access-token/YOUR_TOKEN`
- Mainnet: `https://solana-mainnet.syndica.io/access-token/YOUR_TOKEN`

---

## 📝 Step-by-Step Setup Example (Helius)

### 1. Get Helius API Key

```bash
# 1. Go to https://helius.dev/
# 2. Sign up (free)
# 3. Create new project
# 4. Copy API key
```

### 2. Add to .env.local

Create or edit `.env.local` in your project root:

```bash
# Add this line
NEXT_PUBLIC_HELIUS_API_KEY=abc123xyz789yourkey
```

### 3. Update connectionPool.ts

Open `src/lib/solana/connectionPool.ts` and find around line 260:

```typescript
const DEVNET_ENDPOINTS: RpcEndpointConfig[] = [
  { url: 'https://api.devnet.solana.com' },
  { url: 'https://rpc.ankr.com/solana_devnet' },
  { url: 'https://devnet.helius-rpc.com/?api-key=public' },

  // Add Helius with your API key
  ...(process.env.NEXT_PUBLIC_HELIUS_API_KEY
    ? [{ url: `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` }]
    : []),
];
```

### 4. Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
npm run dev
```

### 5. Verify It's Working

Check the console, you should see:
```
🔗 Initialized connection pool with 4 endpoints
   1. https://api.devnet.solana.com
   2. https://rpc.ankr.com/solana_devnet
   3. https://devnet.helius-rpc.com/?api-key=public
   4. https://devnet.helius-rpc.com/?api-key=abc123...
```

---

## 🎯 My Recommendation

**For Devnet Development:**

```typescript
const DEVNET_ENDPOINTS: RpcEndpointConfig[] = [
  // Primary - Your Helius free tier
  { url: `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` },

  // Fallbacks - Free public endpoints
  { url: 'https://api.devnet.solana.com' },
  { url: 'https://rpc.ankr.com/solana_devnet' },
  { url: 'https://devnet.helius-rpc.com/?api-key=public' },
];
```

**For Mainnet Production:**

```typescript
const MAINNET_ENDPOINTS: RpcEndpointConfig[] = [
  // Primary - Paid Helius
  { url: `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` },

  // Secondary - QuickNode
  { url: process.env.NEXT_PUBLIC_QUICKNODE_MAINNET_URL },

  // Fallback - Alchemy
  { url: process.env.NEXT_PUBLIC_ALCHEMY_MAINNET_URL },

  // Last resort - Public (may be slow/rate limited)
  { url: 'https://api.mainnet-beta.solana.com' },
];
```

---

## 🔧 Quick Configuration Template

Copy this to your `.env.local`:

```bash
# ===========================================
# RPC PROVIDER CONFIGURATION
# ===========================================

# Helius (Get free key at helius.dev)
NEXT_PUBLIC_HELIUS_API_KEY=

# QuickNode (Get endpoint at quicknode.com)
NEXT_PUBLIC_QUICKNODE_DEVNET_URL=
NEXT_PUBLIC_QUICKNODE_MAINNET_URL=

# Alchemy (Get key at alchemy.com)
NEXT_PUBLIC_ALCHEMY_DEVNET_URL=
NEXT_PUBLIC_ALCHEMY_MAINNET_URL=

# Syndica (Get key at syndica.io)
NEXT_PUBLIC_SYNDICA_API_KEY=

# Custom RPC (if you have your own)
NEXT_PUBLIC_CUSTOM_RPC_DEVNET=
NEXT_PUBLIC_CUSTOM_RPC_MAINNET=
```

---

## 📊 Comparison Table

| Provider | Free Tier | Speed | Reliability | Best For |
|----------|-----------|-------|-------------|----------|
| **Helius** | 100K/day | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Solana-specific |
| **QuickNode** | 50 req/sec | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Easy setup |
| **Alchemy** | 300M CU/month | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Multi-chain |
| **Syndica** | 1000 req/sec | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Enterprise |
| **Ankr** | Limited | ⚡⚡⚡ | ⭐⭐⭐ | Fallback |

---

## ❓ FAQ

**Q: How many endpoints should I add?**
A: 3-5 endpoints is optimal. More than that adds complexity without much benefit.

**Q: Should I use API keys in the code?**
A: NO! Always use environment variables (`.env.local`).

**Q: What if all endpoints are rate limited?**
A: The system will retry after 30 seconds. Consider upgrading to paid tiers.

**Q: Can I mix free and paid endpoints?**
A: Yes! Put paid endpoints first in the array for better performance.

**Q: Do I need different endpoints for devnet vs mainnet?**
A: Yes, they're separate networks and require different URLs.
