# Liquidity Flow Improvement Design Document

## Overview

This design document outlines the transformation of the liquidity addition interface from a modal-based popup flow to a seamless, single-screen progressive disclosure experience. The new design eliminates context switching by keeping users on the same screen throughout the entire process, with interface elements that expand and collapse intelligently based on user actions.

The key design principles are:
- **Progressive Disclosure**: Show information and controls as they become relevant
- **Visual Continuity**: Smooth transitions without jarring modal popups
- **Clear Hierarchy**: Guide users through steps with visual emphasis
- **Minimal Cognitive Load**: Reduce decision fatigue by revealing options progressively

## Architecture

### Component Structure

```
LiquidityPage
├── Background Gradients (existing)
├── Page Header (existing)
└── Add Liquidity Section (enhanced)
    ├── TokenSelectorCard (new component)
    │   ├── Expanded State (dropdown with search)
    │   └── Minimized State (selected token display)
    ├── TokenSelectorCard (second token)
    ├── AmountInputCard (new component)
    │   ├── Collapsed State (hidden/minimal)
    │   └── Expanded State (full input form)
    └── PoolInfoCard (existing, enhanced)
```

### State Management

```typescript
interface LiquidityFlowState {
  // Token selection
  selectedTokenA: Token | null;
  selectedTokenB: Token | null;
  tokenASelectorExpanded: boolean;
  tokenBSelectorExpanded: boolean;
  
  // Amount input
  amountInputExpanded: boolean;
  amountA: string;
  amountB: string;
  
  // Calculated values
  lpTokensToReceive: bigint;
  shareOfPool: number;
  priceImpact: number;
  
  // UI state
  isProcessing: boolean;
  error: string | null;
}
```

## Components and Interfaces

### 1. TokenSelectorCard Component

A dual-state component that shows either a token selector or a minimized selected token display.

```typescript
interface TokenSelectorCardProps {
  label: string; // "First Token" or "Second Token"
  selectedToken: Token | null;
  availableTokens: Token[];
  isExpanded: boolean;
  onTokenSelect: (token: Token) => void;
  onToggleExpand: () => void;
  disabled?: boolean;
  excludeToken?: string; // Mint address to exclude (the other selected token)
}

// Component States:
// 1. Expanded (no selection): Full dropdown with search
// 2. Expanded (with selection): Full dropdown showing current selection
// 3. Minimized (with selection): Compact display with token logo and symbol
```

**Expanded State Layout:**
```
┌─────────────────────────────────────┐
│ First Token                         │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Search tokens...             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [Logo] USDT - Tether USD        │ │
│ │ [Logo] USDC - USD Coin          │ │
│ │ [Logo] SOL - Solana             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Minimized State Layout:**
```
┌─────────────────────────────────────┐
│ [Logo] USDT - Tether USD        [▼] │
└─────────────────────────────────────┘
```

### 2. AmountInputCard Component

An expandable card that reveals amount input fields after both tokens are selected.

```typescript
interface AmountInputCardProps {
  isExpanded: boolean;
  tokenA: Token;
  tokenB: Token;
  amountA: string;
  amountB: string;
  balanceA: bigint;
  balanceB: bigint;
  poolRatio: number;
  onAmountAChange: (value: string) => void;
  onAmountBChange: (value: string) => void;
  onMaxA: () => void;
  onMaxB: () => void;
  lpTokensToReceive: bigint;
  shareOfPool: number;
  priceImpact: number;
  validationErrors: Record<string, string>;
}

// Component States:
// 1. Collapsed: Hidden or minimal placeholder
// 2. Expanding: Smooth animation revealing content
// 3. Expanded: Full input form with all details
```

**Collapsed State:**
```
┌─────────────────────────────────────┐
│ Select both tokens to continue...   │
└─────────────────────────────────────┘
```

**Expanded State Layout:**
```
┌─────────────────────────────────────┐
│ Enter Amounts                       │
│                                     │
│ [Logo] USDT Amount                  │
│ ┌─────────────────────────────────┐ │
│ │ 0.0                        [MAX] │ │
│ └─────────────────────────────────┘ │
│ Balance: 493,176.75 USDT            │
│                                     │
│ [Logo] USDC Amount                  │
│ ┌─────────────────────────────────┐ │
│ │ 0.0                        [MAX] │ │
│ └─────────────────────────────────┘ │
│ Balance: 500,000.00 USDC            │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ℹ️ Liquidity Details             │ │
│ │ LP Tokens: 496,588.37           │ │
│ │ Share of Pool: 0.0012%          │ │
│ │ Price Impact: 0.05%             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Add Liquidity Button]              │
└─────────────────────────────────────┘
```

### 3. Enhanced LiquidityPage Layout

The main page component orchestrates the flow.

```typescript
// Page flow logic
const handleTokenASelect = (token: Token) => {
  setSelectedTokenA(token);
  setTokenASelectorExpanded(false); // Minimize after selection
  
  // If both tokens selected, expand amount input
  if (selectedTokenB) {
    setAmountInputExpanded(true);
  }
};

const handleTokenBSelect = (token: Token) => {
  setSelectedTokenB(token);
  setTokenBSelectorExpanded(false); // Minimize after selection
  
  // If both tokens selected, expand amount input
  if (selectedTokenA) {
    setAmountInputExpanded(true);
  }
};

const handleTokenSelectorClick = (selector: 'A' | 'B') => {
  // Allow re-expanding to change selection
  if (selector === 'A') {
    setTokenASelectorExpanded(true);
  } else {
    setTokenBSelectorExpanded(true);
  }
};
```

## Data Models

### Token Selection State

```typescript
interface TokenSelectionState {
  token: Token | null;
  isExpanded: boolean;
  searchQuery: string;
}

interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}
```

### Amount Input State

```typescript
interface AmountInputState {
  amountA: string;
  amountB: string;
  isExpanded: boolean;
  validationErrors: {
    amountA?: string;
    amountB?: string;
    general?: string;
    priceImpact?: string;
    solBalance?: string;
  };
}
```

### Calculated Pool Data

```typescript
interface PoolCalculations {
  lpTokensToReceive: bigint;
  shareOfPool: number; // Percentage
  priceImpact: number; // Percentage
  poolRatio: number; // TokenA per TokenB
  estimatedFee: bigint; // SOL
}
```

## Animation Specifications

### Token Selector Minimize Animation

```typescript
const minimizeAnimation = {
  initial: { height: 'auto', opacity: 1 },
  animate: { 
    height: 64, // Minimized height
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.4, 0.25, 1] // Apple-like easing
    }
  }
};
```

### Token Selector Expand Animation

```typescript
const expandAnimation = {
  initial: { height: 64 },
  animate: { 
    height: 'auto',
    transition: {
      duration: 0.3,
      ease: [0.25, 0.4, 0.25, 1]
    }
  }
};
```

### Amount Input Card Expand Animation

```typescript
const amountCardExpandAnimation = {
  initial: { 
    height: 0, 
    opacity: 0,
    marginTop: 0
  },
  animate: { 
    height: 'auto',
    opacity: 1,
    marginTop: 16, // 1rem spacing
    transition: {
      height: {
        duration: 0.4,
        ease: [0.25, 0.4, 0.25, 1]
      },
      opacity: {
        duration: 0.3,
        delay: 0.1 // Fade in slightly after height animation starts
      }
    }
  }
};
```

### Token Logo Fade In

```typescript
const logoFadeIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.4, 0.25, 1]
    }
  }
};
```

## Visual Design Specifications

### Token Selector Card Styling

**Expanded State:**
```css
.token-selector-expanded {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 24px;
}

.token-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.token-option:hover {
  background: rgba(255, 255, 255, 0.08);
}

.token-option-selected {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.5);
}
```

**Minimized State:**
```css
.token-selector-minimized {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
}

.token-selector-minimized:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}
```

### Amount Input Card Styling

```css
.amount-input-card {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 24px;
  overflow: hidden;
}

.amount-input-field {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  font-size: 24px;
  font-weight: 300;
  color: white;
  transition: all 0.2s ease;
}

.amount-input-field:focus {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(255, 255, 255, 0.08);
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.max-button {
  background: linear-gradient(to right, #3b82f6, #8b5cf6);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.max-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
```

### Token Logo Display

```css
.token-logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.token-logo-large {
  width: 48px;
  height: 48px;
}

.token-logo-small {
  width: 24px;
  height: 24px;
}

.token-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.token-logo-fallback {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}
```

## User Flow Diagram

```
┌─────────────────────────────────────┐
│ 1. Initial State                    │
│ - Token A Selector: Expanded        │
│ - Token B Selector: Collapsed       │
│ - Amount Input: Hidden              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Token A Selected                 │
│ - Token A Selector: Minimized       │
│ - Token B Selector: Expanded        │
│ - Amount Input: Hidden              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Both Tokens Selected             │
│ - Token A Selector: Minimized       │
│ - Token B Selector: Minimized       │
│ - Amount Input: Expanding (animated)│
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Amount Input Active              │
│ - Token A Selector: Minimized       │
│ - Token B Selector: Minimized       │
│ - Amount Input: Expanded            │
│ - User enters amounts               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Ready to Add Liquidity           │
│ - All fields valid                  │
│ - Pool info displayed               │
│ - Add Liquidity button enabled      │
└─────────────────────────────────────┘
```

## Interaction Patterns

### Token Selection Interaction

1. **Initial Load**: First token selector is expanded, second is collapsed
2. **First Token Selection**: 
   - Animate first selector to minimized state
   - Expand second selector with animation
   - Focus moves to second selector
3. **Second Token Selection**:
   - Animate second selector to minimized state
   - Expand amount input card with animation
   - Focus moves to first amount input field
4. **Change Token Selection**:
   - Click on minimized selector to re-expand
   - Other elements remain in current state
   - After new selection, minimize again

### Amount Input Interaction

1. **Auto-calculation**: When user types in one field, calculate the other based on pool ratio
2. **MAX Button**: Fill field with maximum available balance
3. **Real-time Validation**: Show errors immediately as user types
4. **Pool Info Update**: Update LP tokens, share, and price impact in real-time

### Visual Feedback

1. **Hover States**: Subtle scale and brightness changes
2. **Focus States**: Blue glow and border color change
3. **Loading States**: Spinner and disabled state during transaction
4. **Success State**: Brief success animation before closing
5. **Error States**: Red border and error message display

## Error Handling

### Validation Errors

```typescript
interface ValidationError {
  field: 'amountA' | 'amountB' | 'general';
  message: string;
  severity: 'error' | 'warning';
}

// Error Display Patterns:
// 1. Inline errors: Below input fields in red text
// 2. Warning banner: Above action button for warnings
// 3. Error banner: Above action button for critical errors
```

### Error States

1. **Insufficient Balance**: Show error below input field, disable button
2. **High Price Impact**: Show warning banner, allow but warn user
3. **No Pool Available**: Show info message, disable button
4. **Network Error**: Show error banner with retry option
5. **Transaction Failed**: Show error modal with details

## Accessibility Considerations

### Keyboard Navigation

```typescript
// Tab order:
// 1. Token A selector (or minimized card)
// 2. Token B selector (or minimized card)
// 3. Amount A input
// 4. MAX button A
// 5. Amount B input
// 6. MAX button B
// 7. Add Liquidity button

// Keyboard shortcuts:
// - Enter: Select highlighted token / Submit form
// - Escape: Close expanded selector / Clear input
// - Arrow keys: Navigate token list
// - Tab: Move to next field
// - Shift+Tab: Move to previous field
```

### ARIA Labels

```typescript
// Token Selector
<div
  role="combobox"
  aria-expanded={isExpanded}
  aria-label={`${label} selector`}
  aria-controls="token-list"
>

// Amount Input
<input
  type="text"
  role="spinbutton"
  aria-label={`${token.symbol} amount`}
  aria-describedby={`${token.symbol}-balance ${token.symbol}-error`}
  aria-invalid={hasError}
/>

// Pool Info
<div
  role="region"
  aria-label="Liquidity details"
  aria-live="polite"
>
```

### Screen Reader Announcements

```typescript
// Announce state changes
const announceTokenSelection = (token: Token) => {
  announce(`${token.symbol} selected. ${token.name}`);
};

const announceAmountCalculation = (amount: string, token: Token) => {
  announce(`Calculated ${amount} ${token.symbol}`);
};

const announceValidationError = (error: string) => {
  announce(`Error: ${error}`, 'assertive');
};
```

## Mobile Responsiveness

### Breakpoints

```typescript
const breakpoints = {
  mobile: '< 768px',
  tablet: '768px - 1024px',
  desktop: '> 1024px'
};
```

### Mobile Adaptations

1. **Token Selector**: Full width, larger touch targets (min 44x44px)
2. **Amount Input**: Larger font size (18px), full-width buttons
3. **Spacing**: Increased padding for touch-friendly interface
4. **Animations**: Slightly faster (0.25s instead of 0.3s) for responsiveness
5. **Keyboard**: Show numeric keyboard for amount inputs on mobile

### Mobile Layout

```
┌─────────────────────┐
│ Token A Selector    │
│ [Minimized/Expanded]│
├─────────────────────┤
│ Token B Selector    │
│ [Minimized/Expanded]│
├─────────────────────┤
│ Amount Input Card   │
│ [Expanded when ready│
│                     │
│ Amount A Input      │
│ Amount B Input      │
│ Pool Info           │
│ Add Liquidity Btn   │
└─────────────────────┘
```

## Performance Optimizations

### Rendering Optimizations

```typescript
// Memoize expensive calculations
const poolRatio = useMemo(() => {
  if (!pool || pool.reserveA === BigInt(0)) return 0;
  return Number(pool.reserveA) / Number(pool.reserveB);
}, [pool]);

// Debounce amount calculations
const debouncedCalculateAmountB = useMemo(
  () => debounce(calculateAmountB, 300),
  [calculateAmountB]
);

// Lazy load token logos
const TokenLogo = lazy(() => import('@/components/tokens/TokenLogo'));
```

### Animation Performance

```typescript
// Use GPU-accelerated properties
const animationStyles = {
  transform: 'translateY(0)', // GPU-accelerated
  opacity: 1, // GPU-accelerated
  // Avoid: height, width, margin (CPU-bound)
};

// Use will-change for animations
.animating-element {
  will-change: transform, opacity;
}

// Remove will-change after animation
useEffect(() => {
  if (!isAnimating) {
    element.style.willChange = 'auto';
  }
}, [isAnimating]);
```

## Testing Strategy

### Unit Tests

1. **TokenSelectorCard**: Test expand/collapse, token selection, search
2. **AmountInputCard**: Test amount calculations, validation, MAX button
3. **Pool Calculations**: Test LP token calculation, price impact, share percentage

### Integration Tests

1. **Full Flow**: Select tokens → Enter amounts → Add liquidity
2. **Error Scenarios**: Insufficient balance, high price impact, network errors
3. **State Management**: Verify state updates correctly through flow

### Visual Regression Tests

1. **Component States**: Capture screenshots of all component states
2. **Animations**: Verify smooth transitions between states
3. **Responsive**: Test on mobile, tablet, and desktop sizes

### Accessibility Tests

1. **Keyboard Navigation**: Verify tab order and keyboard shortcuts
2. **Screen Reader**: Test with NVDA, JAWS, VoiceOver
3. **Color Contrast**: Verify WCAG AA compliance
4. **Focus Management**: Verify focus moves logically through flow

## Implementation Notes

### Migration from Modal

The current implementation uses a modal (`AddLiquidity` component with `Dialog` from Headless UI). The new implementation will:

1. **Remove Modal**: Delete the `showAddModal` state and `AddLiquidity` modal component usage
2. **Inline Components**: Move all functionality inline to the main page
3. **Preserve Logic**: Keep all calculation and validation logic, just change the UI structure
4. **Maintain State**: Use the same state management patterns, just reorganize the UI

### Code Reuse

- **Calculations**: Reuse existing pool ratio, LP token, and price impact calculations
- **Validation**: Reuse existing validation logic from `poolValidation.ts`
- **Token Balances**: Reuse existing balance fetching logic
- **Transaction**: Reuse existing liquidity service and transaction handling

### New Components to Create

1. `TokenSelectorCard.tsx` - Dual-state token selector
2. `AmountInputCard.tsx` - Expandable amount input form
3. Update `LiquidityPage.tsx` - Orchestrate the new flow

### Styling Approach

- Use Tailwind CSS for consistency with existing codebase
- Use Framer Motion for animations (already in use)
- Maintain glassmorphism design language from premium UI spec
- Ensure mobile-first responsive design

