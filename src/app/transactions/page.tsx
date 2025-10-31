'use client';

import React, { useMemo } from 'react';
import { TransactionList } from '@/components/transactions';
import { MotionFadeIn, MotionReveal, MotionStagger } from '@/components/animations';
import { AnimatedStat } from '@/components/ui/AnimatedStat';
import { motion } from 'framer-motion';
import { CheckCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useTransactionStore } from '@/stores/transactionStore';
import { TransactionStatus, TransactionType } from '@/types';

export default function TransactionsPage() {
  const { transactions } = useTransactionStore();
  
  // Calculate statistics from actual transactions
  const stats = useMemo(() => {
    const total = transactions.length;
    const successful = transactions.filter(tx => tx.status === TransactionStatus.CONFIRMED).length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    // Calculate total volume (sum of all swap amounts in USD - simplified)
    const totalVolume = transactions
      .filter(tx => tx.type === TransactionType.SWAP && tx.amountOut)
      .reduce((sum, tx) => {
        // Rough estimate: assume 1 token = $1 for display purposes
        // In production, you'd fetch actual prices
        const amount = Number(tx.amountOut || 0) / Math.pow(10, tx.tokenOut?.decimals || 9);
        return sum + amount;
      }, 0);
    
    return {
      total,
      successRate: successRate.toFixed(1),
      totalVolume: totalVolume > 1000 
        ? `$${(totalVolume / 1000).toFixed(1)}K`
        : `$${totalVolume.toFixed(2)}`
    };
  }, [transactions]);
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
              Transaction History
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
              className="text-base sm:text-lg text-gray-400 font-light"
            >
              View all your swap, pool, and token transactions
            </motion.p>
          </div>
        </MotionFadeIn>

        {/* Statistics */}
        <MotionStagger staggerDelay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <AnimatedStat
              value={stats.total.toString()}
              label="Total Transactions"
              gradient="from-blue-400 to-cyan-400"
              icon={<CheckCircleIcon className="w-full h-full text-white" />}
              delay={0.2}
            />
            <AnimatedStat
              value={stats.successRate}
              label="Success Rate"
              gradient="from-green-400 to-emerald-400"
              icon={<CheckCircleIcon className="w-full h-full text-white" />}
              delay={0.3}
              suffix="%"
            />
            <AnimatedStat
              value={stats.totalVolume}
              label="Total Volume"
              gradient="from-purple-400 to-pink-400"
              icon={<CurrencyDollarIcon className="w-full h-full text-white" />}
              delay={0.4}
            />
          </div>
        </MotionStagger>

        {/* Transaction List */}
        <MotionReveal delay={0.5} direction="up">
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
            <div className="p-6 sm:p-8">
              <TransactionList />
            </div>
          </div>
        </MotionReveal>
      </div>
    </div>
  );
}
