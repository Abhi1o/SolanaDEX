# Deployment Guide - Solana DEX Frontend

This guide covers the deployment process for the Solana DEX frontend application to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Platforms](#deployment-platforms)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Checklist](#production-checklist)
- [Monitoring and Analytics](#monitoring-and-analytics)

## Prerequisites

Before deploying, ensure you have:

1. **Node.js 20+** installed
2. **npm** or **yarn** package manager
3. Access to a **Solana RPC provider** (QuickNode, Alchemy, Helius, or Triton recommended for production)
4. **Vercel** or **Netlify** account (for hosting)
5. **GitHub** repository (for CI/CD)

## Environment Variables

### Required Variables

Create a `.env.production` file or configure these in your deployment platform:

```bash
# Solana RPC Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# Fallback RPC endpoints (use premium providers)
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://your-premium-rpc.com
NEXT_PUBLIC_SOLANA_RPC_FALLBACK_1=https://fallback-1.com
NEXT_PUBLIC_SOLANA_RPC_FALLBACK_2=https://fallback-2.com

# Jupiter API
NEXT_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag/v6

# Application
NEXT_PUBLIC_APP_URL=https://your-dex.vercel.app
NEXT_PUBLIC_APP_NAME=Solana DEX
```

### Optional Variables (Recommended for Production)

```bash
# Error Tracking (Sentry)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### RPC Provider Recommendations

For production, use premium RPC providers for better reliability:

- **QuickNode**: https://www.quicknode.com/
- **Alchemy**: https://www.alchemy.com/
- **Helius**: https://www.helius.dev/
- **Triton**: https://triton.one/

## Deployment Platforms

### Vercel (Recommended)

#### Quick Deploy

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # Preview deployment
   vercel
   
   # Production deployment
   vercel --prod
   ```

#### Using Vercel Dashboard

1. Import your GitHub repository
2. Configure environment variables in project settings
3. Deploy automatically on push to main branch

#### Configuration

The `vercel.json` file is already configured with:
- Build optimization
- Security headers
- Environment variable references

### Netlify

#### Quick Deploy

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Deploy**:
   ```bash
   # Preview deployment
   netlify deploy
   
   # Production deployment
   netlify deploy --prod
   ```

#### Using Netlify Dashboard

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Add environment variables
4. Deploy

#### Configuration

The `netlify.toml` file is configured with:
- Next.js plugin
- Security headers
- Environment-specific settings

### Custom Deployment Script

Use the provided deployment script for automated deployments:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging
```

## CI/CD Pipeline

### GitHub Actions

The project includes a complete CI/CD pipeline (`.github/workflows/ci-cd.yml`) that:

1. **Lints** code on every push and PR
2. **Runs tests** to ensure code quality
3. **Builds** the application
4. **Deploys previews** for pull requests
5. **Deploys to production** on main branch merges

#### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
NEXT_PUBLIC_SOLANA_RPC_URL=your-rpc-url
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag/v6
```

#### Getting Vercel Tokens

1. Go to Vercel Dashboard → Settings → Tokens
2. Create a new token
3. Get your Org ID and Project ID from project settings

## Production Checklist

Before deploying to production, verify:

### Security

- [ ] All environment variables are properly configured
- [ ] No sensitive data in code or commits
- [ ] Security headers are enabled (CSP, X-Frame-Options, etc.)
- [ ] HTTPS is enforced
- [ ] Content Security Policy allows only necessary domains

### Performance

- [ ] Production build completes without errors
- [ ] Bundle size is optimized (check with `npm run build`)
- [ ] Images are optimized
- [ ] Code splitting is working correctly
- [ ] Lazy loading is implemented for heavy components

### Functionality

- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Wallet connection works on mainnet
- [ ] Swap functionality works with real tokens
- [ ] Pool creation and management work correctly
- [ ] Transaction tracking is accurate

### Monitoring

- [ ] Error tracking is configured (Sentry or similar)
- [ ] Analytics is set up
- [ ] Performance monitoring is enabled
- [ ] Logging is configured for debugging

### RPC Configuration

- [ ] Primary RPC endpoint is a premium provider
- [ ] Fallback RPC endpoints are configured
- [ ] Rate limits are appropriate for expected traffic
- [ ] Network is set to `mainnet-beta`

## Monitoring and Analytics

### Error Tracking with Sentry

1. **Create Sentry Account**: https://sentry.io/
2. **Create New Project**: Select Next.js
3. **Get DSN**: Copy your project DSN
4. **Configure Environment Variable**:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
   ```

### Analytics Integration

The application includes analytics tracking for:
- Wallet connections/disconnections
- Transaction events (swaps, pool creation, etc.)
- Page views
- Error occurrences

Configure your analytics provider:
```bash
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Monitoring Checklist

- [ ] Error tracking is receiving events
- [ ] Analytics is tracking user interactions
- [ ] Transaction success/failure rates are monitored
- [ ] RPC endpoint health is monitored
- [ ] Application performance metrics are tracked

## Troubleshooting

### Build Failures

**Issue**: Build fails with module not found errors
**Solution**: Run `npm ci` to ensure clean dependency installation

**Issue**: TypeScript errors during build
**Solution**: Run `npm run lint` locally to identify and fix type errors

### Deployment Issues

**Issue**: Environment variables not working
**Solution**: Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access

**Issue**: Wallet connection fails in production
**Solution**: Check that RPC endpoints are accessible and not rate-limited

### Performance Issues

**Issue**: Slow page loads
**Solution**: 
- Check bundle size with `npm run build`
- Verify code splitting is working
- Use premium RPC providers
- Enable caching

## Support and Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Solana Documentation**: https://docs.solana.com/
- **Vercel Documentation**: https://vercel.com/docs
- **Netlify Documentation**: https://docs.netlify.com/

## Post-Deployment

After successful deployment:

1. **Test all functionality** on production URL
2. **Monitor error tracking** for any issues
3. **Check analytics** to ensure tracking works
4. **Verify RPC endpoints** are responding correctly
5. **Test wallet connections** with different wallet providers
6. **Perform test transactions** on mainnet (with small amounts)

## Rollback Procedure

If issues occur in production:

### Vercel
```bash
vercel rollback
```

### Netlify
```bash
netlify rollback
```

### Manual Rollback
1. Revert the problematic commit in Git
2. Push to main branch
3. CI/CD will automatically deploy the previous version

---

**Note**: Always test thoroughly on devnet/testnet before deploying to mainnet production.
