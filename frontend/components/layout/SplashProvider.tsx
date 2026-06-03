"use client";

import React, { useState, useEffect } from 'react';

export default function SplashProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 1200ms showing loading, then trigger visually smooth opacity fadeout
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 600);

    // 1800ms total, set loading to false to completely unmount splash screen
    const loadTimer = setTimeout(() => {
      setLoading(false);
    }, 900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(loadTimer);
    };
  }, []);

  if (!loading) return <>{children}</>;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#F8FAFC] transition-opacity duration-600 ease-in-out ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
    >
      <div className="flex flex-col items-center justify-center gap-6 select-none">
        {/* Clean Logo Container */}
        <div className="relative w-24 h-24 flex items-center justify-center" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <div className="relative w-20 h-20 animate-in zoom-in-95 duration-700 ease-out" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <img
              src="/assets/reckon-logo.png"
              alt="Reckon AI Logo"
              style={{ height: '100%', width: '100%', objectFit: 'contain', imageRendering: 'auto', background: 'transparent' }}
              className="animate-[pulse_2.5s_infinite_ease-in-out]"
            />
          </div>
        </div>

        {/* Branding Text */}
        <div className="flex flex-col items-center animate-in fade-in-0 slide-in-from-bottom-2 delay-300 duration-1000 ease-out">
          <span className="text-[17px] font-bold tracking-wider text-slate-900">
            Reckon AI
          </span>
          <span className="text-[9px] font-black tracking-[0.24em] uppercase text-slate-400 mt-1.5 pl-[2px]">
            CA Intelligence Platform
          </span>
        </div>
      </div>
    </div>
  );
}
