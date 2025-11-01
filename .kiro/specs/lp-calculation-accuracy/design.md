# Design Document: LP Calculation Accuracy

## Overview

This design document outlines the architecture and implementation strategy for fixing LP (Liquidity Provider) token calculations in the frontend to match the SAMM DEX smart contract exactly. The smart contract uses a constant product AMM formula with specific rounding rules that must be replicated precisely to prevent transaction failures and provide accurate estimates to users.

## Architecture

### Current State Analysis

**Existing Implementation Issues:**

1. **Incorrect LP Calculation Formula** (`src/utils/calculations.ts`):
   - Current: Uses `sqrt(amountA * amountB)` for initial deposits
   - Smart Contract: Uses fixed `INITIAL_SWAP_POOL_AMOUNT = 1_000_000_000`
   - Impact: Incorrect LP token estimates for first deposits

2. **Missing Rounding Logic**:
   - Current: No explicit rounding direction handling
   - Smart Contract: Uses ceiling rounding for deposits, floor for withdrawals
   - Impact: Off-by-one errors causing slippage failures

3. **Incomplete Proportional Calculations**:
   - Current: Simple ratio calculation without remainder handling
   - Smart Contract: Checks remainders and adds 1 when needed
   - Impact: Inaccurate token amount estimates

4. **No Per-Shard LP Tracking**:
   - Current: Generic pool interface without shard-specific LP supply
   - Smart Contract: Each shard has independent LP token mint
   - Impact: Cannot accurately calculate LP tokens per shard

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         LP Calculation Service (NEW)                  │  │
│  │  - Matches smart contract formulas exactly            │  │
│  │  - Handles rounding (ceiling/floor)                   │  │
│  │  - Manages precision with BigInt                      │  │
│  │  - Caches reserve data (5s TTL)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Liquidity Service (UPDATED)                   │  │
│  │  - Uses LP Calculation Service                        │  │
│  │  - Fetches fresh reserves before transactions         │  │
│  │  - Applies slippage protection                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Pool Instructions (EXISTING)                  │  │
│  │  - Creates transaction instructions                   │  │
│  │  - Correct discriminators (2 for add, 3 for remove)  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  Solana Blockchain                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SAMM DEX Smart Contract                       │  │
│  │  Program ID: 6QcjKRkeDfA1vQUMGc4eQUFoDTX7snoZZSA1N1SUdb4Z │
│  │                                                        │  │
│  │  Shard 1:                                             │  │
│  │  ├─ Pool State (SwapV1)                              │  │
│  │  ├─ LP Token Mint (unique)                           │  │
│  │  ├─ Token A Reserve                                  │  │
│  │  └─ Token B Reserve                                  │  │
│  │                                                        │  │
│  │  Shard 2:                                             │  │
│  │  ├─ Pool State (SwapV1)                              │  │
│  │  ├─ LP Token Mint (unique)                           │  │
│  │  ├─ Token A Reserve                                  │  │
│  │  └─ Token B Reserve                                  │  │
│  │                                                        │  │
│  │  ... (more shards)                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. LP Calculation Service (NEW)

**File:** `src/services/lpCalculationService.ts`

**Purpose:** Centralized service that replicates smart contract calculation logic exactly.

**Interface:**

```typescript
export interface LPCalculationService {
  // Core calculations matching smart contract
  calculateLPTokensForDeposit(params: DepositCalculationParams): LPTokenResult;
  calculateTokensForLPAmount(params: LPToTokensParams): TokenAmountResult;
  calculateWithdrawalAmounts(params: WithdrawalCalculationParams): TokenAmountResult;
  
  // Single-token deposit (Balancer formula)
  calculateSingleTokenDeposit(params: SingleTokenDepositParams): LPTokenResult;
  
  // Slippage protection
  applySlippageToDeposit(amounts: TokenAmountResult, slippage: number): SlippageProtectedAmounts;
  applySlippageToWithdrawal(amounts: TokenAmountResult, slippage: number): SlippageProtectedAmounts;
  
  // Pool share calculations
  calculatePoolShare(userLPTokens: bigint, totalLPSupply: bigint): number;
  calculateProjectedPoolShare(depositAmount: bigint, currentSupply: bigint): number;
  
  // Validation
  validateDepositAmounts(params: DepositValidationParams): ValidationResult;
  validateWithdrawalAmount(params: WithdrawalValidationParams): ValidationResult;
}

export interface DepositCalculationParams {
  tokenAAmount: bigint;
  tokenBAmount: bigint;
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  isInitialDeposit: boolean;
}

export interface LPToTokensParams {
  lpTokenAmount: bigint;
  lpSupply: bigint;
  reserveA: bigint;
  reserveB: bigint;
  roundDirection: RoundDirection;
}

export interface WithdrawalCalculationParams {
  lpTokenAmount: bigint;
  lpSupply: bigint;
  reserveA: bigint;
  reserveB: bigint;
  withdrawalFeeNumerator: bigint;
  withdrawalFeeDenominator: bigint;
}

export interface SingleTokenDepositParams {
  sourceAmount: bigint;
  sourceReserve: bigint;
  otherReserve: bigint;
  lpSupply: bigint;
  tradeDirection: 'AtoB' | 'BtoA';
}

export interface LPTokenResult {
  lpTokens: bigint;
  actualTokenA: bigint;
  actualTokenB: bigint;
}

export interface TokenAmountResult {
  tokenA: bigint;
  tokenB: bigint;
}

export interface SlippageProtectedAmounts {
  maxTokenA: bigint;
  maxTokenB: bigint;
  minTokenA: bigint;
  minTokenB: bigint;
}

export enum RoundDirection {
  Floor = 'floor',
  Ceiling = 'ceiling',
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

**Key Methods:**

1. **calculateLPTokensForDeposit**
   - Implements: `pool_tokens_to_trading_tokens` (inverse)
   - Formula: `lp_tokens = (token_amount / reserve_amount) × lp_supply`
   - Rounding: Floor (protects pool)
   - Special case: Initial deposit returns `INITIAL_SWAP_POOL_AMOUNT`

2. **calculateTokensForLPAmount**
   - Implements: `pool_tokens_to_trading_tokens`
   - Formula: `token_amount = (lp_tokens / lp_supply) × reserve_amount`
   - Rounding: Ceiling for deposits, Floor for withdrawals
   - Handles remainders: Adds 1 if remainder > 0 and amount > 0

3. **calculateWithdrawalAmounts**
   - Implements: Withdrawal with fees
   - Formula: `token_amount = ((lp_tokens - fee) / lp_supply) × reserve_amount`
   - Rounding: Floor (protects pool)
   - Fee calculation: `fee = lp_tokens × (fee_numerator / fee_denominator)`

4. **calculateSingleTokenDeposit**
   - Implements: Balancer formula
   - Formula: `lp_tokens = lp_supply × (√(1 + ratio) - 1)`
   - Where: `ratio = source_amount / source_reserve`
   - Rounding: Floor

### 2. Updated Liquidity Service

**File:** `src/services/liquidityService.ts` (UPDATED)

**Changes:**

1. **Import LP Calculation Service:**
```typescript
import { LPCalculationService } from './lpCalculationService';
```

2. **Add LP Calculator Instance:**
```typescript
private lpCalculator: LPCalculationService;

constructor(connection: Connection, programId?: string) {
  this.connection = connection;
  this.lpCalculator = new LPCalculationService();
  // ... existing code
}
```

3. **Update calculateExpectedLpTokens:**
```typescript
calculateExpectedLpTokens(
  pool: Pool,
  amountA: bigint,
  amountB: bigint
): bigint {
  return this.lpCalculator.calculateLPTokensForDeposit({
    tokenAAmount: amountA,
    tokenBAmount: amountB,
    reserveA: pool.reserveA,
    reserveB: pool.reserveB,
    lpSupply: pool.lpTokenSupply,
    isInitialDeposit: pool.lpTokenSupply === BigInt(0),
  }).lpTokens;
}
```

4. **Update calculateRemoveAmounts:**
```typescript
calculateRemoveAmounts(
  pool: Pool,
  lpTokenAmount: bigint
): { tokenA: bigint; tokenB: bigint } {
  if (pool.lpTokenSupply === BigInt(0)) {
    return { tokenA: BigInt(0), tokenB: BigInt(0) };
  }

  return this.lpCalculator.calculateWithdrawalAmounts({
    lpTokenAmount,
    lpSupply: pool.lpTokenSupply,
    reserveA: pool.reserveA,
    reserveB: pool.reserveB,
    withdrawalFeeNumerator: BigInt(1), // From smart contract fees
    withdrawalFeeDenominator: BigInt(5), // owner_withdraw_fee_denominator
  });
}
```

5. **Update buildAddLiquidityTransaction:**
```typescript
// Calculate required token amounts with ceiling rounding
const requiredAmounts = this.lpCalculator.calculateTokensForLPAmount({
  lpTokenAmount: targetLpTokens,
  lpSupply: freshLpSupply,
  reserveA: freshReserveA,
  reserveB: freshReserveB,
  roundDirection: RoundDirection.Ceiling,
});

// Apply slippage protection
const slippageProtected = this.lpCalculator.applySlippageToDeposit(
  requiredAmounts,
  0.01 // 1% slippage
);

const addLiquidityIx = createAddLiquidityInstruction(
  // ... accounts
  slippageProtected.maxTokenA,
  slippageProtected.maxTokenB,
  targetLpTokens
);
```

### 3. Updated Calculations Utility

**File:** `src/utils/calculations.ts` (UPDATED)

**Changes:**

1. **Remove calculateLiquidityTokens** (deprecated, use LP Calculation Service)

2. **Add helper functions:**
```typescript
export const INITIAL_SWAP_POOL_AMOUNT = BigInt(1_000_000_000);

export function ceilingDivision(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder > BigInt(0) ? quotient + BigInt(1) : quotient;
}

export function floorDivision(numerator: bigint, denominator: bigint): bigint {
  return numerator / denominator;
}
```

### 4. Pool Store Updates

**File:** `src/stores/poolStore.ts` (UPDATED)

**Changes:**

1. **Add LP supply tracking per shard:**
```typescript
interface PoolState {
  pools: Pool[];
  lpSupplyCache: Map<string, { supply: bigint; timestamp: number }>;
  // ... existing fields
}
```

2. **Add method to fetch LP supply:**
```typescript
async fetchLPSupply(poolMintAddress: string): Promise<bigint> {
  const cached = this.lpSupplyCache.get(poolMintAddress);
  if (cached && Date.now() - cached.timestamp < 5000) {
    return cached.supply;
  }
  
  const mintInfo = await connection.getTokenSupply(new PublicKey(poolMintAddress));
  const supply = BigInt(mintInfo.value.amount);
  
  this.lpSupplyCache.set(poolMintAddress, {
    supply,
    timestamp: Date.now(),
  });
  
  return supply;
}
```

## Data Models

### Pool Interface (UPDATED)

```typescript
export interface Pool {
  id: string;
  tokenA: Token;
  tokenB: Token;
  reserveA: bigint;
  reserveB: bigint;
  lpTokenSupply: bigint; // Total LP tokens minted for this shard
  lpTokenMint: string;   // Unique LP token mint address per shard
  shardNumber: number;   // Shard identifier
  fee: number;
  apy: number;
  volume24h: number;
  tvl: number;
  
  // Pool state accounts
  poolAddress: string;
  authority: string;
  tokenAccountA: string;
  tokenAccountB: string;
  feeAccount: string;
}
```

### LP Calculation Constants

```typescript
export const LP_CALCULATION_CONSTANTS = {
  INITIAL_SWAP_POOL_AMOUNT: BigInt(1_000_000_000),
  DEFAULT_SLIPPAGE_TOLERANCE: 0.01, // 1%
  MIN_SLIPPAGE_TOLERANCE: 0.001,    // 0.1%
  MAX_SLIPPAGE_TOLERANCE: 0.05,     // 5%
  RESERVE_CACHE_TTL: 5000,          // 5 seconds
  MAX_U64: BigInt('18446744073709551615'),
} as const;
```

## Error Handling

### Error Types

```typescript
export enum LPCalculationError {
  OVERFLOW = 'CALCULATION_OVERFLOW',
  UNDERFLOW = 'CALCULATION_UNDERFLOW',
  ZERO_RESERVES = 'ZERO_RESERVES',
  ZERO_LP_SUPPLY = 'ZERO_LP_SUPPLY',
  INVALID_RATIO = 'INVALID_RATIO',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  EXCEEDS_MAX_U64 = 'EXCEEDS_MAX_U64',
}

export class LPCalculationException extends Error {
  constructor(
    public code: LPCalculationError,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'LPCalculationException';
  }
}
```

### Error Handling Strategy

1. **Validation Before Calculation:**
   - Check for zero reserves/supply
   - Validate input amounts are positive
   - Ensure amounts fit within u64 range

2. **Overflow Protection:**
   - Use BigInt for all intermediate calculations
   - Check results against MAX_U64 before returning
   - Throw descriptive errors with context

3. **User-Friendly Messages:**
   - Map technical errors to user-friendly messages
   - Provide actionable guidance (e.g., "Reduce amount")
   - Log full error context for debugging

## Testing Strategy

### Unit Tests

**File:** `src/services/__tests__/lpCalculationService.test.ts`

**Test Cases:**

1. **Initial Deposit:**
   - Should return INITIAL_SWAP_POOL_AMOUNT (1 billion)
   - Should accept any ratio for first deposit
   - Should validate both amounts are positive

2. **Proportional Deposit:**
   - Should calculate LP tokens correctly
   - Should use floor rounding
   - Should match smart contract test cases

3. **Token Amount Calculation:**
   - Should calculate required tokens with ceiling rounding
   - Should handle remainders correctly
   - Should match smart contract test cases

4. **Withdrawal Calculation:**
   - Should calculate withdrawal amounts with floor rounding
   - Should account for withdrawal fees
   - Should match smart contract test cases

5. **Single Token Deposit:**
   - Should use Balancer formula
   - Should calculate LP tokens correctly
   - Should match smart contract test cases

6. **Edge Cases:**
   - Zero amounts
   - Maximum u64 values
   - Very small amounts (dust)
   - Very large amounts (overflow)

### Integration Tests

**File:** `src/services/__tests__/liquidityService.integration.test.ts`

**Test Cases:**

1. **Add Liquidity Flow:**
   - Fetch fresh reserves
   - Calculate LP tokens
   - Build transaction
   - Verify instruction data

2. **Remove Liquidity Flow:**
   - Calculate withdrawal amounts
   - Build transaction
   - Verify instruction data

3. **Slippage Protection:**
   - Verify max amounts include slippage
   - Verify min amounts include slippage
   - Test with different slippage tolerances

### Smart Contract Parity Tests

**File:** `src/services/__tests__/smartContractParity.test.ts`

**Purpose:** Verify frontend calculations match smart contract exactly

**Test Cases:**

1. **Replicate Smart Contract Test Suite:**
   - Use same test values from `processor.rs` tests
   - Verify identical results
   - Test all rounding scenarios

2. **Precision Tests:**
   - Test with various decimal places
   - Verify no precision loss
   - Test remainder handling

## Implementation Plan

### Phase 1: Core LP Calculation Service

**Tasks:**

1. Create `lpCalculationService.ts` with core interfaces
2. Implement `calculateLPTokensForDeposit` with initial deposit handling
3. Implement `calculateTokensForLPAmount` with ceiling/floor rounding
4. Implement `calculateWithdrawalAmounts` with fee handling
5. Add comprehensive unit tests matching smart contract tests

**Acceptance Criteria:**
- All unit tests pass
- Calculations match smart contract test cases exactly
- Handles edge cases (zero amounts, overflow, etc.)

### Phase 2: Integration with Liquidity Service

**Tasks:**

1. Update `liquidityService.ts` to use LP Calculation Service
2. Update `calculateExpectedLpTokens` method
3. Update `calculateRemoveAmounts` method
4. Update `buildAddLiquidityTransaction` to use new calculations
5. Update `buildRemoveLiquidityTransaction` to use new calculations

**Acceptance Criteria:**
- Liquidity service uses LP Calculation Service for all calculations
- Fresh reserves fetched before transactions
- Slippage protection applied correctly

### Phase 3: UI Updates

**Tasks:**

1. Update `AddLiquidity.tsx` to display accurate LP token estimates
2. Update `RemoveLiquidity.tsx` to display accurate withdrawal amounts
3. Add real-time calculation updates with debouncing
4. Display pool share percentage
5. Show projected pool share after deposit

**Acceptance Criteria:**
- UI displays accurate estimates
- Calculations update in real-time
- No performance issues with rapid input changes

### Phase 4: Testing and Validation

**Tasks:**

1. Write integration tests
2. Write smart contract parity tests
3. Test on devnet with real transactions
4. Verify LP token amounts match expectations
5. Verify withdrawal amounts match expectations

**Acceptance Criteria:**
- All tests pass
- Devnet transactions succeed
- LP token amounts match smart contract calculations

### Phase 5: Documentation and Cleanup

**Tasks:**

1. Add JSDoc comments to all calculation functions
2. Document formulas with references to smart contract
3. Update README with calculation logic explanation
4. Remove deprecated `calculateLiquidityTokens` from utils
5. Add migration guide for developers

**Acceptance Criteria:**
- All functions have JSDoc comments
- Formulas documented with smart contract references
- README updated
- No deprecated code remains

## Performance Considerations

### Caching Strategy

1. **Reserve Data Caching:**
   - Cache reserve amounts for 5 seconds
   - Invalidate on transaction confirmation
   - Per-shard cache keys

2. **Calculation Memoization:**
   - Memoize expensive calculations (sqrt, division)
   - Cache key based on input parameters
   - Max cache size: 1000 entries
   - TTL: 30 seconds

3. **Debouncing:**
   - Debounce input changes (100ms)
   - Cancel pending calculations on new input
   - Show loading state during calculation

### Optimization Techniques

1. **BigInt Operations:**
   - Minimize BigInt conversions
   - Perform multiplication before division
   - Use bitwise operations where possible

2. **Batch RPC Calls:**
   - Fetch multiple reserve accounts in parallel
   - Use `getMultipleAccounts` for batch fetching
   - Reduce RPC call overhead

3. **Lazy Loading:**
   - Load LP supply only when needed
   - Defer non-critical calculations
   - Prioritize user-facing calculations

## Security Considerations

### Input Validation

1. **Amount Validation:**
   - Ensure amounts are positive
   - Check against MAX_U64
   - Validate against user balances

2. **Ratio Validation:**
   - Verify deposit ratio matches pool ratio (within tolerance)
   - Prevent manipulation through extreme ratios
   - Warn users of large ratio deviations

3. **Slippage Protection:**
   - Enforce minimum slippage tolerance (0.1%)
   - Enforce maximum slippage tolerance (5%)
   - Warn users of high slippage settings

### Transaction Safety

1. **Fresh Reserve Fetching:**
   - Always fetch reserves immediately before transaction
   - Verify reserves haven't changed significantly
   - Abort if reserves changed beyond threshold

2. **Simulation:**
   - Simulate transaction before sending
   - Verify expected outcomes
   - Catch errors early

3. **Error Recovery:**
   - Provide clear error messages
   - Suggest corrective actions
   - Log errors for debugging

## Monitoring and Debugging

### Logging Strategy

1. **Calculation Logging:**
   - Log all input parameters
   - Log intermediate calculation steps
   - Log final results
   - Include timestamps

2. **Transaction Logging:**
   - Log instruction data (hex)
   - Log account addresses
   - Log transaction signatures
   - Log confirmation status

3. **Error Logging:**
   - Log full error context
   - Log stack traces
   - Log user actions leading to error
   - Include environment information

### Debugging Tools

1. **Calculation Debugger:**
   - Console tool to test calculations
   - Compare frontend vs smart contract results
   - Visualize calculation steps

2. **Transaction Inspector:**
   - Decode instruction data
   - Verify account order
   - Check discriminator values
   - Validate amounts

## Migration Strategy

### Backward Compatibility

1. **Deprecation Period:**
   - Mark old `calculateLiquidityTokens` as deprecated
   - Add deprecation warnings
   - Provide migration guide
   - Remove after 2 releases

2. **Gradual Rollout:**
   - Deploy to staging first
   - Test with small amounts
   - Monitor error rates
   - Full rollout after validation

### Rollback Plan

1. **Feature Flag:**
   - Add feature flag for new calculations
   - Allow instant rollback if issues found
   - Monitor metrics during rollout

2. **Fallback Logic:**
   - Keep old calculation logic as fallback
   - Switch to fallback on calculation errors
   - Log fallback usage for analysis

## Success Metrics

### Accuracy Metrics

1. **Calculation Accuracy:**
   - 100% match with smart contract test cases
   - Zero off-by-one errors
   - Correct rounding in all scenarios

2. **Transaction Success Rate:**
   - >99% success rate for liquidity operations
   - <1% slippage failures
   - Zero InvalidInstruction errors

### Performance Metrics

1. **Calculation Speed:**
   - <50ms for all calculations
   - <100ms for UI updates
   - No blocking operations

2. **Cache Hit Rate:**
   - >80% cache hit rate for reserves
   - >70% cache hit rate for calculations
   - <5s average cache age

### User Experience Metrics

1. **Error Rate:**
   - <1% user-facing errors
   - <0.1% calculation errors
   - Zero crashes

2. **User Satisfaction:**
   - Clear error messages
   - Accurate estimates
   - Fast response times

## Conclusion

This design provides a comprehensive solution for fixing LP calculation accuracy by:

1. **Replicating Smart Contract Logic:** Exact implementation of constant product formulas with proper rounding
2. **Centralized Calculation Service:** Single source of truth for all LP calculations
3. **Robust Error Handling:** Comprehensive validation and user-friendly error messages
4. **Performance Optimization:** Caching, memoization, and efficient BigInt operations
5. **Thorough Testing:** Unit tests, integration tests, and smart contract parity tests

The implementation will be done in phases to ensure quality and allow for thorough testing at each stage. The result will be a reliable, accurate, and performant LP calculation system that matches the smart contract exactly.
