"use client";

import React, { useState, useEffect } from "react";
import { useShardedDex } from "@/hooks/useShardedDex";
import { SwapQuote } from "@/lib/shardedDex";
import { TokenIcon } from "@/components/tokens/TokenIcon";
import { TokenBalances } from "./TokenBalances";
import { SwapSuccessModal } from "./SwapSuccessModal";
import { SwapErrorModal } from "./SwapErrorModal";
import { SlippageSettings } from "./SlippageSettings";
import { QuoteAgeProgress } from "./QuoteAgeProgress";

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
    getPoolsForPairRealTime,
    getTradingPairs,
  } = useShardedDex();

  const [inputToken, setInputToken] = useState("USDC");
  const [outputToken, setOutputToken] = useState("SOL");
  const [inputAmount, setInputAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    signature: string;
    inputAmount: number;
    outputAmount: number;
    inputToken: string;
    outputToken: string;
  } | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(5.0); // Default 5% - accounts for devnet pool changes
  const [highImpactConfirmed, setHighImpactConfirmed] = useState(false);
  const [quoteAge, setQuoteAge] = useState(0);
  const [lastQuoteTime, setLastQuoteTime] = useState<number>(0);
  const [realTimePools, setRealTimePools] = useState<any[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);

  // Fetch real-time pool data when token pair changes
  useEffect(() => {
    const fetchRealTimePools = async () => {
      setPoolsLoading(true);
      try {
        const pools = await getPoolsForPairRealTime(inputToken, outputToken);
        setRealTimePools(pools);
      } catch (error) {
        console.error('Failed to fetch real-time pool data:', error);
        // Fallback to static data
        setRealTimePools(getPoolsForPair(inputToken, outputToken));
      } finally {
        setPoolsLoading(false);
      }
    };

    fetchRealTimePools();

    // Auto-refresh pool data every 10 seconds
    const refreshInterval = setInterval(fetchRealTimePools, 10000);
    return () => clearInterval(refreshInterval);
  }, [inputToken, outputToken, getPoolsForPairRealTime, getPoolsForPair]);

  // Get quote when inputs change
  useEffect(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0) {
      setQuote(null);
      setHighImpactConfirmed(false);
      setQuoteAge(0);
      setLastQuoteTime(0);
      return;
    }

    const debounce = setTimeout(async () => {
      setQuoteLoading(true);
      const q = await getQuote(inputToken, outputToken, amount);
      setQuote(q);
      setQuoteLoading(false);
      setLastQuoteTime(Date.now());
      setQuoteAge(0);
      // Reset confirmation when quote changes
      setHighImpactConfirmed(false);
    }, 500);

    return () => clearTimeout(debounce);
  }, [inputToken, outputToken, inputAmount, getQuote]);

  // Auto-refresh quote every 10 seconds to keep reserves reasonably fresh
  // The executeSwap function will fetch fresh reserves anyway before submitting
  useEffect(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0 || !quote) {
      return;
    }

    const refreshInterval = setInterval(async () => {
      console.log('🔄 Auto-refreshing quote...');
      const q = await getQuote(inputToken, outputToken, amount);
      setQuote(q);
      setLastQuoteTime(Date.now());
      setQuoteAge(0);
      // Reset confirmation when quote changes
      setHighImpactConfirmed(false);
    }, 10000); // Refresh every 10 seconds (less aggressive)

    return () => clearInterval(refreshInterval);
  }, [inputToken, outputToken, inputAmount, quote, getQuote]);

  // Track quote age
  useEffect(() => {
    if (!lastQuoteTime) return;

    const ageInterval = setInterval(() => {
      const age = Date.now() - lastQuoteTime;
      setQuoteAge(age);
    }, 100); // Update age every 100ms

    return () => clearInterval(ageInterval);
  }, [lastQuoteTime]);

  const handleSwap = async () => {
    if (!quote) return;

    try {
      const signature = await executeSwap(quote, slippageTolerance);
      if (signature) {
        // Show premium success modal
        setSuccessData({
          signature,
          inputAmount: quote.inputAmount,
          outputAmount: quote.estimatedOutput,
          inputToken,
          outputToken,
        });
        setShowSuccessModal(true);

        // Reset form
        setInputAmount("");
        setQuote(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      console.error("Swap error:", err);
    }
  };

  const handleSwapDirection = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setQuote(null);
  };

  // Use real-time pools data instead of static config data
  const pools = realTimePools.length > 0 ? realTimePools : getPoolsForPair(inputToken, outputToken);
  const pairs = getTradingPairs();

  return (
    <>
      {/* Success Modal */}
      {successData && (
        <SwapSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          signature={successData.signature}
          inputAmount={successData.inputAmount}
          outputAmount={successData.outputAmount}
          inputToken={successData.inputToken}
          outputToken={successData.outputToken}
        />
      )}

      {/* Error Modal */}
      <SwapErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        error={errorMessage}
      />

      {/* Slippage Settings Modal */}
      <SlippageSettings
        isOpen={showSlippageSettings}
        onClose={() => setShowSlippageSettings(false)}
        currentSlippage={slippageTolerance}
        onSlippageChange={setSlippageTolerance}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side - Swap Card */}
        <div className="lg:col-span-3">
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-white/20 transition-all shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Swap Tokens</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSlippageSettings(true)}
                  className="p-2 backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full transition-all group"
                  title="Slippage Settings"
                >
                  <svg
                    className="w-5 h-5 text-gray-300 group-hover:text-white group-hover:rotate-90 transition-all duration-300"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                
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
              <>
                <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 rounded-2xl p-4 mb-4 space-y-2">
                  {/* Quote Freshness Indicator */}
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <QuoteAgeProgress quoteAge={quoteAge} maxAge={10000} />
                  </div>

                  {/* Routing Method Indicator */}
                  <div className="flex justify-between items-center text-sm mb-2 pb-2 border-b border-white/10">
                    <span className="text-gray-400">Routing Method:</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium px-3 py-1 rounded-full text-xs flex items-center gap-1 ${
                          quote.routingMethod === "backend"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        }`}
                      >
                        {quote.routingMethod === "backend" ? (
                          <>
                            <span>✓</span>
                            <span>Backend Routing</span>
                          </>
                        ) : (
                          <>
                            <span>⚠</span>
                            <span>Local Routing</span>
                          </>
                        )}
                      </span>
                      {/* Info Icon with Tooltip */}
                      <div className="relative group">
                        <svg
                          className="w-4 h-4 text-gray-400 cursor-help"
                          fill="none"
                          strokeWidth="2"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-label={
                            quote.routingMethod === "backend"
                              ? "Backend routing information"
                              : "Local routing information"
                          }
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {/* Tooltip */}
                        <div
                          className="absolute right-0 bottom-full mb-2 w-64 p-3 backdrop-blur-xl bg-gray-900/95 border border-white/20 rounded-xl text-xs text-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl"
                          role="tooltip"
                        >
                          {quote.routingMethod === "backend" ? (
                            <p>
                              Optimal shard selected by backend API based on
                              real-time analysis
                            </p>
                          ) : (
                            <p>
                              Shard selected by local calculation (backend
                              unavailable)
                            </p>
                          )}
                          {/* Tooltip arrow */}
                          <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900/95" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Backend Reason Display */}
                  {quote.routingMethod === "backend" && quote.backendReason && (
                    <div className="text-xs text-gray-400 italic mb-2 pb-2 border-b border-white/10">
                      {quote.backendReason}
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price Impact:</span>
                    <span
                      className={`font-medium ${
                        quote.priceImpact > 5
                          ? "text-red-400"
                          : quote.priceImpact > 1
                          ? "text-yellow-400"
                          : "text-green-400"
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

                {/* Price Impact Warning - Yellow for > 1% */}
                {quote.priceImpact > 1 && quote.priceImpact <= 5 && (
                  <div className="backdrop-blur-xl bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        strokeWidth="2"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <div>
                        <h4 className="text-yellow-300 font-semibold text-sm mb-1">
                          Moderate Price Impact
                        </h4>
                        <p className="text-yellow-200/80 text-xs">
                          This trade will move the market price by{" "}
                          {quote.priceImpact.toFixed(2)}%. You may receive less
                          favorable rates than expected.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Impact Warning - Red for > 5% */}
                {quote.priceImpact > 5 && (
                  <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/50 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-3 mb-3">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        strokeWidth="2"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <div>
                        <h4 className="text-red-300 font-semibold text-sm mb-1">
                          High Price Impact Warning
                        </h4>
                        <p className="text-red-200/80 text-xs mb-2">
                          This trade will significantly move the market price by{" "}
                          {quote.priceImpact.toFixed(2)}%. You will receive much
                          less favorable rates. Consider splitting this trade into
                          smaller amounts.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={highImpactConfirmed}
                        onChange={(e) => setHighImpactConfirmed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-red-400 bg-red-500/20 text-red-500 focus:ring-2 focus:ring-red-500/50 cursor-pointer"
                      />
                      <span className="text-red-200 text-xs font-medium group-hover:text-red-100 transition-colors">
                        I understand the risks and want to proceed with this high
                        impact trade
                      </span>
                    </label>
                  </div>
                )}
              </>
            )}

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={
                !quote ||
                loading ||
                quoteLoading ||
                (quote && quote.priceImpact > 5 && !highImpactConfirmed)
              }
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
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
              ) : quote && quote.priceImpact > 5 && !highImpactConfirmed ? (
                "Confirm High Impact Warning"
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                    Available Shards for {inputToken}/{outputToken}
                  </h3>
                  {poolsLoading && (
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {pools.map((pool: any) => (
                    <div
                      key={pool.poolAddress}
                      className={`text-xs p-3 rounded-2xl backdrop-blur-xl transition-all ${
                        quote && quote.route[0].poolAddress === pool.poolAddress
                          ? "bg-blue-500/20 border border-blue-500/50"
                          : "bg-white/5 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            Shard {pool.shardNumber}
                          </span>
                          {pool.dataSource && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                pool.dataSource === 'blockchain'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              }`}
                            >
                              {pool.dataSource === 'blockchain' ? '' : '⚠️ Cached'}
                            </span>
                          )}
                        </div>
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
              className={
                pools.length > 0 ? "border-t border-white/10 pt-6" : ""
              }
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
    </>
  );
}
