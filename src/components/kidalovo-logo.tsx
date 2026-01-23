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
      {/* Top-left: Circle */}
      <circle cx="30" cy="35" r="20" fill="hsl(var(--primary))" />

      {/* Top-right: Rounded Square */}
      <rect x="55" y="10" width="40" height="40" rx="10" fill="hsl(var(--border))" />

      {/* Bottom-left: Rounded Square */}
      <rect x="10" y="60" width="40" height="40" rx="10" fill="hsl(var(--border))" />

      {/* Bottom-right: Circle */}
      <circle cx="75" cy="75" r="20" fill="hsl(var(--primary))" />
    </svg>
  );
}
