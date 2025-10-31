# Customizing Pool Instructions for Your Smart Contract

This guide explains how to customize the pool instructions to match your specific Solana smart contract implementation.

## Understanding the Current Implementation

The current implementation in `src/lib/solana/poolInstructions.ts` uses a standard AMM instruction format. If your smart contract uses a different format, you'll need to modify this file.

## Instruction Components

### 1. Instruction Discriminators

```typescript
export enum PoolInstruction {
  InitializePool = 0,
  AddLiquidity = 1,
  RemoveLiquidity = 2,
  Swap = 3,
}
```

**How to customize:**
- Update the enum values to match your program's instruction discriminators
- Add or remove instructions as needed
- These values are typically defined in your Rust program's `instruction.rs`

### 2. Data Layouts

#### Add Liquidity Layout

```typescript
const addLiquidityLayout = BufferLayout.struct([
  BufferLayout.u8('instruction'),
  BufferLayout.nu64('amountA'),
  BufferLayout.nu64('amountB'),
  BufferLayout.nu64('minLpTokens'),
]);
```

**Common variations:**
- **With deadline**: Add `BufferLayout.nu64('deadline')`
- **With slippage**: Add `BufferLayout.u16('slippageBps')` (basis points)
- **Different order**: Rearrange fields to match your program
- **Additional params**: Add any custom parameters your program needs

#### Remove Liquidity Layout

```typescript
const removeLiquidityLayout = BufferLayout.struct([
  BufferLayout.u8('instruction'),
  BufferLayout.nu64('lpTokenAmount'),
  BufferLayout.nu64('minTokenA'),
  BufferLayout.nu64('minTokenB'),
]);
```

**Common variations:**
- **Percentage-based**: Use `BufferLayout.u8('percentage')` instead of exact amount
- **With deadline**: Add `BufferLayout.nu64('deadline')`
- **Single-sided**: Remove one of the min amounts if your program supports single-sided removal

### 3. Account Order

The account order in the instruction must match your program's expected order.

**Current order for Add Liquidity:**
```typescript
const keys = [
  { pubkey: poolAddress, isSigner: false, isWritable: true },
  { pubkey: poolAuthority, isSigner: false, isWritable: false },
  { pubkey: poolTokenAccountA, isSigner: false, isWritable: true },
  { pubkey: poolTokenAccountB, isSigner: false, isWritable: true },
  { pubkey: lpTokenMint, isSigner: false, isWritable: true },
  { pubkey: userAuthority, isSigner: true, isWritable: false },
  { pubkey: userTokenAccountA, isSigner: false, isWritable: true },
  { pubkey: userTokenAccountB, isSigner: false, isWritable: true },
  { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
];
```

**How to customize:**
1. Check your Rust program's account struct
2. Match the order exactly
3. Set `isSigner: true` for accounts that must sign
4. Set `isWritable: true` for accounts that will be modified

**Example Rust program account struct:**
```rust
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    /// CHECK: PDA authority
    pub pool_authority: AccountInfo<'info>,
    
    #[account(mut)]
    pub pool_token_a: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_token_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub lp_token_mint: Account<'info, Mint>,
    
    #[account(signer)]
    pub user_authority: Signer<'info>,
    
    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_lp_token: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}
```

## Common Customization Scenarios

### Scenario 1: Using Anchor Framework

If your program uses Anchor, you might need to:

1. **Add discriminator prefix**:
```typescript
// Anchor uses 8-byte discriminator
const discriminator = Buffer.from([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08
]); // Get this from your IDL

const data = Buffer.concat([
  discriminator,
  instructionData
]);
```

2. **Use Anchor's account ordering**:
Anchor typically orders accounts as: program accounts, then system accounts

### Scenario 2: Using Borsh Serialization

If your program uses Borsh instead of raw bytes:

```typescript
import { serialize } from 'borsh';

class AddLiquidityInstruction {
  instruction: number;
  amountA: bigint;
  amountB: bigint;
  minLpTokens: bigint;

  constructor(fields: any) {
    this.instruction = fields.instruction;
    this.amountA = fields.amountA;
    this.amountB = fields.amountB;
    this.minLpTokens = fields.minLpTokens;
  }
}

const schema = new Map([
  [AddLiquidityInstruction, {
    kind: 'struct',
    fields: [
      ['instruction', 'u8'],
      ['amountA', 'u64'],
      ['amountB', 'u64'],
      ['minLpTokens', 'u64'],
    ],
  }],
]);

const instruction = new AddLiquidityInstruction({
  instruction: 1,
  amountA,
  amountB,
  minLpTokens,
});

const data = Buffer.from(serialize(schema, instruction));
```

### Scenario 3: Additional System Accounts

If your program requires additional system accounts:

```typescript
const keys = [
  // ... existing accounts ...
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
];
```

### Scenario 4: Multiple Pool Authorities

If your program uses separate authorities for different operations:

```typescript
// Derive different PDAs
const [depositAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from('deposit'), poolAddress.toBuffer()],
  programId
);

const [withdrawAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from('withdraw'), poolAddress.toBuffer()],
  programId
);
```

## Testing Your Customizations

### 1. Unit Tests

Create tests for your instruction builders:

```typescript
import { createAddLiquidityInstruction } from '../poolInstructions';

describe('Pool Instructions', () => {
  it('should create valid add liquidity instruction', () => {
    const instruction = createAddLiquidityInstruction(
      programId,
      poolAddress,
      // ... other params
    );

    expect(instruction.programId.toString()).toBe(programId.toString());
    expect(instruction.keys.length).toBe(10);
    expect(instruction.data.length).toBeGreaterThan(0);
  });
});
```

### 2. Integration Tests

Test with your devnet deployment:

```typescript
// In browser console or test file
const connection = new Connection('https://api.devnet.solana.com');
const wallet = // ... your wallet

const tx = new Transaction().add(
  createAddLiquidityInstruction(/* params */)
);

const signature = await wallet.sendTransaction(tx, connection);
console.log('Transaction signature:', signature);
```

### 3. Verify on Explorer

1. Send a test transaction
2. Check on Solana Explorer: https://explorer.solana.com/?cluster=devnet
3. Verify:
   - Instruction data is correct
   - All accounts are present
   - Transaction succeeds

## Debugging Tips

### 1. Log Instruction Data

```typescript
console.log('Instruction data:', instruction.data.toString('hex'));
console.log('Accounts:', instruction.keys.map(k => ({
  pubkey: k.pubkey.toString(),
  isSigner: k.isSigner,
  isWritable: k.isWritable,
})));
```

### 2. Compare with Working Transaction

1. Find a successful transaction from your program
2. Decode its instruction data
3. Compare with your generated instruction

### 3. Check Program Logs

Enable program logs in your transaction:

```typescript
const signature = await connection.sendTransaction(tx, {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
});

// Wait and get logs
await connection.confirmTransaction(signature);
const txDetails = await connection.getTransaction(signature, {
  commitment: 'confirmed',
});

console.log('Program logs:', txDetails?.meta?.logMessages);
```

## Example: Complete Custom Implementation

Here's a complete example for a custom AMM:

```typescript
// Custom instruction layout
const customAddLiquidityLayout = BufferLayout.struct([
  BufferLayout.u8('instruction'),
  BufferLayout.nu64('amountA'),
  BufferLayout.nu64('amountB'),
  BufferLayout.nu64('minLpTokens'),
  BufferLayout.nu64('deadline'),
  BufferLayout.u16('slippageBps'),
]);

export function createCustomAddLiquidityInstruction(
  programId: PublicKey,
  poolAddress: PublicKey,
  // ... other params
  deadline: bigint,
  slippageBps: number
): TransactionInstruction {
  const data = Buffer.alloc(customAddLiquidityLayout.span);
  customAddLiquidityLayout.encode(
    {
      instruction: 1,
      amountA,
      amountB,
      minLpTokens,
      deadline,
      slippageBps,
    },
    data
  );

  // Custom account order
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: true },
    { pubkey: userAuthority, isSigner: true, isWritable: true }, // Writable for fee payment
    // ... other accounts in your program's order
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
```

## Getting Help

If you're having trouble:

1. **Check your program's IDL** (if using Anchor)
2. **Review successful transactions** on Solana Explorer
3. **Compare with program's test files** in your Rust codebase
4. **Enable verbose logging** in both frontend and program
5. **Test with small amounts** first

## Resources

- [Solana Program Library](https://github.com/solana-labs/solana-program-library)
- [Anchor Framework Docs](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Buffer Layout Documentation](https://github.com/solana-labs/buffer-layout)
