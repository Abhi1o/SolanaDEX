import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePoolRefresh } from '../usePoolRefresh';
import { usePoolStore } from '@/stores/poolStore';
import { useSolanaConnection } from '../useSolanaConnection';

// Mock dependencies
vi.mock('@/stores/poolStore');
vi.mock('../useSolanaConnection');

describe('usePoolRefresh', () => {
  const mockConnection = {
    rpcEndpoint: 'https://api.devnet.solana.com',
  };

  const mockPoolStore = {
    pools: [
      {
        id: 'pool1',
        tokenA: { symbol: 'SOL', decimals: 9 },
        tokenB: { symbol: 'USDC', decimals: 6 },
      },
    ],
    loading: false,
    error: null,
    lastFetchTime: Date.now(),
    isStale: false,
    refreshPools: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useSolanaConnection).mockReturnValue({
      connection: mockConnection as any,
      cluster: 'devnet' as any,
      endpoint: 'https://api.devnet.solana.com',
    });
    vi.mocked(usePoolStore).mockReturnValue(mockPoolStore as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Automatic Polling', () => {
    it('should perform initial refresh on mount', async () => {
      renderHook(() => usePoolRefresh({ enabled: true }));

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockPoolStore.refreshPools).toHaveBeenCalledWith(mockConnection);
    });

    it('should poll at 10-second intervals by default', async () => {
      renderHook(() => usePoolRefresh({ enabled: true }));

      // Initial refresh
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(1);

      // First poll after 10 seconds
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(2);

      // Second poll after another 10 seconds
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(3);
    });

    it('should use custom refresh interval when provided', async () => {
      renderHook(() => usePoolRefresh({ enabled: true, refreshInterval: 5000 }));

      // Initial refresh
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(1);

      // Poll after 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(2);
    });

    it('should not poll when disabled', async () => {
      renderHook(() => usePoolRefresh({ enabled: false }));

      await act(async () => {
        vi.advanceTimersByTime(20000);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockPoolStore.refreshPools).not.toHaveBeenCalled();
    });

    it('should cleanup polling on unmount', async () => {
      const { unmount } = renderHook(() => usePoolRefresh({ enabled: true }));

      // Initial refresh
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(1);

      // Unmount
      unmount();

      // Advance time - should not trigger more refreshes
      await act(async () => {
        vi.advanceTimersByTime(20000);
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Refresh', () => {
    it('should allow manual refresh trigger', async () => {
      const { result } = renderHook(() => usePoolRefresh({ enabled: false }));

      await act(async () => {
        await result.current.manualRefresh();
      });

      expect(mockPoolStore.refreshPools).toHaveBeenCalledWith(mockConnection);
    });

    it('should update isRefreshing state during manual refresh', async () => {
      mockPoolStore.refreshPools.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => usePoolRefresh({ enabled: false }));

      expect(result.current.isRefreshing).toBe(false);

      const refreshPromise = act(async () => {
        await result.current.manualRefresh();
      });

      // Should be refreshing during the operation
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      await refreshPromise;

      // Should be done after completion
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Exponential Backoff', () => {
    it('should implement exponential backoff on consecutive failures', async () => {
      mockPoolStore.refreshPools.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePoolRefresh({ enabled: true }));

      // First failure
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(result.current.consecutiveFailures).toBe(1);
      expect(result.current.currentBackoffDelay).toBe(2000); // 1s * 2

      // Second failure
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runOnlyPendingTimersAsync();
      });
      expect(result.current.consecutiveFailures).toBe(2);
      expect(result.current.currentBackoffDelay).toBe(4000); // 2s * 2

      // Third failure
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runOnlyPendingTimersAsync();
      });
      expect(result.current.consecutiveFailures).toBe(3);
      expect(result.current.currentBackoffDelay).toBe(8000); // 4s * 2
    });

    it('should cap backoff delay at maximum (30 seconds)', async () => {
      mockPoolStore.refreshPools.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePoolRefresh({ enabled: true }));

      // Trigger multiple failures to exceed max backoff
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          vi.advanceTimersByTime(10000);
          await vi.runOnlyPendingTimersAsync();
        });
      }

      // Should be capped at 30 seconds
      expect(result.current.currentBackoffDelay).toBeLessThanOrEqual(30000);
    });

    it('should reset backoff on successful refresh', async () => {
      // Start with failures
      mockPoolStore.refreshPools.mockRejectedValueOnce(new Error('Network error'));
      mockPoolStore.refreshPools.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePoolRefresh({ enabled: true }));

      // Two failures
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.consecutiveFailures).toBe(2);
      expect(result.current.currentBackoffDelay).toBe(4000);

      // Now succeed
      mockPoolStore.refreshPools.mockResolvedValueOnce(undefined);
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runOnlyPendingTimersAsync();
      });

      // Should reset
      expect(result.current.consecutiveFailures).toBe(0);
      expect(result.current.currentBackoffDelay).toBe(1000);
    });

    it('should skip polls during backoff period', async () => {
      mockPoolStore.refreshPools.mockRejectedValue(new Error('Network error'));

      renderHook(() => usePoolRefresh({ enabled: true }));

      // First failure - sets backoff to 2s
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(1);

      // Try to poll after 1 second (within backoff period)
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runOnlyPendingTimersAsync();
      });
      // Should still be 1 call (skipped due to backoff)
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(1);

      // Poll after backoff period expires (after 2s total)
      await act(async () => {
        vi.advanceTimersByTime(9000); // Total 10s from last attempt
        await vi.runOnlyPendingTimersAsync();
      });
      // Should now attempt again
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(2);
    });
  });

  describe('Staleness Detection', () => {
    it('should detect stale data (older than 1 minute)', () => {
      const staleTime = Date.now() - 61 * 1000; // 61 seconds ago
      vi.mocked(usePoolStore).mockReturnValue({
        ...mockPoolStore,
        lastFetchTime: staleTime,
      } as any);

      const { result } = renderHook(() => usePoolRefresh({ enabled: false }));

      expect(result.current.isStale).toBe(true);
    });

    it('should not mark fresh data as stale', () => {
      const freshTime = Date.now() - 30 * 1000; // 30 seconds ago
      vi.mocked(usePoolStore).mockReturnValue({
        ...mockPoolStore,
        lastFetchTime: freshTime,
      } as any);

      const { result } = renderHook(() => usePoolRefresh({ enabled: false }));

      expect(result.current.isStale).toBe(false);
    });

    it('should update staleness as time passes', async () => {
      const initialTime = Date.now();
      vi.mocked(usePoolStore).mockReturnValue({
        ...mockPoolStore,
        lastFetchTime: initialTime,
      } as any);

      const { result, rerender } = renderHook(() => usePoolRefresh({ enabled: false }));

      // Initially fresh
      expect(result.current.isStale).toBe(false);

      // Advance time by 61 seconds
      await act(async () => {
        vi.advanceTimersByTime(61000);
      });

      // Rerender to update staleness check
      rerender();

      // Should now be stale
      expect(result.current.isStale).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should capture and expose errors', async () => {
      const testError = new Error('Test error');
      mockPoolStore.refreshPools.mockRejectedValue(testError);

      const { result } = renderHook(() => usePoolRefresh({ enabled: true }));

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.error).toEqual(testError);
    });

    it('should call onError callback when refresh fails', async () => {
      const testError = new Error('Test error');
      const onError = vi.fn();
      mockPoolStore.refreshPools.mockRejectedValue(testError);

      renderHook(() => usePoolRefresh({ enabled: true, onError }));

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(onError).toHaveBeenCalledWith(testError);
    });

    it('should call onSuccess callback when refresh succeeds', async () => {
      const onSuccess = vi.fn();
      mockPoolStore.refreshPools.mockResolvedValue(undefined);

      renderHook(() => usePoolRefresh({ enabled: true, onSuccess }));

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should clear error on successful refresh', async () => {
      // Start with error
      mockPoolStore.refreshPools.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => usePoolRefresh({ enabled: true }));

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(result.current.error).toBeTruthy();

      // Now succeed
      mockPoolStore.refreshPools.mockResolvedValueOnce(undefined);
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should not refresh if no pools are loaded', async () => {
      vi.mocked(usePoolStore).mockReturnValue({
        ...mockPoolStore,
        pools: [],
      } as any);

      renderHook(() => usePoolRefresh({ enabled: true }));

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockPoolStore.refreshPools).not.toHaveBeenCalled();
    });

    it('should not start multiple concurrent refreshes', async () => {
      mockPoolStore.refreshPools.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { result } = renderHook(() => usePoolRefresh({ enabled: false }));

      // Start first refresh
      const refresh1 = act(async () => {
        await result.current.manualRefresh();
      });

      // Try to start second refresh while first is in progress
      const refresh2 = act(async () => {
        await result.current.manualRefresh();
      });

      await Promise.all([refresh1, refresh2]);

      // Should only call once (second call skipped)
      expect(mockPoolStore.refreshPools).toHaveBeenCalledTimes(1);
    });

    it('should expose lastRefreshTime from store', () => {
      const testTime = Date.now() - 5000;
      vi.mocked(usePoolStore).mockReturnValue({
        ...mockPoolStore,
        lastFetchTime: testTime,
      } as any);

      const { result } = renderHook(() => usePoolRefresh({ enabled: false }));

      expect(result.current.lastRefreshTime).toBe(testTime);
    });
  });
});
