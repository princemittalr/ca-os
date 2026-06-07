"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { supabase } from "../../lib/supabase";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const authPages = ["/login", "/signup", "/forgot-password", "/onboarding", "/reset-password"];
  const isAuthPage = authPages.includes(pathname);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && !isAuthPage) {
        router.replace("/login");
        return;
      }
      
      if (session) {
        try {
          const { data: user } = await supabase
            .from("users")
            .select("onboarding_complete")
            .eq("id", session.user.id)
            .single();
          
          const onboardingComplete = user?.onboarding_complete ?? false;
          
          if (!onboardingComplete && pathname !== "/onboarding") {
            router.replace("/onboarding");
            return;
          }
          
          if (onboardingComplete && isAuthPage) {
            router.replace("/action-center");
            return;
          }
        } catch (err) {
          console.error("Error checking onboarding status:", err);
        }
      }
      
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (!session && !isAuthPage) router.replace("/login");
    });
    
    return () => subscription.unsubscribe();
  }, [pathname]); // re-run when the route changes

  // Auth pages — no sidebar
  if (isAuthPage) {
    return (
      <div className="flex-1 min-w-0 bg-[#F8FAFC] relative z-0 h-screen w-screen overflow-y-auto">
        {children}
      </div>
    );
  }

  // Still checking session
  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-[#4F46E5]/10 border-t-[#4F46E5] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Unauthenticated — show nothing while redirect happens
  if (!isAuthenticated) return null;

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