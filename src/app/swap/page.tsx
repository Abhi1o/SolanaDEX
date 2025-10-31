'use client';

import React from 'react';
import { ShardedSwapInterface } from '@/components/swap/ShardedSwapInterface';

export default function SwapPage() {
  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)] py-4 sm:py-8">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Token Swap</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Sharded liquidity pools on Solana
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="mr-1">●</span> Connected to Devnet
          </div>
        </div>

        <ShardedSwapInterface />

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Program: {process.env.NEXT_PUBLIC_DEX_PROGRAM_ID?.slice(0, 8)}...{process.env.NEXT_PUBLIC_DEX_PROGRAM_ID?.slice(-8)}</p>
          <p className="mt-1">Network: Solana Devnet</p>
        </div>
      </div>
    </div>
  );
}