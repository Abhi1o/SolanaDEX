'use client';

import { useState, useMemo } from 'react';
import { useTransactionStore } from '@/stores/transactionStore';
import { useTransactionTracking } from '@/hooks/useTransactionTracking';
import { TransactionType, TransactionStatus } from '@/types';
// Lightweight relative time formatter to avoid external dependency
const formatDistanceToNow = (timestamp: number): string => {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diffMs = Date.now() - timestamp;
  const seconds = Math.round(diffMs / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (Math.abs(seconds) < 60) return rtf.format(-seconds, 'second');
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-days, 'day');
};

const EXPLORER_URLS = {
  mainnet: 'https://solscan.io',
  devnet: 'https://solscan.io',
  testnet: 'https://solscan.io',
};

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.SWAP]: 'Swap',
  [TransactionType.ADD_LIQUIDITY]: 'Add Liquidity',
  [TransactionType.REMOVE_LIQUIDITY]: 'Remove Liquidity',
  [TransactionType.CREATE_POOL]: 'Create Pool',
  [TransactionType.SPL_TRANSFER]: 'Token Transfer',
  [TransactionType.SOL_TRANSFER]: 'SOL Transfer',
};

const STATUS_COLORS: Record<TransactionStatus, string> = {
  [TransactionStatus.PENDING]: 'backdrop-blur-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300',
  [TransactionStatus.CONFIRMED]: 'backdrop-blur-xl bg-green-500/20 border border-green-500/50 text-green-300',
  [TransactionStatus.FAILED]: 'backdrop-blur-xl bg-red-500/20 border border-red-500/50 text-red-300',
  [TransactionStatus.CANCELLED]: 'backdrop-blur-xl bg-gray-500/20 border border-gray-500/50 text-gray-300',
  [TransactionStatus.TIMEOUT]: 'backdrop-blur-xl bg-orange-500/20 border border-orange-500/50 text-orange-300',
};

export function TransactionList() {
  const {
    filters,
    setFilters,
    clearFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    getPaginatedTransactions,
    getFilteredTransactions,
    setSelectedTransaction,
  } = useTransactionStore();

  useTransactionTracking();

  const [searchInput, setSearchInput] = useState(filters.searchQuery || '');

  const paginatedTransactions = getPaginatedTransactions();
  const filteredTransactions = getFilteredTransactions();
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  const handleSearch = (query: string) => {
    setSearchInput(query);
    setFilters({ searchQuery: query || undefined });
  };

  const handleTypeFilter = (type: TransactionType | 'all') => {
    setFilters({ type: type === 'all' ? undefined : type });
  };

  const handleStatusFilter = (status: TransactionStatus | 'all') => {
    setFilters({ status: status === 'all' ? undefined : status });
  };

  const getExplorerUrl = (signature: string, cluster: string = 'devnet') => {
    const baseUrl = EXPLORER_URLS[cluster as keyof typeof EXPLORER_URLS] || EXPLORER_URLS.devnet;
    return `${baseUrl}/tx/${signature}?cluster=${cluster}`;
  };

  const formatAmount = (amount: bigint | undefined, decimals: number = 9) => {
    if (!amount) return '0';
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const truncateSignature = (signature: string) => {
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
        >
          Clear Filters
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search by signature or token..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={filters.type || 'all'}
            onChange={(e) => handleTypeFilter(e.target.value as TransactionType | 'all')}
            className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          >
            <option value="all" className="bg-gray-900">All Types</option>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-gray-900">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleStatusFilter(e.target.value as TransactionStatus | 'all')}
            className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          >
            <option value="all" className="bg-gray-900">All Status</option>
            <option value={TransactionStatus.PENDING} className="bg-gray-900">Pending</option>
            <option value={TransactionStatus.CONFIRMED} className="bg-gray-900">Confirmed</option>
            <option value={TransactionStatus.FAILED} className="bg-gray-900">Failed</option>
            <option value={TransactionStatus.CANCELLED} className="bg-gray-900">Cancelled</option>
            <option value={TransactionStatus.TIMEOUT} className="bg-gray-900">Timeout</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {paginatedTransactions.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <div className="text-gray-300 font-semibold mb-2">No transactions found</div>
            <p className="text-sm text-gray-400">Your transaction history will appear here</p>
          </div>
        ) : (
          paginatedTransactions.map((tx) => (
            <div
              key={tx.signature}
              onClick={() => setSelectedTransaction(tx)}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-6 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01] cursor-pointer transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-white">
                      {TRANSACTION_TYPE_LABELS[tx.type]}
                    </span>
                    <span
                      className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                        STATUS_COLORS[tx.status]
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  {tx.tokenIn && tx.tokenOut && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <span>
                        {formatAmount(tx.amountIn, tx.tokenIn.decimals)} {tx.tokenIn.symbol}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span>
                        {formatAmount(tx.amountOut, tx.tokenOut.decimals)} {tx.tokenOut.symbol}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(tx.timestamp)}
                  </span>
                  <a
                    href={getExplorerUrl(tx.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors"
                  >
                    {truncateSignature(tx.signature)}
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} transactions
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
