import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SolanaWalletProvider } from '../providers/SolanaWalletProvider'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { NotificationContainer } from '../components/ui/NotificationContainer'
import { ResponsiveNav } from '../components/ui/ResponsiveNav'
import { SkipNav } from '../components/ui/SkipNav'
import { AccessibilityProvider } from '../components/ui/AccessibilityProvider'
import { AccessibilityMenu } from '../components/ui/AccessibilityMenu'
import { MonitoringProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rocket Sharded Amm - Sharded Liquidity Pools on Solana',
  description: 'A high-performance decentralized exchange with sharded liquidity pools on Solana. Swap tokens with optimal routing across multiple pool shards.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MonitoringProvider>
          <ErrorBoundary>
            <AccessibilityProvider>
              <SolanaWalletProvider>
                <SkipNav />
                <div className="min-h-screen flex flex-col">
                  <ResponsiveNav />
                  <main id="main-content" className="flex-1" role="main">
                    {children}
                  </main>
                </div>
                <NotificationContainer />
                <AccessibilityMenu />
              </SolanaWalletProvider>
            </AccessibilityProvider>
          </ErrorBoundary>
        </MonitoringProvider>
      </body>
    </html>
  )
}