'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, ArrowsUpDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Pool } from '@/types';
import { usePools } from '@/hooks/usePools';
import { TokenLogo } from '@/components/tokens/TokenLogo';
import { formatTokenAmount, formatNumber, formatCurrency } from '@/utils/formatting';

interface PoolListProps {
  onPoolSelect?: (pool: Pool) => void;
  showCreateButton?: boolean;
  onCreatePool?: () => void;
}

type SortField = 'liquidity' | 'volume24h' | 'fees24h' | 'created';
type SortDirection = 'asc' | 'desc';

interface FilterOptions {
  minLiquidity: string;
  tokenSymbol: string;
  ammType: string;
}

export function PoolList({ onPoolSelect, showCreateButton = true, onCreatePool }: PoolListProps) {
  const { pools, loading, error } = usePools();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('liquidity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minLiquidity: '',
    tokenSymbol: '',
    ammType: '',
  });

  // Filter and sort pools
  const filteredAndSortedPools = useMemo(() => {
    let filtered = pools.filter(pool => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        pool.tokenA.symbol.toLowerCase().includes(searchLower) ||
        pool.tokenB.symbol.toLowerCase().includes(searchLower) ||
        pool.tokenA.name.toLowerCase().includes(searchLower) ||
        pool.tokenB.name.toLowerCase().includes(searchLower) ||
        pool.id.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Minimum liquidity filter
      if (filters.minLiquidity) {
        const minLiq = parseFloat(filters.minLiquidity);
        if (!isNaN(minLiq)) {
          const poolLiquidity = Number(pool.totalLiquidity) / 1e9; // Convert to SOL equivalent
          if (poolLiquidity < minLiq) return false;
        }
      }

      // Token symbol filter
      if (filters.tokenSymbol) {
        const symbolLower = filters.tokenSymbol.toLowerCase();
        const hasToken = pool.tokenA.symbol.toLowerCase().includes(symbolLower) ||
                        pool.tokenB.symbol.toLowerCase().includes(symbolLower);
        if (!hasToken) return false;
      }

      // AMM type filter
      if (filters.ammType && filters.ammType !== 'all') {
        if (pool.ammType !== filters.ammType) return false;
      }

      return true;
    });

    // Sort pools
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'liquidity':
          aValue = Number(a.totalLiquidity);
          bValue = Number(b.totalLiquidity);
          break;
        case 'volume24h':
          aValue = Number(a.volume24h);
          bValue = Number(b.volume24h);
          break;
        case 'fees24h':
          aValue = Number(a.fees24h);
          bValue = Number(b.fees24h);
          break;
        case 'created':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [pools, searchQuery, sortField, sortDirection, filters]);

  // Handle sort change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Calculate pool statistics
  const poolStats = useMemo(() => {
    const totalPools = pools.length;
    const totalLiquidity = pools.reduce((sum, pool) => sum + Number(pool.totalLiquidity), 0);
    const totalVolume24h = pools.reduce((sum, pool) => sum + Number(pool.volume24h), 0);
    const activePools = pools.filter(pool => pool.isActive).length;

    return {
      totalPools,
      totalLiquidity,
      totalVolume24h,
      activePools,
    };
  }, [pools]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Liquidity Pools</h2>
          {showCreateButton && (
            <button
              onClick={onCreatePool}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Pool
            </button>
          )}
        </div>
        
        {/* Loading skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-32"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Failed to load pools</div>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Liquidity Pools</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {poolStats.totalPools} pools • {poolStats.activePools} active
          </p>
        </div>
        {showCreateButton && (
          <button
            onClick={onCreatePool}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation text-sm sm:text-base whitespace-nowrap"
          >
            Create Pool
          </button>
        )}
      </div>

      {/* Pool Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Total Liquidity</div>
          <div className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
            {formatCurrency(poolStats.totalLiquidity / 1e9)} SOL
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-500">24h Volume</div>
          <div className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
            {formatCurrency(poolStats.totalVolume24h / 1e9)} SOL
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Active Pools</div>
          <div className="text-xl sm:text-2xl font-semibold text-gray-900">
            {poolStats.activePools}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation text-sm sm:text-base whitespace-nowrap"
          >
            <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Min Liquidity (SOL)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={filters.minLiquidity}
                  onChange={(e) => setFilters(prev => ({ ...prev, minLiquidity: e.target.value }))}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Token Symbol
                </label>
                <input
                  type="text"
                  placeholder="SOL, USDC, etc."
                  value={filters.tokenSymbol}
                  onChange={(e) => setFilters(prev => ({ ...prev, tokenSymbol: e.target.value }))}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  AMM Type
                </label>
                <select
                  value={filters.ammType}
                  onChange={(e) => setFilters(prev => ({ ...prev, ammType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                >
                  <option value="">All Types</option>
                  <option value="constant_product">Constant Product</option>
                  <option value="stable">Stable</option>
                  <option value="concentrated">Concentrated</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sort Options */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-700 py-2">Sort by:</span>
        {[
          { field: 'liquidity' as SortField, label: 'Liquidity' },
          { field: 'volume24h' as SortField, label: '24h Volume' },
          { field: 'fees24h' as SortField, label: '24h Fees' },
          { field: 'created' as SortField, label: 'Created' },
        ].map(({ field, label }) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium touch-manipulation ${
              sortField === field
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            {label}
            {sortField === field && (
              <ArrowsUpDownIcon className={`w-3 h-3 sm:w-4 sm:h-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
            )}
          </button>
        ))}
      </div>

      {/* Pool List */}
      <div className="space-y-3">
        {filteredAndSortedPools.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">No pools found</div>
            <p className="text-sm text-gray-400">
              {searchQuery || Object.values(filters).some(f => f) 
                ? 'Try adjusting your search or filters'
                : 'No liquidity pools available yet'
              }
            </p>
          </div>
        ) : (
          filteredAndSortedPools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              onClick={() => onPoolSelect?.(pool)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface PoolCardProps {
  pool: Pool;
  onClick?: () => void;
}

const PoolCard = React.memo(({ pool, onClick }: PoolCardProps) => {
  const liquidityValue = useMemo(() => Number(pool.totalLiquidity) / 1e9, [pool.totalLiquidity]);
  const volume24h = useMemo(() => Number(pool.volume24h) / 1e9, [pool.volume24h]);
  const fees24h = useMemo(() => Number(pool.fees24h) / 1e9, [pool.fees24h]);

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 transition-colors ${
        onClick ? 'hover:bg-gray-50 active:bg-gray-100 cursor-pointer touch-manipulation' : ''
      }`}
      onClick={onClick}
    >
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              <TokenLogo token={pool.tokenA} size="sm" />
              <TokenLogo token={pool.tokenB} size="sm" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                {pool.tokenA.symbol}/{pool.tokenB.symbol}
              </div>
              <div className="text-xs text-gray-500">
                {pool.ammType.replace('_', ' ')} • {pool.feeRate}% fee
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${pool.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            {onClick && <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-gray-500">Liquidity</div>
            <div className="font-medium text-gray-900 truncate">
              {formatCurrency(liquidityValue)} SOL
            </div>
          </div>
          <div>
            <div className="text-gray-500">24h Volume</div>
            <div className="font-medium text-gray-900 truncate">
              {formatCurrency(volume24h)} SOL
            </div>
          </div>
          <div>
            <div className="text-gray-500">24h Fees</div>
            <div className="font-medium text-gray-900 truncate">
              {formatCurrency(fees24h)} SOL
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              <TokenLogo token={pool.tokenA} size="md" />
              <TokenLogo token={pool.tokenB} size="md" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                {pool.tokenA.symbol}/{pool.tokenB.symbol}
              </div>
              <div className="text-sm text-gray-500">
                {pool.ammType.replace('_', ' ')} • {pool.feeRate}% fee
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(liquidityValue)} SOL
            </div>
            <div className="text-xs text-gray-500">Liquidity</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(volume24h)} SOL
            </div>
            <div className="text-xs text-gray-500">24h Volume</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(fees24h)} SOL
            </div>
            <div className="text-xs text-gray-500">24h Fees</div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${pool.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            {onClick && <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
      </div>
    </div>
  );
});

PoolCard.displayName = 'PoolCard';