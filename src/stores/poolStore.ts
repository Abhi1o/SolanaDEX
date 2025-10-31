import { create } from 'zustand';
import { Pool } from '@/types';

interface PoolStore {
  pools: Pool[];
  loading: boolean;
  error: string | null;
  
  setPools: (pools: Pool[]) => void;
  addPool: (pool: Pool) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePoolStore = create<PoolStore>((set) => ({
  pools: [],
  loading: false,
  error: null,
  
  setPools: (pools) => set({ pools }),
  addPool: (pool) => set((state) => ({ pools: [...state.pools, pool] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));