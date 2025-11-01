/**
 * Test Script: Backend Routing with Live API
 * 
 * This script tests Task 8.1 - Backend routing functionality
 * Run this in the browser console while on the swap page
 */

(async function testBackendRouting() {
  console.log('\n🧪 TEST: Backend Routing with Live API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  function pass(test) {
    console.log(`✅ PASS: ${test}`);
    results.passed.push(test);
  }

  function fail(test, reason) {
    console.error(`❌ FAIL: ${test}`);
    console.error(`   Reason: ${reason}`);
    results.failed.push({ test, reason });
  }

  function warn(test, reason) {
    console.warn(`⚠️  WARN: ${test}`);
    console.warn(`   Reason: ${reason}`);
    results.warnings.push({ test, reason });
  }

  try {
    // Test 1: Check if backend API URL is configured
    console.log('Test 1: Backend API Configuration');
    const backendUrl = process.env.NEXT_PUBLIC_SAMM_ROUTER_API_URL || 'http://saigreen.cloud:3000';
    console.log(`   Backend URL: ${backendUrl}`);
    
    if (backendUrl && backendUrl !== 'http://invalid-endpoint-test.local:9999') {
      pass('Backend API URL is configured');
    } else {
      fail('Backend API URL is not configured', 'URL is missing or set to test invalid endpoint');
    }

    // Test 2: Check backend API health
    console.log('\nTest 2: Backend API Health Check');
    try {
      const healthResponse = await fetch(`${backendUrl}/api/health`);
      if (healthResponse.ok) {
        pass('Backend API is accessible and healthy');
      } else {
        fail('Backend API health check failed', `Status: ${healthResponse.status}`);
      }
    } catch (error) {
      fail('Backend API is not accessible', error.message);
    }

    // Test 3: Check if ShardedDexService is available
    console.log('\nTest 3: ShardedDexService Availability');
    // This test assumes the service is imported in the page
    // In a real scenario, you'd need to access it through the React component
    warn('ShardedDexService availability', 'Manual verification required - check if service is initialized');

    // Test 4: Simulate quote request
    console.log('\nTest 4: Quote Request Simulation');
    console.log('   This test requires manual interaction:');
    console.log('   1. Enter amount: 100');
    console.log('   2. Select: USDC → USDT');
    console.log('   3. Wait for quote to load');
    console.log('   4. Check console for backend routing logs');
    warn('Quote request simulation', 'Manual interaction required');

    // Test 5: Check for routing method indicator in DOM
    console.log('\nTest 5: Routing Method Indicator in UI');
    setTimeout(() => {
      const routingBadge = document.querySelector('[class*="bg-green-500/20"]');
      if (routingBadge && routingBadge.textContent.includes('Backend Routing')) {
        pass('Backend routing indicator found in UI');
      } else {
        warn('Backend routing indicator', 'Not found - may need to generate a quote first');
      }
    }, 1000);

    // Test 6: Check for backend reason display
    console.log('\nTest 6: Backend Reason Display');
    setTimeout(() => {
      const reasonText = document.querySelector('[class*="text-xs"][class*="italic"]');
      if (reasonText && reasonText.textContent.length > 0) {
        pass('Backend reason is displayed in UI');
        console.log(`   Reason: ${reasonText.textContent}`);
      } else {
        warn('Backend reason display', 'Not found - may need to generate a quote first');
      }
    }, 1000);

    // Test 7: Performance metrics check
    console.log('\nTest 7: Performance Metrics');
    console.log('   Check console for performance metrics after 10 quotes');
    console.log('   Look for: "📊 Performance Metrics Summary"');
    warn('Performance metrics', 'Generate 10 quotes to see metrics summary');

  } catch (error) {
    fail('Test execution', error.message);
  }

  // Print summary
  setTimeout(() => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.failed.forEach(({ test, reason }) => {
        console.log(`   - ${test}: ${reason}`);
      });
    }
    
    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(({ test, reason }) => {
        console.log(`   - ${test}: ${reason}`);
      });
    }
    
    console.log('\n📝 Manual Verification Required:');
    console.log('   1. Generate a quote (100 USDC → USDT)');
    console.log('   2. Check for "✓ Backend Routing" badge (green)');
    console.log('   3. Check for backend reason text below badge');
    console.log('   4. Check console for "🌐 Backend Routing Request"');
    console.log('   5. Check console for "✅ Backend Routing Successful"');
    console.log('   6. Verify selected shard matches backend recommendation');
    console.log('   7. (Optional) Execute swap and verify transaction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }, 2000);

})();
