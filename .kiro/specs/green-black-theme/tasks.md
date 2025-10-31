# Implementation Plan: Green and Black Theme

- [ ] 1. Update global CSS variables and base styles
  - Modify `src/app/globals.css` to define green and black color variables
  - Update root CSS custom properties with new color palette
  - Change body background to black and text to light colors
  - Update scrollbar colors to match green/black theme
  - _Requirements: 1.1, 1.2, 1.5, 4.1, 4.2_

- [ ] 2. Update glassmorphism utility classes
  - Modify `src/styles/glassmorphism.css` to use green-tinted backgrounds
  - Update glass effect borders to use green with transparency
  - Change gradient overlays from blue/purple/pink to green variations
  - Update hover states to enhance green tint
  - _Requirements: 1.1, 1.2, 1.4, 3.2_

- [ ] 3. Update animation and transition styles
  - Review `src/styles/animations.css` for any color-specific animations
  - Update shimmer effect to use green highlights if applicable
  - Ensure all animations work with new color scheme
  - _Requirements: 1.4, 3.2_

- [ ] 4. Update swap interface components
  - Modify `src/components/swap/ShardedSwapInterface.tsx` styling classes
  - Update card backgrounds to black variations
  - Change button colors to green primary
  - Update input borders to green
  - Ensure token selector uses green accents
  - _Requirements: 1.1, 1.2, 3.2, 3.3, 4.1_

- [ ] 5. Update swap modal components
  - Modify `src/components/swap/SwapSuccessModal.tsx` to use green/black theme
  - Update `src/components/swap/SwapConfirmationModal.tsx` styling
  - Update `src/components/swap/SwapErrorModal.tsx` styling
  - Change modal backgrounds to dark black with green borders
  - Update success indicators to use bright green
  - _Requirements: 1.1, 1.2, 3.4, 4.4_

- [ ] 6. Update liquidity page and components
  - Modify `src/app/liquidity/page.tsx` styling
  - Update `src/components/pools/AddLiquidity.tsx` to use green/black theme
  - Update `src/components/pools/RemoveLiquidity.tsx` styling
  - Update `src/components/pools/PoolCreator.tsx` styling
  - Change form backgrounds and borders to match theme
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3_

- [ ] 7. Update pool list and details components
  - Modify `src/components/pools/PoolList.tsx` card styling
  - Update `src/components/pools/PoolDetails.tsx` to use green accents
  - Change table headers and rows to black backgrounds with green borders
  - Update pool statistics to use green highlights
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.3_

- [ ] 8. Update token components
  - Modify `src/components/tokens/TokenSelector.tsx` styling
  - Update `src/components/tokens/TokenList.tsx` to use green/black theme
  - Update `src/components/tokens/TokenPortfolio.tsx` card styling
  - Change token balance displays to use green for positive values
  - Update `src/components/tokens/BalanceChangeNotification.tsx` colors
  - _Requirements: 1.1, 1.2, 3.2, 4.4_

- [ ] 9. Update navigation components
  - Modify `src/components/ui/ResponsiveNav.tsx` to use black background
  - Update `src/components/ui/MobileNav.tsx` styling
  - Change active navigation items to green highlight
  - Update hover states to show green underline or background
  - _Requirements: 1.1, 1.2, 3.5, 4.3_

- [ ] 10. Update UI utility components
  - Modify `src/components/ui/PremiumCard.tsx` to use green/black theme
  - Update `src/components/ui/GradientButton.tsx` gradients to green variations
  - Update `src/components/ui/StatusBadge.tsx` to use green for success states
  - Update `src/components/ui/LoadingSpinner.tsx` to use green color
  - Update `src/components/ui/ProgressBar.tsx` to use green fill
  - _Requirements: 1.1, 1.2, 1.5, 3.2, 3.3, 4.4_

- [ ] 11. Update account and portfolio pages
  - Modify `src/app/account/page.tsx` styling
  - Update `src/app/portfolio/page.tsx` styling
  - Update `src/components/account/UnifiedAccountDashboard.tsx` to use green/black theme
  - Update `src/components/portfolio/PortfolioDashboard.tsx` card styling
  - Update `src/components/portfolio/PortfolioChart.tsx` to use green for chart elements
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.3_

- [ ] 12. Update transaction components
  - Modify `src/components/transactions/TransactionList.tsx` styling
  - Update `src/components/transactions/TransactionDetails.tsx` to use green/black theme
  - Update `src/components/ui/TransactionProgress.tsx` to use green progress indicators
  - Change transaction status colors to use green variations
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.4_

- [ ] 13. Update wallet components
  - Modify `src/components/wallet/WalletConnectButton.tsx` to use green primary color
  - Update `src/components/wallet/SolanaWalletConnector.tsx` modal styling
  - Update `src/components/WalletStatus.tsx` to use green for connected state
  - Change wallet selection cards to black backgrounds with green borders
  - _Requirements: 1.1, 1.2, 3.2, 3.3, 3.4_

- [ ] 14. Update remaining page layouts
  - Modify `src/app/swap/page.tsx` layout styling
  - Update `src/app/pools/page.tsx` layout styling
  - Update `src/app/transactions/page.tsx` layout styling
  - Ensure all page backgrounds are black
  - Ensure all page containers use green accents
  - _Requirements: 1.1, 1.2, 3.1_

- [ ] 15. Update notification and overlay components
  - Modify `src/components/ui/NotificationContainer.tsx` styling
  - Update notification backgrounds to dark black with green borders
  - Update `src/components/ui/LoadingOverlay.tsx` to use black backdrop
  - Ensure overlay text is readable with light colors
  - _Requirements: 1.1, 1.2, 3.4, 4.1_

- [ ] 16. Verify accessibility and contrast
  - Check contrast ratios for all text on backgrounds using browser dev tools
  - Ensure green text meets WCAG AA standards (4.5:1 minimum)
  - Test keyboard navigation with visible green focus indicators
  - Verify high contrast mode still functions properly
  - _Requirements: 1.3, 4.1, 4.2, 4.3_

- [ ] 17. Cross-browser visual verification
  - Test theme appearance in Chrome/Edge
  - Test theme appearance in Firefox
  - Test theme appearance in Safari
  - Test theme appearance on mobile browsers
  - Verify glassmorphism fallbacks work in older browsers
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 18. Functional verification
  - Verify all swap functionality works unchanged
  - Verify all liquidity operations work unchanged
  - Verify all pool operations work unchanged
  - Verify wallet connection works unchanged
  - Verify all navigation and routing works unchanged
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
