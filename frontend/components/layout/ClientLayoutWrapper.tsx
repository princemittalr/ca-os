"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { supabase } from "../../lib/supabase";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isRedirectingRef = useRef(false);

  const authPages = ["/login", "/signup", "/forgot-password", "/onboarding", "/reset-password"];
  const isAuthPage = authPages.includes(pathname);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      if (isRedirectingRef.current) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        if (!isAuthPage) {
          isRedirectingRef.current = true;
          router.replace("/login");
        } else {
          setAuthState('unauthenticated');
        }
        return;
      }

      // Check onboarding
      try {
        const { data: user } = await supabase
          .from("users")
          .select("onboarding_complete")
          .eq("id", session.user.id)
          .single();

        if (!mounted) return;

        const complete = user?.onboarding_complete ?? false;

        if (!complete && pathname !== "/onboarding") {
          isRedirectingRef.current = true;
          router.replace("/onboarding");
          return;
        }

        if (complete && isAuthPage) {
          isRedirectingRef.current = true;
          router.replace("/action-center");
          return;
        }
      } catch (err) {
        console.error("Onboarding check error:", err);
      }

      if (!mounted) return;
      isRedirectingRef.current = false;
      setAuthState('authenticated');
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (!session && !isAuthPage && !isRedirectingRef.current) {
        isRedirectingRef.current = true;
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, isAuthPage, router]);

  // Auth pages — no sidebar
  if (isAuthPage) {
    return (
      <div className="flex-1 min-w-0 bg-[#F8FAFC] h-screen w-screen overflow-y-auto">
        {children}
      </div>
    );
  }

  if (authState === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#1B4F8A] rounded-full animate-spin" />
          <span className="text-[11px] text-slate-400 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') return null;

  return (
    <>
      <Sidebar isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] relative z-0">
        <TopBar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto hidden-scrollbar p-4 md:p-6 lg:p-10 page-fade-in">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}