'use client';

import React, { useState, useMemo } from 'react';
import { MotionFadeIn, MotionReveal, MotionStagger } from '@/components/animations';
import { AnimatedStat } from '@/components/ui/AnimatedStat';
import { motion } from 'framer-motion';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  BeakerIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import dexConfig from '@/config/dex-config.json';
import { TokenPairIcon } from '@/components/tokens/TokenIcon';
import { usePoolStore } from '@/stores/poolStore';
import { usePoolRefresh } from '@/hooks/usePoolRefresh';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';

interface PoolData {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  liquidityA: string; // Human-readable format (already divided by decimals)
  liquidityB: string; // Human-readable format (already divided by decimals)
  shardNumber: number;
  poolTokenMint: string;
  dataSource?: 'config' | 'blockchain' | 'hybrid';
  tokenADecimals?: number;
  tokenBDecimals?: number;
}

// Helper function to format token amounts with appropriate decimal places
function formatTokenAmount(amount: string, symbol: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';

  // Use different decimal places based on token type
  if (symbol === 'USDC' || symbol === 'USDT') {
    // Stablecoins: 2 decimal places
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (symbol === 'SOL') {
    // SOL: 4 decimal places
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else if (symbol === 'ETH') {
    // ETH: 6 decimal places
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  // Default: 2-6 decimal places
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function PoolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get pool data from store
  const poolStore = usePoolStore();
  
  // Setup automatic pool refresh
  const { 
    isRefreshing, 
    isStale, 
    manualRefresh, 
    error: refreshError,
    lastRefreshTime,
    consecutiveFailures,
    currentBackoffDelay
  } = usePoolRefresh({
    enabled: true,
    refreshInterval: 30000, // 30 seconds as per requirements
    onError: (error) => {
      console.error('Pool refresh error:', error);
    }
  });

  // Use blockchain data from store if available, otherwise fall back to config
  const poolsData = useMemo(() => {
    if (poolStore.pools.length > 0) {
      // Map store pools to the format expected by this page
      return poolStore.pools.map(pool => {
        // Convert base units to human-readable amounts using token decimals
        const liquidityA = (Number(pool.reserveA) / Math.pow(10, pool.tokenA.decimals)).toString();
        const liquidityB = (Number(pool.reserveB) / Math.pow(10, pool.tokenB.decimals)).toString();

        return {
          poolAddress: pool.id,
          tokenA: pool.tokenA.mint,
          tokenB: pool.tokenB.mint,
          tokenASymbol: pool.tokenA.symbol,
          tokenBSymbol: pool.tokenB.symbol,
          liquidityA, // Now in human-readable format
          liquidityB, // Now in human-readable format
          shardNumber: 0, // Default shard number
          poolTokenMint: pool.lpTokenMint.toBase58(),
          dataSource: pool.dataSource || 'config',
          tokenADecimals: pool.tokenA.decimals,
          tokenBDecimals: pool.tokenB.decimals
        };
      });
    }
    // Fallback to config data - add dataSource field and find token decimals
    return dexConfig.pools.map(pool => {
      const tokenA = dexConfig.tokens.find(t => t.mint === pool.tokenA);
      const tokenB = dexConfig.tokens.find(t => t.mint === pool.tokenB);

      return {
        ...pool,
        dataSource: 'config' as const,
        tokenADecimals: tokenA?.decimals || 9,
        tokenBDecimals: tokenB?.decimals || 9
      };
    });
  }, [poolStore.pools]);

  // Calculate total statistics
  const stats = useMemo(() => {
    const totalLiquidityUSD = poolsData.reduce((sum, pool) => {
      // Rough estimation: assuming 1 SOL = $100, 1 USDC = $1, 1 ETH = $2000
      const tokenAValue = pool.tokenASymbol === 'USDC' || pool.tokenASymbol === 'USDT' 
        ? parseFloat(pool.liquidityA)
        : pool.tokenASymbol === 'SOL'
        ? parseFloat(pool.liquidityA) * 100
        : parseFloat(pool.liquidityA) * 2000;
      return sum + tokenAValue;
    }, 0);

    return {
      totalLiquidity: totalLiquidityUSD,
      totalPools: poolsData.length,
      totalVolume: totalLiquidityUSD * 0.02, // Estimate 2% daily volume
    };
  }, [poolsData]);

  // Filter pools
  const filteredPools = useMemo(() => {
    let pools = poolsData;

    // Filter by search query
    if (searchQuery) {
      pools = pools.filter(pool => 
        pool.tokenASymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.tokenBSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.poolAddress.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected pair
    if (selectedPair !== 'all') {
      pools = pools.filter(pool => 
        `${pool.tokenASymbol}/${pool.tokenBSymbol}` === selectedPair
      );
    }

    return pools;
  }, [poolsData, searchQuery, selectedPair]);

  // Group pools by pair
  const poolsByPair = useMemo(() => {
    const grouped: { [key: string]: PoolData[] } = {};
    filteredPools.forEach(pool => {
      const pairKey = `${pool.tokenASymbol}/${pool.tokenBSymbol}`;
      if (!grouped[pairKey]) {
        grouped[pairKey] = [];
      }
      grouped[pairKey].push(pool);
    });
    return grouped;
  }, [filteredPools]);

  return (
    <div className="relative bg-black text-white min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <MotionFadeIn delay={0.1}>
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
              className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
            >
              Liquidity Pools
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
              className="text-base sm:text-lg text-gray-400 font-light"
            >
              Provide liquidity and earn rewards from trading fees
            </motion.p>
            
            {/* Connection Status and Refresh Controls */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
              className="flex flex-col items-center gap-4 mt-6"
            >
              {/* Connection Status Indicator */}
              <ConnectionStatus
                isConnected={!refreshError && poolStore.pools.length > 0}
                isConnecting={isRefreshing || poolStore.loading}
                error={refreshError?.message}
                consecutiveFailures={consecutiveFailures}
                onRetry={manualRefresh}
                variant="full"
                className="max-w-md w-full"
              />

              {/* Additional Controls */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {/* Manual Refresh Button */}
                <button
                  onClick={manualRefresh}
                  disabled={isRefreshing || poolStore.loading}
                  className="flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isRefreshing || poolStore.loading ? 'animate-spin' : ''}`} />
                  <span className="text-sm">
                    {isRefreshing || poolStore.loading ? 'Refreshing...' : 'Refresh Data'}
                  </span>
                </button>

                {/* Staleness Indicator */}
                {isStale && !isRefreshing && (
                  <div className="flex items-center gap-2 px-3 py-2 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-300">Data may be outdated</span>
                  </div>
                )}

                {/* Last Update Time */}
                {lastRefreshTime > 0 && !isStale && !refreshError && (
                  <div className="text-xs text-gray-400">
                    Updated {new Date(lastRefreshTime).toLocaleTimeString()}
                  </div>
                )}

                {/* Backoff Info (for debugging) */}
                {consecutiveFailures > 0 && currentBackoffDelay > 0 && (
                  <div className="text-xs text-gray-400">
                    Next retry in {Math.round(currentBackoffDelay / 1000)}s
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </MotionFadeIn>

        {/* Loading Indicator for Initial Fetch */}
        {poolStore.loading && poolStore.pools.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 mb-12">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading pool data from blockchain...</p>
          </div>
        )}

        {/* Statistics */}
        {(!poolStore.loading || poolStore.pools.length > 0) && (
          <MotionStagger staggerDelay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <AnimatedStat
              value={`$${(stats.totalLiquidity / 1000000).toFixed(2)}M`}
              label="Total Value Locked"
              gradient="from-blue-400 to-cyan-400"
              icon={<CurrencyDollarIcon className="w-full h-full text-white" />}
              delay={0.2}
            />
            <AnimatedStat
              value={stats.totalPools.toString()}
              label="Active Pools"
              gradient="from-purple-400 to-pink-400"
              icon={<BeakerIcon className="w-full h-full text-white" />}
              delay={0.3}
            />
            <AnimatedStat
              value={`$${(stats.totalVolume / 1000).toFixed(1)}K`}
              label="24h Volume"
              gradient="from-green-400 to-emerald-400"
              icon={<ChartBarIcon className="w-full h-full text-white" />}
              delay={0.4}
            />
          </div>
        </MotionStagger>
        )}

        {/* Search and Filters */}
        <MotionReveal delay={0.5} direction="up">
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pools by token or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center px-6 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 text-white transition-all"
              >
                <FunnelIcon className="w-5 h-5 mr-2" />
                Filters
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Filter by Trading Pair
                </label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                >
                  <option value="all" className="bg-gray-900">All Pairs</option>
                  {dexConfig.summary.pairs.map((pair) => (
                    <option key={pair.pair} value={pair.pair} className="bg-gray-900">
                      {pair.pair} ({pair.shards} shards)
                    </option>
                  ))}
                </select>
              </motion.div>
            )}
          </div>
        </MotionReveal>

        {/* Pools Grid */}
        <MotionReveal delay={0.6} direction="up">
          <div className="space-y-8 relative">
            {/* Refreshing Overlay */}
            {isRefreshing && poolStore.pools.length > 0 && (
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-2 backdrop-blur-sm bg-black/30 rounded-2xl border border-blue-500/30">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-xl">
                  <ArrowPathIcon className="w-4 h-4 text-blue-300 animate-spin" />
                  <span className="text-sm text-blue-300">Updating pool data...</span>
                </div>
              </div>
            )}
            {Object.entries(poolsByPair).map(([pairKey, pools], pairIndex) => {
              const totalLiquidityA = pools.reduce((sum, p) => sum + parseFloat(p.liquidityA), 0);
              const totalLiquidityB = pools.reduce((sum, p) => sum + parseFloat(p.liquidityB), 0);

              return (
                <motion.div
                  key={pairKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pairIndex * 0.1 }}
                  className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10"
                >
                  {/* Pair Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TokenPairIcon 
                          tokenA={pools[0].tokenASymbol} 
                          tokenB={pools[0].tokenBSymbol} 
                          size="lg"
                        />
                        <div>
                          <h3 className="text-2xl font-bold text-white">{pairKey}</h3>
                          <p className="text-sm text-gray-400">{pools.length} shard{pools.length > 1 ? 's' : ''} available</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Total Liquidity</div>
                      <div className="text-lg font-bold text-white">
                        {formatTokenAmount(totalLiquidityA.toString(), pools[0].tokenASymbol)} {pools[0].tokenASymbol}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatTokenAmount(totalLiquidityB.toString(), pools[0].tokenBSymbol)} {pools[0].tokenBSymbol}
                      </div>
                    </div>
                  </div>

                  {/* Shards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pools.map((pool) => {
                      // Calculate total liquidity for this pool
                      const poolLiquidity = parseFloat(pool.liquidityA) + parseFloat(pool.liquidityB);
                      
                      // Find the pool with highest liquidity in this pair
                      const maxLiquidity = Math.max(...pools.map(p => 
                        parseFloat(p.liquidityA) + parseFloat(p.liquidityB)
                      ));
                      const isHighestLiquidity = poolLiquidity === maxLiquidity && pools.length > 1;
                      
                      // Check if this is blockchain data
                      const isBlockchainData = pool.dataSource === 'blockchain' || pool.dataSource === 'hybrid';
                      
                      return (
                        <div
                          key={pool.poolAddress}
                          className={`backdrop-blur-xl rounded-2xl p-4 border transition-all cursor-pointer group relative ${
                            isHighestLiquidity
                              ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/50 hover:border-green-400/70'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Highest Liquidity Badge */}
                          {isHighestLiquidity && (
                            <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                              ⭐ Best
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 backdrop-blur-xl text-xs font-bold rounded-full ${
                                isHighestLiquidity
                                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                                  : 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                              }`}>
                                Shard #{pool.shardNumber}
                              </span>
                              {/* Data Source Indicator */}
                              {isBlockchainData && (
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live blockchain data" />
                              )}
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                              View →
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">{pool.tokenASymbol}:</span>
                              <span className={`font-medium ${isHighestLiquidity ? 'text-green-300' : 'text-white'}`}>
                                {formatTokenAmount(pool.liquidityA, pool.tokenASymbol)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{pool.tokenBSymbol}:</span>
                              <span className={`font-medium ${isHighestLiquidity ? 'text-green-300' : 'text-white'}`}>
                                {formatTokenAmount(pool.liquidityB, pool.tokenBSymbol)}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-white/10">
                              <div className="flex justify-between">
                                <span className="text-gray-400">APR:</span>
                                <span className="text-green-400 font-medium">~12.5%</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="text-xs text-gray-500 font-mono truncate" title={pool.poolAddress}>
                              {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)}
                            </div>
                            {/* Data Source Label */}
                            {isBlockchainData && (
                              <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                Live Data
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}

            {/* Empty State */}
            {filteredPools.length === 0 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-12 border border-white/10 text-center">
                <BeakerIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold text-white mb-2">No pools found</h3>
                <p className="text-gray-400">
                  {searchQuery || selectedPair !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No liquidity pools available yet'}
                </p>
              </div>
            )}
          </div>
        </MotionReveal>
      </div>
    </div>
  );
}
