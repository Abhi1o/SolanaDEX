import { create } from 'zustand';
import { Connection } from '@solana/web3.js';
import { Pool } from '@/types';
import { loadPoolsFromBlockchain } from '@/lib/solana/poolLoader';
import { enrichPoolsWithBlockchainData } from '@/lib/solana/poolBlockchainFetcher';

interface PoolStore {
  pools: Pool[];
  loading: boolean;
  error: string | null;
  lastFetchTime: number;
  isStale: boolean;
  consecutiveFailures: number;
  isInitialLoad: boolean;
  isBackgroundRefresh: boolean;
  
  setPools: (pools: Pool[]) => void;
  addPool: (pool: Pool) => void;
  updatePool: (poolId: string, updates: Partial<Pool>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastFetchTime: (time: number) => void;
  fetchPools: (connection: Connection, isInitial: boolean) => Promise<void>;
  refreshPools: (connection: Connection) => Promise<void>;
  clearCache: () => void;
  resetFailures: () => void;
}

const STALE_THRESHOLD = 60 * 1000; // 60 seconds (1 minute) in milliseconds

export const usePoolStore = create<PoolStore>((set, get) => ({
  pools: [],
  loading: false,
  error: null,
  lastFetchTime: 0,
  isStale: false,
  consecutiveFailures: 0,
  isInitialLoad: false,
  isBackgroundRefresh: false,
  
  setPools: (pools) => {
    const now = Date.now();
    // Mark all pools as fresh when setting new data
    const freshPools = pools.map(pool => ({
      ...pool,
      isFresh: true,
      lastBlockchainFetch: now
    }));
    
    set({ 
      pools: freshPools,
      lastFetchTime: now,
      isStale: false
    });
  },
  
  addPool: (pool) => set((state) => ({ 
    pools: [...state.pools, pool] 
  })),
  
  updatePool: (poolId, updates) => set((state) => ({
    pools: state.pools.map(pool =>
      pool.id === poolId ? { ...pool, ...updates } : pool
    )
  })),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  setLastFetchTime: (time) => set((state) => {
    const now = Date.now();
    const isStale = now - time > STALE_THRESHOLD;
    
    // Mark pools as stale if threshold exceeded
    const updatedPools = state.pools.map(pool => ({
      ...pool,
      isFresh: !isStale
    }));
    
    return {
      lastFetchTime: time,
      isStale,
      pools: updatedPools
    };
  }),
  
  clearCache: () => set({
    pools: [],
    error: null,
    lastFetchTime: 0,
    consecutiveFailures: 0,
    isStale: false,
    isInitialLoad: false,
    isBackgroundRefresh: false
  }),
  
  fetchPools: async (connection: Connection, isInitial: boolean) => {
    const state = get();
    
    // Don't fetch if already loading
    if (state.loading) {
      console.log('⏭️  Pool fetch already in progress, skipping');
      return;
    }
    
    console.log(`🔄 Fetching pools (${isInitial ? 'initial' : 'background'} load)`);
    
    // Set appropriate loading state
    set({ 
      loading: true, 
      error: null,
      isInitialLoad: isInitial,
      isBackgroundRefresh: !isInitial
    });
    
    try {
      // Load pools from blockchain (always fetches real-time data)
      const pools = await loadPoolsFromBlockchain(connection);
      
      // Count how many pools successfully fetched blockchain data
      const blockchainDataCount = pools.filter(p => p.dataSource === 'blockchain').length;
      const fallbackDataCount = pools.length - blockchainDataCount;
      
      console.log(`✅ Pool fetch complete: ${blockchainDataCount} live, ${fallbackDataCount} cached`);
      
      const now = Date.now();
      // Mark all pools as fresh on successful fetch
      const freshPools = pools.map(pool => ({
        ...pool,
        isFresh: true,
        lastBlockchainFetch: now
      }));
      
      // Update store with pools
      set({
        pools: freshPools,
        lastFetchTime: now,
        isStale: false,
        loading: false,
        error: null,
        consecutiveFailures: 0,
        isInitialLoad: false,
        isBackgroundRefresh: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to fetch pools:', errorMessage);
      
      set((state) => {
        // Mark existing pools as stale on fetch failure
        const stalePools = state.pools.map(pool => ({
          ...pool,
          isFresh: false
        }));
        
        return {
          pools: stalePools,
          error: errorMessage,
          loading: false,
          isStale: true,
          consecutiveFailures: state.consecutiveFailures + 1,
          isInitialLoad: false,
          isBackgroundRefresh: false
        };
      });
    }
  },
  
  refreshPools: async (connection: Connection) => {
    const state = get();
    
    // Don't refresh if already loading
    if (state.loading) {
      console.log('⏭️  Pool refresh already in progress, skipping');
      return;
    }
    
    // Don't refresh if no pools to refresh
    if (state.pools.length === 0) {
      console.log('⏭️  No pools to refresh');
      return;
    }
    
    console.log(`🔄 Refreshing ${state.pools.length} pools with blockchain data`);
    
    set({ loading: true, error: null, isBackgroundRefresh: true });
    
    try {
      // Enrich all pools with blockchain data
      const enrichedPools = await enrichPoolsWithBlockchainData(connection, state.pools);
      
      // Count how many pools successfully fetched blockchain data
      const blockchainDataCount = enrichedPools.filter(p => p.dataSource === 'blockchain').length;
      const fallbackDataCount = enrichedPools.length - blockchainDataCount;
      
      console.log(`✅ Pool refresh complete: ${blockchainDataCount} live, ${fallbackDataCount} cached`);
      
      const now = Date.now();
      // Mark all pools as fresh on successful refresh
      const freshPools = enrichedPools.map(pool => ({
        ...pool,
        isFresh: true,
        lastBlockchainFetch: now
      }));
      
      // Update store with enriched pools and reset consecutiveFailures on success
      set({
        pools: freshPools,
        lastFetchTime: now,
        isStale: false,
        loading: false,
        error: null,
        consecutiveFailures: 0,
        isBackgroundRefresh: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to refresh pools:', errorMessage);
      
      // Keep existing pool data on refresh failure, increment consecutiveFailures
      set((state) => {
        // Mark existing pools as stale on refresh failure
        const stalePools = state.pools.map(pool => ({
          ...pool,
          isFresh: false
        }));
        
        return {
          pools: stalePools,
          error: errorMessage,
          loading: false,
          isStale: true,
          consecutiveFailures: state.consecutiveFailures + 1,
          isBackgroundRefresh: false
          // Note: pools are NOT cleared - existing data is retained
        };
      });
    }
  },
  
  resetFailures: () => set({ consecutiveFailures: 0, error: null })
}));