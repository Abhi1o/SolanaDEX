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
