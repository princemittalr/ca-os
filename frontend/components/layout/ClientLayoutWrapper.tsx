"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { supabase } from "../../lib/supabase";

// Pages that never require auth — wrapper renders children directly
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

// Pages that require auth but skip sidebar/topbar
const BARE_AUTH_PAGES = ["/onboarding"];

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isRedirectingRef = useRef(false);
  const checkRunningRef = useRef(false);

  const isPublicAuthPage = AUTH_PAGES.includes(pathname);
  const isBareAuthPage = BARE_AUTH_PAGES.includes(pathname);
  const isAnyAuthPage = isPublicAuthPage || isBareAuthPage;

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      // Prevent concurrent checks
      if (checkRunningRef.current) return;
      checkRunningRef.current = true;

      console.log(`[AUTH] checkAuth start | pathname=${pathname}`);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error("[AUTH] getSession error:", sessionError.message);
        }

        // ── No session ────────────────────────────────────────────────────
        if (!session) {
          console.log("[AUTH] SESSION: null");
          if (!isPublicAuthPage && !isBareAuthPage) {
            if (!isRedirectingRef.current) {
              console.log("[AUTH] REDIRECT: → /login");
              isRedirectingRef.current = true;
              router.replace("/login");
            }
          } else {
            setAuthState('unauthenticated');
          }
          return;
        }

        console.log(`[AUTH] SESSION: valid | user=${session.user.id}`);

        // ── Has session — fetch profile via service-safe approach ─────────
        // CRITICAL: anon key + RLS on public.users requires auth.uid() match.
        // supabase.from() here uses the anon key but Supabase SDK attaches
        // the session JWT automatically when using createClient with session.
        // However if RLS policy is missing, this 404s silently.
        // We treat MISSING ROW as "needs onboarding" not as an error.
        let onboardingComplete = false;
        let profileExists = false;

        try {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("onboarding_complete")
            .eq("id", session.user.id)
            .maybeSingle(); // ← maybeSingle: returns null (not error) if no row

          if (!mounted) return;

          if (profileError) {
            // RLS denial or real DB error — log but don't block
            console.warn("[AUTH] PROFILE: query error:", profileError.message, profileError.code);
            // If RLS is blocking (42501) or table missing (42P01), treat as no-profile
            // Don't crash — fall through with onboardingComplete = false
          } else if (profile === null) {
            console.log("[AUTH] PROFILE: no row found — treating as incomplete onboarding");
            profileExists = false;
            onboardingComplete = false;
          } else {
            profileExists = true;
            onboardingComplete = profile.onboarding_complete === true;
            console.log(`[AUTH] PROFILE: found | onboarding_complete=${onboardingComplete}`);
          }
        } catch (profileException) {
          console.warn("[AUTH] PROFILE: unexpected exception:", profileException);
          // Non-fatal — continue with onboardingComplete = false
        }

        if (!mounted) return;

        console.log(`[AUTH] ONBOARDING: complete=${onboardingComplete} | profileExists=${profileExists}`);

        // ── Redirect logic ────────────────────────────────────────────────
        if (isRedirectingRef.current) {
          // Already redirecting — set authenticated to unblock render
          setAuthState('authenticated');
          return;
        }

        // Authenticated user on public login/signup → send to app
        if (isPublicAuthPage) {
          console.log("[AUTH] REDIRECT: authenticated user on auth page → /action-center");
          isRedirectingRef.current = true;
          router.replace("/action-center");
          return;
        }

        // Needs onboarding and not already there
        if (!onboardingComplete && pathname !== "/onboarding") {
          console.log("[AUTH] REDIRECT: onboarding incomplete → /onboarding");
          isRedirectingRef.current = true;
          router.replace("/onboarding");
          return;
        }

        // Onboarding complete but stuck on onboarding page
        if (onboardingComplete && pathname === "/onboarding") {
          console.log("[AUTH] REDIRECT: onboarding complete → /action-center");
          isRedirectingRef.current = true;
          router.replace("/action-center");
          return;
        }

        // All good — authenticated
        console.log("[AUTH] AUTH STATE: authenticated");
        isRedirectingRef.current = false;
        setAuthState('authenticated');

      } catch (fatalErr) {
        console.error("[AUTH] Fatal checkAuth error:", fatalErr);
        // Always resolve — never leave loading permanently
        if (mounted) {
          if (!isPublicAuthPage && !isBareAuthPage) {
            router.replace("/login");
          } else {
            setAuthState('unauthenticated');
          }
        }
      } finally {
        checkRunningRef.current = false;
      }
    };

    // Reset redirect lock on pathname change
    isRedirectingRef.current = false;
    setAuthState('loading');
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log(`[AUTH] onAuthStateChange: event=${event}`);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        isRedirectingRef.current = false;
        // Re-run full check to handle onboarding state after sign-in
        checkAuth();
        return;
      }

      if (event === 'SIGNED_OUT') {
        isRedirectingRef.current = false;
        setAuthState('unauthenticated');
        if (!isPublicAuthPage && !isBareAuthPage) {
          router.replace("/login");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public auth pages (login/signup/forgot/reset) — no wrapper ───────────
  if (isPublicAuthPage) {
    return (
      <div className="flex-1 min-w-0 bg-[#F8FAFC] h-screen w-screen overflow-y-auto">
        {children}
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (authState === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#1B4F8A] rounded-full animate-spin" />
          <span className="text-[11px] text-slate-400 font-medium tracking-wide">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  // ── Unauthenticated — render nothing (redirect already fired) ────────────
  if (authState === 'unauthenticated') return null;

  // ── Onboarding — authenticated but bare layout (no sidebar) ─────────────
  if (isBareAuthPage) {
    return (
      <div className="flex-1 min-w-0 bg-[#F8FAFC] h-screen w-screen overflow-y-auto">
        {children}
      </div>
    );
  }

  // ── Authenticated app shell ───────────────────────────────────────────────
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