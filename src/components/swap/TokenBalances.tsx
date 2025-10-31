'use client';

import React, { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenIcon } from '@/components/tokens/TokenIcon';

interface TokenBalance {
  symbol: string;
  mint: string;
  balance: number;
  decimals: number;
  loading: boolean;
}

interface TokenBalancesProps {
  tokens: Array<{ symbol: string; mint: string; decimals: number }>;
}

export function TokenBalances({ tokens }: TokenBalancesProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalances([]);
      setSolBalance(null);
      return;
    }

    async function fetchBalances() {
      if (!publicKey) return;

      // Fetch SOL balance
      try {
        const solBal = await connection.getBalance(publicKey);
        setSolBalance(solBal / 1e9);
      } catch (err) {
        console.error('Error fetching SOL balance:', err);
        setSolBalance(null);
      }

      // Fetch token balances
      const balancePromises = tokens.map(async (token) => {
        try {
          const ata = await getAssociatedTokenAddress(
            new PublicKey(token.mint),
            publicKey,
            false,
            TOKEN_PROGRAM_ID
          );

          const account = await getAccount(connection, ata, 'confirmed', TOKEN_PROGRAM_ID);
          const balance = Number(account.amount) / Math.pow(10, token.decimals);

          return {
            symbol: token.symbol,
            mint: token.mint,
            balance,
            decimals: token.decimals,
            loading: false,
          };
        } catch (err) {
          // Account doesn't exist or other error
          return {
            symbol: token.symbol,
            mint: token.mint,
            balance: 0,
            decimals: token.decimals,
            loading: false,
          };
        }
      });

      const results = await Promise.all(balancePromises);
      setBalances(results);
    }

    fetchBalances();

    // Refresh every 10 seconds
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection, tokens]);

  if (!publicKey) {
    return (
      <div className="backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
        <div className="text-yellow-300 text-sm font-medium">
          Connect your wallet to view balances
        </div>
      </div>
    );
  }

  const hasZeroBalances = balances.some((b) => b.balance === 0);

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
        <span>Your Balances</span>
        {hasZeroBalances && (
          <a
            href="/GET_TEST_TOKENS.md"
            target="_blank"
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Get test tokens
          </a>
        )}
      </h3>

      {/* SOL Balance */}
      <div className="mb-2 p-2 rounded-xl bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TokenIcon symbol="SOL" size="sm" />
          <span className="text-white font-medium text-sm">SOL</span>
        </div>
        <span className="text-white font-mono text-sm">
          {solBalance !== null ? solBalance.toFixed(4) : '...'}
        </span>
      </div>

      {/* Token Balances */}
      {balances.map((token) => (
        <div
          key={token.mint}
          className={`mb-2 p-2 rounded-xl flex items-center justify-between ${
            token.balance === 0
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <TokenIcon symbol={token.symbol} size="sm" />
            <span className="text-white font-medium text-sm">{token.symbol}</span>
            {token.balance === 0 && (
              <span className="text-xs text-red-400">No balance</span>
            )}
          </div>
          <span className="text-white font-mono text-sm">
            {token.loading ? '...' : token.balance.toFixed(4)}
          </span>
        </div>
      ))}

      {hasZeroBalances && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-gray-400 space-y-1">
            <div className="font-semibold text-yellow-300">⚠️ Missing tokens</div>
            <div>You need devnet tokens to swap.</div>
            <div className="mt-2">
              <a
                href="https://faucet.solana.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Get SOL from faucet →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
