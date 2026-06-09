"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { supabase } from "../../lib/supabase";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const BARE_AUTH_PAGES: string[] = []; // onboarding removed — users go straight to dashboard

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const isPublicAuthPage = AUTH_PAGES.includes(pathname);
  const isBareAuthPage = BARE_AUTH_PAGES.includes(pathname);

  // Render public pages immediately — no auth check needed
  // This must be BEFORE the useEffect so login/signup never show spinner
  if (isPublicAuthPage) {
    return (
      <div className="flex-1 min-w-0 bg-[#F8FAFC] h-screen w-screen overflow-y-auto">
        {children}
      </div>
    );
  }

  return <AuthenticatedWrapper
    pathname={pathname}
    pathnameRef={pathnameRef}
    isBareAuthPage={isBareAuthPage}
    router={router}
    authState={authState}
    setAuthState={setAuthState}
    isMobileSidebarOpen={isMobileSidebarOpen}
    setIsMobileSidebarOpen={setIsMobileSidebarOpen}
  >
    {children}
  </AuthenticatedWrapper>;
}

// Separate component so useEffect only runs for protected/bare pages
// Public pages (login/signup) never mount this — no auth check, no spinner
function AuthenticatedWrapper({
  pathname,
  pathnameRef,
  isBareAuthPage,
  router,
  authState,
  setAuthState,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  children,
}: {
  pathname: string;
  pathnameRef: React.MutableRefObject<string>;
  isBareAuthPage: boolean;
  router: any;
  authState: 'loading' | 'authenticated' | 'unauthenticated';
  setAuthState: (s: 'loading' | 'authenticated' | 'unauthenticated') => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (v: boolean) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    let mounted = true;
    let didRun = false; // local to THIS effect instance — resets on every mount

    const runAuthCheck = async () => {
      if (didRun) return;
      didRun = true;

      const path = pathnameRef.current;
      const onBare = BARE_AUTH_PAGES.includes(path);
      console.log(`[AUTH] checkAuth | pathname=${path}`);

      try {
        // getSession: reads localStorage (instant, no network)
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!session?.user) {
          console.log("[AUTH] SESSION: null → /login");
          router.replace("/login");
          return;
        }

        const user = session.user;
        console.log(`[AUTH] SESSION: valid | id=${user.id}`);

        let onboardingComplete = false;
        try {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("onboarding_complete")
            .eq("id", user.id)
            .maybeSingle();

          if (!mounted) return;
          if (profileError) {
            console.warn("[AUTH] PROFILE error:", profileError.message);
          } else if (profile) {
            onboardingComplete = profile.onboarding_complete === true;
          }
          console.log(`[AUTH] PROFILE: onboarding_complete=${onboardingComplete}`);
        } catch (e) {
          console.warn("[AUTH] PROFILE exception:", e);
        }

        if (!mounted) return;

        const nowPath = pathnameRef.current;
        const nowBare = BARE_AUTH_PAGES.includes(nowPath);

        if (!onboardingComplete && !nowBare) {
          console.log("[AUTH] REDIRECT: → /onboarding");
          router.replace("/onboarding");
          return;
        }

        if (onboardingComplete && nowPath === "/onboarding") {
          console.log("[AUTH] REDIRECT: → /action-center");
          router.replace("/action-center");
          return;
        }

        console.log("[AUTH] authenticated ✓");
        setAuthState('authenticated');

      } catch (fatal) {
        console.error("[AUTH] fatal:", fatal);
        if (mounted) router.replace("/login");
      }
    };

    runAuthCheck();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log(`[AUTH] onAuthStateChange: ${event}`);
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_IN') {
        didRun = false;
        runAuthCheck();
        return;
      }
      if (event === 'TOKEN_REFRESHED') return;
      if (event === 'SIGNED_OUT') {
        setAuthState('unauthenticated');
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (authState === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#1B4F8A] rounded-full animate-spin" />
          <span className="text-[11px] text-slate-400 font-medium tracking-wide">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') return null;

  if (isBareAuthPage) {
    return (
      <div className="flex-1 min-w-0 bg-[#F8FAFC] h-screen w-screen overflow-y-auto">
        {children}
      </div>
    );
  }

  return (
    <>
      <Sidebar isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] relative z-0">
        <TopBar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto hidden-scrollbar p-4 md:p-6 lg:p-10 page-fade-in">
          <div className="max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </>
  );
}