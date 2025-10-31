# Quick Deployment Guide

## 🚀 Deploy in 5 Minutes

### Prerequisites
- Node.js 20+ installed
- Vercel or Netlify account
- Solana RPC endpoint (for production, use premium provider)

### Step 1: Configure Environment Variables

Create `.env.production` or configure in your deployment platform:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag/v6
```

### Step 2: Run Pre-deployment Check

```bash
npm run predeploy
```

This will:
- ✓ Check environment configuration
- ✓ Run linting
- ✓ Run tests
- ✓ Verify build
- ✓ Check security
- ✓ Validate deployment config

### Step 3: Deploy

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
npm run vercel:deploy
```

#### Option B: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy to production
npm run netlify:deploy
```

#### Option C: Automated Script

```bash
# Make script executable (first time only)
chmod +x scripts/deploy.sh

# Deploy
npm run deploy
```

### Step 4: Verify Deployment

1. Visit your deployment URL
2. Test wallet connection
3. Verify network is mainnet-beta
4. Test a small swap transaction
5. Check error tracking dashboard (if configured)

## 🔧 Configuration Checklist

- [ ] Environment variables configured
- [ ] RPC endpoint is premium provider (not public)
- [ ] Network set to `mainnet-beta`
- [ ] Error tracking enabled (optional but recommended)
- [ ] Analytics configured (optional)
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate active
- [ ] Security headers enabled

## 📊 Monitoring

After deployment, monitor:

- **Error Tracking**: Check Sentry dashboard (if configured)
- **Analytics**: Monitor user interactions
- **RPC Health**: Ensure RPC endpoints are responding
- **Transaction Success Rate**: Track swap success/failure rates

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables Not Working
- Ensure variables are prefixed with `NEXT_PUBLIC_`
- Restart deployment after changing variables
- Check deployment platform's environment variable settings

### Wallet Connection Issues
- Verify RPC endpoint is accessible
- Check network is set correctly
- Ensure CORS is configured properly

## 📚 Full Documentation

For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔄 CI/CD

Automatic deployments are configured via GitHub Actions:
- **Pull Requests**: Deploy preview
- **Push to main**: Deploy to production
- **Push to develop**: Deploy to staging

See [.github/README.md](./.github/README.md) for CI/CD details.

## 🎯 Production Best Practices

1. **Use Premium RPC**: Don't use public endpoints in production
2. **Enable Error Tracking**: Configure Sentry for monitoring
3. **Set Up Analytics**: Track user behavior and issues
4. **Monitor Performance**: Use Vercel Analytics or similar
5. **Test Thoroughly**: Always test on devnet first
6. **Have Rollback Plan**: Know how to revert if issues occur

## 📞 Support

- Next.js: https://nextjs.org/docs
- Solana: https://docs.solana.com/
- Vercel: https://vercel.com/docs
- Netlify: https://docs.netlify.com/

---

**Ready to deploy?** Run `npm run predeploy` to start! 🚀
