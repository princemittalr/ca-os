import React from 'react';
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse bg-slate-100 rounded", className)}
    />
  );
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse bg-slate-100 rounded", className)}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-6 w-2/3" />
      <SkeletonLine className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 h-12 border-b border-slate-100 px-4">
      <SkeletonLine className="h-4 w-1/4" />
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-4 w-1/6 ml-auto" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="h-10 bg-slate-50 border-b border-[#E2E8F0]" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
