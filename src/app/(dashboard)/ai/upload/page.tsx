'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileUp,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../../../components';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { ChatModelPicker } from '../../../../widgets/ai-chat';
import { ProductReviewModal } from './ProductReviewModal';

interface Batch {
  id: string;
  file: string;
  supplier: string;
  status: string;
  proposals: number;
  error: string;
  warning?: string;
  estimate?: { input_tokens?: number; output_tokens?: number; rows?: number };
  reconcile?: {
    expected?: number;
    staged?: number;
    missing?: string[];
    pages?: Record<string, { expected: number; missing: string[] }>;
    priced?: number;
  };
  created_at: string;
  updated_at: string;
  progress?: {
    phase?: string;
    pages_total?: number;
    pages_done?: number;
    calls_total?: number;
    calls_done?: number;
    model?: string;
    file_mb?: number;
    started_at?: string;
    first_token_s?: number | null;
    chars?: number;
    generation_id?: string;
    duration_s?: number;
    products_read?: number;
    staged?: number;
    complete?: boolean;
    tokens_in?: number | null;
    tokens_out?: number | null;
    cost_usd?: number | null;
    schema?: boolean;
    input?: string;
    ocr_pages?: number;
  };
}

interface Proposal {
  id: string;
  entity: 'brand' | 'category' | 'product';
  action: 'create' | 'update';
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  payload: Record<string, any>;
  warnings: string[];
  ready: boolean;
  blocked_reason: string;
  applied_object_id: string | null;
  source: { row?: number; item?: number; file?: string };
}

type Tab = 'product' | 'brand' | 'category' | 'applied';
type Filter = 'pending' | 'all' | 'ready' | 'blocked' | 'warnings';

const money = (value: unknown) =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '—';


export default function AIUploadPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('');
  const [changes, setChanges] = useState<Proposal[]>([]);
  const [tab, setTab] = useState<Tab>('product');
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [finished, setFinished] = useState<{ count: number } | null>(null);
  const previousStatus = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null);
  const [dismissedError, setDismissedError] = useState('');
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [freeQuota, setFreeQuota] = useState<{ used: number; limit: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadBatches = async (preferred?: string, silent = false) => {
    try {
      const res = await fetch('/api/ai/imports', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || 'Could not load batches');
      const list: Batch[] = json?.data ?? json ?? [];
      setBatches(list);
      setBatchId((current) => preferred || current || list[0]?.id || '');
      return list;
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Could not load batches');
      return [];
    } finally {
    }
  };

  const loadQueue = async () => {
    try {
      const res = await fetch('/api/ai/queue', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || 'Could not load the review queue');
      const data = json?.data ?? json;
      const list: Proposal[] = data?.changes ?? [];
      setChanges(list);
      return list;
    } catch (err: any) {
      setError(err?.message || 'Could not load the review queue');
      return [];
    }
  };

  useEffect(() => {
    void loadBatches();
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    const read = async (fresh = false) => {
      try {
        const res = await fetch(
          `/api/settings/ai/gateway-usage${fresh ? '?fresh=1' : ''}`,
          { cache: 'no-store' }
        );
        const json = await res.json().catch(() => ({}));
        const data = json?.data ?? json;
        const quota = data?.free_requests;
        if (!alive) return;
        setFreeQuota(
          quota && Number(quota.limit) > 0
            ? { used: Number(quota.used || 0), limit: Number(quota.limit) }
            : null
        );
      } catch {
        if (alive) setFreeQuota(null);
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), 120000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  // The chat assistant can edit or delete unapproved proposals; refetch so the
  // table (and the open editor) never show something that no longer exists.
  useEffect(() => {
    const onReviewChanged = () => {
      void loadBatches(batchId, true);
      void loadQueue().then((list) => {
        setSelected((current) =>
          current && !list.some((item) => item.id === current.id) ? null : current
        );
      });
    };
    window.addEventListener('ai:review-changed', onReviewChanged);
    return () => window.removeEventListener('ai:review-changed', onReviewChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const batch = batches.find((item) => item.id === batchId);
  const processing = batch?.status === 'processing';
  // Slow is only a hint for the admin; it must never stop the polling or hide
  // the fact that extraction is still marked as running.
  // The backend touches updated_at after every model call, so a stale
  // heartbeat (not total runtime) is what tells us a run may be dead.
  const callsTotal = Number(batch?.progress?.calls_total || 0);
  // Streaming heartbeats every few seconds, so a long silence means the run is
  // dead. Before the stream opens there is no heartbeat at all, so allow more.
  const generating = batch?.progress?.phase === 'generating';
  const waitingFirstToken = batch?.progress?.phase === 'waiting_model';
  const slowAfter = generating
    ? 2 * 60 * 1000
    : waitingFirstToken
      ? 10 * 60 * 1000
      : callsTotal === 1
        ? 35 * 60 * 1000
        : 5 * 60 * 1000;
  const slow =
    processing && clock - new Date(batch!.updated_at).getTime() > slowAfter;
  const pagesTotal = Number(batch?.progress?.pages_total || 0);
  const pagesDone = Number(batch?.progress?.pages_done || 0);
  const currentPage = Math.min(pagesDone + 1, pagesTotal || 1);
  const staging = batch?.progress?.phase === 'staging';
  const waitingModel = batch?.progress?.phase === 'waiting_model';
  const phaseLabel = generating
    ? 'Generating'
    : waitingModel
      ? 'Waiting for first token'
      : batch?.progress?.phase === 'extracting'
        ? 'Model is reading the file'
        : staging
          ? 'Saving proposals'
          : 'Starting';
  const errorKey = batch ? `${batch.id}:${batch.updated_at}` : '';

  useEffect(() => {
    if (!errorKey) return;
    try {
      setDismissedError(window.localStorage.getItem(`ai-error-dismissed:${errorKey}`) || '');
    } catch {
      setDismissedError('');
    }
  }, [errorKey]);

  const dismissError = () => {
    setDismissedError(errorKey);
    try {
      window.localStorage.setItem(`ai-error-dismissed:${errorKey}`, errorKey);
    } catch {
      /* storage is optional */
    }
  };

  const missingRows = batch?.reconcile?.missing || [];
  const missingPages = batch?.reconcile?.pages || {};
  const productsRead = Number(batch?.progress?.products_read || 0);
  const tokensIn = Number(batch?.progress?.tokens_in || 0);
  const tokensOut = Number(batch?.progress?.tokens_out || 0);
  const costUsd =
    typeof batch?.progress?.cost_usd === 'number' ? batch.progress.cost_usd : null;
  const shortCount = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k` : `${value}`;
  const costLabel =
    costUsd === null
      ? ''
      : costUsd >= 0.01
        ? `$${costUsd.toFixed(2)}`
        : `$${costUsd.toFixed(4)}`;
  const charCount = Number(batch?.progress?.chars || 0);
  const charLabel = charCount
    ? `${charCount >= 1000 ? `${(charCount / 1000).toFixed(1)}k` : charCount} chars`
    : '';
  const firstToken = Number(batch?.progress?.first_token_s || 0);
  const generationId = String(batch?.progress?.generation_id || '');
  const startedAt = batch?.progress?.started_at
    ? Date.parse(batch.progress.started_at)
    : batch
      ? new Date(batch.updated_at || batch.created_at).getTime()
      : 0;
  const elapsedMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
  const elapsedLabel = elapsedMs
    ? `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`
    : '';
  const buttonLabel = uploading
    ? uploadPct !== null
      ? `Uploading ${uploadPct}%`
      : 'Uploading…'
    : processing
      ? slow
        ? 'Stalled…'
        : waitingModel
          ? 'Waiting for model…'
          : staging
          ? 'Saving…'
          : pagesDone === 0
            ? 'AI working…'
            : pagesTotal > 1
              ? `AI ${Math.min(currentPage, pagesTotal)}/${pagesTotal}`
              : 'AI working…'
      : finished
        ? `Done · ${finished.count}`
        : 'Upload sheet';

  useEffect(() => {
    if (previousStatus.current === 'processing' && batch?.status === 'parsed') {
      setFinished({ count: batch.proposals || 0 });
      previousStatus.current = batch.status;
      const timer = window.setTimeout(() => setFinished(null), 8000);
      return () => window.clearTimeout(timer);
    }
    previousStatus.current = batch?.status ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status, batch?.proposals]);

  const refreshAll = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      await loadBatches(batchId, true);
      await loadQueue();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (batch?.status !== 'processing') return;
    const timer = window.setInterval(() => void loadBatches(batchId, true), 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status, batchId]);

  useEffect(() => {
    if (batch?.status !== 'processing') return;
    const timer = window.setInterval(() => void loadQueue(), 4000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status, batchId]);

  useEffect(() => {
    if (batch?.status !== 'processing') return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [batch?.status]);

  useEffect(() => {
    if (batch?.status === 'parsed') void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status]);

  const pendingCount = useMemo(
    () => changes.filter((change) => change.status === 'pending').length,
    [changes]
  );

  const counts = useMemo(() => {
    const pending = changes.filter((change) => change.status === 'pending');
    return {
      products: pending.filter((change) => change.entity === 'product').length,
      brands: pending.filter((change) => change.entity === 'brand').length,
      categories: pending.filter((change) => change.entity === 'category').length,
      applied: changes.filter((change) => change.status === 'applied').length,
    };
  }, [changes]);

  const rows = useMemo(() => {
    let list = changes.filter((change) => change.status !== 'rejected');
    if (tab === 'applied') list = list.filter((change) => change.status === 'applied');
    else list = list.filter((change) => change.entity === tab);

    // The Applied tab is its own view: the pending/ready/blocked pills only
    // describe items waiting to be approved, so they must not empty it.
    if (tab !== 'applied') {
      if (filter === 'pending') list = list.filter((change) => change.status === 'pending');
      if (filter === 'ready')
        list = list.filter((change) => change.status === 'pending' && change.ready);
      if (filter === 'blocked')
        list = list.filter((change) => change.status === 'pending' && !change.ready);
    }
    if (filter === 'warnings') list = list.filter((change) => change.warnings.length > 0);

    const query = search.trim().toLowerCase();
    if (query) {
      const tokens = query.split(/\s+/).filter(Boolean);
      list = list.filter((change) => {
        const payload = change.payload || {};
        const haystack = [
          payload.name,
          payload.sku,
          payload.brand_name,
          payload.category_name,
          change.entity,
          change.applied_object_id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });
    }

    return list;
  }, [changes, tab, filter, search]);

  // The view (tab, filter, search, page, size) lives in the URL so a refresh
  // keeps you exactly where you were, and the link can be shared.
  const hydrated = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (['product', 'brand', 'category', 'applied'].includes(tabParam || '')) {
      setTab(tabParam as Tab);
    }
    const filterParam = params.get('filter');
    if (['pending', 'all', 'ready', 'blocked', 'warnings'].includes(filterParam || '')) {
      setFilter(filterParam as Filter);
    }
    const query = params.get('q');
    if (query) setSearch(query);
    const pageParam = Number(params.get('page'));
    if (Number.isFinite(pageParam) && pageParam > 0) setPage(pageParam);
    const sizeParam = Number(params.get('size'));
    if ([25, 50, 100].includes(sizeParam)) setPageSize(sizeParam);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.set('filter', filter);
    params.set('size', String(pageSize));
    if (search.trim()) params.set('q', search.trim());
    else params.delete('q');
    if (page > 1) params.set('page', String(page));
    else params.delete('page');
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
  }, [tab, filter, search, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const listPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((listPage - 1) * pageSize, listPage * pageSize);

  const openEditor = (change: Proposal) => {
    setSelected(change);
  };

  const act = async (change: Proposal, action: 'approve' | 'reject' | 'enrich') => {
    setBusy(change.id);
    setError(null);
    try {
      const res = await fetch(`/api/ai/imports/changes/${change.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || `Could not ${action}`);
      await loadQueue();
      if (selected?.id === change.id) {
        // Approving or rejecting ends the review of that proposal.
        if (action === 'approve' || action === 'reject') setSelected(null);
        else if (json?.data?.change) setSelected(json.data.change as Proposal);
      }
    } catch (err: any) {
      setError(err?.message || `Could not ${action}`);
      await loadQueue();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(deleteTarget.id);
    setError(null);
    try {
      const res = await fetch(`/api/ai/imports/changes/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || 'Could not delete');
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      await loadQueue();
    } catch (err: any) {
      setError(err?.message || 'Could not delete');
    } finally {
      setBusy(null);
    }
  };

  const purgeAll = async () => {
    setPurging(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/queue/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || 'Could not delete the queue');
      setPurgeOpen(false);
      setSelected(null);
      await loadQueue();
      await loadBatches(batchId, true);
    } catch (err: any) {
      setError(err?.message || 'Could not delete the queue');
    } finally {
      setPurging(false);
    }
  };

  const resumeBatch = async () => {
    if (!batchId) return;
    setBusy(batchId);
    setError(null);
    try {
      const res = await fetch(`/api/ai/imports/${batchId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || 'Could not resume the upload');
      await loadBatches(batchId, true);
    } catch (err: any) {
      setError(err?.message || 'Could not resume the upload');
    } finally {
      setBusy(null);
    }
  };

  const cancelBatch = async () => {
    if (!batchId) return;
    setBusy(batchId);
    setError(null);
    try {
      const res = await fetch(`/api/ai/imports/${batchId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || 'Could not delete the upload');
      setBatchId('');
      await loadBatches(undefined, true);
      await loadQueue();
    } catch (err: any) {
      setError(err?.message || 'Could not delete the upload');
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setUploadPct(0);

    const send = () =>
      new Promise<{ ok: boolean; json: any }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/ai/imports');
        xhr.withCredentials = true;
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadPct(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        };
        xhr.onload = () => {
          let json: any = {};
          try {
            json = JSON.parse(xhr.responseText || '{}');
          } catch {
            json = {};
          }
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, json });
        };
        xhr.onerror = () => reject(new Error('Could not upload the file'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));
        const body = new FormData();
        body.append('file', file);
        xhr.send(body);
      });

    try {
      const res = await send();
      if (!res.ok) throw new Error(res.json?.detail || 'Could not read that file');
      const data = res.json?.data ?? res.json;
      await loadBatches(data?.batch);
      await loadQueue();
    } catch (err: any) {
      setError(err?.message || 'Could not read that file');
    } finally {
      setUploading(false);
      setUploadPct(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="animate-fade-in space-y-4 pb-10">
      <PageHeader
        title="AI Upload"
        description="Upload a price list or PDF — the assistant extracts the products for you to review and approve before they go live."
      />
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12.5px] text-rose-700">
          {error}
        </div>
      )}

      {!error && batch?.status === 'failed' && batch.error && dismissedError !== errorKey && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12.5px] text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">{batch.error}</span>
          <button
            type="button"
            onClick={dismissError}
            aria-label="Dismiss this error"
            className="shrink-0 rounded-md p-0.5 text-rose-500 hover:bg-rose-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {batch?.status === 'paused' && (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">This file may not fit the selected model.</p>
            <p className="mt-0.5 text-amber-800">{batch.warning}</p>
            {batch.estimate?.rows ? (
              <p className="mt-1 text-[11.5px] text-amber-700">
                {batch.estimate.rows} rows · ~{Number(batch.estimate.input_tokens || 0).toLocaleString()} in · ~
                {Number(batch.estimate.output_tokens || 0).toLocaleString()} out
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void resumeBatch()}
              disabled={busy === batchId}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-[12px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {busy === batchId ? <Loader2 size={13} className="animate-spin" /> : null}
              Proceed anyway
            </button>
            <button
              type="button"
              onClick={() => void cancelBatch()}
              disabled={busy === batchId}
              className="inline-flex h-8 items-center rounded-lg border border-amber-300 px-3 text-[12px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
            >
              Cancel upload
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-color px-5 py-3">
          {tab !== 'applied' && (
            <div className="flex items-center gap-1.5">
              {(['pending', 'all', 'ready', 'blocked', 'warnings'] as Filter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFilter(value);
                    setPage(1);
                  }}
                  className={clsx(
                    'h-8 rounded-lg px-2.5 text-[11.5px] font-semibold capitalize transition-colors',
                    filter === value
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {freeQuota && (
              <span
                title={`Free model requests today: ${freeQuota.used} of ${freeQuota.limit} used`}
                className={clsx(
                  'hidden text-[11px] font-medium tabular-nums sm:inline',
                  freeQuota.limit - freeQuota.used <= 5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-text-muted'
                )}
              >
                {freeQuota.used}/{freeQuota.limit} free
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <ChatModelPicker
              buttonClassName="h-8 w-[150px] max-w-none justify-between"
              recommended="dots-studio/dots-3-note-preview:free"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || processing}
              className="inline-flex h-8 w-[150px] items-center justify-center gap-2 rounded-lg bg-accent-primary px-3 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-progress disabled:opacity-80"
            >
              {uploading || processing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileUp size={14} />
              )}
              {buttonLabel}
            </button>
            <button
              type="button"
              onClick={() => setPurgeOpen(true)}
              disabled={purging || pendingCount === 0}
              title="Delete every pending proposal"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/25 px-2.5 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {purging ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Deny all
            </button>
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={refreshing}
              aria-label="Refresh uploads and proposals"
              title="Refresh uploads and proposals"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-color bg-white text-text-muted hover:text-text-primary disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {processing && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-color px-4 py-2 text-[11px] text-text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-text-secondary">
              <Loader2 size={11} className="animate-spin" />
              {phaseLabel}
            </span>
            {batch?.progress?.model && (
              <span className="max-w-[260px] truncate" title={batch.progress.model}>
                {batch.progress.model}
              </span>
            )}
            {batch?.progress?.file_mb ? (
              <span>{batch.progress.file_mb} MB</span>
            ) : null}
            {firstToken > 0 && <span>first token {firstToken}s</span>}
            {charLabel && <span>{charLabel}</span>}
            {batch?.progress?.schema && (
              <span className="rounded bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary">
                JSON schema
              </span>
            )}
            {batch?.progress?.input === 'text' && (
              <span
                title={`Parsed locally${
                  Number(batch.progress.pages_total || 0)
                    ? ` · ${batch.progress.pages_total} pages`
                    : ''
                }${Number(batch.progress.ocr_pages || 0) ? ` · ${batch.progress.ocr_pages} scanned` : ''}`}
                className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-text-muted"
              >
                local parse
              </span>
            )}
            {productsRead > 0 && (
              <span className="font-medium text-text-secondary">
                {productsRead} {productsRead === 1 ? 'product' : 'products'} read
              </span>
            )}
            {generationId && (
              <span className="font-mono text-[10px]" title={`Provider request ${generationId}`}>
                {generationId.slice(0, 12)}
              </span>
            )}
            {elapsedLabel && <span>{elapsedLabel} elapsed</span>}
          </div>
        )}

        {!processing && (batch?.proposals || 0) > 0 && (tokensIn > 0 || costLabel) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-color px-4 py-2 text-[11px] text-text-muted">
            <span className="font-medium text-text-secondary">
              {batch?.proposals || 0} proposal{batch?.proposals === 1 ? '' : 's'}
            </span>
            {tokensIn > 0 && <span>{shortCount(tokensIn)} in</span>}
            {tokensOut > 0 && <span>{shortCount(tokensOut)} out</span>}
            {costLabel && <span>{costLabel} this run</span>}
            {batch?.progress?.schema && <span>JSON schema</span>}
            {batch?.progress?.duration_s ? (
              <span>{Math.round(Number(batch.progress.duration_s))}s model time</span>
            ) : null}
          </div>
        )}

        {!processing && (batch?.proposals || 0) > 0 && missingRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border-color px-4 py-2 text-[11px] text-warning">
            <AlertTriangle size={11} className="shrink-0" />
            <span className="font-medium">
              {missingRows.length} product{missingRows.length === 1 ? '' : 's'} from the sheet
              never reached the model output
            </span>
            {typeof batch?.reconcile?.priced === 'number' &&
              typeof batch?.reconcile?.staged === 'number' &&
              batch.reconcile.priced < batch.reconcile.staged && (
                <span className="text-text-muted">
                  · {batch.reconcile.staged - batch.reconcile.priced} without a price
                </span>
              )}
            <span className="truncate text-text-muted" title={missingRows.join(', ')}>
              {Object.entries(missingPages)
                .map(
                  ([page, entry]) =>
                    `${page === 'sheet' ? 'sheet' : `page ${page}`}: ${entry.missing.join(', ')}`
                )
                .join(' · ')}
            </span>
          </div>
        )}

        {!processing &&
          batch?.progress?.complete === false &&
          Number(batch?.progress?.products_read || 0) > 0 && (
            <div className="flex items-center gap-2 border-b border-border-color px-4 py-2 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={11} />
              The model stopped before closing the JSON. The{' '}
              {Number(batch.progress.products_read)} products it finished were kept.
            </div>
          )}

        <div className="flex items-center gap-1 border-b border-border-color px-3">
          {([
            ['product', counts.products, 'Products'],
            ['brand', counts.brands, 'Brands'],
            ['category', counts.categories, 'Categories'],
            ['applied', counts.applied, 'Applied'],
          ] as [Tab, number, string][]).map(([value, count, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value);
                setPage(1);
              }}
              className={clsx(
                'border-b-2 px-3 py-2.5 text-[12.5px] font-semibold transition-colors',
                tab === value
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {label}
              <span className="ml-1.5 rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10.5px] text-text-muted">
                {count}
              </span>
            </button>
          ))}
          <div className="relative ml-auto pr-1">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, SKU, brand…"
              aria-label="Search proposals"
              className="h-8 w-[230px] rounded-lg border border-border-color bg-bg-secondary/50 pl-7 pr-7 text-[12px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent-primary/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed text-left" data-responsive="off">
            <thead>
              <tr className="border-b border-border-color text-[10px] uppercase tracking-[0.08em] text-text-muted">
                <th className="w-[4%] px-3 py-3 font-semibold">#</th>
                <th className="w-[27%] px-4 py-3 font-semibold">Product</th>
                <th className="w-[12%] px-4 py-3 font-semibold">Category</th>
                <th className="w-[8%] px-4 py-3 font-semibold">Dealer</th>
                <th className="w-[8%] px-4 py-3 font-semibold">Selling</th>
                <th className="w-[8%] px-4 py-3 font-semibold">MRP</th>
                <th className="w-[5%] px-4 py-3 font-semibold">Stock</th>
                <th className="w-[14%] px-4 py-3 font-semibold">Status</th>
                <th className="w-[14%] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/70">
              {visibleRows.map((change, index) => {
                const payload = change.payload || {};
                const thumb = Array.isArray(payload.image_urls) ? payload.image_urls[0] : null;
                return (
                  <tr
                    key={change.id}
                    onClick={() => openEditor(change)}
                    className="cursor-pointer transition-colors hover:bg-bg-secondary/40"
                  >
                    <td className="px-3 py-2.5 text-[12px] tabular-nums text-text-muted">
                      {(listPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-black/[0.03]">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <Package size={17} className="text-text-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-text-primary">
                            {payload.name || '(unnamed)'}
                          </p>
                          <p className="truncate text-[11.5px] text-text-muted">
                            {[
                              payload.brand_name,
                              payload.sku,
                              Array.isArray(payload.variants) && payload.variants.length > 1
                                ? `${payload.variants.length} variants`
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ') ||
                              (change.entity === 'product' ? 'no brand/SKU' : `new ${change.entity}`)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="truncate px-4 py-2.5 text-[12.5px] text-text-secondary" title={payload.category_name || ''}>
                      {payload.category_name || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-text-secondary tabular-nums">
                      {money(payload.dealer_price)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] font-medium text-text-primary tabular-nums">
                      {money(payload.online_price)}
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-text-secondary tabular-nums">
                      {money(payload.mrp)}
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-text-secondary tabular-nums">
                      {payload.stock ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={clsx(
                          'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                          change.status === 'applied'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : change.status === 'rejected'
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : !change.ready
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        {change.status === 'pending' && !change.ready ? 'blocked' : change.status}
                      </span>
                      {change.status === 'pending' && !change.ready && (
                        <p className="mt-0.5 truncate text-[10.5px] text-amber-700" title={change.blocked_reason}>{change.blocked_reason}</p>
                      )}
                      {change.warnings.length > 0 && (
                        <p className="mt-0.5 truncate text-[10.5px] text-text-muted">
                          {change.warnings.slice(0, 2).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {change.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void act(change, 'approve');
                              }}
                              disabled={busy === change.id || !change.ready}
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-accent-primary px-2.5 text-[11px] font-semibold text-white disabled:opacity-40"
                            >
                              {busy === change.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Check size={11} />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void act(change, 'reject');
                              }}
                              disabled={busy === change.id}
                              className="inline-flex h-7 items-center rounded-md border border-border-color px-2.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary disabled:opacity-40"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              aria-label="Delete proposal"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteTarget(change);
                              }}
                              disabled={busy === change.id}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-color text-text-muted hover:text-danger disabled:opacity-40"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        {change.status === 'applied' && change.applied_object_id && (
                          <Link
                            href={`/products/${change.applied_object_id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-border-color px-2.5 text-[11px] font-semibold text-accent-primary"
                          >
                            Open
                            <ExternalLink size={10} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <p className="text-[13px] font-medium text-text-primary">
                      {changes.length === 0
                        ? 'No proposals yet'
                        : search.trim()
                          ? `Nothing matches “${search.trim()}”`
                          : 'Nothing matches this filter'}
                    </p>
                    <p className="mt-1 text-[12px] text-text-muted">
                      {changes.length === 0
                        ? 'Upload a price list or product sheet to extract products.'
                        : 'Try another tab, page or a different search.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-color px-4 py-2.5 text-[11.5px] text-text-muted">
            <span className="tabular-nums">
              Showing {(listPage - 1) * pageSize + 1}–
              {Math.min(listPage * pageSize, rows.length)} of {rows.length}
            </span>
            <div className="flex items-center gap-1.5">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
                className="h-7 rounded-md border border-border-color bg-white px-1.5 text-[11.5px] font-medium text-text-secondary outline-none"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={listPage <= 1}
                className="inline-flex h-7 items-center rounded-md border border-border-color px-2.5 font-semibold text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-1 tabular-nums">
                {listPage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={listPage >= pageCount}
                className="inline-flex h-7 items-center rounded-md border border-border-color px-2.5 font-semibold text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={purgeOpen}
        title="Delete all proposals?"
        tone="danger"
        confirmLabel={purging ? 'Deleting…' : 'Delete pending'}
        message={`${pendingCount} pending proposal${
          pendingCount === 1 ? '' : 's'
        } from every upload will be deleted. Applied and failed proposals stay.`}
        onConfirm={() => void purgeAll()}
        onClose={() => setPurgeOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this proposal?"
        tone="danger"
        confirmLabel="Delete"
        message={
          deleteTarget
            ? `“${deleteTarget.payload?.name || 'This item'}” will be removed from AI Upload.`
            : ''
        }
        onConfirm={() => void remove()}
        onClose={() => setDeleteTarget(null)}
      />

      {selected && (
        <ProductReviewModal
          change={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onApprove={() => void act(selected, 'approve')}
          onReject={() => void act(selected, 'reject')}
          onDelete={() => setDeleteTarget(selected)}
          onSaved={() => void loadQueue()}
        />
      )}
    </div>
  );
}
