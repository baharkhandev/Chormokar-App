'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  User,
  Settings,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Menu,
} from 'lucide-react';
import { useAdminAuth } from '../../shared/auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const SECTION_LABELS: Record<string, string> = {
  '': 'Dashboard',
  ai: 'AI Assistant',
  review: 'Upload',
  upload: 'Upload',
  orders: 'Orders',
  products: 'Products',
  categories: 'Categories',
  brands: 'Brands',
  promotions: 'Promotions',
  deals: 'Deals',
  coupons: 'Coupons',
  'best-sellers': 'Best Sellers',
  newsletter: 'Newsletter',
  support: 'Support',
  'hero-slides': 'Hero Banners',
  promos: 'Promo Popups',
  users: 'Users',
  settings: 'Settings',
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname() || '/';
  const { user, clearAuth } = useAdminAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const currentSection = SECTION_LABELS[segment] ?? 'Dashboard';

  const displayName =
    user?.full_name ||
    user?.first_name ||
    (user?.email ? user.email.split('@')[0] : 'Administrator');

  const roleTitle = user?.is_superuser ? 'Super Admin' : 'Staff Admin';
  const initial = (displayName[0] || 'A').toUpperCase();

  return (
    <header
      suppressHydrationWarning
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border-color bg-white/70 px-4 backdrop-blur-xl sm:gap-4 sm:px-6 lg:px-10"
    >
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-color bg-white text-text-secondary transition-colors hover:text-text-primary lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
        <span className="text-text-muted">Console</span>
        <ChevronRight size={13} className="text-text-muted/70" />
        <span className="truncate font-semibold text-text-primary">{currentSection}</span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border-color bg-white text-text-secondary transition-all hover:border-text-muted/30 hover:text-text-primary"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="mx-1 hidden h-6 w-px bg-border-color sm:block" />

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 rounded-xl border border-transparent px-1.5 py-1.5 text-left transition-all hover:border-border-color hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-primary/10"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-blue-600 text-[13px] font-bold text-white shadow-sm ring-2 ring-white">
                {initial}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                title="Active"
              />
            </div>

            <div className="hidden min-w-0 flex-col pr-1 sm:flex">
              <span className="max-w-[140px] truncate text-[13px] font-semibold leading-tight text-text-primary">
                {displayName}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium leading-tight text-text-muted">
                <ShieldCheck size={10} className="shrink-0 text-accent-primary" />
                {roleTitle}
              </span>
            </div>

            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-accent-primary' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 flex w-64 animate-fade-in flex-col gap-1 rounded-2xl border border-border-color bg-white p-2 text-text-primary shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)]">
              <div className="flex items-center gap-3 rounded-xl border border-border-color bg-bg-secondary/60 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-blue-600 text-sm font-bold text-white">
                  {initial}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {user?.full_name || displayName}
                  </span>
                  <span
                    className="truncate text-xs text-text-secondary"
                    title={user?.email || 'chormokar@outlook.com'}
                  >
                    {user?.email || 'chormokar@outlook.com'}
                  </span>
                  <span className="mt-1 inline-flex w-fit items-center rounded-md bg-accent-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-primary">
                    {roleTitle}
                  </span>
                </div>
              </div>

              <div className="my-1 border-t border-border-color" />

              <Link
                href="/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <Settings size={15} className="text-text-muted" />
                Settings &amp; Security
              </Link>

              <a
                href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:4444'}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <span className="flex items-center gap-2.5">
                  <User size={15} className="text-text-muted" />
                  View Storefront
                </span>
                <ExternalLink size={12} className="text-text-muted" />
              </a>

              <div className="my-1 border-t border-border-color" />

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  clearAuth();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={15} className="text-red-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
