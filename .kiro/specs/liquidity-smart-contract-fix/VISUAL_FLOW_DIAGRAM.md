# Visual Flow Diagrams - Liquidity Routing

## Add Liquidity - Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER OPENS LIQUIDITY PAGE                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: TOKEN SELECTION                                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  User Interface:                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Select First Token:  [USDC ▼]                          │  │  │
│  │  │                                                           │  │  │
│  │  │  Select Second Token: [USDT ▼]                          │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  │  State Changes:                                                 │  │
│  │  • selectedTokenA = USDC                                        │  │
│  │  • selectedTokenB = USDT                                        │  │
│  │  • Triggers useEffect for shard selection                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: AUTOMATIC SHARD SELECTION                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Frontend Process:                                             │  │
│  │  1. useEffect detects both tokens selected                     │  │
│  │  2. setIsLoadingShard(true)                                    │  │
│  │  3. Call liquidityService.getSmallestShard()                   │  │
│  │                                                                 │  │
│  │  UI Shows:                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Available Pools: 4 shards                              │  │  │
│  │  │  Selecting Optimal Shard: [⟳ Loading...]               │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: BACKEND API CALL                                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  API Request:                                                   │  │
│  │  GET /api/shards/smallest/                                      │  │
│  │      BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa/            │  │
│  │      F7CVt32PGjVCJo7N4PS4qUzXVMBQBj3iV4qCVFdHgseu/            │  │
│  │      BJYyjsX1xPbjL661mozEnU2vPf5gznbZAdGRXQh9Gufa             │  │
│  │                                                                 │  │
│  │  Backend Process:                                               │  │
│  │  1. Load pool configuration for USDC/USDT                      │  │
│  │  2. Fetch reserves from Solana for each shard:                 │  │
│  │     • Shard 1: 100 USDC + 100 USDT = 200 total                │  │
│  │     • Shard 2: 200 USDC + 200 USDT = 400 total                │  │
│  │     • Shard 3: 150 USDC + 150 USDT = 300 total                │  │
│  │     • Shard 4: 300 USDC + 300 USDT = 600 total                │  │
│  │  3. Sort by total size (ascending)                             │  │
│  │  4. Return sorted list                                         │  │
│  │                                                                 │  │
│  │  API Response:                                                  │  │
│  │  {                                                              │  │
│  │    "success": true,                                             │  │
│  │    "data": {                                                    │  │
│  │      "shards": [                                                │  │
│  │        { "address": "Shard1...", "reserves": {...} },  ← SMALLEST│  │
│  │        { "address": "Shard3...", "reserves": {...} },          │  │
│  │        { "address": "Shard2...", "reserves": {...} },          │  │
│  │        { "address": "Shard4...", "reserves": {...} }           │  │
│  │      ]                                                          │  │
│  │    }                                                            │  │
│  │  }                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: UPDATE UI WITH SELECTED SHARD                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Frontend Process:                                             │  │
│  │  1. Parse API response                                         │  │
│  │  2. Extract smallest shard (first in array)                    │  │
│  │  3. Find shard number from config                             │  │
│  │  4. setSelectedShard({ poolAddress, shardNumber, reserves })   │  │
│  │  5. setIsLoadingShard(false)                                   │  │
│  │                                                                 │  │
│  │  UI Updates:                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Available Pools: 4 shards                              │  │  │
│  │  │  Selected Shard: Shard 1 (Smallest) ✓                  │  │  │
│  │  │  Pool Ratio: 1 USDC ≈ 1.000000 USDT                    │  │  │
│  │  │  Network Fee: ~0.00005 SOL                              │  │  │
│  │  │                                                           │  │  │
│  │  │  💡 Liquidity Routing Strategy                          │  │  │
│  │  │  Adding to the smallest shard provides the best         │  │  │
│  │  │  experience for traders by balancing liquidity          │  │  │
│  │  │  across all shards.                                      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: USER ENTERS AMOUNTS                                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  User Interface:                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  USDC Amount: [100.00]                    Balance: 500  │  │  │
│  │  │  USDT Amount: [100.00]                    Balance: 500  │  │  │
│  │  │                                                           │  │  │
│  │  │  You will receive:                                        │  │  │
│  │  │  • LP Tokens: ~100.00                                    │  │  │
│  │  │  • Share of Pool: 0.5%                                   │  │  │
│  │  │  • Price Impact: 0.01%                                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  │  Frontend Calculations:                                         │  │
│  │  • Convert to base units (with decimals)                       │  │
│  │  • Calculate LP tokens using pool formula                      │  │
│  │  • Calculate share percentage                                  │  │
│  │  • Calculate price impact                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: BUILD TRANSACTION                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  User clicks "Add Liquidity"                                   │  │
│  │                                                                 │  │
│  │  Frontend Process:                                             │  │
│  │  1. Validate inputs                                            │  │
│  │  2. Get current pool (uses selectedShard)                      │  │
│  │  3. Call liquidityService.buildAddLiquidityTransaction({       │  │
│  │       pool: currentPool,  // This is Shard 1                   │  │
│  │       amountA: 100_000_000,  // 100 USDC (6 decimals)          │  │
│  │       amountB: 100_000_000,  // 100 USDT (6 decimals)          │  │
│  │       minLpTokens: 99_000_000_000  // 99 LP (1% slippage)      │  │
│  │     })                                                          │  │
│  │                                                                 │  │
│  │  Transaction Structure:                                         │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Instruction Data (25 bytes):                           │  │  │
│  │  │  [2][99000000000][100000000][100000000]                 │  │  │
│  │  │   │   │           │          │                           │  │  │
│  │  │   │   │           │          └─ maxTokenB                │  │  │
│  │  │   │   │           └─ maxTokenA                           │  │  │
│  │  │   │   └─ poolTokenAmount (minLpTokens)                  │  │  │
│  │  │   └─ discriminator (2 = ADD_LIQUIDITY)                  │  │  │
│  │  │                                                           │  │  │
│  │  │  Accounts (14):                                          │  │  │
│  │  │  0. Shard 1 Pool Address                                │  │  │
│  │  │  1. Pool Authority                                       │  │  │
│  │  │  2. User Wallet (signer)                                │  │  │
│  │  │  3. User USDC Account                                    │  │  │
│  │  │  4. User USDT Account                                    │  │  │
│  │  │  5. Pool USDC Account                                    │  │  │
│  │  │  6. Pool USDT Account                                    │  │  │
│  │  │  7. LP Token Mint                                        │  │  │
│  │  │  8. User LP Token Account                                │  │  │
│  │  │  9. USDC Mint                                            │  │  │
│  │  │  10. USDT Mint                                           │  │  │
│  │  │  11-13. Token Programs                                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: SIGN & SEND TRANSACTION                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  1. Wallet popup appears                                       │  │
│  │  2. User reviews and approves                                  │  │
│  │  3. Transaction signed                                         │  │
│  │  4. Sent to Solana network                                     │  │
│  │  5. Wait for confirmation                                      │  │
│  │                                                                 │  │
│  │  UI Shows:                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  [⟳ Loading...] Adding Liquidity...                     │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8: SUCCESS!                                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  UI Shows:                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  ✅ Liquidity Added Successfully!                        │  │  │
│  │  │                                                           │  │  │
│  │  │  Added 100 USDC and 100 USDT to Shard 1                 │  │  │
│  │  │  Received: 100 LP tokens                                 │  │  │
│  │  │                                                           │  │  │
│  │  │  Transaction: abc123...xyz789                            │  │  │
│  │  │  [View on Explorer]                                      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  │  State Updates:                                                 │  │
│  │  • Refresh token balances                                      │  │
│  │  • Refresh LP token balance                                    │  │
│  │  • Update positions list                                       │  │
│  │  • Reset form                                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```



---

## Remove Liquidity - Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER CLICKS "REMOVE LIQUIDITY" TAB                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: LOAD USER POSITIONS                                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Frontend Process:                                             │  │
│  │  1. Fetch user's LP token balances for all pools              │  │
│  │  2. Calculate share of each pool                              │  │
│  │  3. Calculate withdrawable amounts                            │  │
│  │  4. Identify pool sizes                                       │  │
│  │                                                                 │  │
│  │  UI Shows:                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Your Positions:                                         │  │  │
│  │  │                                                           │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐    │  │  │
│  │  │  │ USDC/USDT - Shard 1                             │    │  │  │
│  │  │  │ LP Tokens: 50.00                                │    │  │  │
│  │  │  │ Pool Size: Normal                               │    │  │  │
│  │  │  │ [Remove Liquidity]                              │    │  │  │
│  │  │  └─────────────────────────────────────────────────┘    │  │  │
│  │  │                                                           │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐    │  │  │
│  │  │  │ USDC/USDT - Shard 4                             │    │  │  │
│  │  │  │ LP Tokens: 150.00                               │    │  │  │
│  │  │  │ Pool Size: Largest 🔥                           │    │  │  │
│  │  │  │ [Remove Liquidity]                              │    │  │  │
│  │  │  └─────────────────────────────────────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  │  Logic for "Largest":                                          │  │
│  │  • Compare total pool sizes (reserveA + reserveB)             │  │
│  │  • Highlight the largest pool with user position              │  │
│  │  • Recommend removing from largest first                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: USER SELECTS POSITION TO REMOVE                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  User clicks "Remove Liquidity" on Shard 4 (Largest)          │  │
│  │                                                                 │  │
│  │  Modal Opens:                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Remove Liquidity from USDC/USDT                        │  │  │
│  │  │  Shard 4 (Largest Pool) 🔥                              │  │  │
│  │  │                                                           │  │  │
│  │  │  Your LP Tokens: 150.00                                 │  │  │
│  │  │                                                           │  │  │
│  │  │  Amount to Remove: [____] LP                            │  │  │
│  │  │  [25%] [50%] [75%] [100%]                               │  │  │
│  │  │                                                           │  │  │
│  │  │  You will receive:                                        │  │  │
│  │  │  • USDC: ~0.00                                           │  │  │
│  │  │  • USDT: ~0.00                                           │  │  │
│  │  │                                                           │  │  │
│  │  │  💡 Removing from the largest pool helps maintain       │  │  │
│  │  │     balanced liquidity distribution                      │  │  │
│  │  │                                                           │  │  │
│  │  │  [Cancel] [Remove Liquidity]                            │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: USER ENTERS AMOUNT                                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  User enters: 100 LP tokens                                    │  │
│  │                                                                 │  │
│  │  Frontend Calculations:                                         │  │
│  │  1. Calculate share: 100 / totalSupply                         │  │
│  │  2. Calculate tokenA: share * reserveA                         │  │
│  │  3. Calculate tokenB: share * reserveB                         │  │
│  │  4. Apply slippage (1%): minTokenA = tokenA * 0.99             │  │
│  │                                                                 │  │
│  │  UI Updates:                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Amount to Remove: [100.00] LP                          │  │  │
│  │  │                                                           │  │  │
│  │  │  You will receive:                                        │  │  │
│  │  │  • USDC: ~99.50 (min: 98.50)                            │  │  │
│  │  │  • USDT: ~99.50 (min: 98.50)                            │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: BUILD REMOVE TRANSACTION                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  User clicks "Remove Liquidity"                                │  │
│  │                                                                 │  │
│  │  Frontend Process:                                             │  │
│  │  1. Validate inputs                                            │  │
│  │  2. Call liquidityService.buildRemoveLiquidityTransaction({    │  │
│  │       pool: shard4Pool,  // Largest shard                      │  │
│  │       lpTokenAmount: 100_000_000_000,  // 100 LP (9 decimals)  │  │
│  │       minTokenA: 98_500_000,  // 98.5 USDC (1% slippage)       │  │
│  │       minTokenB: 98_500_000   // 98.5 USDT (1% slippage)       │  │
│  │     })                                                          │  │
│  │                                                                 │  │
│  │  Transaction Structure:                                         │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Instruction Data (25 bytes):                           │  │  │
│  │  │  [3][100000000000][98500000][98500000]                  │  │  │
│  │  │   │   │            │         │                           │  │  │
│  │  │   │   │            │         └─ minTokenB                │  │  │
│  │  │   │   │            └─ minTokenA                          │  │  │
│  │  │   │   └─ lpTokenAmount                                  │  │  │
│  │  │   └─ discriminator (3 = REMOVE_LIQUIDITY)               │  │  │
│  │  │                                                           │  │  │
│  │  │  Accounts (15):                                          │  │  │
│  │  │  0. Shard 4 Pool Address                                │  │  │
│  │  │  1. Pool Authority                                       │  │  │
│  │  │  2. User Wallet (signer)                                │  │  │
│  │  │  3. LP Token Mint                                        │  │  │
│  │  │  4. User LP Token Account                                │  │  │
│  │  │  5. Pool USDC Account                                    │  │  │
│  │  │  6. Pool USDT Account                                    │  │  │
│  │  │  7. User USDC Account                                    │  │  │
│  │  │  8. User USDT Account                                    │  │  │
│  │  │  9. Fee Account                                          │  │  │
│  │  │  10. USDC Mint                                           │  │  │
│  │  │  11. USDT Mint                                           │  │  │
│  │  │  12-14. Token Programs                                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: SIGN & SEND TRANSACTION                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  1. Wallet popup appears                                       │  │
│  │  2. User reviews and approves                                  │  │
│  │  3. Transaction signed                                         │  │
│  │  4. Sent to Solana network                                     │  │
│  │  5. Wait for confirmation                                      │  │
│  │                                                                 │  │
│  │  UI Shows:                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  [⟳ Loading...] Removing Liquidity...                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: SUCCESS!                                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  UI Shows:                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  ✅ Liquidity Removed Successfully!                      │  │  │
│  │  │                                                           │  │  │
│  │  │  Removed from Shard 4 (Largest Pool)                     │  │  │
│  │  │  Received:                                                │  │  │
│  │  │  • 99.50 USDC                                            │  │  │
│  │  │  • 99.50 USDT                                            │  │  │
│  │  │                                                           │  │  │
│  │  │  Transaction: abc123...xyz789                            │  │  │
│  │  │  [View on Explorer]                                      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  │  State Updates:                                                 │  │
│  │  • Refresh token balances                                      │  │
│  │  • Refresh LP token balance                                    │  │
│  │  • Update positions list                                       │  │
│  │  • Close modal                                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```



---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API FAILURE SCENARIO                      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  User selects Token A & Token B                                      │
│  Frontend calls: liquidityService.getSmallestShard()                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend API Call Fails                                              │
│  • Network timeout                                                   │
│  • Server error (500)                                                │
│  • Invalid response                                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Graceful Fallback                                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  try {                                                          │  │
│  │    const response = await sammRouter.getSmallestShards(...);   │  │
│  │    return response.data.shards[0];                             │  │
│  │  } catch (error) {                                              │  │
│  │    console.warn('Backend failed, using fallback');             │  │
│  │    showWarning('Using default pool selection');                │  │
│  │    return null;  // Triggers fallback to first pool            │  │
│  │  }                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  UI Shows Warning (Non-Blocking)                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ⚠️  Unable to connect to routing service                      │  │
│  │     Using default pool selection                                │  │
│  │     [Dismiss]                                                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Pool Selection:                                                     │
│  • selectedShard = null                                              │
│  • currentPool = availablePools[0]  // First pool as fallback       │
│  • User can still add liquidity                                      │
│  • No "Smallest" badge shown                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

```
┌──────────────┐
│   Frontend   │
│   (React)    │
└──────┬───────┘
       │
       │ 1. User selects tokens
       │
       ▼
┌──────────────────────┐
│  LiquidityService    │
│  getSmallestShard()  │
└──────┬───────────────┘
       │
       │ 2. API call
       │
       ▼
┌──────────────────────┐
│  SammRouterService   │
│  getSmallestShards() │
└──────┬───────────────┘
       │
       │ 3. HTTP GET
       │
       ▼
┌──────────────────────────────┐
│  Backend API                 │
│  /api/shards/smallest/...    │
└──────┬───────────────────────┘
       │
       │ 4. Fetch pool states
       │
       ▼
┌──────────────────────┐
│  Solana RPC          │
│  getTokenAccountBalance()
└──────┬───────────────┘
       │
       │ 5. Return reserves
       │
       ▼
┌──────────────────────────────┐
│  Backend API                 │
│  • Sort shards by size       │
│  • Return sorted list        │
└──────┬───────────────────────┘
       │
       │ 6. JSON response
       │
       ▼
┌──────────────────────┐
│  Frontend            │
│  • Update UI         │
│  • Show selected shard│
│  • Enable add liquidity│
└──────────────────────┘
```

---

## State Management

```
Frontend State Tree:

liquidityPage
├── selectedTokenA: Token | null
├── selectedTokenB: Token | null
├── selectedShard: {
│   ├── poolAddress: string
│   ├── shardNumber: number
│   └── reserves: { tokenA: string, tokenB: string }
│   } | null
├── isLoadingShard: boolean
├── amountA: string
├── amountB: string
├── lpTokensToReceive: bigint
├── currentPool: Pool | null  // Derived from selectedShard
└── availablePools: Pool[]

State Transitions:

1. Initial: All null/empty
2. Token A selected: selectedTokenA = Token
3. Token B selected: selectedTokenB = Token, isLoadingShard = true
4. Shard fetched: selectedShard = {...}, isLoadingShard = false
5. Amounts entered: amountA, amountB, lpTokensToReceive updated
6. Transaction sent: isProcessing = true
7. Success: Reset to initial state
```

