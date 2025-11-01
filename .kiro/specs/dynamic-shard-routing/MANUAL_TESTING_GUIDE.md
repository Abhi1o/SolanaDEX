# Manual Testing Guide - Dynamic Shard Routing

This guide provides step-by-step instructions for manually testing the dynamic shard routing feature implementation.

## Prerequisites

1. Development server running (`npm run dev`)
2. Browser with DevTools open (Console tab visible)
3. Wallet connected with test tokens (USDC, USDT, SOL)
4. Backend API accessible at http://saigreen.cloud:3000

## Test Environment Setup

### Check Backend API Status

Before starting tests, verify the backend API is accessible:

```bash
curl http://saigreen.cloud:3000/api/health
```

Expected response: `{"status":"ok"}` or similar success response.

---

## Task 8.1: Test Backend Routing with Live API

**Objective**: Verify that backend routing works correctly when the API is available.

### Test Steps:

1. **Open the Swap Interface**
   - Navigate to http://localhost:3000/swap
   - Open browser DevTools (F12) and go to Console tab

2. **Test Quote Generation**
   - Select: USDC → USDT
   - Enter amount: 100
   - Wait for quote to load (500ms debounce)

3. **Verify Backend Routing Indicator**
   - ✅ Check: Quote panel shows "✓ Backend Routing" badge in GREEN
   - ✅ Check: Badge has green background (bg-green-500/20)
   - ✅ Check: Checkmark icon (✓) is visible

4. **Verify Backend Reason Display**
   - ✅ Check: Below routing badge, there's italic gray text showing the backend reason
   - ✅ Check: Reason text is meaningful (e.g., "Selected shard with lowest price impact")
   - ✅ Check: Text is styled with text-xs and text-gray-400

5. **Verify Selected Shard Matches Backend Recommendation**
   - ✅ Check: Console shows backend API request and response
   - ✅ Check: Console log shows "Selected Shard Address: [address]"
   - ✅ Check: Quote panel shows "Using Shard: #X" matching the backend selection
   - ✅ Check: In the right sidebar, the selected shard has "✓ Selected" badge

6. **Verify Console Logging**
   - ✅ Check: Console shows "🌐 Backend Routing Request" section
   - ✅ Check: Console shows backend API response time
   - ✅ Check: Console shows "✅ Backend Routing Successful"
   - ✅ Check: Console shows selected shard details and reason

7. **Test Swap Execution** (Optional - requires wallet with funds)
   - Click "Swap" button
   - Approve transaction in wallet
   - ✅ Check: Transaction completes successfully
   - ✅ Check: Console shows transaction signature
   - ✅ Check: Success modal appears with transaction details

8. **Verify Transaction Uses Correct Pool Address**
   - ✅ Check: Console log shows "Building Swap Transaction..." with pool address
   - ✅ Check: Pool address matches the backend-selected shard
   - ✅ Check: Transaction explorer link works (if transaction executed)

### Expected Results:

- ✅ Routing method badge shows "Backend Routing" in green
- ✅ Backend reason is displayed below the badge
- ✅ Selected shard matches backend recommendation
- ✅ Console logs show comprehensive backend routing information
- ✅ Swap execution uses the correct pool address
- ✅ Transaction completes successfully (if executed)

### Test Data:

Record your test results:

```
Test Date: _______________
Backend API Status: _______________
Quote Generated: _______________
Routing Method: _______________
Backend Reason: _______________
Selected Shard: _______________
Swap Executed: _______________
Transaction Signature: _______________
```

---

## Task 8.2: Test Fallback Behavior

**Objective**: Verify that the system falls back to local routing when backend API is unavailable.

### Test Steps:

1. **Temporarily Disable Backend API**
   - Open `.env.local` file
   - Change `NEXT_PUBLIC_SAMM_ROUTER_API_URL` to invalid endpoint:
     ```
     NEXT_PUBLIC_SAMM_ROUTER_API_URL=http://invalid-endpoint-test.local:9999
     ```
   - Save file
   - Restart development server (`npm run dev`)

2. **Test Quote Generation with Invalid Backend**
   - Navigate to http://localhost:3000/swap
   - Open browser DevTools Console
   - Select: USDC → USDT
   - Enter amount: 100
   - Wait for quote to load

3. **Verify Local Routing Indicator**
   - ✅ Check: Quote panel shows "⚠ Local Routing" badge in YELLOW
   - ✅ Check: Badge has yellow background (bg-yellow-500/20)
   - ✅ Check: Warning icon (⚠) is visible

4. **Verify Warning is Logged to Console**
   - ✅ Check: Console shows "⚠️ Backend Routing Failed - Falling Back to Local Calculation"
   - ✅ Check: Console shows error type (e.g., "network", "network-timeout")
   - ✅ Check: Console shows error message with details
   - ✅ Check: Console shows input parameters (tokens, amount)
   - ✅ Check: Console shows timestamp

5. **Verify Quote Generation Falls Back to Local**
   - ✅ Check: Quote is still generated despite backend failure
   - ✅ Check: Console shows "🔄 Getting LOCAL quote" section
   - ✅ Check: Console shows shard evaluation for each pool
   - ✅ Check: Console shows "✅ Quote Calculation Complete"
   - ✅ Check: Quote displays estimated output, price impact, and shard selection

6. **Verify Swap Execution Still Works**
   - ✅ Check: "Swap" button is enabled with valid quote
   - Click "Swap" button (if testing with real wallet)
   - ✅ Check: Transaction builds successfully
   - ✅ Check: Swap executes using locally-selected shard
   - ✅ Check: Transaction completes successfully

7. **Restore Correct Backend API URL**
   - Open `.env.local` file
   - Change back to correct URL:
     ```
     NEXT_PUBLIC_SAMM_ROUTER_API_URL=http://saigreen.cloud:3000
     ```
   - Save file
   - Restart development server

8. **Verify Backend Routing Restored**
   - Generate a new quote
   - ✅ Check: Routing method shows "Backend Routing" again
   - ✅ Check: Backend reason is displayed

### Expected Results:

- ✅ Routing method badge shows "Local Routing" in yellow when backend unavailable
- ✅ Console shows comprehensive fallback warning with error details
- ✅ Quote is still generated using local calculation
- ✅ Swap execution works with local routing
- ✅ Backend routing is restored after fixing configuration

### Test Data:

Record your test results:

```
Test Date: _______________
Invalid Backend URL Used: _______________
Fallback Triggered: _______________
Error Type Logged: _______________
Local Quote Generated: _______________
Swap Executed with Local Routing: _______________
Backend Restored: _______________
```

---

## Task 8.3: Test Error Scenarios

**Objective**: Verify that the system handles various error scenarios gracefully.

### Test Scenario 1: Invalid Token Pair

1. **Modify Token Configuration** (Temporarily)
   - This test verifies the system handles token pairs not in configuration
   - Expected: Should fall back to local routing or show appropriate error

2. **Test Steps**:
   - Try to get quote for a token pair
   - ✅ Check: System handles gracefully (either fallback or clear error message)
   - ✅ Check: Error is logged with adequate detail
   - ✅ Check: User sees friendly error message

### Test Scenario 2: Very Large Amounts

1. **Test Steps**:
   - Select: USDC → USDT
   - Enter amount: 1000000 (1 million)
   - Wait for quote

2. **Verify Handling**:
   - ✅ Check: Quote is generated (backend or local)
   - ✅ Check: Price impact is calculated correctly (likely very high)
   - ✅ Check: High price impact warning is displayed (red warning box)
   - ✅ Check: Confirmation checkbox appears for high impact trades
   - ✅ Check: No crashes or undefined values
   - ✅ Check: Console logs show proper calculation

### Test Scenario 3: Network Timeout

1. **Simulate Slow Network** (Optional - requires network throttling)
   - Open Chrome DevTools → Network tab
   - Set throttling to "Slow 3G" or "Offline"
   - Generate a quote

2. **Verify Timeout Handling**:
   - ✅ Check: Request times out within 5 seconds
   - ✅ Check: Console shows "Timeout error" or "network-timeout" error type
   - ✅ Check: System falls back to local routing
   - ✅ Check: Quote is still generated
   - ✅ Check: User doesn't experience hanging UI

### Test Scenario 4: Malformed Backend Response

1. **This test requires backend modification or mock**
   - Expected: System should detect invalid response and fall back

2. **Verify Handling**:
   - ✅ Check: Invalid response is detected
   - ✅ Check: Error is logged with "validation" or "API" error type
   - ✅ Check: System falls back to local routing
   - ✅ Check: Quote is generated successfully

### Test Scenario 5: User-Friendly Error Messages

1. **Review All Error Messages**:
   - ✅ Check: No raw error objects shown to user
   - ✅ Check: Error messages are clear and actionable
   - ✅ Check: Technical details are in console, not UI
   - ✅ Check: Fallback behavior is transparent but not alarming

### Test Scenario 6: Adequate Error Logging

1. **Review Console Logs for Each Error**:
   - ✅ Check: Error type is categorized (network, timeout, API, validation)
   - ✅ Check: Timestamp is included
   - ✅ Check: Input parameters are logged
   - ✅ Check: Error message is descriptive
   - ✅ Check: Stack trace is available (for debugging)

### Expected Results:

- ✅ All error scenarios are handled gracefully
- ✅ System falls back to local routing when backend fails
- ✅ User sees friendly error messages
- ✅ Console logs provide adequate debugging information
- ✅ No crashes or undefined values
- ✅ UI remains responsive

### Test Data:

Record your test results:

```
Test Date: _______________

Scenario 1 - Invalid Token Pair:
  Result: _______________
  Error Logged: _______________

Scenario 2 - Very Large Amounts:
  Amount Tested: _______________
  Quote Generated: _______________
  Price Impact: _______________
  Warning Displayed: _______________

Scenario 3 - Network Timeout:
  Timeout Occurred: _______________
  Fallback Triggered: _______________
  Time to Fallback: _______________

Scenario 4 - Malformed Response:
  Result: _______________

Scenario 5 - Error Messages:
  User-Friendly: _______________

Scenario 6 - Error Logging:
  Adequate Detail: _______________
```

---

## Task 8.4: Test Different Token Pairs and Amounts

**Objective**: Verify that backend routing works correctly across different token pairs and amounts.

### Test Scenario 1: USDC → USDT Swaps

1. **Test Small Amount**:
   - Amount: 10 USDC
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected
   - ✅ Check: Price impact is low (< 1%)
   - Record: Selected Shard #_____, Output: _____ USDT

2. **Test Medium Amount**:
   - Amount: 100 USDC
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected (may differ from small amount)
   - ✅ Check: Price impact is reasonable
   - Record: Selected Shard #_____, Output: _____ USDT

3. **Test Large Amount**:
   - Amount: 1000 USDC
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected (may differ from medium amount)
   - ✅ Check: Price impact is calculated
   - Record: Selected Shard #_____, Output: _____ USDT

### Test Scenario 2: USDC → SOL Swaps

1. **Test Small Amount**:
   - Amount: 10 USDC
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected
   - Record: Selected Shard #_____, Output: _____ SOL

2. **Test Medium Amount**:
   - Amount: 100 USDC
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected
   - Record: Selected Shard #_____, Output: _____ SOL

3. **Test Large Amount**:
   - Amount: 1000 USDC
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected
   - Record: Selected Shard #_____, Output: _____ SOL

### Test Scenario 3: Reverse Swaps

1. **SOL → USDC**:
   - Amount: 1 SOL
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected
   - Record: Selected Shard #_____, Output: _____ USDC

2. **USDT → USDC**:
   - Amount: 100 USDT
   - ✅ Check: Quote generated successfully
   - ✅ Check: Backend routing used
   - ✅ Check: Shard selected
   - Record: Selected Shard #_____, Output: _____ USDC

### Test Scenario 4: Backend Shard Selection Varies by Amount

1. **Compare Shard Selection**:
   - ✅ Check: Different amounts may select different shards
   - ✅ Check: Backend reason explains why each shard was selected
   - ✅ Check: Larger amounts may prefer shards with more liquidity
   - ✅ Check: Smaller amounts may optimize for lowest price impact

2. **Document Shard Selection Pattern**:
   ```
   USDC → USDT:
     10 USDC → Shard #_____ (Reason: _______________)
     100 USDC → Shard #_____ (Reason: _______________)
     1000 USDC → Shard #_____ (Reason: _______________)
   
   Pattern observed: _______________________________
   ```

### Test Scenario 5: Price Impact Accuracy

1. **Verify Price Impact Calculations**:
   - For each quote generated above:
   - ✅ Check: Price impact percentage is displayed
   - ✅ Check: Price impact increases with larger amounts
   - ✅ Check: Price impact is color-coded (green < 1%, yellow 1-5%, red > 5%)
   - ✅ Check: High impact warning appears when > 5%

2. **Compare Price Impact Values**:
   ```
   Token Pair: USDC → USDT
     10 USDC: _____% price impact
     100 USDC: _____% price impact
     1000 USDC: _____% price impact
   
   Pattern: Price impact increases with amount ✅/❌
   ```

### Test Scenario 6: Compare Backend vs Local Routing

1. **Get Backend Quote**:
   - Ensure backend API is enabled
   - Amount: 100 USDC → USDT
   - Record: Shard #_____, Output: _____, Impact: _____%

2. **Get Local Quote**:
   - Disable backend API (change .env.local)
   - Restart server
   - Same amount: 100 USDC → USDT
   - Record: Shard #_____, Output: _____, Impact: _____%

3. **Compare Results**:
   - ✅ Check: Both methods produce valid quotes
   - ✅ Check: Outputs are similar (within reasonable range)
   - ✅ Check: Shard selection may differ
   - ✅ Check: Backend reason explains its selection advantage

4. **Analysis**:
   ```
   Backend Shard: #_____
   Local Shard: #_____
   Output Difference: _____ tokens (_____%)
   Impact Difference: _____%
   
   Backend advantage: _______________________________
   ```

### Expected Results:

- ✅ Backend routing works for all token pairs
- ✅ Quotes are generated for various amounts
- ✅ Backend selects different shards based on amount and conditions
- ✅ Reverse swaps work correctly
- ✅ Price impact calculations are accurate
- ✅ Backend routing provides optimal or comparable results to local routing

### Test Data Summary:

```
Test Date: _______________

Token Pairs Tested:
  USDC → USDT: ✅/❌
  USDC → SOL: ✅/❌
  SOL → USDC: ✅/❌
  USDT → USDC: ✅/❌

Amount Ranges Tested:
  Small (10-50): ✅/❌
  Medium (100-500): ✅/❌
  Large (1000+): ✅/❌

Shard Selection Varies: ✅/❌
Price Impact Accurate: ✅/❌
Backend vs Local Compared: ✅/❌

Overall Result: PASS/FAIL
```

---

## Performance Metrics Review

After completing all tests, review the performance metrics:

1. **Open Browser Console**
2. **Look for Performance Metrics Summary** (logged every 10 quotes)
3. **Record Metrics**:
   ```
   Session Duration: _____________
   Total Quotes Generated: _____________
   
   Backend Routing:
     Requests: _____________
     Successes: _____________
     Failures: _____________
     Success Rate: _____________%
     Avg Response Time: _____________ms
   
   Local Routing:
     Fallback Count: _____________
     Avg Calculation Time: _____________ms
   
   Overall:
     Avg Quote Generation Time: _____________ms
   ```

4. **Verify Metrics**:
   - ✅ Check: Backend success rate is high when API is available
   - ✅ Check: Backend response time is reasonable (< 1000ms)
   - ✅ Check: Local calculation is fast (< 100ms)
   - ✅ Check: Fallback count matches expected failures

---

## Test Completion Checklist

### Task 8.1: Backend Routing with Live API
- [ ] Quote shows "Backend Routing" indicator
- [ ] Backend reason is displayed
- [ ] Selected shard matches backend recommendation
- [ ] Console logs show backend routing details
- [ ] Swap execution uses correct pool address
- [ ] Transaction completes successfully (if tested)

### Task 8.2: Fallback Behavior
- [ ] Quote shows "Local Routing" when backend disabled
- [ ] Warning is logged to console with error details
- [ ] Quote is generated using local calculation
- [ ] Swap execution works with local routing
- [ ] Backend routing restored after fixing configuration

### Task 8.3: Error Scenarios
- [ ] Invalid token pair handled gracefully
- [ ] Very large amounts handled properly
- [ ] Network timeout falls back within 5 seconds
- [ ] Malformed response handled gracefully
- [ ] Error messages are user-friendly
- [ ] Errors logged with adequate detail

### Task 8.4: Different Token Pairs and Amounts
- [ ] USDC → USDT tested with various amounts
- [ ] USDC → SOL tested with various amounts
- [ ] Reverse swaps tested (SOL → USDC, USDT → USDC)
- [ ] Backend selects different shards for different amounts
- [ ] Price impact calculations are accurate
- [ ] Backend vs local routing compared

### Overall Test Result
- [ ] All sub-tasks completed
- [ ] All requirements verified
- [ ] Performance metrics reviewed
- [ ] No critical issues found

**Test Completed By**: _______________
**Date**: _______________
**Overall Status**: PASS / FAIL
**Notes**: _______________________________
