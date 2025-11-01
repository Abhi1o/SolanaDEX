"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { TokenPairIcon } from "@/components/tokens/TokenIcon";
import { usePools } from "@/hooks/usePools";
import { useWallet } from "@/hooks/useWallet";
import { RemoveLiquidity } from "@/components/pools/RemoveLiquidity";
import { useLiquidityPositions } from "@/hooks/useLiquidityPositions";
import { Pool, Token, TransactionStatus, TransactionType } from "@/types";
import { formatTokenAmount } from "@/utils/formatting";
import { TokenSelectorCard } from "@/components/pools/TokenSelectorCard";
import { AmountInputCard } from "@/components/pools/AmountInputCard";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  validatePoolCreation,
  hasSufficientSolForPoolCreation,
} from "@/utils/poolValidation";
import { getLiquidityService } from "@/services/liquidityService";
import { useTransactionStore } from "@/stores/transactionStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usePoolRefresh } from "@/hooks/usePoolRefresh";
import { ErrorRecoveryPanel } from "@/components/ui/ErrorRecoveryPanel";
import dexConfig from "@/config/dex-config.json";

export default function LiquidityPage() {
  const { pools } = usePools();
  const { isConnected, tokenBalances, solBalance, solanaWallet, publicKey } =
    useWallet();
  const { positions, refreshAfterOperation } = useLiquidityPositions();
  const { connection } = useConnection();
  const { addTransaction } = useTransactionStore();
  const { showSuccess, showError, showInfo, showWarning } =
    useNotificationStore();
  
  // Integrate pool refresh hook for real-time data (Requirement 1.1, 4.1, 4.4, 5.1)
  const { 
    isRefreshing, 
    isStale, 
    manualRefresh, 
    error: refreshError,
    consecutiveFailures 
  } = usePoolRefresh({
    enabled: true,
    refreshInterval: 10000, // 10 seconds
  });

  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");

  // Token selection state
  const [selectedTokenA, setSelectedTokenA] = useState<Token | null>(null);
  const [selectedTokenB, setSelectedTokenB] = useState<Token | null>(null);
  const [tokenASelectorExpanded, setTokenASelectorExpanded] = useState(true);
  const [tokenBSelectorExpanded, setTokenBSelectorExpanded] = useState(false);

  // Amount input state
  const [amountInputExpanded, setAmountInputExpanded] = useState(false);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // Calculated values
  const [lpTokensToReceive, setLpTokensToReceive] = useState(BigInt(0));
  const [shareOfPool, setShareOfPool] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransactionTime, setLastTransactionTime] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [poolTokenBalances, setPoolTokenBalances] = useState<
    Record<string, bigint>
  >({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Shard routing state
  const [selectedShard, setSelectedShard] = useState<{
    poolAddress: string;
    shardNumber: number;
    reserves: { tokenA: string; tokenB: string };
  } | null>(null);
  const [isLoadingShard, setIsLoadingShard] = useState(false);

  // Remove liquidity modal state
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Get unique tokens from pools
  const availableTokens = useMemo(() => {
    const tokenMap = new Map();
    pools.forEach((pool) => {
      if (!tokenMap.has(pool.tokenA.mint)) {
        tokenMap.set(pool.tokenA.mint, pool.tokenA);
      }
      if (!tokenMap.has(pool.tokenB.mint)) {
        tokenMap.set(pool.tokenB.mint, pool.tokenB);
      }
    });
    return Array.from(tokenMap.values());
  }, [pools]);

  // Get available pools for selected token pair
  const availablePools = useMemo(() => {
    if (!selectedTokenA || !selectedTokenB) return [];
    return pools.filter(
      (pool) =>
        (pool.tokenA.mint === selectedTokenA.mint &&
          pool.tokenB.mint === selectedTokenB.mint) ||
        (pool.tokenA.mint === selectedTokenB.mint &&
          pool.tokenB.mint === selectedTokenA.mint)
    );
  }, [selectedTokenA, selectedTokenB, pools]);

  // Get the current pool (use selected shard if available, otherwise first available pool)
  const currentPool = useMemo(() => {
    if (selectedShard && availablePools.length > 0) {
      // Find the pool that matches the selected shard
      const shardPool = availablePools.find(
        (p) => p.id === selectedShard.poolAddress
      );
      if (shardPool) {
        // ✅ FIXED: Use ACTUAL LP supply from blockchain (fetched by poolBlockchainFetcher)
        // The shardPool object already contains the correct blockchain-fetched LP supply
        // We only need to update reserves from the API shard data
        const freshReserveA = BigInt(selectedShard.reserves.tokenA);
        const freshReserveB = BigInt(selectedShard.reserves.tokenB);

        const updatedPool = {
          ...shardPool,
          reserveA: freshReserveA,
          reserveB: freshReserveB,
          // ✅ CRITICAL: Use blockchain-fetched LP supply, NOT calculated
          // shardPool.lpTokenSupply is already fetched from blockchain via connection.getTokenSupply()
          lpTokenSupply: shardPool.lpTokenSupply,
        };

        console.log('🔄 Using fresh data from API + blockchain:', {
          poolAddress: selectedShard.poolAddress,
          reserveA: selectedShard.reserves.tokenA,
          reserveB: selectedShard.reserves.tokenB,
          lpTokenSupply: shardPool.lpTokenSupply.toString(),
          source: 'API reserves + blockchain LP supply'
        });
        return updatedPool;
      }
    }
    return availablePools.length > 0 ? availablePools[0] : null;
  }, [availablePools, selectedShard]);

  // Calculate pool ratio
  const poolRatio = useMemo(() => {
    if (
      !currentPool ||
      currentPool.reserveA === BigInt(0) ||
      currentPool.reserveB === BigInt(0)
    ) {
      return 0;
    }
    return Number(currentPool.reserveB) / Number(currentPool.reserveA);
  }, [currentPool]);

  // Fetch smallest shard when both tokens are selected
  useEffect(() => {
    if (!selectedTokenA || !selectedTokenB || !connection) {
      setSelectedShard(null);
      return;
    }

    const fetchSmallestShard = async () => {
      setIsLoadingShard(true);
      try {
        const liquidityService = getLiquidityService(
          connection,
          dexConfig.programId
        );
        const shard = await liquidityService.getSmallestShard(
          selectedTokenA.mint,
          selectedTokenB.mint
        );

        if (shard) {
          setSelectedShard(shard);
          console.log(
            "✅ Selected smallest shard for liquidity addition:",
            shard
          );
        } else {
          setSelectedShard(null);
          console.log(
            "ℹ️  No shard recommendation from backend, using first available pool"
          );
        }
      } catch (error) {
        console.error("Failed to fetch smallest shard:", error);
        setSelectedShard(null);
      } finally {
        setIsLoadingShard(false);
      }
    };

    fetchSmallestShard();
  }, [selectedTokenA, selectedTokenB, connection]);

  // Fetch balances for pool tokens
  useEffect(() => {
    if (!currentPool || !isConnected || !publicKey || !connection) {
      setPoolTokenBalances({});
      setIsLoadingBalances(false);
      return;
    }

    const fetchPoolTokenBalances = async () => {
      setIsLoadingBalances(true);
      const balances: Record<string, bigint> = {};

      try {
        const nativeSOLMint = "So11111111111111111111111111111111111111112";

        // Fetch Token A balance
        if (currentPool.tokenA.mint === nativeSOLMint) {
          const solBal = await connection.getBalance(publicKey);
          balances[nativeSOLMint] = BigInt(solBal);
        } else {
          try {
            const tokenAMint = new PublicKey(currentPool.tokenA.mint);
            const tokenAATA = await getAssociatedTokenAddress(
              tokenAMint,
              publicKey
            );
            const tokenAAccount = await getAccount(
              connection,
              tokenAATA,
              "confirmed",
              TOKEN_PROGRAM_ID
            );
            balances[currentPool.tokenA.mint] = BigInt(tokenAAccount.amount);
          } catch {
            balances[currentPool.tokenA.mint] = BigInt(0);
          }
        }

        // Fetch Token B balance
        if (currentPool.tokenB.mint === nativeSOLMint) {
          const solBal = await connection.getBalance(publicKey);
          balances[nativeSOLMint] = BigInt(solBal);
        } else {
          try {
            const tokenBMint = new PublicKey(currentPool.tokenB.mint);
            const tokenBATA = await getAssociatedTokenAddress(
              tokenBMint,
              publicKey
            );
            const tokenBAccount = await getAccount(
              connection,
              tokenBATA,
              "confirmed",
              TOKEN_PROGRAM_ID
            );
            balances[currentPool.tokenB.mint] = BigInt(tokenBAccount.amount);
          } catch {
            balances[currentPool.tokenB.mint] = BigInt(0);
          }
        }

        setPoolTokenBalances(balances);
      } catch (error) {
        console.error("Failed to fetch pool token balances:", error);
        setPoolTokenBalances({});
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchPoolTokenBalances();
    const interval = setInterval(fetchPoolTokenBalances, 10000);
    return () => clearInterval(interval);
  }, [currentPool, isConnected, publicKey, connection]);

  // Get token balances
  const tokenABalance = useMemo(() => {
    if (!selectedTokenA) return BigInt(0);
    if (poolTokenBalances[selectedTokenA.mint] !== undefined) {
      return poolTokenBalances[selectedTokenA.mint];
    }
    if (tokenBalances) {
      return tokenBalances[selectedTokenA.mint] || BigInt(0);
    }
    return BigInt(0);
  }, [selectedTokenA, poolTokenBalances, tokenBalances]);

  const tokenBBalance = useMemo(() => {
    if (!selectedTokenB) return BigInt(0);
    if (poolTokenBalances[selectedTokenB.mint] !== undefined) {
      return poolTokenBalances[selectedTokenB.mint];
    }
    if (tokenBalances) {
      return tokenBalances[selectedTokenB.mint] || BigInt(0);
    }
    return BigInt(0);
  }, [selectedTokenB, poolTokenBalances, tokenBalances]);

  // Token selection handlers (Subtask 3.3)
  const handleTokenASelect = useCallback(
    (token: Token) => {
      // Reset amounts when changing tokens to prevent stale calculations
      if (selectedTokenA && selectedTokenA.mint !== token.mint) {
        setAmountA("");
        setAmountB("");
        setValidationErrors({});
      }

      setSelectedTokenA(token);
      setTokenASelectorExpanded(false);

      // If both tokens selected, expand amount input
      if (selectedTokenB) {
        setAmountInputExpanded(true);
      } else {
        // Focus on token B selector
        setTokenBSelectorExpanded(true);
      }
    },
    [selectedTokenA, selectedTokenB]
  );

  const handleTokenBSelect = useCallback(
    (token: Token) => {
      // Reset amounts when changing tokens to prevent stale calculations
      if (selectedTokenB && selectedTokenB.mint !== token.mint) {
        setAmountA("");
        setAmountB("");
        setValidationErrors({});
      }

      setSelectedTokenB(token);
      setTokenBSelectorExpanded(false);

      // If both tokens selected, expand amount input
      if (selectedTokenA) {
        setAmountInputExpanded(true);
      }
    },
    [selectedTokenA, selectedTokenB]
  );

  const handleTokenASelectorToggle = useCallback(() => {
    setTokenASelectorExpanded(!tokenASelectorExpanded);
  }, [tokenASelectorExpanded]);

  const handleTokenBSelectorToggle = useCallback(() => {
    setTokenBSelectorExpanded(!tokenBSelectorExpanded);
  }, [tokenBSelectorExpanded]);

  // Amount calculation logic (Subtask 3.4)
  const calculateAmountB = useCallback(
    (amountAValue: string) => {
      if (!currentPool || !amountAValue || poolRatio === 0) return "";

      const amountANum = parseFloat(amountAValue);
      if (isNaN(amountANum) || amountANum <= 0) return "";

      // Handle very small amounts (less than minimum precision)
      const minAmount = 1 / Math.pow(10, currentPool.tokenA.decimals);
      if (amountANum < minAmount) return "";

      try {
        const amountABigInt = BigInt(
          Math.floor(amountANum * Math.pow(10, currentPool.tokenA.decimals))
        );

        // Prevent overflow for very large amounts
        if (amountABigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          console.warn("Amount too large for calculation");
          return "";
        }

        const amountBBigInt =
          (amountABigInt * currentPool.reserveB) / currentPool.reserveA;
        const amountBNum =
          Number(amountBBigInt) / Math.pow(10, currentPool.tokenB.decimals);

        // Handle extreme ratios that result in very small or very large amounts
        if (amountBNum === 0 || !isFinite(amountBNum)) return "";

        return amountBNum.toString();
      } catch (error) {
        console.error("Error calculating amount B:", error);
        return "";
      }
    },
    [currentPool, poolRatio]
  );

  const calculateAmountA = useCallback(
    (amountBValue: string) => {
      if (!currentPool || !amountBValue || poolRatio === 0) return "";

      const amountBNum = parseFloat(amountBValue);
      if (isNaN(amountBNum) || amountBNum <= 0) return "";

      // Handle very small amounts (less than minimum precision)
      const minAmount = 1 / Math.pow(10, currentPool.tokenB.decimals);
      if (amountBNum < minAmount) return "";

      try {
        const amountBBigInt = BigInt(
          Math.floor(amountBNum * Math.pow(10, currentPool.tokenB.decimals))
        );

        // Prevent overflow for very large amounts
        if (amountBBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          console.warn("Amount too large for calculation");
          return "";
        }

        const amountABigInt =
          (amountBBigInt * currentPool.reserveA) / currentPool.reserveB;
        const amountANum =
          Number(amountABigInt) / Math.pow(10, currentPool.tokenA.decimals);

        // Handle extreme ratios that result in very small or very large amounts
        if (amountANum === 0 || !isFinite(amountANum)) return "";

        return amountANum.toString();
      } catch (error) {
        console.error("Error calculating amount A:", error);
        return "";
      }
    },
    [currentPool, poolRatio]
  );

  const handleAmountAChange = useCallback(
    (value: string) => {
      setAmountA(value);

      // Clear any previous errors when user starts typing
      if (validationErrors.amountA || validationErrors.general) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.amountA;
          if (prev.general?.includes("amount")) {
            delete newErrors.general;
          }
          return newErrors;
        });
      }

      if (value && poolRatio > 0) {
        const calculatedB = calculateAmountB(value);
        setAmountB(calculatedB);
      } else if (!value) {
        setAmountB("");
      }
    },
    [poolRatio, calculateAmountB, validationErrors]
  );

  const handleAmountBChange = useCallback(
    (value: string) => {
      setAmountB(value);

      // Clear any previous errors when user starts typing
      if (validationErrors.amountB || validationErrors.general) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.amountB;
          if (prev.general?.includes("amount")) {
            delete newErrors.general;
          }
          return newErrors;
        });
      }

      if (value && poolRatio > 0) {
        const calculatedA = calculateAmountA(value);
        setAmountA(calculatedA);
      } else if (!value) {
        setAmountA("");
      }
    },
    [poolRatio, calculateAmountA, validationErrors]
  );

  const handleMaxA = useCallback(() => {
    if (selectedTokenA && tokenABalance > 0) {
      const maxAmount =
        Number(tokenABalance) / Math.pow(10, selectedTokenA.decimals);
      handleAmountAChange(maxAmount.toString());
    }
  }, [selectedTokenA, tokenABalance, handleAmountAChange]);

  const handleMaxB = useCallback(() => {
    if (selectedTokenB && tokenBBalance > 0) {
      const maxAmount =
        Number(tokenBBalance) / Math.pow(10, selectedTokenB.decimals);
      handleAmountBChange(maxAmount.toString());
    }
  }, [selectedTokenB, tokenBBalance, handleAmountBChange]);

  // Calculate LP tokens and pool share (Subtask 3.4)
  useEffect(() => {
    if (!currentPool || !amountA || !amountB) {
      setLpTokensToReceive(BigInt(0));
      setShareOfPool(0);
      setPriceImpact(0);
      return;
    }

    try {
      const amountABigInt = BigInt(
        Math.floor(
          parseFloat(amountA) * Math.pow(10, currentPool.tokenA.decimals)
        )
      );
      const amountBBigInt = BigInt(
        Math.floor(
          parseFloat(amountB) * Math.pow(10, currentPool.tokenB.decimals)
        )
      );

      let lpTokens: bigint;

      if (currentPool.lpTokenSupply === BigInt(0)) {
        // For empty pool, use geometric mean
        lpTokens = BigInt(
          Math.floor(Math.sqrt(Number(amountABigInt) * Number(amountBBigInt)))
        );
      } else {
        // For existing pool, calculate based on both tokens and take the minimum
        // This ensures we don't request more LP tokens than we should get
        const lpFromA =
          (amountABigInt * currentPool.lpTokenSupply) / currentPool.reserveA;
        const lpFromB =
          (amountBBigInt * currentPool.lpTokenSupply) / currentPool.reserveB;
        
        // Take the minimum to be conservative
        lpTokens = lpFromA < lpFromB ? lpFromA : lpFromB;
        
        // Log the calculation for debugging
        console.log('📊 LP Token Calculation:');
        console.log('  LP from A:', lpFromA.toString());
        console.log('  LP from B:', lpFromB.toString());
        console.log('  Taking minimum:', lpTokens.toString());
      }

      const newTotalSupply = currentPool.lpTokenSupply + lpTokens;
      const share =
        newTotalSupply > 0
          ? (Number(lpTokens) / Number(newTotalSupply)) * 100
          : 0;

      const currentPrice =
        Number(currentPool.reserveA) / Number(currentPool.reserveB);
      const newReserveA = currentPool.reserveA + amountABigInt;
      const newReserveB = currentPool.reserveB + amountBBigInt;
      const newPrice = Number(newReserveA) / Number(newReserveB);
      const impact = Math.abs((newPrice - currentPrice) / currentPrice) * 100;

      setLpTokensToReceive(lpTokens);
      setShareOfPool(share);
      setPriceImpact(impact);
    } catch (error) {
      console.error("Error calculating LP tokens:", error);
    }
  }, [currentPool, amountA, amountB]);

  // Validation logic (Subtask 3.5)
  const validateInputs = useCallback(() => {
    if (!currentPool || !selectedTokenA || !selectedTokenB) return false;

    const validation = validatePoolCreation({
      tokenA: selectedTokenA,
      tokenB: selectedTokenB,
      amountA,
      amountB,
      tokenABalance,
      tokenBBalance,
    });

    const errors: Record<string, string> = {};
    validation.errors.forEach((error) => {
      if (error.includes(selectedTokenA.symbol)) {
        errors.amountA = error;
      } else if (error.includes(selectedTokenB.symbol)) {
        errors.amountB = error;
      } else {
        errors.general = error;
      }
    });

    if (!hasSufficientSolForPoolCreation(solBalance)) {
      errors.general = "Insufficient SOL for transaction fees";
    }

    if (priceImpact > 15) {
      errors.general =
        "Price impact too high (>15%). Please reduce the amount.";
    }

    setValidationErrors(errors);
    return validation.isValid && !errors.general;
  }, [
    currentPool,
    selectedTokenA,
    selectedTokenB,
    amountA,
    amountB,
    tokenABalance,
    tokenBBalance,
    solBalance,
    priceImpact,
  ]);

  // Add liquidity transaction logic (Subtask 3.8)
  const handleAddLiquidity = async () => {
    // ✅ CRITICAL: Prevent duplicate transaction submissions
    const now = Date.now();
    const DEBOUNCE_MS = 3000; // 3 seconds minimum between transactions

    if (isProcessing) {
      console.warn('⚠️ Transaction already in progress, ignoring duplicate call');
      return;
    }

    if (now - lastTransactionTime < DEBOUNCE_MS) {
      const waitTime = Math.ceil((DEBOUNCE_MS - (now - lastTransactionTime)) / 1000);
      console.warn('⚠️ Transaction submitted too quickly, please wait', {
        timeSinceLastTx: now - lastTransactionTime,
        debounceMs: DEBOUNCE_MS
      });
      showWarning("Please Wait", `Please wait ${waitTime}s before trying again to prevent duplicate transactions`);
      return;
    }

    if (!isConnected || !currentPool || !selectedTokenA || !selectedTokenB) {
      const errorMsg = "Please connect your wallet and select tokens";
      setError(errorMsg);
      showError("Connection Required", errorMsg);
      return;
    }

    if (!validateInputs()) {
      showWarning(
        "Validation Failed",
        "Please check your input amounts and try again"
      );
      return;
    }

    setIsProcessing(true);
    setLastTransactionTime(now);
    setError(null);

    try {
      // Fetch current pool reserves before liquidity operation (Requirement 1.1, 2.1)
      console.log('🔄 Refreshing pool data before liquidity operation');
      await manualRefresh();
      const amountABigInt = BigInt(Math.floor(parseFloat(amountA) * Math.pow(10, selectedTokenA.decimals)));
      const amountBBigInt = BigInt(Math.floor(parseFloat(amountB) * Math.pow(10, selectedTokenB.decimals)));

      if (!connection || !solanaWallet) {
        throw new Error('Connection or wallet not available');
      }

      const liquidityService = getLiquidityService(connection, currentPool.programId);
      
      // ✅ CRITICAL: Check minimum deposit threshold
      // The working Node.js script deposits 1% of pool reserves
      // Small deposits (< 0.01% of pool) cause slippage errors
      const depositPercentage = (Number(amountABigInt) / Number(currentPool.reserveA)) * 100;
      const MIN_DEPOSIT_PERCENTAGE = 0.01; // 0.01% minimum
      
      if (depositPercentage < MIN_DEPOSIT_PERCENTAGE) {
        const minAmountA = (Number(currentPool.reserveA) * MIN_DEPOSIT_PERCENTAGE / 100) / Math.pow(10, selectedTokenA.decimals);
        const minAmountB = (Number(currentPool.reserveB) * MIN_DEPOSIT_PERCENTAGE / 100) / Math.pow(10, selectedTokenB.decimals);
        
        setError(`Deposit amount too small. Minimum deposit: ${minAmountA.toFixed(2)} ${selectedTokenA.symbol} + ${minAmountB.toFixed(4)} ${selectedTokenB.symbol} (0.01% of pool)`);
        setIsProcessing(false);
        return;
      }
      
      // ✅ CRITICAL FIX: Pass EXPECTED LP tokens, not minimum!
      // The smart contract's pool_token_amount parameter means:
      // "I want to receive THIS MANY LP tokens"
      // NOT "I'll accept at least this many LP tokens"
      // 
      // Slippage protection is handled by the maximum token amounts (2x buffer),
      // not by reducing the LP token amount.
      // This matches the working Node.js script behavior.
      const expectedLpTokens = lpTokensToReceive;
      
      console.log('💰 Add Liquidity Parameters:');
      console.log('  Amount A:', amountABigInt.toString(), `(${amountA} ${selectedTokenA.symbol})`);
      console.log('  Amount B:', amountBBigInt.toString(), `(${amountB} ${selectedTokenB.symbol})`);
      console.log('  Expected LP Tokens:', lpTokensToReceive.toString());
      console.log('  Pool Reserve A:', currentPool.reserveA.toString());
      console.log('  Pool Reserve B:', currentPool.reserveB.toString());
      console.log('  Pool LP Supply:', currentPool.lpTokenSupply.toString());
      console.log('  Deposit % of pool:', depositPercentage.toFixed(4) + '%');
      console.log('  Note: Token amounts will have 2x buffer (100% slippage) added in liquidityService');
      console.log('  Note: Matches working Node.js script exactly (2x buffer, 1% deposit)');

      const result = await liquidityService.addLiquidity(
        {
          pool: currentPool,
          amountA: amountABigInt,
          amountB: amountBBigInt,
          minLpTokens: expectedLpTokens,
        },
        solanaWallet,
        (status, signature, error) => {
          if (error) {
            setError(error);
          }
        }
      );

      if (result.status === TransactionStatus.CONFIRMED) {
        addTransaction({
          signature: result.signature,
          hash: result.signature,
          type: TransactionType.ADD_LIQUIDITY,
          status: TransactionStatus.CONFIRMED,
          timestamp: Date.now(),
          tokenIn: selectedTokenA,
          tokenOut: selectedTokenB,
          amountIn: amountABigInt,
          amountOut: amountBBigInt,
          feePayer: solanaWallet.publicKey?.toString() || '',
          solFee: BigInt(5000),
        });
        
        // Show success animation and notification
        setShowSuccessAnimation(true);
        showSuccess(
          'Liquidity Added Successfully!',
          `Added ${amountA} ${selectedTokenA.symbol} and ${amountB} ${selectedTokenB.symbol} to the pool`
        );
        
        // Refresh pool data after successful liquidity transaction (Requirement 4.3)
        console.log('🔄 Refreshing pool data after successful liquidity addition');
        await manualRefresh();
        
        // Refresh LP positions after successful liquidity addition (Requirement 2.1, 2.4)
        refreshAfterOperation().catch(err => {
          console.warn('Failed to refresh LP positions:', err);
        });
        
        // Reset form after animation
        setTimeout(() => {
          setAmountA('');
          setAmountB('');
          setSelectedTokenA(null);
          setSelectedTokenB(null);
          setTokenASelectorExpanded(true);
          setTokenBSelectorExpanded(false);
          setAmountInputExpanded(false);
          setLpTokensToReceive(BigInt(0));
          setShareOfPool(0);
          setPriceImpact(0);
          setValidationErrors({});
          setShowSuccessAnimation(false);
        }, 2000);
      } else {
        const errorMsg = result.error || 'Failed to add liquidity';
        setError(errorMsg);
        showError('Transaction Failed', errorMsg);
      }

    } catch (err) {
      console.error('Add liquidity failed:', err);
      let errorMsg = 'Failed to add liquidity';
      let errorTitle = 'Transaction Failed';
      
      if (err instanceof Error) {
        errorMsg = err.message;
        
        // Provide more specific error messages for common issues
        if (errorMsg.includes('User rejected') || errorMsg.includes('User cancelled')) {
          errorTitle = 'Transaction Cancelled';
          errorMsg = 'You cancelled the transaction';
        } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('Insufficient balance')) {
          errorTitle = 'Insufficient Funds';
          errorMsg = 'You do not have enough tokens or SOL for this transaction';
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('fetch')) {
          errorTitle = 'Network Error';
          errorMsg = 'Network connection issue. Please check your connection and try again';
        } else if (errorMsg.includes('slippage') || errorMsg.includes('0x10') || errorMsg.includes('exceeds desired slippage limit')) {
          errorTitle = 'Slippage Protection';
          errorMsg = 'The pool ratio changed. Try reducing your deposit amount or adjusting the ratio to match the pool better.';
        } else if (errorMsg.includes('0xe') || errorMsg.includes('InvalidInstruction')) {
          errorTitle = 'Invalid Instruction';
          errorMsg = 'Transaction format error. Please try again or contact support.';
        }
      }
      
      setError(errorMsg);
      showError(errorTitle, errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle opening remove liquidity modal
  const handleOpenRemoveLiquidity = () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    if (availablePools.length === 0) {
      alert("No pool available for this token pair");
      return;
    }
    setSelectedPool(availablePools[0]);
    setShowRemoveModal(true);
  };

  // Handle liquidity removed successfully
  const handleLiquidityRemoved = async (poolId: string, signature: string) => {
    console.log("Liquidity removed:", { poolId, signature });
    setShowRemoveModal(false);
    
    // Refresh pool data after successful liquidity transaction (Requirement 4.3)
    console.log('🔄 Refreshing pool data after successful liquidity removal');
    await manualRefresh();
    
    // Refresh LP positions after successful liquidity removal (Requirement 2.1, 2.4)
    refreshAfterOperation().catch(err => {
      console.warn('Failed to refresh LP positions:', err);
    });
  };

  // Get token pairs for display
  const tokenPairs = useMemo(() => {
    const pairMap = new Map<
      string,
      { tokenA: string; tokenB: string; pools: Pool[] }
    >();

    pools.forEach((pool) => {
      const pairKey = [pool.tokenA.symbol, pool.tokenB.symbol].sort().join("/");
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          tokenA: pool.tokenA.symbol,
          tokenB: pool.tokenB.symbol,
          pools: [],
        });
      }
      pairMap.get(pairKey)!.pools.push(pool);
    });

    return Array.from(pairMap.values());
  }, [pools]);

  return (
    <div className="relative bg-black text-white min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Liquidity Pools
            </h1>
            {/* Manual refresh button and status indicators (Requirement 5.1, 5.2) */}
            <button
              onClick={manualRefresh}
              disabled={isRefreshing}
              className="p-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
              title="Refresh pool data"
            >
              <svg
                className={`w-5 h-5 text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          {/* Staleness indicator (Requirement 5.3) */}
          {isStale && (
            <div className="inline-flex items-center gap-2 px-3 py-1 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-full text-xs text-yellow-400 mb-2">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Data may be outdated
            </div>
          )}
          <p className="text-base sm:text-lg text-gray-400 font-light">
            Provide liquidity to earn trading fees from swaps
          </p>
        </div>

        {/* Error Recovery Panel - Show blockchain connection errors (Requirement 1.4, 4.4, 5.1) */}
        {refreshError && consecutiveFailures > 2 && (
          <div className="mb-8">
            <ErrorRecoveryPanel
              error={refreshError}
              consecutiveFailures={consecutiveFailures}
              isRetrying={isRefreshing}
              onRetry={manualRefresh}
              severity="error"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Add/Remove Liquidity */}
          <div className="lg:col-span-2">
            {/* Tab Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab("add")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all ${
                  activeTab === "add"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "backdrop-blur-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                <PlusIcon className="w-5 h-5" />
                Add Liquidity
              </button>
              <button
                onClick={() => setActiveTab("remove")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all ${
                  activeTab === "remove"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "backdrop-blur-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                <MinusIcon className="w-5 h-5" />
                Remove Liquidity
              </button>
            </div>

            {/* Add Liquidity Form - Progressive Disclosure Flow */}
            {activeTab === "add" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                style={{
                  opacity: amountInputExpanded ? 0.7 : 1,
                  transform: amountInputExpanded ? "scale(0.98)" : "scale(1)",
                  transition: "all 0.3s ease",
                }}
              >
                <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Add Liquidity
                  </h2>
                  <p className="text-sm text-gray-400 mb-6">
                    Add tokens to a liquidity pool to earn trading fees
                  </p>

                  {/* Empty state if no tokens available */}
                  {availableTokens.length === 0 ? (
                    <div className="text-center py-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
                      <div className="text-gray-400 mb-2">
                        No tokens available
                      </div>
                      <p className="text-sm text-gray-500">
                        Please wait while we load available tokens
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Token Selector A */}
                      <TokenSelectorCard
                        label="First Token"
                        selectedToken={selectedTokenA}
                        availableTokens={availableTokens}
                        isExpanded={tokenASelectorExpanded}
                        onTokenSelect={handleTokenASelect}
                        onToggleExpand={handleTokenASelectorToggle}
                        excludeToken={selectedTokenB?.mint}
                      />

                      {/* Plus Icon */}
                      <div className="flex justify-center my-4">
                        <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full">
                          <PlusIcon className="w-5 h-5 text-gray-300" />
                        </div>
                      </div>

                      {/* Token Selector B */}
                      <TokenSelectorCard
                        label="Second Token"
                        selectedToken={selectedTokenB}
                        availableTokens={availableTokens}
                        isExpanded={tokenBSelectorExpanded}
                        onTokenSelect={handleTokenBSelect}
                        onToggleExpand={handleTokenBSelectorToggle}
                        excludeToken={selectedTokenA?.mint}
                      />
                    </>
                  )}

                  {/* Pool Info - Show when both tokens selected but before amount input */}
                  {selectedTokenA &&
                    selectedTokenB &&
                    availablePools.length > 0 &&
                    !amountInputExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-6 backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 rounded-2xl p-4"
                      >
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Available Pools:
                            </span>
                            <span className="text-white font-medium">
                              {availablePools.length} shard(s)
                            </span>
                          </div>
                          {isLoadingShard ? (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">
                                Selecting Optimal Shard:
                              </span>
                              <LoadingSpinner size="sm" color="primary" />
                            </div>
                          ) : selectedShard ? (
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Selected Shard:
                              </span>
                              <span className="text-green-400 font-medium">
                                Shard {selectedShard.shardNumber} (Smallest)
                              </span>
                            </div>
                          ) : null}
                          {poolRatio > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Pool Ratio:</span>
                              <span className="text-white font-medium">
                                1 {selectedTokenA.symbol} ≈{" "}
                                {poolRatio.toFixed(6)} {selectedTokenB.symbol}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">Network Fee:</span>
                            <span className="text-white font-medium">
                              ~0.00005 SOL
                            </span>
                          </div>
                          {selectedShard && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <div className="text-xs text-gray-400 mb-1">
                                💡 Liquidity Routing Strategy
                              </div>
                              <div className="text-xs text-gray-300">
                                Adding to the smallest shard provides the best
                                experience for traders by balancing liquidity
                                across all shards.
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                  {selectedTokenA &&
                    selectedTokenB &&
                    availablePools.length === 0 && (
                      <div className="mt-6 text-center py-4 text-gray-400">
                        No pool available for this pair
                      </div>
                    )}
                </div>

                {/* Amount Input Card - Expands when both tokens selected */}
                <AmountInputCard
                  isExpanded={amountInputExpanded}
                  tokenA={selectedTokenA}
                  tokenB={selectedTokenB}
                  amountA={amountA}
                  amountB={amountB}
                  balanceA={tokenABalance}
                  balanceB={tokenBBalance}
                  poolRatio={poolRatio}
                  onAmountAChange={handleAmountAChange}
                  onAmountBChange={handleAmountBChange}
                  onMaxA={handleMaxA}
                  onMaxB={handleMaxB}
                  lpTokensToReceive={lpTokensToReceive}
                  shareOfPool={shareOfPool}
                  priceImpact={priceImpact}
                  validationErrors={validationErrors}
                  isLoadingBalances={isLoadingBalances}
                />

                {/* Add Liquidity Button - Show when amount input is expanded */}
                {amountInputExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {error && (
                      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-sm text-red-400 flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1">
                          <div className="font-semibold mb-1">
                            Transaction Failed
                          </div>
                          <div>{error}</div>
                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={() => {
                                setError(null);
                                handleAddLiquidity();
                              }}
                              className="text-xs text-red-300 hover:text-red-200 underline"
                            >
                              Retry
                            </button>
                            <button
                              onClick={() => setError(null)}
                              className="text-xs text-red-300 hover:text-red-200 underline"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleAddLiquidity}
                      disabled={
                        !amountA ||
                        !amountB ||
                        isProcessing ||
                        Object.keys(validationErrors).length > 0 ||
                        showSuccessAnimation
                      }
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                          <span>Adding Liquidity...</span>
                        </>
                      ) : showSuccessAnimation ? (
                        <>
                          <svg
                            className="w-5 h-5 text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>Success!</span>
                        </>
                      ) : (
                        "Add Liquidity"
                      )}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Remove Liquidity Form */}
            {activeTab === "remove" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10"
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  Remove Liquidity
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  Remove your liquidity from the pool
                </p>

                {/* Token Pair Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Token
                  </label>
                  <select
                    value={selectedTokenA?.mint || ""}
                    onChange={(e) => {
                      const token = availableTokens.find(
                        (t) => t.mint === e.target.value
                      );
                      setSelectedTokenA(token || null);
                    }}
                    className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  >
                    <option value="" className="bg-gray-900">
                      Select Token
                    </option>
                    {availableTokens.map((token) => (
                      <option
                        key={token.mint}
                        value={token.mint}
                        className="bg-gray-900"
                      >
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Second Token
                  </label>
                  <select
                    value={selectedTokenB?.mint || ""}
                    onChange={(e) => {
                      const token = availableTokens.find(
                        (t) => t.mint === e.target.value
                      );
                      setSelectedTokenB(token || null);
                    }}
                    className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  >
                    <option value="" className="bg-gray-900">
                      Select Token
                    </option>
                    {availableTokens.map((token) => (
                      <option
                        key={token.mint}
                        value={token.mint}
                        className="bg-gray-900"
                      >
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pool Info */}
                {availablePools.length > 0 &&
                  selectedTokenA &&
                  selectedTokenB && (
                    <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 rounded-2xl p-4 mb-6">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pool:</span>
                          <span className="text-white font-medium">
                            {selectedTokenA.symbol}/{selectedTokenB.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            Available Shards:
                          </span>
                          <span className="text-white font-medium">
                            {availablePools.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Action Button */}
                {availablePools.length > 0 ? (
                  <button
                    onClick={handleOpenRemoveLiquidity}
                    disabled={!selectedTokenA || !selectedTokenB}
                    className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-pink-600 hover:from-pink-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                  >
                    Remove Liquidity
                  </button>
                ) : selectedTokenA && selectedTokenB ? (
                  <div className="text-center py-8 text-gray-400">
                    No pool available for this pair
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 px-6 backdrop-blur-xl bg-white/10 border border-white/20 text-white font-semibold rounded-2xl transition-all opacity-50"
                  >
                    Select Token Pair
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Right Side - Your Positions */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-6 border border-white/10 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-4">
                Your Positions
              </h3>
              {positions.length > 0 ? (
                <div className="space-y-3">
                  {positions.map((position) => (
                    <div
                      key={position.pool.id}
                      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TokenPairIcon
                            tokenA={position.pool.tokenA.symbol}
                            tokenB={position.pool.tokenB.symbol}
                            size="sm"
                          />
                          <span className="font-semibold text-white">
                            {position.pool.tokenA.symbol}/
                            {position.pool.tokenB.symbol}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">LP Tokens:</span>
                          <span className="text-white">
                            {formatTokenAmount(position.lpTokenBalance, 6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Share:</span>
                          <span className="text-white">
                            {position.shareOfPool.toFixed(4)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    No liquidity positions yet
                  </div>
                  <p className="text-sm text-gray-500">
                    Add liquidity to start earning fees
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Available Pools Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Available Pools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokenPairs.map((pair) => {
              const totalLiquidityA = pair.pools.reduce(
                (sum, p) => sum + Number(p.reserveA),
                0
              );
              const totalLiquidityB = pair.pools.reduce(
                (sum, p) => sum + Number(p.reserveB),
                0
              );

              return (
                <div
                  key={`${pair.tokenA}/${pair.tokenB}`}
                  className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => {
                    const tokenA = availableTokens.find(
                      (t) => t.symbol === pair.tokenA
                    );
                    const tokenB = availableTokens.find(
                      (t) => t.symbol === pair.tokenB
                    );
                    if (tokenA && tokenB) {
                      setSelectedTokenA(tokenA);
                      setSelectedTokenB(tokenB);
                      setTokenASelectorExpanded(false);
                      setTokenBSelectorExpanded(false);
                      setAmountInputExpanded(true);
                      setActiveTab("add");
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TokenPairIcon
                        tokenA={pair.tokenA}
                        tokenB={pair.tokenB}
                        size="md"
                      />
                      <h3 className="text-lg font-bold text-white">
                        {pair.tokenA}/{pair.tokenB}
                      </h3>
                    </div>
                    <span className="px-3 py-1 backdrop-blur-xl bg-blue-500/20 border border-blue-500/50 text-blue-300 text-xs font-semibold rounded-full">
                      {pair.pools.length} Shards
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Liquidity:</span>
                      <span className="text-white font-medium">
                        {(
                          totalLiquidityA /
                          Math.pow(10, pair.pools[0].tokenA.decimals)
                        ).toLocaleString()}{" "}
                        /{" "}
                        {(
                          totalLiquidityB /
                          Math.pow(10, pair.pools[0].tokenB.decimals)
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">APR:</span>
                      <span className="text-green-400 font-medium">~12.5%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Remove Liquidity Modal */}
      <RemoveLiquidity
        pool={selectedPool}
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onLiquidityRemoved={handleLiquidityRemoved}
      />
    </div>
  );
}
