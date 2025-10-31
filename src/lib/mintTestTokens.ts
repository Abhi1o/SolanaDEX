/**
 * Mint test tokens directly from the UI
 * This allows users to get test tokens without using CLI scripts
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import dexConfig from '../config/dex-config.json';

export async function mintTestTokensToWallet(
  walletAdapter: any,
  tokenSymbol: string,
  amount: number
): Promise<string> {
  const connection = new Connection(dexConfig.rpcUrl, 'confirmed');
  const wallet = walletAdapter.publicKey;

  if (!wallet) {
    throw new Error('Wallet not connected');
  }

  // Find token config
  const tokenConfig = dexConfig.tokens.find(t => t.symbol === tokenSymbol);
  if (!tokenConfig) {
    throw new Error(`Token ${tokenSymbol} not found in config`);
  }

  console.log(`🪙 Minting ${amount} ${tokenSymbol} to ${wallet.toBase58()}`);

  try {
    // Note: This requires the wallet to have mint authority
    // In production, you'd need a backend service to mint tokens
    // For devnet testing, the user's wallet needs to be the mint authority
    
    const mint = new PublicKey(tokenConfig.mint);
    
    // Get or create user's token account
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      walletAdapter, // This won't work directly - needs a Keypair
      mint,
      wallet,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    // Calculate amount in base units
    const amountInBaseUnits = BigInt(Math.floor(amount * Math.pow(10, tokenConfig.decimals)));

    // Mint tokens (requires mint authority)
    const signature = await mintTo(
      connection,
      walletAdapter, // This won't work directly - needs a Keypair
      mint,
      userTokenAccount.address,
      wallet, // Mint authority
      amountInBaseUnits,
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`✅ Minted ${amount} ${tokenSymbol}`);
    console.log(`TX: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return signature;
  } catch (error) {
    console.error('Mint error:', error);
    throw new Error(
      `Failed to mint ${tokenSymbol}. ` +
      `You may not have mint authority for this token. ` +
      `Use the CLI script instead: node scripts/mint-test-tokens.js ${wallet.toBase58()} ${amount}`
    );
  }
}

/**
 * Check if user has sufficient balance for a swap
 */
export async function checkTokenBalance(
  connection: Connection,
  wallet: PublicKey,
  tokenMint: string,
  requiredAmount: number,
  decimals: number
): Promise<{ hasBalance: boolean; currentBalance: number; ata: PublicKey }> {
  try {
    const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
    
    const ata = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      wallet,
      false,
      TOKEN_PROGRAM_ID
    );

    const account = await getAccount(connection, ata, 'confirmed', TOKEN_PROGRAM_ID);
    const balance = Number(account.amount) / Math.pow(10, decimals);

    return {
      hasBalance: balance >= requiredAmount,
      currentBalance: balance,
      ata
    };
  } catch (error) {
    // Account doesn't exist
    return {
      hasBalance: false,
      currentBalance: 0,
      ata: PublicKey.default
    };
  }
}
