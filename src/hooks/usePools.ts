import { useEffect } from 'react';
import { usePoolStore } from '@/stores/poolStore';
import { usePoolListSubscriptions } from './usePoolUpdates';

export const usePools = () => {
  const poolStore = usePoolStore();
  
  // Subscribe to real-time pool updates
  usePoolListSubscriptions(true);
  
  return {
    ...poolStore,
  };
};