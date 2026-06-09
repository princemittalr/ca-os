"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  Package,
  ShieldCheck,
  FileWarning,
  Zap,
  Bot,
  ScrollText,
  Settings,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { clearAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

/* ─── Data Structures & Grouping ─────────────────────────── */
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: undefined, // CORE no label
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Clients', href: '/clients', icon: Building2 },
    ],
  },
  {
    label: 'RECONCILIATION',
    items: [
      { name: 'GST Recon', href: '/gst-recon', icon: ArrowLeftRight },
      { name: 'BOE Recon', href: '/import-recon', icon: Package },
    ],
  },
  {
    label: 'COMPLIANCE',
    items: [
      { name: 'Compliance', href: '/compliance', icon: ShieldCheck },
      { name: 'Notices', href: '/notices', icon: FileWarning },
      { name: 'Action Center', href: '/action-center', icon: Zap },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Automation', href: '/automation', icon: Bot },
      { name: 'Audit Trail', href: '/audit-trail', icon: ScrollText },
    ],
  },
  {
    label: undefined, // SYSTEM no label
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Support', href: '/support', icon: HelpCircle },
    ],
  },
];

/* ─── NavRow Component ───────────────────────────────────── */
function NavRow({
  item, isActive, isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const [isRowHovered, setIsRowHovered] = useState(false);

  return (
    <Link 
      href={item.href} 
      className="block w-full"
      onMouseEnter={() => setIsRowHovered(true)}
      onMouseLeave={() => setIsRowHovered(false)}
    >
      <div className="group relative w-full h-[36px] mx-2 my-0.5 rounded-[8px] flex items-center transition-all duration-150 ease"
           style={{
             backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : isRowHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
             color: isActive ? '#FFFFFF' : isRowHovered ? '#FFFFFF' : '#94A3B8',
             fontWeight: isActive ? 600 : 400,
             justifyContent: isCollapsed ? 'center' : 'flex-start',
             borderLeft: isActive ? '3px solid #1B4F8A' : '3px solid transparent',
           }}>
        {/* Icon */}
        <item.icon
          size={isCollapsed ? 20 : 16}
          strokeWidth={2}
          className="flex-shrink-0"
          style={{ marginRight: isCollapsed ? 0 : 12 }}
        />

        {/* Label */}
        {!isCollapsed && (
          <span className="text-[13px] font-medium leading-none whitespace-nowrap">
            {item.name}
          </span>
        )}

        {/* Tooltip (collapsed state only) */}
        {isCollapsed && (
          <div 
            className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out delay-200 z-50 whitespace-nowrap"
            style={{
              backgroundColor: '#1e293b',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '6px',
              padding: '6px 8px',
            }}
          >
            {item.name}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Group label ────────────────────────────────────────── */
function GroupLabel({ label, isCollapsed }: { label?: string; isCollapsed: boolean }) {
  if (!label) return null;

  return (
    <div 
      className="select-none uppercase mt-4 mb-1 px-3"
      style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.15em',
        color: '#64748B',
        opacity: isCollapsed ? 0 : 1,
        height: isCollapsed ? 0 : 'auto',
        overflow: 'hidden',
        transition: 'opacity 150ms ease, height 150ms ease, margin 150ms ease, padding 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
}

/* ─── Sidebar Component ──────────────────────────────────── */
export default function Sidebar({
  isMobileOpen = false,
  onClose,
}: {
  isMobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("PARTNER");
  const [userInitials, setUserInitials] = useState("U");

  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1024);
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCollapsed = isMobile
    ? !isMobileOpen
    : (isTablet ? true : !isHovered);

  // Load user identity from Supabase metadata — never from localStorage.
  const loadUserMeta = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const meta = user.user_metadata || {};
    const fullName: string = meta.full_name || '';
    const role: string = meta.role || 'PARTNER';
    if (role) setUserRole(role);
    if (fullName) {
      setUserName(fullName);
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      setUserInitials(initials || 'U');
    }
  };

  useEffect(() => {
    loadUserMeta();
    // Re-hydrate on token refresh or sign-in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserMeta();
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await clearAuth();
    window.location.href = "/login";
  };

  // Split nav groups into top (CORE, RECONCILIATION, COMPLIANCE, OPERATIONS) and bottom (SYSTEM)
  const topGroups = navGroups.slice(0, 4);
  const bottomGroup = navGroups[4];

  return (
    <>
      {/* Backdrop overlay for mobile sidebar */}
      {isMobile && isMobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-[99] transition-opacity duration-200 cursor-pointer"
        />
      )}

      <div 
        className="h-screen flex-shrink-0 z-20 relative"
      >
        <aside
          onMouseEnter={() => {
            if (!isTablet && !isMobile) {
              setIsHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (!isTablet && !isMobile) {
              setIsHovered(false);
            }
          }}
          className="h-screen flex flex-col justify-between top-0 left-0 fixed z-30 border-r"
          style={{
            backgroundColor: '#0F172A',
            borderColor: 'rgba(255,255,255,0.06)',
            width: isMobile ? 220 : (isCollapsed ? 72 : 220),
            transform: isMobile ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
            transition: 'width 200ms ease, transform 200ms ease',
          }}
        >
          {/* ── Outer Layout Wrapper (Logo + Nav) ───────── */}
          <div className="flex flex-col flex-1 min-h-0">
            
            {/* ── Logo Section ────────────────────────── */}
            <div
              className="flex-shrink-0"
              style={{
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: isCollapsed ? 16 : 16,
                paddingRight: isCollapsed ? 16 : 16,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center w-full transition-colors duration-200"
                   style={{
                     justifyContent: isCollapsed ? 'center' : 'flex-start',
                   }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#1B4F8A] flex-shrink-0">
                  {/* Logo mark */}
                  <span className="text-white text-sm font-black">R</span>
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col justify-center overflow-hidden ml-3">
                    <span className="text-white font-black text-[13px] tracking-tight leading-none whitespace-nowrap">
                      RECKON CA-OS
                    </span>
                    <span className="text-slate-400 font-medium text-[10px] leading-none mt-1 whitespace-nowrap">
                      CA Platform
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Navigation Items ───────────────────────────────── */}
            <nav
              className="relative z-10 flex-1 flex flex-col justify-start overflow-y-auto pb-6"
            >
              {topGroups.map((group, index) => (
                <React.Fragment key={index}>
                  <GroupLabel label={group.label} isCollapsed={isCollapsed} />
                  <div className="space-y-0.5">
                    {group.items.map(item => (
                      <NavRow
                        key={item.name}
                        item={item}
                        isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                        isCollapsed={isCollapsed}
                      />
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* ── Bottom Section: SYSTEM Nav + User ─────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex flex-col">
            {/* SYSTEM nav items */}
            <div className="flex-shrink-0">
              {bottomGroup && (
                <>
                  <GroupLabel label={bottomGroup.label} isCollapsed={isCollapsed} />
                  <div className="space-y-0.5">
                    {bottomGroup.items.map(item => (
                      <NavRow
                        key={item.name}
                        item={item}
                        isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                        isCollapsed={isCollapsed}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* User profile section */}
            <div
              className="flex-shrink-0"
              style={{
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: isCollapsed ? 16 : 16,
                paddingRight: isCollapsed ? 16 : 16,
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center w-full"
                   style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold bg-[#1B4F8A] flex-shrink-0"
                    style={{ fontSize: '11px' }}
                  >
                    {userInitials}
                  </div>

                  {/* Name + role */}
                  {!isCollapsed && (
                    <div className="flex flex-col justify-center min-w-0">
                      <div className="text-[13px] font-medium text-white truncate leading-none">
                        {userName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate leading-none mt-1">
                        {userRole === 'PARTNER' ? 'CA / Partner' : `CA / ${userRole}`}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout button (only when expanded) */}
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors duration-150"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
