'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ResponsiveTables } from './ResponsiveTables';
import { AIChatFab } from '../ai-chat';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 h-full shrink-0 transition-transform duration-300 ease-in-out lg:static lg:z-40 lg:translate-x-0 print:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar isMobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Header onMenuClick={() => setMobileOpen(true)} />
        </div>
        <main className="relative flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges] print:block print:overflow-visible print:p-0">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1560px] flex-col px-4 py-5 sm:px-5 sm:py-7 lg:px-10 lg:py-9 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </div>
      <ResponsiveTables />
      <AIChatFab />
    </div>
  );
}
