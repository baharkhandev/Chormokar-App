'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Search,
  Inbox,
  CheckCircle2,
  Archive,
  Eye,
  X,
  Mail,
  Phone,
  RefreshCw,
  Loader2,
  Reply,
  Clock3,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader, Pagination, StatusBadge, EmptyState } from '../../../components';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { apiErrorMessage } from '../../../shared/api/errorMessage';

type Status = 'new' | 'in_progress' | 'resolved' | 'archived';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: Status;
  status_display: string;
  source: string;
  admin_notes: string;
  handled_by_email: string;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  new: number;
  in_progress: number;
  resolved: number;
  archived: number;
  total: number;
}

const FILTERS: Array<{ key: 'all' | Status; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'archived', label: 'Archived' },
];

const STATUS_TONE: Record<Status, string> = {
  new: 'pending',
  in_progress: 'processing',
  resolved: 'delivered',
  archived: 'draft',
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function SupportPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const [detail, setDetail] = useState<ContactMessage | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminFetch('/api/support/stats');
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.data ?? json);
    } catch {
      /* counters are non-blocking */
    }
  }, [adminFetch]);

  const knownTotal = useRef<number | null>(null);

  const loadMessages = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (searchQuery) params.set('search', searchQuery);
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const res = await adminFetch(`/api/support/messages?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        const rows: ContactMessage[] = Array.isArray(json.data) ? json.data : [];
        const count = Number(json.meta?.count ?? rows.length);

        if (options.silent && knownTotal.current !== null && count > knownTotal.current) {
          const added = count - knownTotal.current;
          showNotice(`${added} new message${added === 1 ? '' : 's'} received`);
        }
        knownTotal.current = count;

        setMessages(rows);
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
    void loadMessages({});
    void loadStats();
  }, [authStatus, loadMessages, loadStats]);

  // Poll for new messages so the inbox stays live without a manual refresh.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const timer = window.setInterval(() => {
      void loadMessages({ silent: true });
      void loadStats();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [authStatus, loadMessages, loadStats]);

  const openDetail = (message: ContactMessage) => {
    setDetail(message);
    setDraftNotes(message.admin_notes ?? '');
  };

  const updateMessage = async (payload: { status?: Status; admin_notes?: string }) => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/support/messages/${detail.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showNotice(apiErrorMessage(json, 'Could not update the message.'));
        return;
      }
      const json = await res.json();
      const updated: ContactMessage = json.data ?? json;
      setDetail(updated);
      setDraftNotes(updated.admin_notes ?? '');
      setMessages((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      void loadStats();
      showNotice(
        payload.status ? `Marked as ${updated.status_display.toLowerCase()}` : 'Notes saved'
      );
    } catch {
      showNotice('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const statCards = [
    { key: 'new' as const, label: 'New', icon: Inbox, tone: 'text-accent-primary bg-accent-primary/10' },
    {
      key: 'in_progress' as const,
      label: 'In progress',
      icon: Clock3,
      tone: 'text-amber-600 bg-amber-500/10',
    },
    {
      key: 'resolved' as const,
      label: 'Resolved',
      icon: CheckCircle2,
      tone: 'text-success bg-success/10',
    },
    {
      key: 'archived' as const,
      label: 'Archived',
      icon: Archive,
      tone: 'text-text-secondary bg-bg-secondary',
    },
  ];

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Support"
        description="Messages submitted through the storefront contact form."
        actions={
          <button
            type="button"
            onClick={() => {
              void loadMessages({});
              void loadStats();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, tone }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setStatusFilter(key);
              setPage(1);
            }}
            className={clsx(
              'flex items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-colors',
              statusFilter === key
                ? 'border-accent-primary/40 ring-1 ring-accent-primary/20'
                : 'border-border-color hover:border-accent-primary/25'
            )}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                {label}
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">
                {stats ? stats[key] : '—'}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border-color bg-white">
        <div className="flex flex-col gap-3 border-b border-border-color p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map(({ key, label }) => (
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
              placeholder="Search by name, email or subject..."
              className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-color bg-white text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              <tr>
                <th className="px-6 py-3.5">From</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Received</th>
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
                      <span className="text-[13px]">Loading messages…</span>
                    </div>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Inbox size={22} />}
                      title="No support requests yet"
                      message={
                        statusFilter === 'all'
                          ? 'Messages sent from the storefront contact form will appear here.'
                          : 'Nothing matches this filter right now.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                messages.map((message) => (
                  <tr key={message.id} className="transition-colors hover:bg-bg-secondary/40">
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-semibold text-text-primary">{message.name}</p>
                      <p className="text-[12px] text-text-secondary">{message.email}</p>
                    </td>
                    <td className="max-w-[280px] px-6 py-4">
                      <p className="truncate text-[13px] font-medium text-text-primary">
                        {message.subject}
                      </p>
                      <p className="truncate text-[12px] text-text-secondary">{message.message}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[12.5px] text-text-primary">{relativeTime(message.created_at)}</p>
                      <p className="text-[11px] text-text-muted">{formatDateTime(message.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={STATUS_TONE[message.status] ?? 'pending'}
                        label={message.status_display}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(message)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-color bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
                      >
                        <Eye size={13} />
                        View
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
            itemLabel="messages"
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

      {detail &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex justify-end">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setDetail(null)}
              role="presentation"
            />
            <aside className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-border-color px-6 py-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                    {detail.status_display}
                  </p>
                  <h2 className="mt-1 text-[17px] font-semibold leading-snug text-text-primary">
                    {detail.subject}
                  </h2>
                  <p className="mt-1 text-[12px] text-text-secondary">
                    {formatDateTime(detail.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-lg border border-border-color p-2 text-text-secondary transition-colors hover:text-text-primary"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="rounded-xl border border-border-color bg-bg-secondary/40 p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                    <MessageSquare size={15} className="text-accent-primary" />
                    {detail.name}
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-text-secondary">
                    <a
                      href={`mailto:${detail.email}?subject=${encodeURIComponent(`Re: ${detail.subject}`)}`}
                      className="inline-flex items-center gap-2 hover:text-accent-primary"
                    >
                      <Mail size={13} /> {detail.email}
                    </a>
                    {detail.phone && (
                      <a
                        href={`tel:${detail.phone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-2 hover:text-accent-primary"
                      >
                        <Phone size={13} /> {detail.phone}
                      </a>
                    )}
                  </div>
                </div>

                <p className="mt-5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-text-primary">
                  {detail.message}
                </p>

                <div className="mt-6">
                  <label
                    htmlFor="support-notes"
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted"
                  >
                    Internal notes
                  </label>
                  <textarea
                    id="support-notes"
                    rows={4}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="What did we do about this?"
                    className="w-full resize-none rounded-lg border border-border-color bg-bg-secondary/40 px-3 py-2.5 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={saving || draftNotes === (detail.admin_notes ?? '')}
                    onClick={() => void updateMessage({ admin_notes: draftNotes })}
                    className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary disabled:opacity-50"
                  >
                    Save notes
                  </button>
                </div>

                {detail.handled_by_email && (
                  <p className="mt-3 text-[11.5px] text-text-muted">
                    Handled by {detail.handled_by_email}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-color px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {detail.status !== 'in_progress' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateMessage({ status: 'in_progress' })}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-primary transition-colors hover:border-amber-400/40 hover:text-amber-600 disabled:opacity-50"
                    >
                      <Clock3 size={14} />
                      In progress
                    </button>
                  )}
                  {detail.status !== 'resolved' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateMessage({ status: 'resolved' })}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-success/30 bg-success/5 px-3 text-[12px] font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Resolve
                    </button>
                  )}
                  {detail.status !== 'archived' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateMessage({ status: 'archived' })}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                    >
                      <Archive size={14} />
                      Archive
                    </button>
                  )}
                </div>

                <a
                  href={`mailto:${detail.email}?subject=${encodeURIComponent(`Re: ${detail.subject}`)}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-primary px-4 text-[12px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
                >
                  <Reply size={14} />
                  Reply by email
                </a>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </div>
  );
}
