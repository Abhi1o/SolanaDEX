'use client';

import React, { useState, useEffect } from 'react';
import { useShardedDex } from '@/hooks/useShardedDex';
import { Connection, PublicKey } from '@solana/web3.js';
import dexConfig from '@/config/dex-config.json';

export default function TestDexPage() {
  const { tokens, getTradingPairs, getPoolsForPair } = useShardedDex();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results: any[] = [];
    const connection = new Connection(dexConfig.rpcUrl, 'confirmed');

    // Test 1: Program account
    results.push({ test: 'Program Account', status: 'testing' });
    try {
      const programId = new PublicKey(dexConfig.programId);
      const programInfo = await connection.getAccountInfo(programId);
      results[0] = {
        test: 'Program Account',
        status: programInfo ? 'pass' : 'fail',
        details: programInfo ? `Found (${programInfo.data.length} bytes)` : 'Not found'
      };
    } catch (error) {
      results[0] = {
        test: 'Program Account',
        status: 'fail',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    setTestResults([...results]);

    // Test 2: First pool
    results.push({ test: 'Pool Accounts', status: 'testing' });
    try {
      const pool = dexConfig.pools[0];
      const poolPubkey = new PublicKey(pool.poolAddress);
      const poolInfo = await connection.getAccountInfo(poolPubkey);

      results[1] = {
        test: 'Pool Accounts',
        status: poolInfo ? 'pass' : 'fail',
        details: poolInfo ? `Pool ${pool.tokenASymbol}/${pool.tokenBSymbol} found` : 'Pool not found'
      };
    } catch (error) {
      results[1] = {
        test: 'Pool Accounts',
        status: 'fail',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    setTestResults([...results]);

    // Test 3: Quote calculation
    results.push({ test: 'Quote Calculation', status: 'testing' });
    try {
      const { shardedDex } = await import('@/lib/shardedDex');
      const quote = await shardedDex.getQuote('USDC', 'SOL', 100);

      results[2] = {
        test: 'Quote Calculation',
        status: 'pass',
        details: `100 USDC → ${quote.estimatedOutput.toFixed(4)} SOL (Shard ${quote.route[0].shardNumber})`
      };
    } catch (error) {
      results[2] = {
        test: 'Quote Calculation',
        status: 'fail',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    setTestResults([...results]);

    // Test 4: Token accounts
    results.push({ test: 'Token Accounts', status: 'testing' });
    try {
      const pool = dexConfig.pools[0];
      const tokenAAccount = new PublicKey(pool.tokenAccountA);
      const tokenBAccount = new PublicKey(pool.tokenAccountB);

      const [tokenAInfo, tokenBInfo] = await Promise.all([
        connection.getAccountInfo(tokenAAccount),
        connection.getAccountInfo(tokenBAccount)
      ]);

      results[3] = {
        test: 'Token Accounts',
        status: tokenAInfo && tokenBInfo ? 'pass' : 'fail',
        details: `Token A: ${tokenAInfo ? '✓' : '✗'}, Token B: ${tokenBInfo ? '✓' : '✗'}`
      };
    } catch (error) {
      results[3] = {
        test: 'Token Accounts',
        status: 'fail',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    setTestResults([...results]);

    setTesting(false);
  };

  const pairs = getTradingPairs();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sharded DEX Test Suite</h1>
          <p className="text-gray-600 mb-6">Verify your DEX integration is working correctly</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Network</div>
              <div className="text-lg font-bold text-blue-900">Solana Devnet</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Tokens</div>
              <div className="text-lg font-bold text-green-900">{tokens.length} Tokens</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Pools</div>
              <div className="text-lg font-bold text-purple-900">{dexConfig.pools.length} Pools</div>
            </div>
          </div>

          <button
            onClick={runTests}
            disabled={testing}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
          >
            {testing ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Test Results</h2>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.status === 'pass'
                      ? 'bg-green-50 border-green-200'
                      : result.status === 'fail'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{result.test}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        result.status === 'pass'
                          ? 'bg-green-200 text-green-800'
                          : result.status === 'fail'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  {result.details && (
                    <div className="mt-2 text-sm text-gray-600">{result.details}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configuration Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Configuration</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Program ID:</span>
              <span className="font-mono text-gray-900">{dexConfig.programId}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">RPC URL:</span>
              <span className="font-mono text-gray-900">{dexConfig.rpcUrl}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Deployed:</span>
              <span className="text-gray-900">{new Date(dexConfig.deployedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Trading Pairs */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Trading Pairs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pairs.map((pair) => {
              const pools = getPoolsForPair(pair.pair.split('/')[0], pair.pair.split('/')[1]);
              return (
                <div key={pair.pair} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-bold text-gray-900 mb-2">{pair.pair}</div>
                  <div className="text-sm text-gray-600 mb-3">{pair.shards} Shards</div>
                  <div className="space-y-1">
                    {pools.map((pool) => (
                      <div key={pool.poolAddress} className="text-xs text-gray-500">
                        Shard {pool.shardNumber}: {parseFloat(pool.liquidityA).toLocaleString()} / {parseFloat(pool.liquidityB).toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supported Tokens */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Supported Tokens</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tokens.map((token) => (
              <div key={token.symbol} className="border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{token.symbol}</div>
                <div className="text-sm text-gray-600 mt-1">{token.name}</div>
                <div className="text-xs text-gray-400 mt-2 font-mono">{token.decimals} decimals</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
