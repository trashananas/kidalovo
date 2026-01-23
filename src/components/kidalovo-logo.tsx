import { cn } from '@/lib/utils';
import React from 'react';

export function KidalovoLogo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-16 w-16", className)}
      {...props}
    >
      <g transform="rotate(45 50 50)" className="origin-center">
        {/* Buns - use primary color from theme */}
        <circle cx="32.5" cy="32.5" r="16" fill="hsl(var(--primary))" />
        <circle cx="67.5" cy="67.5" r="16" fill="hsl(var(--primary))" />
        
        {/* Yogurts - use secondary color from theme */}
        <rect x="55" y="17.5" width="25" height="30" rx="8" fill="hsl(var(--secondary))" />
        <rect x="20" y="52.5" width="25" height="30" rx="8" fill="hsl(var(--secondary))" />
      </g>
    </svg>
  );
}
