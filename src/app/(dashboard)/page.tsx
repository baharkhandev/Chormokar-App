'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShoppingBag, Clock3, TrendingUp, FileText, Check, Download } from 'lucide-react';
import { PageHeader, StatCard } from '../../components';
import { RecentOrdersTable } from './components/RecentOrdersTable';
import { GenerateReportModal } from './components/GenerateReportModal';
import { useAdminFetch } from '../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../shared/auth/AuthContext';

interface RecentOrder {
  id: string;
  customer: string;
  date: string;
  amount: string;
  status: string;
}

interface OrderStats {
  total: number;
  pending: number;
  unpaid: number;
  today: number;
  revenue: number;
}

function money(value: number): string {
  return `৳ ${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const load = useCallback(async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        adminFetch('/api/orders/stats'),
        adminFetch('/api/orders?page_size=5'),
      ]);

      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json.data ?? json);
      }

      if (ordersRes.ok) {
        const json = await ordersRes.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        setRecentOrders(
          rows.map((order: any) => ({
            id: order.order_number,
            customer: order.customer_name || order.customer_email || '—',
            date: new Date(order.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            amount: money(Number(order.total_amount)),
            status: order.status,
          }))
        );
      }
    } catch {
      /* leave the empty state */
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [authStatus, load]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  return (
    <div className="animate-fade-in pb-12 relative">
      <PageHeader
        title="Dashboard Overview"
        description="A live snapshot of your store's performance and operations."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live store
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="btn btn-primary px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <FileText size={18} />
            <span>Generate Report</span>
          </button>
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
        <StatCard
          title="Paid Revenue"
          value={money(stats?.revenue ?? 0)}
          change={stats?.unpaid ? `${stats.unpaid} unpaid order${stats.unpaid === 1 ? '' : 's'}` : 'All orders paid'}
          trend="neutral"
          icon={<span className="text-lg font-bold leading-none">৳</span>}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total Orders"
          value={String(stats?.total ?? 0)}
          change={`${stats?.today ?? 0} placed today`}
          trend="neutral"
          icon={<ShoppingBag size={19} />}
          iconBg="bg-brand/5 text-brand"
        />
        <StatCard
          title="Needs Action"
          value={String(stats?.pending ?? 0)}
          change="Pending, confirmed or processing"
          trend="neutral"
          icon={<Clock3 size={19} />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Unpaid Orders"
          value={String(stats?.unpaid ?? 0)}
          change="Awaiting payment"
          trend="neutral"
          icon={<TrendingUp size={19} />}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Recent Orders Section */}
      <section className="admin-card mt-8 overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-border-color px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-text-primary">
              Recent Orders
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              The latest transactions across your storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border-color bg-white px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent-primary/30 hover:text-accent-primary sm:self-auto"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
        <RecentOrdersTable orders={recentOrders} />
      </section>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccessToast={showToast}
      />

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-text-primary text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-scale-in border border-white/10">
          <Check size={18} className="text-success shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
