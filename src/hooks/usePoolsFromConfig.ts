/**
 * Hook to load pools from dex-config.json
 */

import { useEffect } from 'react';
import { usePoolStore } from '@/stores/poolStore';
import { loadPoolsFromConfig } from '@/lib/solana/poolLoader';

export function usePoolsFromConfig() {
  const { setPools, setLoading, setError } = usePoolStore();

  useEffect(() => {
    const loadPools = () => {
      setLoading(true);
      setError(null);

      try {
        const pools = loadPoolsFromConfig();
        setPools(pools);
      } catch (error) {
        console.error('Failed to load pools from config:', error);
        setError(error instanceof Error ? error.message : 'Failed to load pools');
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, [setPools, setLoading, setError]);
}
