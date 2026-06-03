"use client";

import React from 'react';

interface PageHeaderProps {
  sectionLabel?: string;
  title: React.ReactNode;
  description?: string;
  liveIndicator?: boolean;
  hasSeparator?: boolean;
  actions?: React.ReactNode;
}

export default function PageHeader({
  sectionLabel,
  title,
  description,
  liveIndicator,
  hasSeparator = false,
  actions,
}: PageHeaderProps) {
  return (
    <div className={`w-full pb-8 ${hasSeparator ? 'border-b border-[var(--color-border)] mb-6' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-live-dot {
          animation: pulse 2s ease-in-out infinite;
        }
      `}} />
      <div className={actions ? "flex flex-col lg:flex-row lg:items-center justify-between gap-4" : ""}>
        <div className="space-y-1 min-w-0">
          {sectionLabel && (
            <div className="flex items-center">
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--color-primary-light)]">
                {sectionLabel}
              </span>
              {liveIndicator && (
                <span 
                  className="w-2 h-2 rounded-full bg-[var(--color-success)] ml-1.5 inline-block animate-live-dot" 
                  title="Live"
                />
              )}
            </div>
          )}
          <h1 className="text-[32px] font-bold text-[var(--color-text-primary)] leading-[1.2] mt-1 mb-1.5">
            {title}
          </h1>
          {description && (
            <p className="text-[14px] font-normal text-[var(--color-text-secondary)] leading-[1.5]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
