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
import { clearServiceWorkerCache } from '@/utils/cacheUtils';

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
  /** Whether initial load is in progress */
  isInitialLoad: boolean;
  /** Whether background refresh is in progress */
  isBackgroundRefresh: boolean;
  /** Timestamp of last successful refresh */
  lastRefreshTime: number;
  /** Whether the current data is stale (older than 1 minute) */
  isStale: boolean;
  /** Function to manually trigger a refresh */
  manualRefresh: () => Promise<void>;
  /** Function to clear cache and trigger fresh fetch */
  clearAndRefresh: () => Promise<void>;
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
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds (changed from 10s for silent background refresh)
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
 * const { 
 *   isInitialLoad, 
 *   isBackgroundRefresh, 
 *   manualRefresh,
 *   clearAndRefresh 
 * } = usePoolRefresh({
 *   enabled: true,
 *   refreshInterval: 30000,
 *   onError: (error) => console.error('Refresh failed:', error)
 * });
 * 
 * // Manual refresh
 * await manualRefresh();
 * 
 * // Hard refresh (clear cache)
 * await clearAndRefresh();
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

  // Error recovery state
  const errorRecoveryRef = useRef<ErrorRecoveryState>({
    consecutiveFailures: 0,
    lastFailureTime: 0,
    backoffDelay: INITIAL_BACKOFF_DELAY,
    maxBackoffDelay: MAX_BACKOFF_DELAY
  });

  // Track if we had previous failures for recovery notification
  const hadPreviousFailuresRef = useRef(false);

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
   * 
   * @param isInitial - Whether this is an initial load (vs background refresh)
   */
  const performRefresh = useCallback(async (isInitial: boolean = false) => {
    // Don't refresh if already loading
    if (poolStore.loading) {
      console.log('⏭️  Pool refresh already in progress, skipping');
      return;
    }

    // Don't refresh if no pools loaded yet (unless it's initial load)
    if (!isInitial && poolStore.pools.length === 0) {
      console.log('⏭️  No pools loaded yet, skipping refresh');
      return;
    }

    console.log(`🔄 Starting pool ${isInitial ? 'initial load' : 'background refresh'}`);
    setError(null);

    try {
      // Call appropriate pool store method based on load type
      if (isInitial) {
        await poolStore.fetchPools(connection, true);
      } else {
        await poolStore.refreshPools(connection);
      }

      // Check if we had failures before (for recovery notification)
      const hadFailures = hadPreviousFailuresRef.current;

      // Reset error recovery state on success
      errorRecoveryRef.current = {
        consecutiveFailures: 0,
        lastFailureTime: 0,
        backoffDelay: INITIAL_BACKOFF_DELAY,
        maxBackoffDelay: MAX_BACKOFF_DELAY
      };

      console.log('✅ Pool refresh completed successfully');

      // Show success notification only if recovering from errors (Requirement 6.6)
      if (hadFailures && isMountedRef.current) {
        notificationStore.showSuccess(
          'Connection Restored',
          'Pool data is now updating from the blockchain.'
        );
        hadPreviousFailuresRef.current = false;
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
        hadPreviousFailuresRef.current = true;

        // Improved error notification logic (Requirement 2.4, 6.2, 6.3, 6.6)
        if (recovery.consecutiveFailures === 1 || recovery.consecutiveFailures === 2) {
          // First 2 failures - no notification (silent retry)
          console.log('   Silent retry - no notification shown');
        } else if (recovery.consecutiveFailures === 3) {
          // Third failure - show warning toast
          notificationStore.showWarning(
            'Connection Issue',
            'Having trouble fetching pool data. Retrying...',
            true
          );
        } else if (recovery.consecutiveFailures >= 4) {
          // Fourth+ failures - show error banner
          notificationStore.showError(
            'Connection Failed',
            `Unable to fetch pool data after ${recovery.consecutiveFailures} attempts. Displaying cached data.`,
            false // Don't auto-close
          );
        }

        // Call error callback if provided
        if (onError) {
          onError(refreshError);
        }
      }
    }
  }, [connection, poolStore, onError, onSuccess, notificationStore]);

  /**
   * Manual refresh function
   * 
   * Allows components to trigger a refresh on-demand.
   * Bypasses backoff delays but shows warning if in backoff period.
   */
  const manualRefresh = useCallback(async () => {
    const recovery = errorRecoveryRef.current;
    
    // Check if we're in backoff period (Requirement 2.2, 2.3)
    if (recovery.consecutiveFailures > 0) {
      const timeSinceLastFailure = Date.now() - recovery.lastFailureTime;
      
      if (timeSinceLastFailure < recovery.backoffDelay) {
        const remainingDelay = recovery.backoffDelay - timeSinceLastFailure;
        console.warn(`⏳ Manual refresh bypassing backoff period`);
        console.warn(`   Remaining delay: ${remainingDelay}ms`);
        console.warn(`   Consecutive failures: ${recovery.consecutiveFailures}`);
        
        // Show warning to user
        notificationStore.showWarning(
          'Retrying Connection',
          'Attempting to reconnect...',
          true
        );
      }
    }

    // Perform background refresh (not initial load)
    await performRefresh(false);
  }, [performRefresh, notificationStore]);

  /**
   * Clear cache and refresh function
   * 
   * Clears all cached data and triggers a fresh fetch.
   * Used for hard refresh scenarios.
   * (Requirement 1.3, 7.1)
   */
  const clearAndRefresh = useCallback(async () => {
    console.log('🗑️  Clearing cache and performing hard refresh');
    
    try {
      // Clear service worker cache if applicable
      await clearServiceWorkerCache();
    } catch (error) {
      console.warn('Failed to clear service worker cache:', error);
      // Continue with refresh even if cache clearing fails
    }
    
    // Clear the pool store cache
    poolStore.clearCache();
    
    // Reset error recovery state
    errorRecoveryRef.current = {
      consecutiveFailures: 0,
      lastFailureTime: 0,
      backoffDelay: INITIAL_BACKOFF_DELAY,
      maxBackoffDelay: MAX_BACKOFF_DELAY
    };
    hadPreviousFailuresRef.current = false;
    setError(null);
    
    // Trigger initial fetch
    await performRefresh(true);
  }, [poolStore, performRefresh]);

  /**
   * Setup automatic polling with exponential backoff
   * (Requirements 2.2, 2.3, 8.1, 8.2, 8.4)
   */
  useEffect(() => {
    // Don't setup polling if disabled
    if (!enabled) {
      console.log('⏸️  Pool refresh polling disabled');
      return;
    }

    console.log(`🔄 Setting up pool refresh polling (interval: ${refreshInterval}ms)`);

    // Perform initial refresh on mount
    performRefresh(true);

    // Setup polling interval for background refresh
    pollingIntervalRef.current = setInterval(() => {
      const recovery = errorRecoveryRef.current;
      const now = Date.now();
      const timeSinceLastFetch = now - poolStore.lastFetchTime;
      const isDataStale = timeSinceLastFetch > STALE_THRESHOLD;
      
      // Implement proper exponential backoff (Requirement 2.2, 2.3)
      // Skip automatic refresh during backoff period
      if (recovery.consecutiveFailures > 0) {
        const timeSinceLastFailure = now - recovery.lastFailureTime;
        
        if (timeSinceLastFailure < recovery.backoffDelay) {
          console.log(`⏭️  Skipping automatic refresh due to backoff`);
          console.log(`   Backoff delay: ${recovery.backoffDelay}ms`);
          console.log(`   Time since failure: ${timeSinceLastFailure}ms`);
          console.log(`   Remaining: ${recovery.backoffDelay - timeSinceLastFailure}ms`);
          return;
        }
      }

      // Trigger background refresh when data becomes stale (Requirement 5.2, 5.3)
      if (isDataStale) {
        console.log(`🔄 Data is stale (${Math.floor(timeSinceLastFetch / 1000)}s old), triggering background refresh`);
      }

      // Perform silent background refresh (Requirement 8.1, 8.2, 8.4)
      performRefresh(false);
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
   * Page visibility detection for hard refresh
   * (Requirement 1.3, 7.1)
   * 
   * Detects when user returns to the page after a long absence
   * and triggers a hard refresh to ensure fresh data.
   */
  useEffect(() => {
    if (!enabled) return;

    // Track when the page was last visible
    let lastVisibleTime = Date.now();
    const ABSENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastVisible = now - lastVisibleTime;

        console.log(`👁️  Page became visible (absence: ${Math.floor(timeSinceLastVisible / 1000)}s)`);

        // If user was away for more than threshold, trigger hard refresh
        if (timeSinceLastVisible > ABSENCE_THRESHOLD) {
          console.log('🔄 Long absence detected, triggering hard refresh');
          clearAndRefresh();
        } else {
          // Short absence, just update the timestamp
          lastVisibleTime = now;
        }
      } else {
        // Page became hidden, record the time
        lastVisibleTime = Date.now();
        console.log('👁️  Page became hidden');
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, clearAndRefresh]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isInitialLoad: poolStore.isInitialLoad,
    isBackgroundRefresh: poolStore.isBackgroundRefresh,
    lastRefreshTime: poolStore.lastFetchTime,
    isStale: isStale(),
    manualRefresh,
    clearAndRefresh,
    error,
    consecutiveFailures: poolStore.consecutiveFailures,
    currentBackoffDelay: errorRecoveryRef.current.backoffDelay
  };
}
