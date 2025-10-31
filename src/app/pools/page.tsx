'use client';

import React from 'react';
import { PoolList } from '@/components/pools';
import { MotionFadeIn, MotionReveal, MotionStagger } from '@/components/animations';
import { AnimatedStat } from '@/components/ui/AnimatedStat';
import { motion } from 'framer-motion';
import { CurrencyDollarIcon, ChartBarIcon, BeakerIcon } from '@heroicons/react/24/outline';

export default function PoolsPage() {
  const handlePoolSelect = (pool: any) => {
    console.log('Pool selected:', pool);
  };

  const handleCreatePool = () => {
    console.log('Create pool clicked');
  };

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
          </div>
        </MotionFadeIn>

        {/* Statistics */}
        <MotionStagger staggerDelay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <AnimatedStat
              value="$2.4M"
              label="Total Value Locked"
              gradient="from-blue-400 to-cyan-400"
              icon={<CurrencyDollarIcon className="w-full h-full text-white" />}
              delay={0.2}
            />
            <AnimatedStat
              value="12"
              label="Active Pools"
              gradient="from-purple-400 to-pink-400"
              icon={<BeakerIcon className="w-full h-full text-white" />}
              delay={0.3}
            />
            <AnimatedStat
              value="$48.2K"
              label="24h Volume"
              gradient="from-green-400 to-emerald-400"
              icon={<ChartBarIcon className="w-full h-full text-white" />}
              delay={0.4}
            />
          </div>
        </MotionStagger>

        {/* Pool List */}
        <MotionReveal delay={0.5} direction="up">
          <PoolList 
            onPoolSelect={handlePoolSelect}
            onCreatePool={handleCreatePool}
            showCreateButton={true}
          />
        </MotionReveal>
      </div>
    </div>
  );
}
