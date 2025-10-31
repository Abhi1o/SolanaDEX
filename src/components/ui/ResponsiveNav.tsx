'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon,
  ArrowsRightLeftIcon,
  BeakerIcon,
  ChartBarIcon,
  ClockIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { WalletConnectButton } from '../wallet/WalletConnectButton';
import { MobileNav } from './MobileNav';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Swap', href: '/swap', icon: ArrowsRightLeftIcon },
  { name: 'Pools', href: '/pools', icon: BeakerIcon },
  { name: 'Portfolio', href: '/portfolio', icon: ChartBarIcon },
  { name: 'Account', href: '/account', icon: UserCircleIcon },
  { name: 'Transactions', href: '/transactions', icon: ClockIcon },
];

export function ResponsiveNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link 
                href="/" 
                className="text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-label="Solana DEX Home"
              >
                Solana DEX
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden lg:ml-8 lg:flex lg:space-x-4" role="menubar">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    className={`
                      inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5 mr-2" aria-hidden="true" />
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
