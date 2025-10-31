'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  MinusIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { Pool } from '@/types';
import { PoolList } from '@/components/pools/PoolList';
import { AddLiquidity } from '@/components/pools/AddLiquidity';
import { RemoveLiquidity } from '@/components/pools/RemoveLiquidity';
import { PoolDetails } from '@/components/pools/PoolDetails';
import { usePools } from '@/hooks/usePools';
import { useLiquidityPositions, useLiquidityPortfolio } from '@/hooks/useLiquidityPositions';
import { useWallet } from '@/hooks/useWallet';
import { formatTokenAmount, formatNumber, formatCurrency } from '@/utils/formatting';
import { TokenLogo } from '@/components/tokens/TokenLogo';

export default function LiquidityPage() {
  const { positions, loading: positionsLoading, totalValue, totalValueUsd, refreshPositions } = useLiquidityPositions();
  const { stats } = useLiquidityPortfolio();
  const { isConnected } = useWallet();

  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [showRemoveLiquidity, setShowRemoveLiquidity] = useState(false);
  const [showPoolDetails, setShowPoolDetails] = useState(false);

  // Handle pool selection
  const handlePoolSelect = (pool: Pool) => {
    setSelectedPool(pool);
    setShowPoolDetails(true);
  };

  // Handle add liquidity
  const handleAddLiquidity = (pool: Pool) => {
    setSelectedPool(pool);
    setShowAddLiquidity(true);
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = (pool: Pool) => {
    setSelectedPool(pool);
    setShowRemoveLiquidity(true);
  };

  // Handle liquidity added callback
  const handleLiquidityAdded = async (poolId: string, txSignature: string) => {
    console.log('Liquidity added:', { poolId, txSignature });
    // Refresh positions after a short delay to allow blockchain state to update
    setTimeout(() => {
      refreshPositions();
    }, 2000);
  };

  // Handle liquidity removed callback
  const handleLiquidityRemoved = async (poolId: string, txSignature: string) => {
    console.log('Liquidity removed:', { poolId, txSignature });
    // Refresh positions after a short delay to allow blockchain state to update
    setTimeout(() => {
      refreshPositions();
    }, 2000);
  };

  // Get user's position for selected pool
  const userPosition = useMemo(() => {
    if (!selectedPool) return null;
    return positions.find(pos => pos.pool.id === selectedPool.id) || null;
  }, [selectedPool, positions]);

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Liquidity</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Provide liquidity to pools and earn trading fees
          </p>
        </div>

        {/* Portfolio Summary */}
        {isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">
                    {formatCurrency(Number(totalValue) / 1e9)} SOL
                  </p>
                  {totalValueUsd && (
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ ${formatNumber(totalValueUsd, 2)}
                    </p>
                  )}
                </div>
                <CurrencyDollarIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Positions</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">
                    {positions.length}
                  </p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">24h Fees Earned</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">
                    {formatCurrency(Number(stats.totalFeesEarned24h) / 1e9)} SOL
                  </p>
                </div>
                <ArrowTrendingUpIcon className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg APR</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">
                    {formatNumber(stats.averageApr, 2)}%
                  </p>
                </div>
                <ArrowTrendingUpIcon className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        {/* User Positions Section */}
        {isConnected && positions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Your Positions</h2>
            </div>

            <div className="space-y-3">
              {positions.slice(0, 3).map((position) => (
                <div
                  key={position.pool.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handlePoolSelect(position.pool)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-2">
                      <TokenLogo token={position.pool.tokenA} size="sm" />
                      <TokenLogo token={position.pool.tokenB} size="sm" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {position.pool.tokenA.symbol}/{position.pool.tokenB.symbol}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatNumber(position.shareOfPool, 4)}% share
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(Number(position.value) / 1e9)} SOL
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTokenAmount(position.lpTokenBalance, 6)} LP
                    </div>
                  </div>
                </div>
              ))}
              {positions.length > 3 && (
                <Link
                  href="#all-pools"
                  className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-2 text-center block"
                >
                  View all {positions.length} positions →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Pools List */}
        <PoolList
          onPoolSelect={handlePoolSelect}
          onCreatePool={() => {
            // Navigate to pools page or open pool creator
            window.location.href = '/pools';
          }}
          showCreateButton={false}
        />

        {/* Modals */}
        {selectedPool && (
          <>
            <AddLiquidity
              pool={selectedPool}
              isOpen={showAddLiquidity}
              onClose={() => {
                setShowAddLiquidity(false);
                setSelectedPool(null);
              }}
              onLiquidityAdded={handleLiquidityAdded}
            />

            <RemoveLiquidity
              pool={selectedPool}
              isOpen={showRemoveLiquidity}
              onClose={() => {
                setShowRemoveLiquidity(false);
                setSelectedPool(null);
              }}
              onLiquidityRemoved={handleLiquidityRemoved}
            />

            <PoolDetails
              pool={selectedPool}
              isOpen={showPoolDetails}
              onClose={() => {
                setShowPoolDetails(false);
                setSelectedPool(null);
              }}
              onAddLiquidity={handleAddLiquidity}
              onRemoveLiquidity={handleRemoveLiquidity}
            />
          </>
        )}
      </div>
    </div>
  );
}

