"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  ClipboardList,
  LifeBuoy,
  Settings,
  ChevronDown,
  User,
  Building2,
  CreditCard,
  LogOut,
  FileText,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

/* ─── Data Structures & Grouping ─────────────────────────── */
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Clients',
    items: [
      { name: 'Client Portfolio', href: '/clients', icon: Users },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { name: 'GST Recon', href: '/gst-recon', icon: BarChart3 },
      { name: 'Import Recon', href: '/import-recon', icon: ArrowLeftRight },
      { name: 'Notice Desk', href: '/notices', icon: FileText },
      { name: 'Compliance Operations Center', href: '/compliance', icon: ShieldCheck },
    ],
  },
  {
    label: 'AI Operations',
    items: [
      { name: 'Action Center', href: '/action-center', icon: Sparkles },
      { name: 'Automation', href: '/automation', icon: Zap },
    ],
  },
  {
    label: 'Governance',
    items: [
      { name: 'Audit Trail', href: '/audit-trail', icon: ClipboardList },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Support', href: '/support', icon: LifeBuoy },
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

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    width: '100%',
    height: '36px',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
    backgroundColor: isActive 
      ? 'var(--color-accent-soft)' 
      : isRowHovered 
        ? 'var(--color-surface-hover)' 
        : 'transparent',
    borderRight: isActive 
      ? '2px solid var(--color-primary-light)' 
      : '2px solid transparent',
    borderTopLeftRadius: 'var(--radius-md)',
    borderBottomLeftRadius: 'var(--radius-md)',
    borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px',
    paddingLeft: isCollapsed ? '0px' : '12px',
    paddingRight: isCollapsed ? '0px' : '12px',
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    gap: isCollapsed ? '0px' : '12px',
  };

  const iconColor = isActive 
    ? 'var(--color-primary-light)' 
    : isRowHovered 
      ? 'var(--color-secondary)' 
      : 'var(--color-text-secondary)';

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
    opacity: isCollapsed ? 0 : 1,
    width: isCollapsed ? 0 : 'auto',
    visibility: isCollapsed ? 'hidden' : 'visible',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    transition: 'opacity 150ms ease 50ms, visibility 150ms, width 150ms ease',
  };

  return (
    <Link 
      href={item.href} 
      className="block w-full"
      onMouseEnter={() => setIsRowHovered(true)}
      onMouseLeave={() => setIsRowHovered(false)}
    >
      <div className="group w-full" style={containerStyle}>
        {/* Icon container */}
        <span
          className="flex-shrink-0 flex items-center justify-center transition-all duration-150"
          style={{ width: '20px', height: '20px' }}
        >
          <item.icon
            size={18}
            strokeWidth={isActive ? 2.25 : 2}
            style={{ 
              color: iconColor,
              transition: 'color var(--transition-fast)'
            }}
          />
        </span>

        {/* Label */}
        <span style={labelStyle}>
          {item.name}
        </span>

        {/* Tooltip (collapsed state only) */}
        {isCollapsed && (
          <div 
            className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out delay-[200ms] z-50 whitespace-nowrap px-2.5 py-1.5"
            style={{
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
function GroupLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  if (isCollapsed) return null;
  return (
    <div 
      className="select-none uppercase"
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: 'var(--color-text-tertiary)',
        marginTop: '20px',
        marginBottom: '8px',
        paddingLeft: '12px',
      }}
    >
      {label}
    </div>
  );
}

/* ─── Dropdown content ───────────────────────────────────── */
function DropdownContent({
  items,
  onClose,
  onLogout,
}: {
  items: { name: string; href: string; icon: LucideIcon }[];
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col gap-[2px] w-full">
      {items.map(i => (
        <Link key={i.name} href={i.href} onClick={onClose} className="block w-full">
          <div
            role="menuitem"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 font-medium group cursor-pointer"
          >
            <i.icon size={14} className="text-slate-400 group-hover:text-[#4F46E5] group-hover:scale-105 transition-all duration-150 flex-shrink-0" />
            <span className="transition-transform duration-150 group-hover:translate-x-0.5">{i.name}</span>
          </div>
        </Link>
      ))}
      <div className="my-1.5 h-px bg-slate-100" />
      <button
        role="menuitem"
        onClick={onLogout}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-[#EF4444] hover:bg-[#EF4444]/5 transition-all duration-150 font-medium w-full text-left cursor-pointer group"
      >
        <LogOut size={14} className="text-[#EF4444]/80 group-hover:scale-105 transition-all duration-150" />
        <span className="transition-transform duration-150 group-hover:translate-x-0.5">Logout</span>
      </button>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("PARTNER");
  const [userInitials, setUserInitials] = useState("U");
  const profileRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const role = localStorage.getItem("role");
    const fullName = localStorage.getItem("full_name");
    if (role) {
      setUserRole(role);
    }
    if (fullName) {
      setUserName(fullName);
      const initials = fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      setUserInitials(initials || "U");
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const dropdownItems = [
    { name: 'My Profile',       href: '/settings?tab=profile',  icon: User },
    { name: 'Firm Settings',    href: '/settings?tab=firm',     icon: Building2 },
    { name: 'Account Settings', href: '/settings?tab=security', icon: Settings },
    { name: 'Billing',          href: '/settings?tab=billing',  icon: CreditCard },
  ];

  // Filter groups according to the user's role
  const filteredGroups = navGroups.map(group => {
    const filteredItems = group.items.filter(item => {
      if (userRole === "CLIENT_VIEWER") {
        // CLIENT_VIEWER can only access: Dashboard, Client Portfolio, and essential system modules
        const allowedNames = ["Dashboard", "Client Portfolio", "Audit Trail", "Settings", "Support"];
        return allowedNames.includes(item.name);
      }
      return true;
    });
    return { ...group, items: filteredItems };
  }).filter(group => group.items.length > 0);

  return (
    <>
      {/* Backdrop overlay for mobile sidebar */}
      {isMobile && isMobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 z-[99] transition-opacity duration-200 cursor-pointer"
        />
      )}

      <div 
        className="h-screen flex-shrink-0 z-20 relative transition-[width] duration-200 ease-in-out"
        style={{
          width: isMobile ? '0px' : '56px'
        }}
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
              setMenuOpen(false);
            }
          }}
          className={[
            'h-screen flex flex-col justify-between top-0 left-0 border-r',
            'transition-[width,transform] duration-200 ease-in-out',
            isMobile ? 'fixed z-[100] w-[220px]' : 'absolute z-30',
            isCollapsed ? 'w-[56px]' : 'w-[220px]',
          ].join(' ')}
          style={{
            background: '#FFFFFF',
            borderColor: '#E2E8F0',
            boxShadow: isCollapsed ? '1px 0 10px rgba(15, 23, 42, 0.01)' : '4px 0 32px rgba(15, 23, 42, 0.05)',
            transform: isMobile ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          }}
        >
        {/* ── Outer Layout Wrapper (Logo + Search + Nav) ───────── */}
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* ── Logo Workspace Switcher ────────────────────────── */}
          <div
            className={[
              'relative z-10 flex-shrink-0 flex items-center h-16',
              isCollapsed ? 'px-2 justify-center' : 'px-3.5 py-3',
            ].join(' ')}
          >
            <div className={[
              'flex items-center w-full rounded-lg p-1 hover:bg-slate-50 transition-colors duration-150 cursor-pointer',
              isCollapsed ? 'justify-center' : 'gap-2.5 justify-start'
            ].join(' ')}>
              <div className="flex-shrink-0 flex justify-center items-center relative" style={{ width: '32px', height: '32px' }}>
                <img 
                  src="/assets/reckon-logo.png" 
                  alt="Reckon AI Logo"
                  width={32}
                  height={32}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }}
                />
              </div>
              <div 
                className={[
                  'flex flex-col justify-center transition-all duration-150 ease-in-out whitespace-nowrap overflow-hidden',
                  isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[150px]'
                ].join(' ')}
              >
                <span className="text-slate-900 font-bold text-[13.5px] tracking-tight leading-none whitespace-nowrap">
                  Reckon AI
                </span>
                <span className="text-slate-400 font-semibold text-[9px] tracking-wider uppercase leading-none mt-1 whitespace-nowrap">
                  CA Platform
                </span>
              </div>
              {!isCollapsed && (
                <ChevronDown size={13} className="text-slate-400 ml-auto flex-shrink-0" />
              )}
            </div>
          </div>

          {/* ── Workspace Search Trigger ───────────────────────── */}
          <div className={['py-1.5 flex-shrink-0', isCollapsed ? 'flex justify-center px-2' : 'px-3.5'].join(' ')}>
            <button
              className={[
                'flex items-center text-left rounded-lg border border-slate-200/70 bg-slate-50/50 hover:bg-slate-100/50 transition-all duration-150 w-full',
                isCollapsed ? 'h-9 w-9 justify-center' : 'h-9 px-2.5 gap-2'
              ].join(' ')}
              style={{
                cursor: 'default',
              }}
            >
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className="text-[12px] font-medium text-slate-400 select-none">Search</span>
                  <kbd className="search-shortcut relative top-auto right-auto translate-y-0 text-[9.5px] font-bold border border-slate-200/80 shadow-sm font-sans select-none">
                    ⌘K
                  </kbd>
                </div>
              )}
            </button>
          </div>

          {/* ── Navigation Items ───────────────────────────────── */}
          <nav
            className={[
              'relative z-10 flex-1 flex flex-col justify-start overflow-y-auto hidden-scrollbar pb-6',
              isCollapsed ? 'px-2' : 'px-3',
            ].join(' ')}
          >
            {filteredGroups.map(group => (
              <React.Fragment key={group.label}>
                <GroupLabel label={group.label} isCollapsed={isCollapsed} />
                <div className="space-y-[2px]">
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

        {/* ── Profile card ─────────────────────────────────────────────── */}
        <div
          ref={profileRef}
          className={[
            'relative z-10 flex-shrink-0 border-t border-[var(--color-border)] pt-3 pb-4',
            isCollapsed ? 'px-2' : 'px-3'
          ].join(' ')}
        >
          {/* Profile dropdown */}
          {menuOpen && (
            <div
              role="menu"
              className={[
                'absolute z-50 rounded-xl border border-slate-200/60 p-2 flex flex-col bg-white/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(15,23,42,0.08)] animate-in fade-in zoom-in-95 duration-150 ease-out',
                isCollapsed ? 'left-[calc(100%+8px)] bottom-0 w-[200px]' : 'bottom-[calc(100%+8px)] left-0 right-0 w-[232px]'
              ].join(' ')}
            >
              {/* User Info Header */}
              <div className="px-2.5 py-2 border-b border-slate-100 mb-1.5 flex items-center gap-2.5">
                <div
                  className="w-[28px] h-[28px] rounded-md text-white font-bold flex items-center justify-center text-[10px] shadow-sm flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  }}
                >
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-slate-800 truncate leading-none">{userName}</div>
                  <div className="text-[9px] font-bold tracking-wider mt-1 text-[#4F46E5] leading-none uppercase">
                    {userRole === 'PARTNER' ? 'CA / Partner' : `CA / ${userRole}`}
                  </div>
                </div>
              </div>
              <DropdownContent items={dropdownItems} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />
            </div>
          )}

          {/* ── Profile Button trigger ─────────────────────────────── */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Open user menu"
            className={[
              'w-full cursor-pointer group relative focus:outline-none flex items-center hover:bg-slate-100/50 transition-colors duration-150 rounded-lg',
              isCollapsed
                ? 'justify-center h-9 p-1'
                : 'gap-3 px-2 py-1.5 h-11',
            ].join(' ')}
          >
            {/* Avatar Wrapper */}
            <div className="relative flex-shrink-0">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-md text-white font-bold tracking-tight"
                style={{
                  width: '28px',
                  height: '28px',
                  fontSize: '11px',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.12)',
                }}
              >
                {userInitials}
              </div>
              {/* Active status dot */}
              <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 rounded-full bg-emerald-500 border border-white ring-1 ring-emerald-500/20" />
            </div>

            {/* Name + role */}
            <div 
              className={[
                'flex-1 text-left transition-all duration-150 ease-in-out whitespace-nowrap overflow-hidden',
                isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[150px]'
              ].join(' ')}
            >
              <div className="text-[12.5px] font-semibold truncate leading-tight text-slate-800 group-hover:text-slate-900">
                {userName}
              </div>
              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5 leading-none">
                {userRole === 'PARTNER' ? 'CA / Partner' : `CA / ${userRole}`}
              </div>
            </div>

            {!isCollapsed && (
              <ChevronDown
                size={14}
                className={`flex-shrink-0 text-slate-400 transition-transform duration-150 ${menuOpen ? 'rotate-180 text-slate-600' : 'group-hover:text-slate-600'}`}
              />
            )}
          </button>
        </div>
      </aside>
    </div>
    </>
  );
}
