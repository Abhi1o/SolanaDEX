import { useEffect } from 'react';
import { usePoolStore } from '@/stores/poolStore';
import { usePoolsFromConfig } from './usePoolsFromConfig';

export const usePools = () => {
  const poolStore = usePoolStore();
  
  // Load pools from config on mount
  usePoolsFromConfig();
  
  return {
    ...poolStore,
  };
};