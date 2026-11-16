'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, CreditCard, Truck, Bell, ShieldCheck, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export type TabType = 'general' | 'payments' | 'shipping' | 'notifications' | 'security';

export interface TabItem {
  id: TabType;
  href: string;
  label: string;
  icon: LucideIcon;
  badge: string | null;
}

export const SETTINGS_TABS: TabItem[] = [
  { id: 'general', href: '/settings/general', label: 'General & Store', icon: Store, badge: null },
  { id: 'payments', href: '/settings/payments', label: 'Payments & Checkout', icon: CreditCard, badge: 'COD only' },
  { id: 'shipping', href: '/settings/shipping', label: 'Shipping & Delivery', icon: Truck, badge: null },
  { id: 'notifications', href: '/settings/notifications', label: 'Notifications & Alerts', icon: Bell, badge: null },
  { id: 'security', href: '/settings/security', label: 'Security & API Keys', icon: ShieldCheck, badge: '2FA On' },
];

export interface SettingsTabsNavProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export function SettingsTabsNav({ activeTab, onTabChange }: SettingsTabsNavProps) {
  const pathname = usePathname() || '';

  return (
    <div className="flex overflow-x-auto gap-2 p-1.5 bg-black/[0.03] border border-black/5 rounded-2xl mb-8 scrollbar-none">
      {SETTINGS_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab
          ? activeTab === tab.id
          : pathname === tab.href || (tab.id === 'general' && pathname === '/settings');

        return (
          <Link
            key={tab.id}
            href={tab.href}
            onClick={() => onTabChange?.(tab.id)}
            className={clsx(
              'flex items-center gap-2.5 px-4.5 py-3 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer select-none',
              isActive
                ? 'bg-white text-accent-primary border border-black/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
            )}
          >
            <Icon
              size={18}
              className={clsx(
                'transition-transform',
                isActive ? 'scale-110 text-accent-primary' : ''
              )}
            />
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={clsx(
                  'text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ml-1',
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'bg-black/5 text-text-muted'
                )}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
