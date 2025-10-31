'use client';

import React from 'react';
import { TransactionList } from '@/components/transactions';

export default function TransactionsPage() {
  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-sm text-gray-600 mt-1">
              View all your swap, pool, and token transactions
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <TransactionList />
          </div>
        </div>
      </div>
    </div>
  );
}
