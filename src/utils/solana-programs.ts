import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  AccountInfo,
  ParsedAccountData,
  TokenAccountsFilter,
  GetProgramAccountsFilter,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token';

// Common Solana program IDs
export const PROGRAM_IDS = {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID: SystemProgram.programId,
  // Add more program IDs as needed for DEX functionality
  SERUM_DEX_PROGRAM_ID: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
  RAYDIUM_AMM_PROGRAM_ID: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
} as const;

// Token account utilities
export class TokenAccountManager {
  constructor(private connection: Connection) {}

  /**
   * Get or create associated token account
   */
  async getOrCreateAssociatedTokenAccount(
    payer: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve = false
  ): Promise<{ address: PublicKey; instruction?: TransactionInstruction }> {
    const associatedToken = await getAssociatedTokenAddress(
      mint,
      owner,
      allowOwnerOffCurve,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
      await getAccount(this.connection, associatedToken, 'confirmed', TOKEN_PROGRAM_ID);
      return { address: associatedToken };
    } catch (error: unknown) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        const instruction = createAssociatedTokenAccountInstruction(
          payer,
          associatedToken,
          owner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        return { address: associatedToken, instruction };
      }
      throw error;
    }
  }

  /**
   * Get all token accounts for a wallet
   */
  async getTokenAccountsByOwner(owner: PublicKey): Promise<Array<{
    pubkey: PublicKey;
    account: AccountInfo<ParsedAccountData>;
  }>> {
    try {
      const response = await this.connection.getParsedTokenAccountsByOwner(
        owner,
        { programId: TOKEN_PROGRAM_ID },
        'confirmed'
      );
      return response.value;
    } catch (error) {
      console.error('Failed to fetch token accounts:', error);
      return [];
    }
  }

  /**
   * Get token balance for a specific mint
   */
  async getTokenBalance(owner: PublicKey, mint: PublicKey): Promise<bigint> {
    try {
      const associatedToken = await getAssociatedTokenAddress(mint, owner);
      const account = await getAccount(this.connection, associatedToken, 'confirmed');
      return account.amount;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        return BigInt(0);
      }
      throw error;
    }
  }

  /**
   * Create transfer instruction
   */
  createTransferInstruction(
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: bigint,
    multiSigners: PublicKey[] = []
  ): TransactionInstruction {
    return createTransferInstruction(
      source,
      destination,
      owner,
      amount,
      multiSigners,
      TOKEN_PROGRAM_ID
    );
  }
}

// Transaction utilities
export class TransactionManager {
  constructor(private connection: Connection) {}

  /**
   * Get recent blockhash with retry logic
   */
  async getRecentBlockhash(commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed') {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(commitment);
        return { blockhash, lastValidBlockHeight };
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed to get blockhash (attempt ${i + 1}/${maxRetries}):`, error);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to get recent blockhash after retries');
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(transaction: Transaction): Promise<number> {
    try {
      const fee = await this.connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      );
      return fee.value || 5000; // Default fallback fee
    } catch (error) {
      console.warn('Failed to estimate transaction fee:', error);
      return 5000; // Default fallback fee
    }
  }

  /**
   * Send and confirm transaction with retry logic
   */
  async sendAndConfirmTransaction(
    transaction: Transaction,
    signers: any[],
    options: {
      skipPreflight?: boolean;
      preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    const {
      skipPreflight = false,
      preflightCommitment = 'confirmed',
      maxRetries = 3,
    } = options;

    // Set recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    // Sign transaction
    transaction.sign(...signers);

    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight,
            preflightCommitment,
          }
        );

        // Confirm transaction
        const confirmation = await this.connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        return signature;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Transaction attempt ${i + 1}/${maxRetries} failed:`, error);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          
          // Update blockhash for retry
          const newBlockhash = await this.getRecentBlockhash();
          transaction.recentBlockhash = newBlockhash.blockhash;
          transaction.lastValidBlockHeight = newBlockhash.lastValidBlockHeight;
          
          // Re-sign with new blockhash
          transaction.sign(...signers);
        }
      }
    }

    throw lastError || new Error('Transaction failed after retries');
  }
}

// Account utilities
export class AccountManager {
  constructor(private connection: Connection) {}

  /**
   * Get SOL balance for an account
   */
  async getSolBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey, 'confirmed');
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get SOL balance:', error);
      return 0;
    }
  }

  /**
   * Get account info with error handling
   */
  async getAccountInfo(publicKey: PublicKey): Promise<AccountInfo<Buffer> | null> {
    try {
      return await this.connection.getAccountInfo(publicKey, 'confirmed');
    } catch (error) {
      console.error('Failed to get account info:', error);
      return null;
    }
  }

  /**
   * Check if account exists
   */
  async accountExists(publicKey: PublicKey): Promise<boolean> {
    const accountInfo = await this.getAccountInfo(publicKey);
    return accountInfo !== null;
  }

  /**
   * Get program accounts with filters
   */
  async getProgramAccounts(
    programId: PublicKey,
    filters?: GetProgramAccountsFilter[]
  ): Promise<Array<{ pubkey: PublicKey; account: AccountInfo<Buffer> }>> {
    try {
      const accounts = await this.connection.getProgramAccounts(programId, {
        filters,
        commitment: 'confirmed',
      });
      return accounts.map(account => ({
        pubkey: account.pubkey,
        account: account.account,
      }));
    } catch (error) {
      console.error('Failed to get program accounts:', error);
      return [];
    }
  }
}

// Main Solana program interaction class
export class SolanaProgramManager {
  public tokenAccountManager: TokenAccountManager;
  public transactionManager: TransactionManager;
  public accountManager: AccountManager;

  constructor(private connection: Connection) {
    this.tokenAccountManager = new TokenAccountManager(connection);
    this.transactionManager = new TransactionManager(connection);
    this.accountManager = new AccountManager(connection);
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Update connection (useful for network switching)
   */
  updateConnection(newConnection: Connection): void {
    this.connection = newConnection;
    this.tokenAccountManager = new TokenAccountManager(newConnection);
    this.transactionManager = new TransactionManager(newConnection);
    this.accountManager = new AccountManager(newConnection);
  }
}

// Utility functions
export const createSolanaProgramManager = (connection: Connection): SolanaProgramManager => {
  return new SolanaProgramManager(connection);
};

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export const shortenAddress = (address: string, chars = 4): string => {
  if (!isValidSolanaAddress(address)) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};