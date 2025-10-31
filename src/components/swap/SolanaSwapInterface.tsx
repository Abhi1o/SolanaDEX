'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowsUpDownIcon, Cog6ToothIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SwapQuote, TransactionStatus, TransactionType, Transaction } from '@/types';
import { TokenSelector } from '@/components/tokens';
import { SwapConfirmationModal } from './SwapConfirmationModal';
import { SwapSettings, SwapSettingsData } from './SwapSettings';
import { useSwap } from '@/hooks/useSwap';
import { useWallet } from '@/hooks/useWallet';
import { useSolanaConnection } from '@/hooks/useSolanaConnection';
import { useTransactionStore } from '@/stores/transactionStore';
import { formatTokenAmount } from '@/utils/formatting';
import { getJupiterSwapService, SwapSettings as SwapServiceSettings } from '@/services/jupiterSwapService';
import { errorTracking } from '@/lib/errorTracking';
import { analytics } from '@/lib/analytics';

interface SolanaSwapInterfaceProps {
  onSwapInitiate?: (quote: SwapQuote) => void;
  className?: string;
}

export function SolanaSwapInterface({ onSwapInitiate, className = '' }: SolanaSwapInterfaceProps) {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    quote,
    loading,
    error,
    isSwapping,
    transactionStatus,
    transactionSignature,
    transactionError,
    showConfirmationModal,
    setTokenIn,
    setTokenOut,
    setAmountIn,
    setAmountOut,
    setQuote,
    setLoading,
    setError,
    swapTokens,
    setIsSwapping,
    setTransactionStatus,
    setTransactionSignature,
    setTransactionError,
    setShowConfirmationModal,
    resetTransaction
  } = useSwap();

  const { isConnected, tokenBalances, solanaWallet, publicKey, address } = useWallet();
  const { connection } = useSolanaConnection();
  const { addTransaction } = useTransactionStore();

  // Swap settings
  const [swapSettings, setSwapSettings] = useState<SwapSettingsData>({
    slippageTolerance: 0.5,
    deadline: 20,
    priorityFee: 0,
    maxAccounts: 64,
    autoOptimizeFees: true,
  });
  const [showSettings, setShowSettings] = useState(false);

  // Quote refresh interval
  const [quoteRefreshInterval, setQuoteRefreshInterval] = useState<NodeJS.Timeout | null>(null);



  // Get token balance for input token
  const inputTokenBalance = useMemo(() => {
    if (!tokenIn || !tokenBalances) return BigInt(0);
    return tokenBalances[tokenIn.mint] || BigInt(0);
  }, [tokenIn, tokenBalances]);

  // Check if input amount exceeds balance
  const insufficientBalance = useMemo(() => {
    if (!tokenIn || !amountIn) return false;
    try {
      const inputAmount = BigInt(Math.floor(parseFloat(amountIn) * Math.pow(10, tokenIn.decimals)));
      return inputAmount > inputTokenBalance;
    } catch {
      return false;
    }
  }, [tokenIn, amountIn, inputTokenBalance]);

  // Get Jupiter service instance
  const jupiterService = useMemo(() => {
    return connection ? getJupiterSwapService(connection) : null;
  }, [connection]);

  // Get swap quote with advanced settings
  const getSwapQuote = useCallback(async () => {
    if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0 || !jupiterService) {
      setQuote(null);
      setAmountOut('');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert input amount to token units
      const inputAmountBN = BigInt(Math.floor(parseFloat(amountIn) * Math.pow(10, tokenIn.decimals)));
      
      // Fetch optimized Jupiter quote
      const jupiterQuote = await jupiterService.getOptimizedQuote(
        tokenIn.mint,
        tokenOut.mint,
        inputAmountBN.toString(),
        {
          slippageTolerance: swapSettings.slippageTolerance,
          deadline: swapSettings.deadline,
          maxAccounts: swapSettings.maxAccounts,
          priorityFee: swapSettings.priorityFee,
          computeUnitPriceMicroLamports: swapSettings.autoOptimizeFees ? undefined : 1,
        }
      );

      if (!jupiterQuote) {
        throw new Error('Failed to get quote from Jupiter');
      }

      // Calculate price impact
      const priceImpact = parseFloat(jupiterQuote.priceImpactPct);
      
      // Calculate minimum received amount
      const outputAmount = BigInt(jupiterQuote.outAmount);
      const slippageMultiplier = 1 - (swapSettings.slippageTolerance / 100);
      const minimumReceived = BigInt(Math.floor(Number(outputAmount) * slippageMultiplier));

      // Estimate transaction fee with optimization
      const estimatedFee = solanaWallet?.publicKey 
        ? await jupiterService.estimateSwapFee(jupiterQuote, solanaWallet.publicKey, {
            slippageTolerance: swapSettings.slippageTolerance,
            deadline: swapSettings.deadline,
            priorityFee: swapSettings.priorityFee,
            computeUnitPriceMicroLamports: swapSettings.autoOptimizeFees ? undefined : 1,
          })
        : 5000;

      // Create swap quote
      const swapQuote: SwapQuote = {
        inputAmount: inputAmountBN,
        outputAmount,
        minimumReceived,
        priceImpact,
        exchangeRate: Number(outputAmount) / Number(inputAmountBN),
        route: [], // Will be populated from Jupiter route plan
        routeType: jupiterQuote.routePlan.length > 1 ? 'multi_hop' : 'direct',
        jupiterQuote,
        slippageTolerance: swapSettings.slippageTolerance,
        estimatedSolFee: BigInt(estimatedFee),
        estimatedComputeUnits: 200000,
        validUntil: Date.now() + 30000, // 30 seconds
        refreshInterval: 10000 // 10 seconds
      };

      setQuote(swapQuote);
      setAmountOut(formatTokenAmount(outputAmount, tokenOut.decimals, 6));

    } catch (error) {
      console.error('Error getting swap quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to get swap quote');
      setQuote(null);
      setAmountOut('');
    } finally {
      setLoading(false);
    }
  }, [tokenIn, tokenOut, amountIn, swapSettings, jupiterService, solanaWallet?.publicKey, setQuote, setAmountOut, setLoading, setError]);

  // Auto-refresh quotes
  useEffect(() => {
    if (quoteRefreshInterval) {
      clearInterval(quoteRefreshInterval);
    }

    if (tokenIn && tokenOut && amountIn && parseFloat(amountIn) > 0) {
      // Get initial quote
      getSwapQuote();
      
      // Set up auto-refresh
      const interval = setInterval(getSwapQuote, 10000); // Refresh every 10 seconds
      setQuoteRefreshInterval(interval);
    }

    return () => {
      if (quoteRefreshInterval) {
        clearInterval(quoteRefreshInterval);
      }
    };
  }, [tokenIn, tokenOut, amountIn, swapSettings, getSwapQuote]);

  // Handle input amount change
  const handleAmountInChange = (value: string) => {
    // Allow only numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) return;
    
    setAmountIn(value);
  };

  // Handle max button click
  const handleMaxClick = () => {
    if (!tokenIn || !inputTokenBalance) return;
    
    const maxAmount = formatTokenAmount(inputTokenBalance, tokenIn.decimals, tokenIn.decimals);
    setAmountIn(maxAmount);
  };

  // Handle swap tokens
  const handleSwapTokens = () => {
    swapTokens();
    setAmountIn('');
    setAmountOut('');
    setQuote(null);
  };

  // Handle settings change
  const handleSettingsChange = (newSettings: SwapSettingsData) => {
    setSwapSettings(newSettings);
  };

  // Handle swap initiation
  const handleSwapClick = () => {
    if (quote) {
      setShowConfirmationModal(true);
    }
  };

  // Execute the swap with advanced settings
  const executeSwap = useCallback(async () => {
    if (!quote || !jupiterService || !solanaWallet || !tokenBalances || !tokenIn || !tokenOut || !publicKey) {
      setTransactionError('Wallet not properly connected. Please reconnect your wallet.');
      return;
    }
    
    // Validate swap parameters
    const validation = jupiterService.validateSwapParameters(quote, publicKey, tokenBalances);
    if (!validation.isValid) {
      setTransactionError(validation.errors.join('. '));
      errorTracking.captureError(new Error('Swap validation failed: ' + validation.errors.join('. ')));
      return;
    }

    setIsSwapping(true);
    resetTransaction();

    // Track swap initiation
    analytics.trackSwapInitiated(tokenIn.mint, tokenOut.mint, amountIn);

    try {
      const serviceSettings: SwapServiceSettings = {
        slippageTolerance: swapSettings.slippageTolerance,
        deadline: swapSettings.deadline,
        priorityFee: swapSettings.priorityFee,
        computeUnitPriceMicroLamports: swapSettings.autoOptimizeFees ? undefined : 1,
        maxAccounts: swapSettings.maxAccounts,
      };

      const result = await jupiterService.executeSwap(
        quote,
        solanaWallet,
        serviceSettings,
        (status, signature, error) => {
          setTransactionStatus(status);
          if (signature) setTransactionSignature(signature);
          if (error) {
            setTransactionError(error);
            errorTracking.captureTransactionError(
              new Error(error) as any,
              signature,
              'swap'
            );
          }
        }
      );

      // Create transaction record
      if (result.signature) {
        const transaction: Transaction = {
          signature: result.signature,
          type: TransactionType.SWAP,
          status: result.status,
          timestamp: Date.now(),
          tokenIn,
          tokenOut,
          amountIn: quote.inputAmount,
          amountOut: quote.outputAmount,
          solFee: quote.estimatedSolFee,
          priceImpact: quote.priceImpact,
          slippageTolerance: quote.slippageTolerance,
          walletAddress: address || publicKey.toString(),
        };

        // Add to transaction store
        addTransaction(transaction);

        // Track transaction
        analytics.trackTransaction({
          type: 'swap',
          signature: result.signature,
          status: result.status === TransactionStatus.CONFIRMED ? 'confirmed' : 'failed',
          tokenIn: tokenIn.mint,
          tokenOut: tokenOut.mint,
          amountIn: amountIn,
          amountOut: amountOut,
        });
      }

      // Call the optional callback
      if (onSwapInitiate) {
        onSwapInitiate(quote);
      }

      // Reset form on successful swap
      if (result.status === TransactionStatus.CONFIRMED) {
        setAmountIn('');
        setAmountOut('');
        setQuote(null);
      }

    } catch (error) {
      const errorMessage = jupiterService.parseTransactionError(error);
      setTransactionError(errorMessage);
      setTransactionStatus(TransactionStatus.FAILED);
      
      // Track error
      errorTracking.captureTransactionError(
        error instanceof Error ? error : new Error(String(error)),
        undefined,
        'swap'
      );
    } finally {
      setIsSwapping(false);
    }
  }, [quote, jupiterService, solanaWallet, tokenBalances, tokenIn, tokenOut, publicKey, address, amountIn, amountOut, swapSettings, onSwapInitiate, addTransaction, setIsSwapping, resetTransaction, setTransactionStatus, setTransactionSignature, setTransactionError, setAmountIn, setAmountOut, setQuote]);

  // Handle confirmation modal close
  const handleConfirmationClose = () => {
    setShowConfirmationModal(false);
    if (transactionStatus === TransactionStatus.CONFIRMED || transactionStatus === TransactionStatus.FAILED) {
      resetTransaction();
    }
  };

  // Check if swap is ready
  const isSwapReady = useMemo(() => {
    return (
      isConnected &&
      tokenIn &&
      tokenOut &&
      amountIn &&
      parseFloat(amountIn) > 0 &&
      quote &&
      !insufficientBalance &&
      !loading
    );
  }, [isConnected, tokenIn, tokenOut, amountIn, quote, insufficientBalance, loading]);

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Swap</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 sm:p-2.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 touch-manipulation"
          aria-label="Swap settings"
        >
          <Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>



      {/* Input Token */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs sm:text-sm font-medium text-gray-700">From</label>
          {tokenIn && (
            <div className="text-xs sm:text-sm text-gray-500 truncate ml-2">
              Balance: {formatTokenAmount(inputTokenBalance, tokenIn.decimals)}
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={amountIn}
            onChange={(e) => handleAmountInChange(e.target.value)}
            placeholder="0.0"
            className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 pr-16 sm:pr-20 text-base sm:text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation ${
              insufficientBalance ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
          />
          <button
            onClick={handleMaxClick}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 rounded touch-manipulation active:bg-blue-50"
            aria-label="Use maximum balance"
          >
            MAX
          </button>
        </div>
        <div className="mt-2">
          <TokenSelector
            selectedToken={tokenIn}
            onTokenSelect={setTokenIn}
            excludeTokens={tokenOut ? [tokenOut.mint] : []}
            showBalance={true}
            placeholder="Select input token"
          />
        </div>
        {insufficientBalance && (
          <div className="mt-2 flex items-center text-xs sm:text-sm text-red-600">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1 flex-shrink-0" />
            Insufficient balance
          </div>
        )}
      </div>

      {/* Swap Button */}
      <div className="flex justify-center my-3 sm:my-4">
        <button
          onClick={handleSwapTokens}
          className="p-2 sm:p-2.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 touch-manipulation active:bg-gray-200"
          aria-label="Swap token positions"
        >
          <ArrowsUpDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Output Token */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs sm:text-sm font-medium text-gray-700">To</label>
          {quote && (
            <div className="text-xs sm:text-sm text-gray-500 truncate ml-2">
              {loading ? 'Fetching...' : `≈ ${amountOut}`}
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            value={amountOut}
            readOnly
            placeholder="0.0"
            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-lg border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
          />
          {loading && (
            <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        <div className="mt-2">
          <TokenSelector
            selectedToken={tokenOut}
            onTokenSelect={setTokenOut}
            excludeTokens={tokenIn ? [tokenIn.mint] : []}
            showBalance={true}
            placeholder="Select output token"
          />
        </div>
      </div>

      {/* Quote Details */}
      {quote && !loading && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Price Impact</span>
            <span className={`font-medium ${
              quote.priceImpact > 5 ? 'text-red-600' : quote.priceImpact > 1 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {quote.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Slippage Tolerance</span>
            <span className="font-medium text-gray-900">
              {swapSettings.slippageTolerance}%
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Minimum Received</span>
            <span className="font-medium text-gray-900 truncate ml-2 text-right">
              {formatTokenAmount(quote.minimumReceived, tokenOut?.decimals || 0)} {tokenOut?.symbol}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Route</span>
            <span className="font-medium text-gray-900">
              {quote.routeType === 'direct' ? 'Direct' : `${quote.jupiterQuote?.routePlan.length} hops`}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Network Fee</span>
            <span className="font-medium text-gray-900 text-right">
              ≈ {formatTokenAmount(quote.estimatedSolFee, 9)} SOL
              {swapSettings.priorityFee > 0 && (
                <span className="text-xs text-blue-600 ml-1 block sm:inline">
                  (+{swapSettings.priorityFee} priority)
                </span>
              )}
            </span>
          </div>
          {swapSettings.deadline !== 20 && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Deadline</span>
              <span className="font-medium text-gray-900">
                {swapSettings.deadline} minutes
              </span>
            </div>
          )}
        </div>
      )}

      {/* Price Impact Warning */}
      {quote && quote.priceImpact > 5 && (
        <div className="mb-3 sm:mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start text-red-800">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-xs sm:text-sm font-medium block">High Price Impact Warning</span>
              <p className="text-xs sm:text-sm text-red-700 mt-1">
                This swap has a price impact of {quote.priceImpact.toFixed(2)}%. You may receive significantly less than expected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-3 sm:mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start text-red-800">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-xs sm:text-sm font-medium block">Error</span>
              <p className="text-xs sm:text-sm text-red-700 mt-1 break-words">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwapClick}
        disabled={!isSwapReady || isSwapping}
        className={`w-full py-3 sm:py-3.5 px-4 rounded-lg font-medium text-white transition-colors touch-manipulation text-sm sm:text-base ${
          isSwapReady && !isSwapping
            ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500'
            : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        {!isConnected
          ? 'Connect Wallet'
          : !tokenIn || !tokenOut
          ? 'Select Tokens'
          : insufficientBalance
          ? 'Insufficient Balance'
          : loading
          ? 'Getting Quote...'
          : isSwapping
          ? 'Swapping...'
          : 'Swap'
        }
      </button>

      {/* Swap Confirmation Modal */}
      <SwapConfirmationModal
        isOpen={showConfirmationModal}
        onClose={handleConfirmationClose}
        onConfirm={executeSwap}
        quote={quote}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        amountIn={amountIn}
        amountOut={amountOut}
        transactionStatus={transactionStatus ?? undefined}
        transactionSignature={transactionSignature ?? undefined}
        error={transactionError ?? undefined}
      />

      {/* Swap Settings Modal */}
      <SwapSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={swapSettings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}