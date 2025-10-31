// Solana-specific error handling utilities

export enum SolanaErrorCode {
  // Wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_CONNECTION_REJECTED = 'WALLET_CONNECTION_REJECTED',
  WALLET_DISCONNECTED = 'WALLET_DISCONNECTED',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_SIGNATURE_REJECTED = 'WALLET_SIGNATURE_REJECTED',
  
  // Transaction errors
  INSUFFICIENT_SOL = 'INSUFFICIENT_SOL',
  INSUFFICIENT_TOKEN_BALANCE = 'INSUFFICIENT_TOKEN_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  BLOCKHASH_NOT_FOUND = 'BLOCKHASH_NOT_FOUND',
  
  // RPC errors
  RPC_CONNECTION_FAILED = 'RPC_CONNECTION_FAILED',
  RPC_TIMEOUT = 'RPC_TIMEOUT',
  RPC_RATE_LIMIT = 'RPC_RATE_LIMIT',
  
  // Swap errors
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  INVALID_SWAP_ROUTE = 'INVALID_SWAP_ROUTE',
  PRICE_IMPACT_TOO_HIGH = 'PRICE_IMPACT_TOO_HIGH',
  
  // Pool errors
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  INVALID_POOL_RATIO = 'INVALID_POOL_RATIO',
  
  // Token errors
  TOKEN_ACCOUNT_NOT_FOUND = 'TOKEN_ACCOUNT_NOT_FOUND',
  INVALID_TOKEN_MINT = 'INVALID_TOKEN_MINT',
  TOKEN_ACCOUNT_FROZEN = 'TOKEN_ACCOUNT_FROZEN',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export interface SolanaError {
  code: SolanaErrorCode;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
  originalError?: Error;
}

/**
 * Parse Solana error messages and return structured error information
 */
export function parseSolanaError(error: unknown): SolanaError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Wallet errors
  if (errorString.includes('user rejected') || errorString.includes('user denied')) {
    return {
      code: SolanaErrorCode.WALLET_SIGNATURE_REJECTED,
      message: errorMessage,
      userMessage: 'Transaction was rejected. Please approve the transaction in your wallet to continue.',
      recoverable: true,
      retryable: true,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  if (errorString.includes('wallet not connected') || errorString.includes('no wallet')) {
    return {
      code: SolanaErrorCode.WALLET_NOT_CONNECTED,
      message: errorMessage,
      userMessage: 'Please connect your wallet to continue.',
      recoverable: true,
      retryable: false,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Insufficient balance errors
  if (errorString.includes('insufficient funds') || errorString.includes('insufficient lamports')) {
    return {
      code: SolanaErrorCode.INSUFFICIENT_SOL,
      message: errorMessage,
      userMessage: 'Insufficient SOL balance to complete this transaction. Please add more SOL to your wallet.',
      recoverable: true,
      retryable: false,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  if (errorString.includes('insufficient token balance') || errorString.includes('insufficient balance')) {
    return {
      code: SolanaErrorCode.INSUFFICIENT_TOKEN_BALANCE,
      message: errorMessage,
      userMessage: 'Insufficient token balance for this transaction.',
      recoverable: true,
      retryable: false,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Transaction errors
  if (errorString.includes('blockhash not found') || errorString.includes('block height exceeded')) {
    return {
      code: SolanaErrorCode.BLOCKHASH_NOT_FOUND,
      message: errorMessage,
      userMessage: 'Transaction expired. Please try again.',
      recoverable: true,
      retryable: true,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return {
      code: SolanaErrorCode.TRANSACTION_TIMEOUT,
      message: errorMessage,
      userMessage: 'Transaction timed out. The network may be congested. Please try again.',
      recoverable: true,
      retryable: true,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // RPC errors
  if (errorString.includes('429') || errorString.includes('rate limit')) {
    return {
      code: SolanaErrorCode.RPC_RATE_LIMIT,
      message: errorMessage,
      userMessage: 'Too many requests. Please wait a moment and try again.',
      recoverable: true,
      retryable: true,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  if (errorString.includes('failed to fetch') || errorString.includes('network request failed')) {
    return {
      code: SolanaErrorCode.RPC_CONNECTION_FAILED,
      message: errorMessage,
      userMessage: 'Unable to connect to Solana network. Please check your internet connection.',
      recoverable: true,
      retryable: true,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Swap errors
  if (errorString.includes('slippage') || errorString.includes('slippage tolerance exceeded')) {
    return {
      code: SolanaErrorCode.SLIPPAGE_EXCEEDED,
      message: errorMessage,
      userMessage: 'Price changed too much. Try increasing slippage tolerance or refreshing the quote.',
      recoverable: true,
      retryable: true,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  if (errorString.includes('quote') && errorString.includes('expired')) {
    return {
      code: SolanaErrorCode.QUOTE_EXPIRED,
      message: errorMessage,
      userMessage: 'Price quote expired. Please refresh and try again.',
      recoverable: true,
      retryable: true,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Token account errors
  if (errorString.includes('token account not found') || errorString.includes('account not found')) {
    return {
      code: SolanaErrorCode.TOKEN_ACCOUNT_NOT_FOUND,
      message: errorMessage,
      userMessage: 'Token account not found. The account may need to be created first.',
      recoverable: true,
      retryable: false,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Default unknown error
  return {
    code: SolanaErrorCode.UNKNOWN_ERROR,
    message: errorMessage,
    userMessage: 'An unexpected error occurred. Please try again.',
    recoverable: true,
    retryable: true,
    originalError: error instanceof Error ? error : undefined,
  };
}

/**
 * Get user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const solanaError = parseSolanaError(error);
  return solanaError.userMessage;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const solanaError = parseSolanaError(error);
  return solanaError.retryable;
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const solanaError = parseSolanaError(error);
  return solanaError.recoverable;
}
