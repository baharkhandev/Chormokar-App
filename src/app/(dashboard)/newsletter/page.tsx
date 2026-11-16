'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  Search,
  Download,
  Users,
  UserPlus,
  UserMinus,
  RefreshCw,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader, Pagination, StatusBadge, EmptyState } from '../../../components';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { apiErrorMessage } from '../../../shared/api/errorMessage';

type Status = 'subscribed' | 'unsubscribed';

interface Subscriber {
  id: string;
  email: string;
  status: Status;
  status_display: string;
  source: string;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}

interface Stats {
  subscribed: number;
  unsubscribed: number;
  new_this_month: number;
  total: number;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NewsletterPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const knownTotal = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminFetch('/api/newsletter/stats');
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.data ?? json);
    } catch {
      /* counters are non-blocking */
    }
  }, [adminFetch]);

  const loadSubscribers = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (searchQuery) params.set('search', searchQuery);
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const res = await adminFetch(`/api/newsletter/subscribers?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        const rows: Subscriber[] = Array.isArray(json.data) ? json.data : [];
        const count = Number(json.meta?.count ?? rows.length);

        if (options.silent && knownTotal.current !== null && count > knownTotal.current) {
          const added = count - knownTotal.current;
          showNotice(`${added} new subscriber${added === 1 ? '' : 's'}`);
        }
        knownTotal.current = count;

        setSubscribers(rows);
        setTotalCount(count);
      } catch {
        /* keep previous rows */
      } finally {
        if (!options.silent) setLoading(false);
      }
    },
    [adminFetch, page, pageSize, searchQuery, statusFilter]
  );

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    void loadSubscribers({});
    void loadStats();
  }, [authStatus, loadSubscribers, loadStats]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const timer = window.setInterval(() => {
      void loadSubscribers({ silent: true });
      void loadStats();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [authStatus, loadSubscribers, loadStats]);

  const toggleSubscription = async (subscriber: Subscriber) => {
    const next: Status = subscriber.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    setUpdatingId(subscriber.id);
    try {
      const res = await adminFetch(`/api/newsletter/subscribers/${subscriber.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showNotice(apiErrorMessage(json, 'Could not update the subscriber.'));
        return;
      }
      const json = await res.json();
      const updated: Subscriber = json.data ?? json;
      setSubscribers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      void loadStats();
      showNotice(next === 'unsubscribed' ? 'Subscriber unsubscribed' : 'Subscriber reactivated');
    } catch {
      showNotice('Could not reach the server. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await adminFetch('/api/newsletter/export');
      if (!res.ok) {
        showNotice('Could not export subscribers.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'newsletter-subscribers.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      showNotice('Could not export subscribers.');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const statCards = [
    {
      label: 'Subscribers',
      value: stats?.subscribed,
      icon: Users,
      tone: 'text-accent-primary bg-accent-primary/10',
    },
    {
      label: 'New this month',
      value: stats?.new_this_month,
      icon: UserPlus,
      tone: 'text-success bg-success/10',
    },
    {
      label: 'Unsubscribed',
      value: stats?.unsubscribed,
      icon: UserMinus,
      tone: 'text-text-secondary bg-bg-secondary',
    },
  ];

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Newsletter"
        description="People subscribed to the storefront newsletter. Signups from the homepage appear here instantly."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                void loadSubscribers({});
                void loadStats();
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={exporting || totalCount === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary disabled:opacity-50"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Export CSV
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                {label}
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">
                {value ?? '—'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border-color bg-white">
        <div className="flex flex-col gap-3 border-b border-border-color p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            {(
              [
                ['all', 'All'],
                ['subscribed', 'Subscribed'],
                ['unsubscribed', 'Unsubscribed'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStatusFilter(key);
                  setPage(1);
                }}
                className={clsx(
                  'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
                  statusFilter === key
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email..."
              className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-color bg-white text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              <tr>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Subscribed</th>
                <th className="px-6 py-3.5">Source</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex items-center justify-center gap-2 py-16 text-text-secondary">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-[13px]">Loading subscribers…</span>
                    </div>
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Mail size={22} />}
                      title="No subscribers yet"
                      message={
                        statusFilter === 'all'
                          ? 'Newsletter signups from the storefront will appear here.'
                          : 'Nothing matches this filter right now.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="transition-colors hover:bg-bg-secondary/40">
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-semibold text-text-primary">
                        {subscriber.email}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-[12.5px] text-text-secondary">
                      {formatDate(subscriber.subscribed_at ?? subscriber.created_at)}
                    </td>
                    <td className="px-6 py-4 text-[12.5px] capitalize text-text-secondary">
                      {subscriber.source}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={subscriber.status === 'subscribed' ? 'active' : 'inactive'}
                        label={subscriber.status_display}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={updatingId === subscriber.id}
                        onClick={() => void toggleSubscription(subscriber)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-color bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary disabled:opacity-50"
                      >
                        {subscriber.status === 'subscribed' ? (
                          <>
                            <UserMinus size={13} />
                            Unsubscribe
                          </>
                        ) : (
                          <>
                            <RotateCcw size={13} />
                            Reactivate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            itemLabel="subscribers"
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {notice &&
        mounted &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[100] rounded-xl bg-text-primary px-4 py-3 text-[12.5px] font-medium text-white shadow-lg">
            {notice}
          </div>,
          document.body
        )}
    </div>
  );
}
