'use client';

import React from 'react';
import { PoolList } from '@/components/pools';

export default function PoolsPage() {
  const handlePoolSelect = (pool: any) => {
    console.log('Pool selected:', pool);
  };

  const handleCreatePool = () => {
    console.log('Create pool clicked');
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PoolList 
          onPoolSelect={handlePoolSelect}
          onCreatePool={handleCreatePool}
          showCreateButton={true}
        />
      </div>
    </div>
  );
}
