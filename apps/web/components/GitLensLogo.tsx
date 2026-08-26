'use client';

import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

export function GitLensLogo({ className = 'h-7 w-7', size = 28 }: Props) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 border border-[#e8a33d] rounded-[3px] bg-[#141312] select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <span
        className="font-mono font-bold text-[#e8a33d] leading-none tracking-tight"
        style={{ fontSize: `${Math.max(10, Math.round(size * 0.42))}px` }}
      >
        GL
      </span>
    </div>
  );
}
