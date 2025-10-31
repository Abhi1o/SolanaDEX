"use client";

import React from "react";
import { ShardedSwapInterface } from "@/components/swap/ShardedSwapInterface";
import { MotionFadeIn, MotionReveal } from "@/components/animations";
import { motion } from "framer-motion";

export default function SwapPage() {
  return (
    <div className="relative bg-black text-white min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4/6 mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <MotionFadeIn delay={0.1}>
          <div className="text-center mb-8 sm:mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
              className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
            >
              Token Swap
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.1,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              className="text-base sm:text-lg text-gray-400 font-light"
            >
              Sharded liquidity pools on Solana
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.2,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              className="mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium backdrop-blur-xl bg-green-500/20 border border-green-500/50 text-green-400"
            >
              <span className="mr-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Connected to Devnet
            </motion.div>
          </div>
        </MotionFadeIn>

        <MotionReveal delay={0.3} direction="up">
          <ShardedSwapInterface />
        </MotionReveal>

        <MotionFadeIn delay={0.5}>
          <div className="mt-8 text-center text-xs text-gray-500 space-y-1">
            <p className="font-mono">
              Program: {process.env.NEXT_PUBLIC_DEX_PROGRAM_ID?.slice(0, 8)}...
              {process.env.NEXT_PUBLIC_DEX_PROGRAM_ID?.slice(-8)}
            </p>
            <p>Network: Solana Devnet</p>
          </div>
        </MotionFadeIn>
      </div>
    </div>
  );
}
