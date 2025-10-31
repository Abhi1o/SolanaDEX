/**
 * Test utility for Sharded DEX integration
 * Run this to verify your pools are accessible
 */

import { Connection, PublicKey } from '@solana/web3.js';
import dexConfig from '../config/dex-config.json';

export async function testPoolConnection() {
  console.log('🔍 Testing Sharded DEX Connection...\n');

  const connection = new Connection(dexConfig.rpcUrl, 'confirmed');
  const programId = new PublicKey(dexConfig.programId);

  console.log(`Program ID: ${programId.toBase58()}`);
  console.log(`RPC URL: ${dexConfig.rpcUrl}`);
  console.log(`Total Pools: ${dexConfig.pools.length}\n`);

  // Test program account exists
  try {
    const programInfo = await connection.getAccountInfo(programId);
    if (programInfo) {
      console.log('✅ Program account found');
      console.log(`   Owner: ${programInfo.owner.toBase58()}`);
      console.log(`   Executable: ${programInfo.executable}`);
    } else {
      console.log('❌ Program account not found');
    }
  } catch (error) {
    console.error('❌ Error checking program:', error);
  }

  console.log('\n📊 Testing Pool Accounts...\n');

  // Test each pool
  for (const pool of dexConfig.pools.slice(0, 3)) { // Test first 3 pools
    console.log(`Pool ${pool.tokenASymbol}/${pool.tokenBSymbol} Shard ${pool.shardNumber}:`);
    console.log(`  Address: ${pool.poolAddress}`);

    try {
      const poolPubkey = new PublicKey(pool.poolAddress);
      const poolInfo = await connection.getAccountInfo(poolPubkey);

      if (poolInfo) {
        console.log(`  ✅ Pool account exists (${poolInfo.data.length} bytes)`);
      } else {
        console.log('  ❌ Pool account not found');
      }

      // Test token accounts
      const tokenAAccount = new PublicKey(pool.tokenAccountA);
      const tokenBAccount = new PublicKey(pool.tokenAccountB);

      const [tokenAInfo, tokenBInfo] = await Promise.all([
        connection.getAccountInfo(tokenAAccount),
        connection.getAccountInfo(tokenBAccount)
      ]);

      console.log(`  Token A Account: ${tokenAInfo ? '✅' : '❌'}`);
      console.log(`  Token B Account: ${tokenBInfo ? '✅' : '❌'}`);

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
    console.log('');
  }

  // Test quote calculation
  console.log('📈 Testing Quote Calculation...\n');
  try {
    const { shardedDex } = await import('./shardedDex');
    const quote = await shardedDex.getQuote('USDC', 'SOL', 100);

    console.log('✅ Quote calculated successfully:');
    console.log(`   Input: ${quote.inputAmount} USDC`);
    console.log(`   Output: ~${quote.estimatedOutput.toFixed(4)} SOL`);
    console.log(`   Price Impact: ${quote.priceImpact.toFixed(2)}%`);
    console.log(`   Using Shard: ${quote.route[0].shardNumber}`);
    console.log(`   Fee: ${quote.totalFee.toFixed(6)} USDC`);
  } catch (error) {
    console.error('❌ Quote calculation failed:', error);
  }

  console.log('\n✨ Test complete!');
}

// Browser-compatible test function
export async function testInBrowser() {
  if (typeof window === 'undefined') {
    console.log('This function is for browser testing only');
    return;
  }

  console.log('🌐 Running browser test...');
  await testPoolConnection();
}
