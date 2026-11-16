'use client';

import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../../components';
import { SettingsProvider, useSettings } from './context/SettingsContext';

function SettingsLayoutContent({ children }: { children: React.ReactNode }) {
  const { toast } = useSettings();

  return (
    <div className="pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={clsx(
            'fixed bottom-6 right-6 z-50 text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border animate-fade-in max-w-md',
            toast.type === 'error' && 'bg-rose-950 text-rose-100 border-rose-800',
            toast.type === 'warning' && 'bg-amber-950 text-amber-100 border-amber-800',
            toast.type === 'success' && 'bg-zinc-900 text-white border-zinc-800'
          )}
        >
          {toast.type === 'error' && <AlertCircle size={18} className="text-rose-400 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-400 shrink-0" />}
          {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Settings"
        description="Payments, checkout rules and the AI assistant."
      />

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </SettingsProvider>
  );
}
