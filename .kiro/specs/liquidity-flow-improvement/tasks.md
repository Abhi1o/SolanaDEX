# Implementation Plan

- [x] 1. Create TokenSelectorCard component with dual states

  - Create a new component that handles both expanded (token selection) and minimized (selected token display) states
  - Implement smooth animations between states using Framer Motion
  - Include token logo display, search functionality, and click-to-expand behavior
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 5.1, 5.2, 5.3_

- [x] 1.1 Create TokenSelectorCard component file and basic structure

  - Create `src/components/pools/TokenSelectorCard.tsx` with TypeScript interface
  - Define props: label, selectedToken, availableTokens, isExpanded, onTokenSelect, onToggleExpand, disabled, excludeToken
  - Set up component state for search query
  - _Requirements: 2.1, 2.2_

- [x] 1.2 Implement expanded state with token list and search

  - Create token list UI with search input field
  - Implement search filtering logic to filter tokens by symbol or name
  - Add token option items with logos, symbols, and names
  - Implement click handlers for token selection
  - Apply glassmorphism styling consistent with premium UI
  - _Requirements: 2.1, 4.1, 4.2_

- [x] 1.3 Implement minimized state with selected token display

  - Create compact display showing selected token logo and symbol
  - Add expand indicator (chevron icon)
  - Implement click handler to re-expand selector
  - Apply hover effects for interactivity
  - _Requirements: 2.3, 2.4, 4.2_

- [x] 1.4 Add animations for expand/collapse transitions

  - Implement Framer Motion animations for height and opacity changes
  - Use Apple-like easing [0.25, 0.4, 0.25, 1] for smooth transitions
  - Set animation duration to 300ms
  - Add token logo fade-in animation when selected
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 1.5 Add accessibility features to TokenSelectorCard

  - Add ARIA labels: role="combobox", aria-expanded, aria-label, aria-controls
  - Implement keyboard navigation: Arrow keys for list, Enter to select, Escape to close
  - Add focus management to move focus appropriately
  - Ensure proper tab order
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 2. Create AmountInputCard component with expandable state

  - Create a new component that expands to show amount input fields after both tokens are selected
  - Include input fields for both tokens with MAX buttons, balance displays, and pool information
  - Implement real-time amount calculations and validation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2.1 Create AmountInputCard component file and structure

  - Create `src/components/pools/AmountInputCard.tsx` with TypeScript interface
  - Define props: isExpanded, tokenA, tokenB, amountA, amountB, balanceA, balanceB, poolRatio, onAmountAChange, onAmountBChange, onMaxA, onMaxB, lpTokensToReceive, shareOfPool, priceImpact, validationErrors
  - Set up component to handle collapsed and expanded states
  - _Requirements: 3.1, 3.2_

- [x] 2.2 Implement collapsed state placeholder

  - Create minimal collapsed state showing "Select both tokens to continue..."
  - Apply glassmorphism styling
  - Set initial height to 0 or minimal height
  - _Requirements: 3.1_

- [x] 2.3 Implement expanded state with amount input fields

  - Create input fields for both token amounts with token logos
  - Add MAX buttons next to each input field
  - Display balance information below each input
  - Apply glassmorphism styling to inputs with focus states
  - Implement input validation (numbers only, decimal support)
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.3, 7.3, 7.4_

- [x] 2.4 Add pool information display section

  - Create info card showing LP tokens to receive, share of pool, and price impact
  - Use gradient styling for values
  - Add color coding for price impact (green < 5%, yellow 5-15%, red > 15%)
  - Update values in real-time as amounts change
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2.5 Implement expand/collapse animation

  - Add Framer Motion animation for height and opacity
  - Animate from height: 0, opacity: 0 to height: auto, opacity: 1
  - Use 400ms duration with Apple-like easing
  - Add slight delay to opacity fade-in (100ms after height animation starts)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.6 Add accessibility features to AmountInputCard

  - Add ARIA labels: role="spinbutton", aria-label, aria-describedby, aria-invalid
  - Add aria-live="polite" to pool info section for screen reader announcements
  - Ensure keyboard navigation works correctly
  - Add focus indicators to all interactive elements
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3. Update LiquidityPage to use new components and flow

  - Refactor the Add Liquidity section to use TokenSelectorCard and AmountInputCard components
  - Remove modal-based flow and implement inline progressive disclosure
  - Orchestrate state management for the new flow
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3.1 Remove modal-based implementation

  - Remove `showAddModal` state and related modal logic
  - Remove `AddLiquidity` modal component import and usage
  - Keep the modal component file for potential future use, but remove from page
  - _Requirements: 1.1_

- [x] 3.2 Add new state management for progressive flow

  - Add state for token selector expansion: tokenASelectorExpanded, tokenBSelectorExpanded
  - Add state for amount input expansion: amountInputExpanded
  - Add state for selected tokens: selectedTokenA, selectedTokenB (already exists, enhance)
  - Add state for amounts: amountA, amountB
  - Add state for calculated values: lpTokensToReceive, shareOfPool, priceImpact
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 3.3 Implement token selection handlers

  - Create handleTokenASelect function that minimizes selector and checks if both tokens selected
  - Create handleTokenBSelect function that minimizes selector and checks if both tokens selected
  - When both tokens selected, automatically expand amount input card
  - Create handlers to re-expand selectors when clicked in minimized state
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2, 6.3_

- [x] 3.4 Implement amount calculation logic

  - Create calculateAmountB function based on pool ratio and amountA
  - Create calculateAmountA function based on pool ratio and amountB
  - Implement real-time calculation as user types
  - Calculate LP tokens to receive using constant product formula
  - Calculate share of pool percentage
  - Calculate price impact
  - _Requirements: 7.1, 7.2, 7.5, 8.1, 8.2, 8.3_

- [x] 3.5 Implement validation logic

  - Validate amounts don't exceed available balances
  - Validate amounts are positive numbers
  - Validate sufficient SOL for transaction fees
  - Validate price impact is within acceptable range (< 15%)
  - Display validation errors inline below input fields
  - _Requirements: 7.3, 7.4_

- [x] 3.6 Integrate TokenSelectorCard components into page

  - Replace existing token select dropdowns with TokenSelectorCard components
  - Pass appropriate props: label, selectedToken, availableTokens, isExpanded, handlers
  - Implement excludeToken logic to prevent selecting same token twice
  - Position cards with proper spacing
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2_

- [x] 3.7 Integrate AmountInputCard component into page

  - Add AmountInputCard component below token selectors
  - Pass all required props: tokens, amounts, balances, pool data, handlers
  - Implement amount change handlers that trigger calculations
  - Implement MAX button handlers to fill with full balance
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.8 Implement Add Liquidity transaction logic

  - Move transaction logic from modal to inline button handler
  - Reuse existing liquidity service and transaction handling
  - Show loading state during transaction
  - Handle success: reset form, show success feedback
  - Handle errors: display error message, allow retry
  - _Requirements: 1.5, 8.4, 8.5_

- [x] 3.9 Add visual hierarchy and emphasis

  - Use opacity and scale to de-emphasize completed steps
  - Highlight current active step with brighter colors or glow
  - Ensure clear top-to-bottom flow: token selection → amount input → action button
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Implement mobile responsiveness

  - Ensure all components work seamlessly on mobile devices
  - Optimize touch targets and spacing for mobile
  - Test on various screen sizes
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 4.1 Add responsive styling to TokenSelectorCard

  - Ensure full width on mobile (< 768px)
  - Increase touch target sizes to minimum 44x44px
  - Adjust padding and spacing for mobile
  - Test token list scrolling on mobile
  - _Requirements: 10.1, 10.2_

- [x] 4.2 Add responsive styling to AmountInputCard

  - Ensure full width on mobile
  - Increase font size for amount inputs (18px on mobile)
  - Make MAX buttons larger and more touch-friendly
  - Stack pool info vertically on mobile
  - _Requirements: 10.1, 10.2, 10.4_

- [x] 4.3 Optimize animations for mobile performance

  - Reduce animation duration slightly on mobile (250ms instead of 300ms)
  - Test animation performance on lower-end mobile devices
  - Ensure no layout shifts during animations
  - _Requirements: 10.3, 10.5_

- [x] 4.4 Add mobile-specific input handling

  - Show numeric keyboard for amount inputs on mobile
  - Ensure proper input type and inputMode attributes
  - Test input behavior on iOS and Android
  - _Requirements: 10.1, 10.2_

- [x] 5. Polish and refinement

  - Add final touches, test edge cases, and ensure smooth user experience
  - _Requirements: All requirements_

- [x] 5.1 Add loading and empty states

  - Show skeleton loader while fetching token balances
  - Show empty state if no tokens available
  - Show loading spinner during transaction
  - _Requirements: 1.4, 1.5_

- [x] 5.2 Add success and error feedback

  - Show success animation after successful liquidity addition
  - Show error messages with retry options
  - Add toast notifications for important events
  - _Requirements: 1.5_

- [x] 5.3 Implement focus management

  - Auto-focus search input when token selector expands
  - Auto-focus first amount input when amount card expands
  - Manage focus after token selection
  - _Requirements: 9.1, 9.2_

- [x] 5.4 Add keyboard shortcuts

  - Implement Enter to select token / submit form
  - Implement Escape to close expanded selector / clear input
  - Implement Arrow keys for token list navigation
  - _Requirements: 9.1, 9.2_

- [x] 5.5 Test and fix edge cases

  - Test with tokens that have no logo (fallback display)
  - Test with very large and very small amounts
  - Test with pools that have extreme ratios
  - Test rapid token switching
  - Test network errors and recovery
  - _Requirements: All requirements_

- [ ]\* 6. Testing and quality assurance

  - Comprehensive testing of the new liquidity flow
  - _Requirements: All requirements_

- [ ]\* 6.1 Write unit tests for TokenSelectorCard

  - Test expand/collapse behavior
  - Test token selection logic
  - Test search filtering
  - Test keyboard navigation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]\* 6.2 Write unit tests for AmountInputCard

  - Test amount input validation
  - Test MAX button functionality
  - Test pool calculations
  - Test error display
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]\* 6.3 Write integration tests for full flow

  - Test complete flow: select tokens → enter amounts → add liquidity
  - Test error scenarios: insufficient balance, high price impact
  - Test state management through entire flow
  - _Requirements: All requirements_

- [ ]\* 6.4 Perform accessibility testing

  - Test with keyboard navigation only
  - Test with screen readers (NVDA, JAWS, VoiceOver)
  - Verify ARIA labels and announcements
  - Check color contrast ratios
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 6.5 Perform cross-browser and device testing
  - Test on Chrome, Firefox, Safari, Edge
  - Test on iOS and Android mobile devices
  - Test on various screen sizes (mobile, tablet, desktop)
  - Verify animations work smoothly across browsers
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
