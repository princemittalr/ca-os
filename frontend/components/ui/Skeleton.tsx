import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-100 rounded-[3px] ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
      <SkeletonLine className="h-3 w-1/3" />
      <SkeletonLine className="h-5 w-2/3" />
      <SkeletonLine className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 h-9 border-b border-[#F3F4F6] px-3">
      <SkeletonLine className="h-3 w-1/4" />
      <SkeletonLine className="h-3 w-1/3" />
      <SkeletonLine className="h-3 w-1/6 ml-auto" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[4px] overflow-hidden">
      <div className="h-9 bg-slate-50 border-b border-[#E5E7EB]" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
