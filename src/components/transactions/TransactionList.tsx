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
  [TransactionStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [TransactionStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [TransactionStatus.FAILED]: 'bg-red-100 text-red-800',
  [TransactionStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
  [TransactionStatus.TIMEOUT]: 'bg-orange-100 text-orange-800',
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transaction History</h2>
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={filters.type || 'all'}
            onChange={(e) => handleTypeFilter(e.target.value as TransactionType | 'all')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value={TransactionStatus.PENDING}>Pending</option>
            <option value={TransactionStatus.CONFIRMED}>Confirmed</option>
            <option value={TransactionStatus.FAILED}>Failed</option>
            <option value={TransactionStatus.CANCELLED}>Cancelled</option>
            <option value={TransactionStatus.TIMEOUT}>Timeout</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.map((tx) => (
                  <tr
                    key={tx.signature}
                    onClick={() => setSelectedTransaction(tx)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {TRANSACTION_TYPE_LABELS[tx.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {tx.tokenIn && tx.tokenOut && (
                          <div className="flex items-center space-x-2">
                            <span>
                              {formatAmount(tx.amountIn, tx.tokenIn.decimals)} {tx.tokenIn.symbol}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span>
                              {formatAmount(tx.amountOut, tx.tokenOut.decimals)} {tx.tokenOut.symbol}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          STATUS_COLORS[tx.status]
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={getExplorerUrl(tx.signature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-blue-600 hover:text-blue-800 font-mono"
                      >
                        {truncateSignature(tx.signature)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
