"use client";

import React, { useState, useMemo } from "react";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import dexConfig from "@/config/dex-config.json";
import { TokenPairIcon } from "@/components/tokens/TokenIcon";

export default function LiquidityPage() {
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");
  const [selectedTokenA, setSelectedTokenA] = useState("");
  const [selectedTokenB, setSelectedTokenB] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpTokenAmount, setLpTokenAmount] = useState("");

  // Get available pools for selected token pair
  const availablePools = useMemo(() => {
    if (!selectedTokenA || !selectedTokenB) return [];
    return dexConfig.pools.filter(
      (pool) =>
        (pool.tokenASymbol === selectedTokenA && pool.tokenBSymbol === selectedTokenB) ||
        (pool.tokenASymbol === selectedTokenB && pool.tokenBSymbol === selectedTokenA)
    );
  }, [selectedTokenA, selectedTokenB]);

  // Calculate price ratio
  const priceRatio = useMemo(() => {
    if (availablePools.length === 0) return null;
    const pool = availablePools[0];
    const ratioA = parseFloat(pool.liquidityA);
    const ratioB = parseFloat(pool.liquidityB);
    return ratioA / ratioB;
  }, [availablePools]);

  // Auto-calculate second token amount
  const handleAmountAChange = (value: string) => {
    setAmountA(value);
    if (priceRatio && value) {
      const calculated = (parseFloat(value) / priceRatio).toFixed(6);
      setAmountB(calculated);
    }
  };

  const handleAmountBChange = (value: string) => {
    setAmountB(value);
    if (priceRatio && value) {
      const calculated = (parseFloat(value) * priceRatio).toFixed(6);
      setAmountA(calculated);
    }
  };

  const handleSelectTokenPair = () => {
    if (availablePools.length > 0) {
      alert(`Selected pool: ${selectedTokenA}/${selectedTokenB} with ${availablePools.length} shard(s)`);
    }
  };

  const handleAddLiquidity = () => {
    if (!selectedTokenA || !selectedTokenB || !amountA || !amountB) {
      alert("Please fill in all fields");
      return;
    }
    alert(
      `Add Liquidity:\n${amountA} ${selectedTokenA} + ${amountB} ${selectedTokenB}\nPool: ${availablePools[0]?.poolAddress}\nNetwork: ${dexConfig.network}`
    );
  };

  const handleRemoveLiquidity = () => {
    if (!selectedTokenA || !selectedTokenB || !lpTokenAmount) {
      alert("Please fill in all fields");
      return;
    }
    alert(
      `Remove Liquidity:\n${lpTokenAmount} LP tokens\nFrom: ${selectedTokenA}/${selectedTokenB}\nPool: ${availablePools[0]?.poolAddress}`
    );
  };

  return (
    <div className="relative bg-black text-white min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            Liquidity Pools
          </h1>
          <p className="text-base sm:text-lg text-gray-400 font-light">
            Provide liquidity to earn trading fees from swaps
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Add/Remove Liquidity */}
          <div className="lg:col-span-2">
            {/* Tab Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab("add")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all ${
                  activeTab === "add"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "backdrop-blur-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                <PlusIcon className="w-5 h-5" />
                Add Liquidity
              </button>
              <button
                onClick={() => setActiveTab("remove")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all ${
                  activeTab === "remove"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "backdrop-blur-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                <MinusIcon className="w-5 h-5" />
                Remove Liquidity
              </button>
            </div>

            {/* Add Liquidity Form */}
            {activeTab === "add" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10"
              >
                <h2 className="text-2xl font-bold text-white mb-2">Add Liquidity</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Add tokens to a liquidity pool to earn trading fees
                </p>

                {/* First Token */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Token
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTokenA}
                      onChange={(e) => setSelectedTokenA(e.target.value)}
                      className="flex-1 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                      <option value="" className="bg-gray-900">
                        Select
                      </option>
                      {dexConfig.tokens.map((token) => (
                        <option key={token.symbol} value={token.symbol} className="bg-gray-900">
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={amountA}
                      onChange={(e) => handleAmountAChange(e.target.value)}
                      className="w-32 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Swap Icon */}
                <div className="flex justify-center my-4">
                  <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full">
                    <PlusIcon className="w-5 h-5 text-gray-300" />
                  </div>
                </div>

                {/* Second Token */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Second Token
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTokenB}
                      onChange={(e) => setSelectedTokenB(e.target.value)}
                      className="flex-1 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                      <option value="" className="bg-gray-900">
                        Select
                      </option>
                      {dexConfig.tokens.map((token) => (
                        <option key={token.symbol} value={token.symbol} className="bg-gray-900">
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={amountB}
                      onChange={(e) => handleAmountBChange(e.target.value)}
                      className="w-32 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Pool Info */}
                {availablePools.length > 0 && (
                  <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 rounded-2xl p-4 mb-6">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Available Pools:</span>
                        <span className="text-white font-medium">{availablePools.length} shard(s)</span>
                      </div>
                      {priceRatio && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Price Ratio:</span>
                          <span className="text-white font-medium">
                            1 {selectedTokenA} = {(1 / priceRatio).toFixed(6)} {selectedTokenB}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Network Fee:</span>
                        <span className="text-white font-medium">~0.00005 SOL</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                {availablePools.length > 0 ? (
                  <button
                    onClick={handleAddLiquidity}
                    disabled={!amountA || !amountB}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                  >
                    Add Liquidity
                  </button>
                ) : selectedTokenA && selectedTokenB ? (
                  <div className="text-center py-4 text-gray-400">
                    No pool available for this pair
                  </div>
                ) : (
                  <button
                    onClick={handleSelectTokenPair}
                    disabled={!selectedTokenA || !selectedTokenB}
                    className="w-full py-4 px-6 backdrop-blur-xl bg-white/10 border border-white/20 text-white font-semibold rounded-2xl transition-all hover:bg-white/20 disabled:opacity-50"
                  >
                    Select Token Pair
                  </button>
                )}
              </motion.div>
            )}

            {/* Remove Liquidity Form */}
            {activeTab === "remove" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10"
              >
                <h2 className="text-2xl font-bold text-white mb-2">Remove Liquidity</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Remove your liquidity from the pool
                </p>

                {/* Token Pair Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Token
                  </label>
                  <select
                    value={selectedTokenA}
                    onChange={(e) => setSelectedTokenA(e.target.value)}
                    className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  >
                    <option value="" className="bg-gray-900">
                      Select
                    </option>
                    {dexConfig.tokens.map((token) => (
                      <option key={token.symbol} value={token.symbol} className="bg-gray-900">
                        {token.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Second Token
                  </label>
                  <select
                    value={selectedTokenB}
                    onChange={(e) => setSelectedTokenB(e.target.value)}
                    className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  >
                    <option value="" className="bg-gray-900">
                      Select
                    </option>
                    {dexConfig.tokens.map((token) => (
                      <option key={token.symbol} value={token.symbol} className="bg-gray-900">
                        {token.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* LP Token Amount */}
                {availablePools.length > 0 && (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        LP Token Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0.0"
                        value={lpTokenAmount}
                        onChange={(e) => setLpTokenAmount(e.target.value)}
                        className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Your LP balance: 0.00 (Connect wallet to see balance)
                      </p>
                    </div>

                    {/* Pool Info */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 rounded-2xl p-4 mb-6">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pool:</span>
                          <span className="text-white font-medium">
                            {selectedTokenA}/{selectedTokenB}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Available Shards:</span>
                          <span className="text-white font-medium">{availablePools.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handleRemoveLiquidity}
                      disabled={!lpTokenAmount}
                      className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-pink-600 hover:from-pink-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                    >
                      Remove Liquidity
                    </button>
                  </>
                )}

                {!availablePools.length && selectedTokenA && selectedTokenB && (
                  <div className="text-center py-8 text-gray-400">
                    No pool available for this pair
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right Side - Your Positions */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 border border-white/10 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-4">Your Positions</h3>
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">No liquidity positions yet</div>
                <p className="text-sm text-gray-500">
                  Add liquidity to start earning fees
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Pools Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Available Pools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dexConfig.summary.pairs.map((pair) => {
              const pairPools = dexConfig.pools.filter(
                (p) => `${p.tokenASymbol}/${p.tokenBSymbol}` === pair.pair
              );
              const totalLiquidityA = pairPools.reduce(
                (sum, p) => sum + parseFloat(p.liquidityA),
                0
              );
              const totalLiquidityB = pairPools.reduce(
                (sum, p) => sum + parseFloat(p.liquidityB),
                0
              );

              return (
                <div
                  key={pair.pair}
                  className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => {
                    const [tokenA, tokenB] = pair.pair.split("/");
                    setSelectedTokenA(tokenA);
                    setSelectedTokenB(tokenB);
                    setActiveTab("add");
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TokenPairIcon 
                        tokenA={pair.pair.split("/")[0]} 
                        tokenB={pair.pair.split("/")[1]} 
                        size="md"
                      />
                      <h3 className="text-lg font-bold text-white">{pair.pair}</h3>
                    </div>
                    <span className="px-3 py-1 backdrop-blur-xl bg-blue-500/20 border border-blue-500/50 text-blue-300 text-xs font-semibold rounded-full">
                      {pair.shards} Shards
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Liquidity:</span>
                      <span className="text-white font-medium">
                        {totalLiquidityA.toLocaleString()} / {totalLiquidityB.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">APR:</span>
                      <span className="text-green-400 font-medium">~12.5%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
