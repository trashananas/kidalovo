'use client';

import { cn } from '@/lib/utils';
import React from 'react';

export function PineappleBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-5 w-5 inline-block align-middle select-none", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pineapple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#F472B6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#pineapple-grad)" />
      
      <g fill="#4ADE80" stroke="#4ADE80" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M50 40 L40 25 Q50 35 60 25 Z" />
        <path d="M50 40 L50 15 Q50 35 50 15 Z" />
        <path d="M50 40 L30 35 Q50 40 30 35 Z" />
        <path d="M50 40 L70 35 Q50 40 70 35 Z" />
      </g>
      
      <circle cx="50" cy="58" r="18" fill="none" stroke="#FACC15" strokeWidth="3" />
      <path d="M38 50 L62 66 M38 66 L62 50 M32 58 L68 58 M50 40 L50 76" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="58" r="18" fill="#FACC15" fillOpacity="0.2" />
    </svg>
  );
}