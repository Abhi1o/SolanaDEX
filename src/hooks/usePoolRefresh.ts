/**
 * Pool Refresh Hook
 * 
 * This hook manages automatic and manual refreshing of pool data from the blockchain.
 * It implements:
 * - Automatic polling at configurable intervals (default 10 seconds)
 * - Manual refresh trigger
 * - Exponential backoff for failed requests
 * - Staleness detection (data older than 1 minute)
 * - Cleanup on unmount
 * 
 * Requirements:
 * - 4.1: Automatic polling to refresh pool data
 * - 4.2: Fetch pool data on component mount
 * - 4.4: Error handling with exponential backoff
 * - 5.3: Staleness detection
 * 
 * @module usePoolRefresh
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePoolStore } from '@/stores/poolStore';
import { useSolanaConnection } from './useSolanaConnection';
import { useNotificationStore } from '@/stores/notificationStore';

/**
 * Configuration options for pool refresh hook
 */
export interface UsePoolRefreshOptions {
  /** Whether automatic polling is enabled (default: true) */
  enabled?: boolean;
  /** Refresh interval in milliseconds (default: 10000 = 10 seconds) */
  refreshInterval?: number;
  /** Callback invoked when an error occurs during refresh */
  onError?: (error: Error) => void;
  /** Callback invoked when refresh completes successfully */
  onSuccess?: () => void;
}

/**
 * Return value from pool refresh hook
 */
export interface UsePoolRefreshReturn {
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Timestamp of last successful refresh */
  lastRefreshTime: number;
  /** Whether the current data is stale (older than 1 minute) */
  isStale: boolean;
  /** Function to manually trigger a refresh */
  manualRefresh: () => Promise<void>;
  /** Last error that occurred during refresh, if any */
  error: Error | null;
  /** Number of consecutive failures (for debugging) */
  consecutiveFailures: number;
  /** Current backoff delay in milliseconds (for debugging) */
  currentBackoffDelay: number;
}

/**
 * Error recovery state for exponential backoff
 */
interface ErrorRecoveryState {
  consecutiveFailures: number;
  lastFailureTime: number;
  backoffDelay: number;
  maxBackoffDelay: number;
}

// Constants
const DEFAULT_REFRESH_INTERVAL = 10000; // 10 seconds
const STALE_THRESHOLD = 60 * 1000; // 1 minute in milliseconds
const INITIAL_BACKOFF_DELAY = 1000; // 1 second
const MAX_BACKOFF_DELAY = 30000; // 30 seconds
const BACKOFF_MULTIPLIER = 2;

/**
 * Calculate next backoff delay using exponential backoff strategy
 * 
 * @param state - Current error recovery state
 * @returns Next backoff delay in milliseconds
 */
function calculateBackoffDelay(state: ErrorRecoveryState): number {
  return Math.min(
    state.backoffDelay * BACKOFF_MULTIPLIER,
    state.maxBackoffDelay
  );
}

/**
 * Pool Refresh Hook
 * 
 * Manages automatic and manual refreshing of pool data from the blockchain.
 * Implements exponential backoff for failed requests and staleness detection.
 * 
 * @param options - Configuration options
 * @returns Hook state and functions
 * 
 * @example
 * ```tsx
 * const { isRefreshing, isStale, manualRefresh } = usePoolRefresh({
 *   enabled: true,
 *   refreshInterval: 10000,
 *   onError: (error) => console.error('Refresh failed:', error)
 * });
 * 
 * // Manual refresh
 * await manualRefresh();
 * ```
 */
export function usePoolRefresh(options: UsePoolRefreshOptions = {}): UsePoolRefreshReturn {
  const {
    enabled = true,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    onError,
    onSuccess
  } = options;

  // Get connection, pool store, and notification store
  const { connection } = useSolanaConnection();
  const poolStore = usePoolStore();
  const notificationStore = useNotificationStore();

  // Local state
  const [error, setError] = useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Error recovery state
  const errorRecoveryRef = useRef<ErrorRecoveryState>({
    consecutiveFailures: 0,
    lastFailureTime: 0,
    backoffDelay: INITIAL_BACKOFF_DELAY,
    maxBackoffDelay: MAX_BACKOFF_DELAY
  });

  // Refs for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Check if data is stale (older than 1 minute)
   */
  const isStale = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - poolStore.lastFetchTime;
    return timeSinceLastFetch > STALE_THRESHOLD;
  }, [poolStore.lastFetchTime]);

  /**
   * Perform pool refresh
   * 
   * Fetches fresh pool data from blockchain and updates the store.
   * Implements exponential backoff on failures.
   */
  const performRefresh = useCallback(async () => {
    // Don't refresh if already refreshing
    if (isRefreshing) {
      console.log('⏭️  Pool refresh already in progress, skipping');
      return;
    }

    // Don't refresh if no pools loaded yet
    if (poolStore.pools.length === 0) {
      console.log('⏭️  No pools loaded yet, skipping refresh');
      return;
    }

    console.log('🔄 Starting pool refresh');
    setIsRefreshing(true);
    setError(null);

    try {
      // Call pool store refresh method
      await poolStore.refreshPools(connection);

      // Reset error recovery state on success
      errorRecoveryRef.current = {
        consecutiveFailures: 0,
        lastFailureTime: 0,
        backoffDelay: INITIAL_BACKOFF_DELAY,
        maxBackoffDelay: MAX_BACKOFF_DELAY
      };

      console.log('✅ Pool refresh completed successfully');

      // Show success notification only if recovering from errors
      if (errorRecoveryRef.current.consecutiveFailures > 0 && isMountedRef.current) {
        notificationStore.showSuccess(
          'Connection Restored',
          'Pool data is now updating from the blockchain.'
        );
      }

      // Call success callback if provided
      if (onSuccess && isMountedRef.current) {
        onSuccess();
      }
    } catch (err) {
      const refreshError = err instanceof Error ? err : new Error(String(err));
      
      // Update error recovery state
      const recovery = errorRecoveryRef.current;
      recovery.consecutiveFailures += 1;
      recovery.lastFailureTime = Date.now();
      recovery.backoffDelay = calculateBackoffDelay(recovery);

      console.error('❌ Pool refresh failed');
      console.error(`   Error: ${refreshError.message}`);
      console.error(`   Consecutive failures: ${recovery.consecutiveFailures}`);
      console.error(`   Next backoff delay: ${recovery.backoffDelay}ms`);

      if (isMountedRef.current) {
        setError(refreshError);

        // Show error notification based on failure count
        if (recovery.consecutiveFailures === 1) {
          // First failure - show warning
          notificationStore.showWarning(
            'Connection Issue',
            'Having trouble fetching pool data. Retrying...',
            true
          );
        } else if (recovery.consecutiveFailures === 3) {
          // Third failure - show error with retry info
          notificationStore.showError(
            'Connection Failed',
            `Unable to fetch pool data. Will retry in ${Math.round(recovery.backoffDelay / 1000)}s.`,
            true
          );
        } else if (recovery.consecutiveFailures >= 5) {
          // Multiple failures - show persistent error
          notificationStore.showError(
            'Blockchain Connection Lost',
            'Displaying cached data. Check your internet connection.',
            false
          );
        }

        // Call error callback if provided
        if (onError) {
          onError(refreshError);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [connection, poolStore, isRefreshing, onError, onSuccess]);

  /**
   * Manual refresh function
   * 
   * Allows components to trigger a refresh on-demand.
   * Respects backoff delays if there have been recent failures.
   */
  const manualRefresh = useCallback(async () => {
    const recovery = errorRecoveryRef.current;
    
    // Check if we should respect backoff delay
    if (recovery.consecutiveFailures > 0) {
      const timeSinceLastFailure = Date.now() - recovery.lastFailureTime;
      
      if (timeSinceLastFailure < recovery.backoffDelay) {
        const remainingDelay = recovery.backoffDelay - timeSinceLastFailure;
        console.warn(`⏳ Manual refresh requested but in backoff period`);
        console.warn(`   Remaining delay: ${remainingDelay}ms`);
        console.warn(`   Consecutive failures: ${recovery.consecutiveFailures}`);
        
        // Still allow manual refresh but warn user
        // In a production app, you might want to prevent this entirely
      }
    }

    await performRefresh();
  }, [performRefresh]);

  /**
   * Setup automatic polling
   */
  useEffect(() => {
    // Don't setup polling if disabled
    if (!enabled) {
      console.log('⏸️  Pool refresh polling disabled');
      return;
    }

    console.log(`🔄 Setting up pool refresh polling (interval: ${refreshInterval}ms)`);

    // Perform initial refresh on mount
    performRefresh();

    // Setup polling interval
    pollingIntervalRef.current = setInterval(() => {
      const recovery = errorRecoveryRef.current;
      
      // If we have consecutive failures, check if we should skip this poll
      if (recovery.consecutiveFailures > 0) {
        const timeSinceLastFailure = Date.now() - recovery.lastFailureTime;
        
        if (timeSinceLastFailure < recovery.backoffDelay) {
          console.log(`⏭️  Skipping poll due to backoff (${recovery.backoffDelay}ms)`);
          return;
        }
      }

      // Perform refresh
      performRefresh();
    }, refreshInterval);

    // Cleanup on unmount
    return () => {
      console.log('🛑 Cleaning up pool refresh polling');
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, performRefresh]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isRefreshing,
    lastRefreshTime: poolStore.lastFetchTime,
    isStale: isStale(),
    manualRefresh,
    error,
    consecutiveFailures: errorRecoveryRef.current.consecutiveFailures,
    currentBackoffDelay: errorRecoveryRef.current.backoffDelay
  };
}
