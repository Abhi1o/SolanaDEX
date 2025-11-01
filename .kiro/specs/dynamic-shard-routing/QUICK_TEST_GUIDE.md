# Quick Test Guide - Dynamic Shard Routing

## Quick Start

### 1. Start Development Server
```bash
npm run dev
```

### 2. Open Swap Interface
- Navigate to: http://localhost:3000/swap
- Open DevTools: Press F12
- Go to Console tab

### 3. Run Test Scripts

Copy and paste these scripts into the browser console:

#### Test 1: Backend Routing
```javascript
// Copy content from: test-backend-routing.js
// Paste into console and press Enter
```

#### Test 2: Fallback Behavior
```javascript
// Copy content from: test-fallback.js
// Paste into console and press Enter
```

#### Test 3: Error Scenarios
```javascript
// Copy content from: test-error-scenarios.js
// Paste into console and press Enter
```

#### Test 4: Token Pairs
```javascript
// Copy content from: test-token-pairs.js
// Paste into console and press Enter
```

## Quick Test Checklist

### ✅ Backend Routing Test (5 minutes)
1. Generate quote: 100 USDC → USDT
2. Check for green "✓ Backend Routing" badge
3. Check for backend reason text
4. Check console for backend logs
5. Verify shard selection

### ✅ Fallback Test (10 minutes)
1. Edit `.env.local`: Set invalid backend URL
2. Restart server
3. Generate quote: 100 USDC → USDT
4. Check for yellow "⚠ Local Routing" badge
5. Check console for fallback warning
6. Restore `.env.local` and restart

### ✅ Error Test (5 minutes)
1. Test large amount: 1,000,000 USDC
2. Check for high impact warning
3. Verify no crashes
4. Check console logs

### ✅ Token Pairs Test (15 minutes)
1. Test USDC → USDT: 10, 100, 1000
2. Test USDC → SOL: 10, 100, 1000
3. Test SOL → USDC: 1
4. Test USDT → USDC: 100
5. Record shard selections

## Quick Verification

### Backend Routing Working?
- [ ] Green badge visible
- [ ] Backend reason shown
- [ ] Console shows "🌐 Backend Routing Request"
- [ ] Console shows "✅ Backend Routing Successful"

### Fallback Working?
- [ ] Yellow badge visible
- [ ] Console shows "⚠️ Backend Routing Failed"
- [ ] Quote still generated
- [ ] Local routing used

### Error Handling Working?
- [ ] Large amounts handled
- [ ] High impact warning shown
- [ ] No crashes
- [ ] Errors logged properly

### UI Working?
- [ ] Routing badges display correctly
- [ ] Colors are correct (green/yellow)
- [ ] Icons show (✓/⚠)
- [ ] Tooltips work
- [ ] Quote information complete

## Quick Issue Reporting

If you find issues, note:
1. What you were testing
2. What you expected
3. What actually happened
4. Console error messages
5. Screenshots (if applicable)

## Quick Commands

### Check Backend API
```bash
curl http://saigreen.cloud:3000/api/health
```

### View Environment Config
```bash
cat .env.local | grep SAMM_ROUTER
```

### Restart Server
```bash
# Press Ctrl+C to stop
npm run dev
```

## Quick Tips

- Keep console open at all times
- Clear console between tests (Ctrl+L)
- Take screenshots of interesting results
- Document unexpected behavior
- Test systematically, one thing at a time

## Quick Links

- Full Testing Guide: `MANUAL_TESTING_GUIDE.md`
- Test Scripts: `test-*.js` files
- Results Template: `TEST_RESULTS_SUMMARY.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`

## Time Estimate

- Quick smoke test: 10 minutes
- Basic functionality test: 30 minutes
- Comprehensive test: 1-2 hours
- Full test with documentation: 2-3 hours

## Need Help?

1. Check `MANUAL_TESTING_GUIDE.md` for detailed instructions
2. Review console logs for error details
3. Check `requirements.md` for expected behavior
4. Review `design.md` for technical details

---

**Quick Test Status**: Ready to execute  
**Estimated Time**: 30-120 minutes depending on depth  
**Prerequisites**: Dev server running, wallet connected (optional)
