'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  X,
  FolderTree,
  BadgeCheck,
  Layers,
  ShoppingCart,
  Image as ImageIcon,
  Tag,
  Mail,
  MessageSquare,
  Ticket,
  Megaphone,
  Newspaper,
  Sparkles,
  ClipboardCheck,
  Truck,
} from 'lucide-react';
import clsx from 'clsx';
import { useAdminAuth } from '../../shared/auth/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'AI Assistant', href: '/ai/chat', icon: Sparkles },
  { name: 'AI Upload', href: '/ai/upload', icon: ClipboardCheck },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Steadfast Courier', href: '/shipping/steadfast', icon: Truck },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Brands', href: '/brands', icon: BadgeCheck },
  { name: 'Spec Templates', href: '/spec-templates', icon: Layers },
  { name: 'Promotions', href: '/promotions', icon: Tag },
  { name: 'Coupons', href: '/coupons', icon: Ticket },
  { name: 'Blog', href: '/blog', icon: Newspaper },
  { name: 'Newsletter', href: '/newsletter', icon: Mail },
  { name: 'Support', href: '/support', icon: MessageSquare },
  { name: 'Hero Banners', href: '/hero-slides', icon: ImageIcon },
  { name: 'Promo Popups', href: '/promos', icon: Megaphone },
  { name: 'Users', href: '/users', icon: Users },
];

export function Sidebar({
  isMobileOpen = false,
  onClose,
}: {
  isMobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname() || '';
  const isSettingsActive = pathname.startsWith('/settings');
  const [isExpanded, setIsExpanded] = useState(true);
  const { clearAuth } = useAdminAuth();
  // The drawer always opens expanded, even if the desktop rail was collapsed.
  const expanded = isExpanded || isMobileOpen;

  const linkBase =
    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 whitespace-nowrap';

  const linkState = (active: boolean) =>
    active
      ? 'bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/[0.06]'
      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100 border border-transparent';

  return (
    <aside
      className={clsx(
        'relative z-40 flex h-full flex-col border-r border-white/[0.06] bg-[#1c120c] py-5 text-zinc-300 transition-all duration-300 ease-in-out',
        expanded ? 'w-[264px]' : 'w-[84px]'
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(220px_160px_at_24px_0px,rgba(201, 162, 77,0.18),transparent_70%)]" />

      {/* Mobile close */}
      {isMobileOpen ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={18} />
        </button>
      ) : null}

      {/* Brand */}
      <div
        className={clsx(
          'relative mb-8 flex items-center transition-all duration-300',
          expanded ? 'px-5' : 'justify-center px-0'
        )}
      >
        {expanded ? (
          <Image
            src="/images/brand/chormokar-logo-email.png"
            alt="Chormokar - The Leather Artisan"
            width={560}
            height={140}
            className="h-14 w-auto max-w-full object-contain"
          />
        ) : (
          <Image
            src="/images/brand/chormokar-mark.png"
            alt="Chormokar"
            width={256}
            height={256}
            className="h-9 w-9 object-contain"
          />
        )}
      </div>

      {/* Collapse control */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="absolute -right-3 top-[76px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#2e1f14] text-zinc-400 shadow-lg transition-all hover:scale-105 hover:border-brand/40 hover:text-white active:scale-95 max-lg:hidden"
        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isExpanded ? <PanelLeftClose size={12} /> : <PanelLeft size={12} />}
      </button>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3">
        <span
          className={clsx(
            'section-label px-3 pb-2 text-zinc-500',
            expanded ? 'block' : 'hidden'
          )}
        >
          Workspace
        </span>
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                linkBase,
                linkState(active),
                !expanded && 'justify-center px-0'
              )}
              title={!isExpanded ? item.name : undefined}
            >
              {active && (
                <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" />
              )}
              <Icon
                size={18}
                className={clsx(
                  'shrink-0 transition-colors',
                  active
                    ? 'text-brand'
                    : 'text-zinc-500 group-hover:text-zinc-300'
                )}
              />
              <span
                className={clsx(
                  'truncate transition-all duration-300',
                  expanded ? 'opacity-100' : 'hidden'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-4 flex flex-col gap-1 border-t border-white/[0.06] px-3 pt-4">
        <Link
          href="/settings"
          className={clsx(
            linkBase,
            linkState(isSettingsActive),
            !expanded && 'justify-center px-0'
          )}
          title={!isExpanded ? 'Settings' : undefined}
        >
          {isSettingsActive && (
            <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" />
          )}
          <Settings
            size={18}
            className={clsx(
              'shrink-0 transition-colors',
              isSettingsActive
                ? 'text-brand'
                : 'text-zinc-500 group-hover:text-zinc-300'
            )}
          />
          <span
            className={clsx(
              'truncate',
              expanded ? 'block' : 'hidden'
            )}
          >
            Settings
          </span>
        </Link>

        <button
          type="button"
          onClick={() => clearAuth()}
          className={clsx(
            linkBase,
            'border border-transparent text-zinc-500 hover:bg-red-500/10 hover:text-red-400',
            !expanded && 'justify-center px-0'
          )}
          title={!isExpanded ? 'Logout' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          <span
            className={clsx(
              'truncate',
              expanded ? 'block' : 'hidden'
            )}
          >
            Logout
          </span>
        </button>

        <div
          className={clsx(
            'mt-3 flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2',
            expanded ? 'block' : 'hidden'
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          <span className="text-[10px] font-medium text-zinc-500">
            All systems operational
          </span>
        </div>
      </div>
    </aside>
  );
}
