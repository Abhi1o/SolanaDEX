'use client';

import { useEffect } from 'react';
import { errorTracking } from '../lib/errorTracking';
import { analytics } from '../lib/analytics';

/**
 * Client-side providers for error tracking and analytics
 * This component initializes monitoring services
 */
export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize error tracking
    errorTracking.init().catch((error) => {
      console.error('Failed to initialize error tracking:', error);
    });

    // Track initial page view
    if (typeof window !== 'undefined') {
      analytics.trackPageView(window.location.pathname);
    }
  }, []);

  return <>{children}</>;
}
