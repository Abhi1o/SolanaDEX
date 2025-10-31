"use client";

import React, { useState, useEffect } from "react";
import { useShardedDex } from "@/hooks/useShardedDex";
import { SwapQuote } from "@/lib/shardedDex";
import { TokenIcon } from "@/components/tokens/TokenIcon";
import { TokenBalances } from "./TokenBalances";

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
    getTradingPairs,
  } = useShardedDex();

  const [inputToken, setInputToken] = useState("USDC");
  const [outputToken, setOutputToken] = useState("SOL");
  const [inputAmount, setInputAmount] = useState("");
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

    try {
      const signature = await executeSwap(quote, 0.5);
      if (signature) {
        alert(
          `✅ Swap successful!\n\nTransaction: ${signature}\n\nView on Solana Explorer:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`
        );
        setInputAmount("");
        setQuote(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`❌ Swap failed:\n\n${errorMessage}`);
      console.error("Swap error:", err);
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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Side - Swap Card */}
      <div className="lg:col-span-3">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-white/20 transition-all shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Swap Tokens</h2>
            <span className="px-3 py-1 backdrop-blur-xl bg-green-500/20 border border-green-500/50 text-green-300 text-xs font-semibold rounded-full">
              🟢 LIVE ON DEVNET
            </span>
          </div>

          <div className="backdrop-blur-xl bg-blue-500/20 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-2xl mb-4 text-sm">
            <div className="font-semibold mb-1">
              ⚡ Real Swap Transactions Enabled
            </div>
            <div className="text-blue-300">
              Connect your wallet to swap tokens on Solana Devnet using sharded
              liquidity pools.
            </div>
          </div>

          {error && (
            <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-2xl mb-4">
              {error}
            </div>
          )}

          {/* Input Token */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              From
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
              <div className="flex items-center gap-2 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
                <TokenIcon symbol={inputToken} size="sm" />
                <select
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  {tokens.map((token) => (
                    <option
                      key={token.symbol}
                      value={token.symbol}
                      className="bg-gray-900"
                    >
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={handleSwapDirection}
              className="p-3 backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full transition-all hover:scale-110"
            >
              <svg
                className="w-5 h-5 text-gray-300"
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              To
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quote ? quote.estimatedOutput.toFixed(6) : "0.00"}
                readOnly
                placeholder="0.00"
                className="flex-1 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500"
              />
              <div className="flex items-center gap-2 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
                <TokenIcon symbol={outputToken} size="sm" />
                <select
                  value={outputToken}
                  onChange={(e) => setOutputToken(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  {tokens.map((token) => (
                    <option
                      key={token.symbol}
                      value={token.symbol}
                      className="bg-gray-900"
                    >
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quote Information */}
          {quoteLoading && (
            <div className="text-center text-gray-400 mb-4 py-4">
              <div className="inline-block w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2" />
              <div>Getting quote...</div>
            </div>
          )}

          {quote && !quoteLoading && (
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 rounded-2xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price Impact:</span>
                <span
                  className={`font-medium ${
                    quote.priceImpact > 5 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fee (0.3%):</span>
                <span className="font-medium text-white">
                  {quote.totalFee.toFixed(6)} {inputToken}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Using Shard:</span>
                <span className="font-medium text-white">
                  #{quote.route[0].shardNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rate:</span>
                <span className="font-medium text-white">
                  1 {inputToken} ={" "}
                  {(quote.estimatedOutput / quote.inputAmount).toFixed(6)}{" "}
                  {outputToken}
                </span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!quote || loading || quoteLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Swapping...
              </span>
            ) : quote ? (
              "Swap"
            ) : (
              "Enter Amount"
            )}
          </button>
        </div>
      </div>

      {/* Right Side - Info Card */}
      <div className="lg:col-span-2">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 border border-white/10 shadow-2xl sticky top-24">
          {/* Token Balances */}
          <div className="mb-6">
            <TokenBalances tokens={tokens} />
          </div>

          {/* Available Shards */}
          {pools.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Available Shards for {inputToken}/{outputToken}
              </h3>
              <div className="space-y-2">
                {pools.map((pool) => (
                  <div
                    key={pool.poolAddress}
                    className={`text-xs p-3 rounded-2xl backdrop-blur-xl transition-all ${
                      quote && quote.route[0].poolAddress === pool.poolAddress
                        ? "bg-blue-500/20 border border-blue-500/50"
                        : "bg-white/5 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-white">
                        Shard {pool.shardNumber}
                      </span>
                      {quote &&
                        quote.route[0].poolAddress === pool.poolAddress && (
                          <span className="text-blue-400 font-semibold">
                            ✓ Selected
                          </span>
                        )}
                    </div>
                    <div className="text-gray-400 space-y-1">
                      <div>Liquidity:</div>
                      <div className="text-white font-medium">
                        {parseFloat(pool.liquidityA).toLocaleString()}{" "}
                        {pool.tokenASymbol}
                      </div>
                      <div className="text-white font-medium">
                        {parseFloat(pool.liquidityB).toLocaleString()}{" "}
                        {pool.tokenBSymbol}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trading Pairs */}
          <div
            className={pools.length > 0 ? "border-t border-white/10 pt-6" : ""}
          >
            <h3 className="text-lg font-bold text-white mb-4">
              Available Trading Pairs
            </h3>
            <div className="flex flex-wrap gap-2">
              {pairs.map((pair) => (
                <span
                  key={pair.pair}
                  className="px-3 py-2 backdrop-blur-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium rounded-full hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  {pair.pair}
                  <span className="ml-1 text-blue-400">({pair.shards})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
