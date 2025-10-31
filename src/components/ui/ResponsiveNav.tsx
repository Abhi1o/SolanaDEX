'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ArrowsRightLeftIcon,
  BeakerIcon,
  ClockIcon,
  UserCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { WalletConnectButton } from '../wallet/WalletConnectButton';
import { MobileNav } from './MobileNav';
import { RocketLogo } from './RocketLogo';
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Swap', href: '/swap', icon: ArrowsRightLeftIcon },
  { name: 'Pools', href: '/pools', icon: BeakerIcon },
  { name: 'Liquidity', href: '/liquidity', icon: CurrencyDollarIcon },
  { name: 'Account', href: '/account', icon: UserCircleIcon },
  { name: 'Transactions', href: '/transactions', icon: ClockIcon },
];

export function ResponsiveNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="relative backdrop-blur-xl bg-black/80 border-b border-white/10 sticky top-0 z-50"
      role="navigation" 
      aria-label="Main navigation"
    >
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo and desktop navigation */}
          <div className="flex items-center flex-1">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className="flex items-center gap-3 text-xl font-bold text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black rounded-lg px-2 py-1 transition-all duration-200 group"
                aria-label="Rocket Sharded Amm Home"
              >
                <RocketLogo size="md" className="text-white group-hover:scale-110 transition-transform duration-200" />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Rocket Sharded Amm
                </span>
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden lg:ml-12 lg:flex lg:items-center lg:space-x-1" role="menubar">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    className="relative"
                  >
                    <motion.div
                      initial={false}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black
                        ${isActive
                          ? 'text-white bg-white/10'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <item.icon className={`h-4 w-4 mr-2 ${isActive ? 'text-white' : 'text-gray-500'}`} aria-hidden="true" />
                      {item.name}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop wallet section */}
          <div className="hidden lg:flex lg:items-center">
            <WalletConnectButton 
              showBalance={false}
              showNetwork={false}
            />
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </nav>
  );
}
