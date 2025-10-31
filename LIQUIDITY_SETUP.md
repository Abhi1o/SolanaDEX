# Liquidity Page Setup for Devnet Testing

This document explains how the liquidity page is configured to work with your Solana devnet smart contract.

## Overview

The liquidity page now fully integrates with your deployed smart contract on Solana devnet. It allows users to:
- Add liquidity to existing pools
- Remove liquidity from pools
- View their liquidity positions
- See all available pools and token pairs

## Configuration

### 1. DEX Configuration (`src/config/dex-config.json`)

Your dex-config.json contains all the necessary information:
- **Network**: devnet
- **RPC URL**: https://api.devnet.solana.com
- **Program ID**: `6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z`
- **Tokens**: USDC, SOL, USDT, ETH with their mint addresses
- **Pools**: 12 pools across 3 token pairs (USDC/SOL, USDC/USDT, ETH/SOL)

### 2. Smart Contract Integration

The liquidity functionality uses the following components:

#### Pool Instructions (`src/lib/solana/poolInstructions.ts`)
- `createAddLiquidityInstruction`: Builds the instruction to add liquidity
- `createRemoveLiquidityInstruction`: Builds the instruction to remove liquidity
- `derivePoolAuthority`: Derives the pool authority PDA

#### Liquidity Service (`src/services/liquidityService.ts`)
- Handles transaction building and execution
- Manages wallet interactions
- Provides error handling and status updates

#### Pool Loader (`src/lib/solana/poolLoader.ts`)
- Loads pool data from dex-config.json
- Converts config data to Pool type
- Provides helper functions to query pools

## How to Test

### Prerequisites
1. Install a Solana wallet (Phantom, Solflare, etc.)
2. Switch your wallet to Devnet
3. Get devnet SOL from a faucet: https://faucet.solana.com/
4. Get devnet test tokens for the mints in your config

### Testing Add Liquidity

1. **Connect Wallet**
   - Click "Connect Wallet" in the header
   - Select your wallet and approve the connection
   - Ensure you're on devnet

2. **Select Token Pair**
   - Go to the Liquidity page
   - Select "Add Liquidity" tab
   - Choose first token (e.g., USDC)
   - Choose second token (e.g., SOL)
   - The page will show available pools for this pair

3. **Add Liquidity**
   - Click "Add Liquidity" button
   - A modal will open showing:
     - Token input fields with balance display
     - Automatic ratio calculation based on pool reserves
     - Expected LP tokens to receive
     - Share of pool percentage
     - Price impact
   - Enter amounts for both tokens
   - Click "Add Liquidity" to execute
   - Approve the transaction in your wallet

4. **Transaction Flow**
   - The transaction will:
     - Create your LP token account if needed
     - Transfer your tokens to the pool
     - Mint LP tokens to your account
   - You'll see status updates during the process
   - Once confirmed, your position will appear in "Your Positions"

### Testing Remove Liquidity

1. **Select Pool**
   - Go to "Remove Liquidity" tab
   - Select the token pair you have liquidity in
   - The page will show your LP token balance

2. **Remove Liquidity**
   - Click "Remove Liquidity" button
   - A modal will open showing:
     - Percentage slider (25%, 50%, 75%, 100%)
     - Expected tokens to receive
     - Price impact
   - Select the percentage to remove
   - Click "Remove Liquidity" to execute
   - Approve the transaction in your wallet

3. **Transaction Flow**
   - The transaction will:
     - Burn your LP tokens
     - Transfer tokens from pool to your account
   - Your position will update after confirmation

## Program Instruction Format

### Add Liquidity Instruction

```
Accounts:
1. Pool (writable)
2. Pool Authority (PDA)
3. Pool Token Account A (writable)
4. Pool Token Account B (writable)
5. LP Token Mint (writable)
6. User Authority (signer)
7. User Token Account A (writable)
8. User Token Account B (writable)
9. User LP Token Account (writable)
10. Token Program

Data:
- instruction: u8 (1 for AddLiquidity)
- amountA: u64
- amountB: u64
- minLpTokens: u64 (slippage protection)
```

### Remove Liquidity Instruction

```
Accounts:
1. Pool (writable)
2. Pool Authority (PDA)
3. Pool Token Account A (writable)
4. Pool Token Account B (writable)
5. LP Token Mint (writable)
6. User Authority (signer)
7. User Token Account A (writable)
8. User Token Account B (writable)
9. User LP Token Account (writable)
10. Token Program

Data:
- instruction: u8 (2 for RemoveLiquidity)
- lpTokenAmount: u64
- minTokenA: u64 (slippage protection)
- minTokenB: u64 (slippage protection)
```

## Customization

### Adjusting Instruction Format

If your smart contract uses a different instruction format, modify:
- `src/lib/solana/poolInstructions.ts` - Update the layouts and account order
- The instruction discriminators (enum values)

### Adding New Pools

To add new pools to the config:
1. Deploy a new pool using your smart contract
2. Add the pool data to `src/config/dex-config.json`
3. The UI will automatically load and display the new pool

### Slippage Tolerance

Default slippage is 1% (99% of expected amount). To adjust:
- In `AddLiquidity` component: `minLpTokens = lpTokens * 99 / 100`
- In `RemoveLiquidity` component: `minTokenA/B = expected * 99 / 100`

## Troubleshooting

### Common Issues

1. **"Program ID not configured" error**
   - Ensure `programId` is set in dex-config.json
   - Check that the program ID matches your deployed contract

2. **"Insufficient balance" error**
   - Get devnet SOL from faucet
   - Ensure you have the test tokens for the selected pair

3. **"Transaction failed" error**
   - Check that pool accounts exist and are initialized
   - Verify token accounts are created
   - Ensure sufficient SOL for transaction fees

4. **"Account not found" error**
   - The pool or token accounts may not exist
   - Verify addresses in dex-config.json match deployed accounts

### Debugging

Enable console logging to see transaction details:
```javascript
// In browser console
localStorage.setItem('debug', 'liquidity:*');
```

Check transaction on Solana Explorer:
- Devnet: https://explorer.solana.com/?cluster=devnet
- Paste transaction signature to see details

## Next Steps

1. **Test with Real Tokens**
   - Mint test tokens to your wallet
   - Try adding small amounts first
   - Verify LP tokens are minted correctly

2. **Monitor Pool State**
   - Check pool reserves update correctly
   - Verify LP token supply changes
   - Test with multiple users

3. **Production Deployment**
   - Update RPC endpoint for mainnet
   - Update program ID and token mints
   - Test thoroughly on mainnet-beta

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify transaction signatures on Solana Explorer
3. Review the smart contract logs
4. Check that all accounts are properly initialized

## Architecture

```
User Interface (Liquidity Page)
    ↓
Pool Loader (loads from dex-config.json)
    ↓
Liquidity Service (builds transactions)
    ↓
Pool Instructions (creates Solana instructions)
    ↓
Wallet Adapter (signs and sends)
    ↓
Solana Network (devnet)
    ↓
Your Smart Contract (processes instructions)
```

The system is fully integrated and ready for testing on devnet!
