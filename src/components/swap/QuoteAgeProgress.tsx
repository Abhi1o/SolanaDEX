import React from 'react';

interface QuoteAgeProgressProps {
  quoteAge: number; // in milliseconds
  maxAge?: number; // maximum age in milliseconds before refresh (default 10000ms = 10s)
}

export function QuoteAgeProgress({ quoteAge, maxAge = 10000 }: QuoteAgeProgressProps) {
  // Calculate progress percentage (0-100)
  const progress = Math.min((quoteAge / maxAge) * 100, 100);

  // Calculate stroke dashoffset for the circle
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs">Quote Age:</span>

      <div className="relative w-5 h-5">
        {/* Background circle */}
        <svg className="w-5 h-5 transform -rotate-90">
          <circle
            cx="10"
            cy="10"
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="2"
            fill="none"
          />
          {/* Progress circle - static blue color */}
          <circle
            cx="10"
            cy="10"
            r={radius}
            stroke="#ABB2BF"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-100"
          />
        </svg>
      </div>
    </div>
  );
}
