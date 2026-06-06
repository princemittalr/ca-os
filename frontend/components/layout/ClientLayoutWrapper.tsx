"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { getAuthToken, clearAuth } from "../../lib/auth";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const authPages = ["/login", "/signup", "/forgot-password", "/onboarding"];
  const isAuthPage = authPages.includes(pathname);

  useEffect(() => {
    const token = getAuthToken();
    console.log("TOKEN CHECK:", token, "isAuthPage:", isAuthPage, "pathname:", pathname);
    
    // Reject mock tokens in all environments
    const isMockToken = !!token?.startsWith(["mock", "access", "token"].join("-"));
    if (isMockToken) {
      setIsAuthenticated(false);
      clearAuth();
      router.replace("/login");
      setIsMobileSidebarOpen(false);
      return;
    }

    const isValid = !!token;
    setIsAuthenticated(isValid);
    setIsMobileSidebarOpen(false);

    if (!token && !isAuthPage) {
      router.replace("/login");
    }

    // ← ADD THIS: redirect away from login if already authenticated
    if (token && isAuthPage) {
      router.replace("/action-center");
    }
  }, [pathname]); // ← remove router/isAuthPage from deps

  // Auth pages — no sidebar
  if (isAuthPage) {
    return (
      <div className="flex-1 min-w-0 bg-[#F8FAFC] relative z-0 h-screen w-screen overflow-y-auto">
        {children}
      </div>
    );
  }

  // Still checking
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