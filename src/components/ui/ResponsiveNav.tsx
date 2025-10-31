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
    <nav className="backdrop-blur-xl bg-black/80 border-b border-white/10 sticky top-0 z-40" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link 
                href="/" 
                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded transition-all hover:scale-105"
                aria-label="Solana DEX Home"
              >
                Solana DEX
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden lg:ml-8 lg:flex lg:space-x-2" role="menubar">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    className={`
                      inline-flex items-center px-4 py-2 text-sm font-medium rounded-2xl transition-all
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black
                      ${isActive
                        ? 'backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/50 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                      }
                    `}
                  >
                    <item.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop wallet button */}
          <div className="hidden lg:flex lg:items-center">
            <WalletConnectButton 
              showBalance={true}
              showNetwork={true}
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
