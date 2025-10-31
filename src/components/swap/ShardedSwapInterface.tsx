'use client';

import React, { useState, useEffect } from 'react';
import { useShardedDex } from '@/hooks/useShardedDex';
import { SwapQuote } from '@/lib/shardedDex';

/**
 * Example component showing how to use the Sharded DEX
 * Replace your existing swap interface with this or integrate the logic
 */
export function ShardedSwapInterface() {
  const {
    tokens,
    loading,
    error,
    getQuote,
    executeSwap,
    getPoolsForPair,
    getTradingPairs
  } = useShardedDex();

  const [inputToken, setInputToken] = useState('USDC');
  const [outputToken, setOutputToken] = useState('SOL');
  const [inputAmount, setInputAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Get quote when inputs change
  useEffect(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0) {
      setQuote(null);
      return;
    }

    const debounce = setTimeout(async () => {
      setQuoteLoading(true);
      const q = await getQuote(inputToken, outputToken, amount);
      setQuote(q);
      setQuoteLoading(false);
    }, 500);

    return () => clearTimeout(debounce);
  }, [inputToken, outputToken, inputAmount, getQuote]);

  const handleSwap = async () => {
    if (!quote) return;

    const signature = await executeSwap(quote, 0.5);
    if (signature) {
      alert(`Swap successful! Signature: ${signature}`);
      setInputAmount('');
      setQuote(null);
    }
  };

  const handleSwapDirection = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setQuote(null);
  };

  const pools = getPoolsForPair(inputToken, outputToken);
  const pairs = getTradingPairs();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Sharded DEX Swap</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Input Token */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          From
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleSwapDirection}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* Output Token */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          To
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={quote ? quote.estimatedOutput.toFixed(6) : '0.00'}
            readOnly
            placeholder="0.00"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
          <select
            value={outputToken}
            onChange={(e) => setOutputToken(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quote Information */}
      {quoteLoading && (
        <div className="text-center text-gray-500 mb-4">
          Getting quote...
        </div>
      )}

      {quote && !quoteLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Price Impact:</span>
            <span className={`font-medium ${quote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {quote.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Fee (0.3%):</span>
            <span className="font-medium text-gray-900">
              {quote.totalFee.toFixed(6)} {inputToken}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Using Shard:</span>
            <span className="font-medium text-gray-900">
              #{quote.route[0].shardNumber}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Rate:</span>
            <span className="font-medium text-gray-900">
              1 {inputToken} = {(quote.estimatedOutput / quote.inputAmount).toFixed(6)} {outputToken}
            </span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!quote || loading || quoteLoading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? 'Swapping...' : quote ? 'Swap' : 'Enter Amount'}
      </button>

      {/* Pool Shards Info */}
      {pools.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Available Shards for {inputToken}/{outputToken}
          </h3>
          <div className="space-y-2">
            {pools.map((pool) => (
              <div
                key={pool.poolAddress}
                className={`text-xs p-2 rounded ${
                  quote && quote.route[0].poolAddress === pool.poolAddress
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">Shard {pool.shardNumber}</span>
                  {quote && quote.route[0].poolAddress === pool.poolAddress && (
                    <span className="text-blue-600 font-semibold">✓ Selected</span>
                  )}
                </div>
                <div className="text-gray-600 mt-1">
                  Liquidity: {parseFloat(pool.liquidityA).toLocaleString()} {pool.tokenASymbol} / {parseFloat(pool.liquidityB).toLocaleString()} {pool.tokenBSymbol}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trading Pairs */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Available Trading Pairs
        </h3>
        <div className="flex flex-wrap gap-2">
          {pairs.map((pair) => (
            <span
              key={pair.pair}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
            >
              {pair.pair} ({pair.shards} shards)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
