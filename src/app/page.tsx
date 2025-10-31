'use client';

import { SolanaSwapInterface } from '../components/swap/SolanaSwapInterface';
import Link from 'next/link';
import {
  ShieldCheckIcon,
  BoltIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  ChartBarIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { MotionReveal, MotionStagger, MotionScale, MotionFadeIn } from '../components/animations';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main className="bg-black text-white overflow-hidden">
      {/* Hero Section with Glassmorphism */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <MotionFadeIn delay={0.2}>
            <div className="text-center mb-16">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
                className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
              >
                Trade at the
                <br />
                speed of light
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto font-light"
              >
                Experience the future of decentralized trading on Solana.
                <br className="hidden sm:block" />
                Lightning-fast swaps with unmatched security.
              </motion.p>
            </div>
          </MotionFadeIn>

          {/* Swap Interface with Glassmorphism */}
          <MotionReveal delay={0.4} direction="up">
            <div className="max-w-md mx-auto backdrop-blur-xl bg-white/5 rounded-3xl p-1 shadow-2xl border border-white/10">
              <div className="bg-black/40 rounded-3xl overflow-hidden">
                <SolanaSwapInterface />
              </div>
            </div>
          </MotionReveal>

          {/* Stats */}
          <MotionStagger staggerDelay={0.1}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mt-20">
              {[
                { value: '<400ms', label: 'Block Time', gradient: 'from-blue-400 to-cyan-400' },
                { value: '$0.00025', label: 'Avg Fee', gradient: 'from-purple-400 to-pink-400' },
                { value: '10+', label: 'Wallets', gradient: 'from-green-400 to-emerald-400' },
                { value: '100%', label: 'Decentralized', gradient: 'from-orange-400 to-red-400' },
              ].map((stat, index) => (
                <MotionReveal key={index} delay={0.6 + index * 0.1} direction="up">
                  <MotionScale>
                    <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
                      <div className={`text-3xl sm:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r ${stat.gradient}`}>
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-400 font-light">{stat.label}</div>
                    </div>
                  </MotionScale>
                </MotionReveal>
              ))}
            </div>
          </MotionStagger>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2"
          >
            <motion.div className="w-1 h-2 bg-white/50 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionReveal direction="up">
            <div className="text-center mb-20">
              <h2 className="text-5xl sm:text-6xl font-bold mb-6">
                Built for <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">performance</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
                Every detail crafted for the ultimate trading experience
              </p>
            </div>
          </MotionReveal>

          <MotionStagger staggerDelay={0.15}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: BoltIcon,
                  title: 'Lightning Fast',
                  description: 'Execute trades in milliseconds with Solana\'s high-performance blockchain.',
                  gradient: 'from-yellow-400 to-orange-500',
                },
                {
                  icon: CurrencyDollarIcon,
                  title: 'Best Rates',
                  description: 'Jupiter aggregator finds optimal routes across all DEXs for superior pricing.',
                  gradient: 'from-green-400 to-emerald-500',
                },
                {
                  icon: LockClosedIcon,
                  title: 'Non-Custodial',
                  description: 'Your keys, your crypto. Complete control with zero compromise.',
                  gradient: 'from-blue-400 to-cyan-500',
                },
                {
                  icon: ShieldCheckIcon,
                  title: 'Battle-Tested',
                  description: 'Audited smart contracts trusted by the Solana ecosystem.',
                  gradient: 'from-purple-400 to-pink-500',
                },
                {
                  icon: ChartBarIcon,
                  title: 'Advanced Analytics',
                  description: 'Real-time insights into your portfolio and trading performance.',
                  gradient: 'from-pink-400 to-rose-500',
                },
                {
                  icon: GlobeAltIcon,
                  title: 'Universal Access',
                  description: 'Connect with 10+ wallets on desktop and mobile devices.',
                  gradient: 'from-indigo-400 to-purple-500',
                },
              ].map((feature, index) => (
                <MotionReveal key={index} delay={index * 0.1} direction="up">
                  <MotionScale>
                    <div className="group relative backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all h-full">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 mb-6 group-hover:scale-110 transition-transform`}>
                        <feature.icon className="w-full h-full text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                      <p className="text-gray-400 font-light leading-relaxed">{feature.description}</p>
                    </div>
                  </MotionScale>
                </MotionReveal>
              ))}
            </div>
          </MotionStagger>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-32 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionReveal direction="up">
            <div className="text-center mb-20">
              <h2 className="text-5xl sm:text-6xl font-bold mb-6">
                Simple. <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Powerful.</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
                Start trading in three effortless steps
              </p>
            </div>
          </MotionReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {[
              { step: '01', title: 'Connect', description: 'Link your Solana wallet with a single click' },
              { step: '02', title: 'Select', description: 'Choose your tokens and enter the amount' },
              { step: '03', title: 'Trade', description: 'Confirm and execute instantly on-chain' },
            ].map((item, index) => (
              <MotionReveal key={index} delay={index * 0.2} direction="up">
                <div className="relative">
                  <div className="text-8xl font-bold text-white/5 mb-4">{item.step}</div>
                  <h3 className="text-3xl font-semibold mb-4 -mt-16">{item.title}</h3>
                  <p className="text-gray-400 font-light text-lg leading-relaxed">{item.description}</p>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-0.5 bg-gradient-to-r from-white/20 to-transparent" />
                  )}
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="relative py-32 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionReveal direction="up">
            <div className="text-center mb-20">
              <h2 className="text-5xl sm:text-6xl font-bold mb-6">
                Security <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">first</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
                Your assets protected by industry-leading security
              </p>
            </div>
          </MotionReveal>

          <MotionStagger staggerDelay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                { title: 'Non-Custodial', description: 'Never give up control of your private keys or funds' },
                { title: 'Open Source', description: 'Transparent, auditable code built on trusted protocols' },
                { title: 'Slippage Protection', description: 'Customizable tolerance ensures fair execution prices' },
                { title: 'Real-Time Monitoring', description: 'Track every transaction with complete transparency' },
              ].map((item, index) => (
                <MotionReveal key={index} delay={index * 0.1} direction="up">
                  <div className="flex items-start space-x-4 backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
                    <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                      <p className="text-gray-400 font-light">{item.description}</p>
                    </div>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </MotionStagger>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 bg-black">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MotionReveal direction="up">
            <SparklesIcon className="w-16 h-16 mx-auto mb-8 text-purple-400" />
            <h2 className="text-5xl sm:text-6xl font-bold mb-6">
              Ready to experience
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                the future?
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-12 font-light">
              Join thousands trading on the fastest DEX on Solana
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MotionScale>
                <Link
                  href="/swap"
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full font-semibold text-lg overflow-hidden"
                >
                  <span className="relative z-10">Start Trading</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </MotionScale>
              <MotionScale>
                <Link
                  href="/account"
                  className="px-8 py-4 backdrop-blur-xl bg-white/10 rounded-full font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all"
                >
                  View Account
                </Link>
              </MotionScale>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4 text-white">About</h3>
              <p className="text-gray-400 text-sm font-light">
                The most advanced DEX on Solana. Built for speed, security, and simplicity.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                {['Swap', 'Pools', 'Portfolio', 'Account'].map((link) => (
                  <li key={link}>
                    <Link href={`/${link.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors font-light">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Resources</h3>
              <ul className="space-y-2 text-sm">
                {[
                  { name: 'Solana', url: 'https://docs.solana.com' },
                  { name: 'Jupiter', url: 'https://jup.ag' },
                  { name: 'Phantom', url: 'https://phantom.app' },
                ].map((link) => (
                  <li key={link.name}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors font-light">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm font-light">
            © 2025 Solana DEX. Crafted with precision.
          </div>
        </div>
      </footer>
    </main>
  );
}
