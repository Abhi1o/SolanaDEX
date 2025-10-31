# Implementing Real Swap Transactions

## Current Status

✅ **Working:**
- Quote engine with smart routing
- Price calculations
- Shard selection
- UI with all features
- Demo mode swap

⚠️ **Demo Mode:**
- Swap button works but simulates transactions
- No real tokens are transferred
- Shows what data would be sent

## What You Need

To enable **real** swaps, you need your program's IDL (Interface Definition Language) that defines:

1. The swap instruction format
2. Required accounts structure
3. Any PDAs (Program Derived Addresses)
4. Instruction data encoding

## Implementation Steps

### Step 1: Get Your Program IDL

Your program should export an IDL file. It looks something like this:

```json
{
  "version": "0.1.0",
  "name": "sharded_dex",
  "instructions": [
    {
      "name": "swap",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "pool", "isMut": true, "isSigner": false },
        { "name": "tokenAccountIn", "isMut": true, "isSigner": false },
        { "name": "tokenAccountOut", "isMut": true, "isSigner": false },
        // ... more accounts
      ],
      "args": [
        { "name": "amountIn", "type": "u64" },
        { "name": "minAmountOut", "type": "u64" }
      ]
    }
  ]
}
```

### Step 2: Create IDL File

1. Create `src/idl/sharded-dex.ts`:

```typescript
export type ShardedDex = {
  "version": "0.1.0",
  "name": "sharded_dex",
  "instructions": [
    {
      "name": "swap",
      "accounts": [
        // Copy from your program's IDL
      ],
      "args": [
        // Copy from your program's IDL
      ]
    }
  ]
};

export const IDL: ShardedDex = {
  // Paste your program's IDL here
};
```

### Step 3: Install Anchor (if using)

```bash
npm install @coral-xyz/anchor @solana/spl-token
```

### Step 4: Implement Swap Function

Replace the `executeSwap` function in `src/lib/shardedDex.ts`:

```typescript
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { IDL } from '../idl/sharded-dex';

async executeSwap(
  wallet: PublicKey,
  quote: SwapQuote,
  slippageTolerance: number = 0.5
): Promise<string> {
  const minOutput = quote.estimatedOutput * (1 - slippageTolerance / 100);

  // Get pool info
  const pool = dexConfig.pools.find(p => p.poolAddress === quote.route[0].poolAddress);
  if (!pool) throw new Error('Pool not found');

  // Get token configs
  const inputToken = dexConfig.tokens.find(t => t.mint === quote.inputToken);
  const outputToken = dexConfig.tokens.find(t => t.mint === quote.outputToken);

  // Setup Anchor
  const provider = new AnchorProvider(
    this.connection,
    wallet as any, // Need wallet adapter
    { commitment: 'confirmed' }
  );
  const program = new Program(IDL, this.programId, provider);

  // Get or create token accounts
  const inputTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(inputToken.mint),
    wallet
  );

  const outputTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(outputToken.mint),
    wallet
  );

  // Convert amounts to base units
  const amountIn = new BN(quote.inputAmount * Math.pow(10, inputToken.decimals));
  const minAmountOut = new BN(minOutput * Math.pow(10, outputToken.decimals));

  // Build and send transaction
  const tx = await program.methods
    .swap(amountIn, minAmountOut)
    .accounts({
      user: wallet,
      pool: new PublicKey(pool.poolAddress),
      tokenAccountIn: inputTokenAccount,
      tokenAccountOut: outputTokenAccount,
      poolTokenAccountA: new PublicKey(pool.tokenAccountA),
      poolTokenAccountB: new PublicKey(pool.tokenAccountB),
      tokenProgram: TOKEN_PROGRAM_ID,
      // Add any other required accounts from your IDL
    })
    .rpc();

  return tx;
}
```

### Step 5: Handle Wallet Connection

Update `src/hooks/useShardedDex.ts` to pass wallet properly:

```typescript
const executeSwap = useCallback(async (
  quote: SwapQuote,
  slippageTolerance: number = 0.5
): Promise<string | null> => {
  if (!publicKey || !signTransaction) {
    setError('Wallet not connected');
    return null;
  }

  setLoading(true);
  setError(null);

  try {
    // Need wallet adapter for signing
    const walletAdapter = {
      publicKey,
      signTransaction,
      signAllTransactions,
    };

    const signature = await shardedDex.executeSwap(
      walletAdapter,
      quote,
      slippageTolerance
    );
    return signature;
  } catch (err) {
    // ...
  }
}, [publicKey, signTransaction, signAllTransactions]);
```

## Example: Standard Token Swap Pattern

If your program follows standard patterns, here's a complete example:

```typescript
import { Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

async executeSwap(
  wallet: any, // Wallet adapter
  quote: SwapQuote,
  slippageTolerance: number = 0.5
): Promise<string> {
  const minOutput = quote.estimatedOutput * (1 - slippageTolerance / 100);

  const pool = dexConfig.pools.find(p => p.poolAddress === quote.route[0].poolAddress);
  const inputToken = dexConfig.tokens.find(t => t.mint === quote.inputToken);
  const outputToken = dexConfig.tokens.find(t => t.mint === quote.outputToken);

  // Get user's token accounts
  const userInputATA = await getAssociatedTokenAddress(
    new PublicKey(inputToken.mint),
    wallet.publicKey
  );

  const userOutputATA = await getAssociatedTokenAddress(
    new PublicKey(outputToken.mint),
    wallet.publicKey
  );

  // Build instruction data
  const amountIn = Math.floor(quote.inputAmount * Math.pow(10, inputToken.decimals));
  const minAmountOut = Math.floor(minOutput * Math.pow(10, outputToken.decimals));

  // Create instruction (adjust to your program's format)
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(pool.poolAddress), isSigner: false, isWritable: true },
      { pubkey: userInputATA, isSigner: false, isWritable: true },
      { pubkey: userOutputATA, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(pool.tokenAccountA), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(pool.tokenAccountB), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: this.programId,
    data: Buffer.from([
      // Encode your instruction data
      // Example: [instruction_discriminator, ...amountIn_bytes, ...minAmountOut_bytes]
    ])
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

  // Sign and send
  const signed = await wallet.signTransaction(transaction);
  const signature = await this.connection.sendRawTransaction(signed.serialize());
  await this.connection.confirmTransaction(signature);

  return signature;
}
```

## Testing

Once implemented:

1. **Test on Devnet First**
   - Use small amounts
   - Verify balances change correctly
   - Check transaction on explorer

2. **Test Each Trading Pair**
   - USDC → SOL
   - USDC → USDT
   - ETH → SOL

3. **Test Different Shards**
   - Small amounts (use small shards)
   - Large amounts (use large shards)

4. **Test Error Handling**
   - Insufficient balance
   - Slippage exceeded
   - Pool not found

## Quick Reference

**Current Demo Mode:**
- Quote engine: ✅ Working
- Price calculations: ✅ Working
- Shard selection: ✅ Working
- Transaction building: ⚠️ Simulated

**Location to Edit:**
`src/lib/shardedDex.ts` - Line 206 (`executeSwap` method)

**What to Add:**
1. Program IDL
2. Instruction building
3. Account resolution
4. Transaction signing

## Need Help?

Check these resources:
- Anchor Book: https://book.anchor-lang.com/
- Solana Cookbook: https://solanacookbook.com/
- SPL Token Docs: https://spl.solana.com/token

## Demo Mode Benefits

While in demo mode, you can still:
- ✅ Test the UI/UX
- ✅ Verify quote calculations
- ✅ Check shard routing logic
- ✅ Test all trading pairs
- ✅ See detailed swap information in console

The only thing missing is the actual on-chain transaction!
