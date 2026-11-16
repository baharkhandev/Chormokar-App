'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { ProductForm, type ProductFormHandle } from '../../products/components/ProductForm';
import { ChatModelPicker } from '../../../../widgets/ai-chat';
import { returnPolicyForForm } from '../../../../shared/products/return-policy';

export interface ReviewProposal {
  id: string;
  entity: 'brand' | 'category' | 'product';
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  payload: Record<string, any>;
  warnings: string[];
  ready: boolean;
  blocked_reason: string;
}

interface Props {
  change: ReviewProposal;
  busy: string | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onSaved: () => void;
}

const num = (value: unknown) => (value === null || value === undefined ? '' : String(value));

const slugOf = (value: string) =>
  (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function toFormData(payload: Record<string, any>) {
  const highlights = Array.isArray(payload.highlights)
    ? payload.highlights.map((item: any) =>
        typeof item === 'string'
          ? { title: item, description: '' }
          : { title: item?.title || '', description: item?.description || '' }
      )
    : [];

  const variants = Array.isArray(payload.variants) ? payload.variants : [];
  const firstVariant = variants[0] || {};
  const rawSpecs = Array.isArray(payload.specifications) ? payload.specifications : [];
  const specifications = rawSpecs.length === 0
    ? []
    : rawSpecs.some((item: any) => Array.isArray(item?.items))
      ? rawSpecs
      : [{ title: 'General Specifications', items: rawSpecs }];

  return {
    id: '',
    name: payload.name || '',
    slug: payload.slug || '',
    brand: payload.brand_name || '',
    brand_id: payload.brand_id || '',
    category:
      payload.category_slug ||
      (payload.category_name ? slugOf(payload.category_name) : ''),
    short_description: payload.short_description || '',
    description: payload.description || '',
    status: payload.status || 'active',
    is_featured: Boolean(payload.is_featured),
    sku: payload.sku || '',
    price: num(payload.online_price ?? firstVariant.online_price),
    cost_price: num(payload.dealer_price ?? firstVariant.dealer_price),
    compare_at_price: num(payload.mrp ?? firstVariant.mrp),
    sale_price: num(payload.sale_price),
    sale_ends_at: payload.sale_ends_at ? String(payload.sale_ends_at).slice(0, 10) : '',
    stock: num(payload.stock),
    meta_title: payload.meta_title || '',
    meta_description: payload.meta_description || '',
    images: Array.isArray(payload.image_urls) ? payload.image_urls : [],
    warranty: payload.warranty || '',
    return_policy: returnPolicyForForm(payload.return_policy),
    highlights,
    specifications,
    variants: variants.map(
      (variant: any, index: number) => ({
        id: variant?.sku || `v-${index}`,
        name:
          variant?.name ||
          Object.values(variant?.attributes || {})
            .filter(Boolean)
            .join(' / '),
        sku: variant?.sku || '',
        price: num(variant?.online_price ?? variant?.price),
        compare_at_price: num(variant?.mrp ?? variant?.compare_at_price),
        cost_price: num(variant?.dealer_price ?? variant?.cost_price),
        stock: num(variant?.stock),
        weight_grams: num(variant?.weight_grams),
        attributes: variant?.attributes || {},
        image: variant?.image || variant?.attributes?.image || '',
        is_default: Boolean(variant?.is_default ?? index === 0),
      })
    ),
  };
}

function fromFormData(payload: Record<string, any>) {
  return {
    name: payload.name,
    slug: payload.slug,
    sku: payload.sku,
    brand_name: payload.brand || '',
    brand_id: payload.brand_id || '',
    category_slug: payload.category || '',
    category_name: payload.category || '',
    short_description: payload.short_description || '',
    description: payload.description || '',
    warranty: payload.warranty || '',
    return_policy: returnPolicyForForm(payload.return_policy),
    status: payload.status || 'active',
    is_featured: Boolean(payload.is_featured),
    meta_title: payload.meta_title || '',
    meta_description: payload.meta_description || '',
    sale_price: payload.sale_price || null,
    sale_ends_at: payload.sale_ends_at || null,
    dealer_price: payload.cost_price || null,
    online_price: payload.price || null,
    mrp: payload.compare_at_price || null,
    stock: payload.stock || null,
    highlights: payload.highlights || [],
    specifications: payload.specifications || [],
    variants: payload.variants || [],
    image_urls: payload.images || [],
  };
}

export function ProductReviewModal({
  change,
  busy,
  onClose,
  onApprove,
  onReject,
  onDelete,
  onSaved,
}: Props) {
  const formRef = useRef<ProductFormHandle>(null);
  const [nameDraft, setNameDraft] = useState(String(change.payload?.name || ''));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const savedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [researching, setResearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [research, setResearch] = useState<any>(null);
  const [researchError, setResearchError] = useState('');
  const [fetchStatus, setFetchStatus] = useState<{ phase: string; detail: string } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const pending = change.status === 'pending';
  const working = busy === change.id;

  useEffect(() => {
    let alive = true;
    const load = async (fresh = false) => {
      try {
        const res = await fetch(`/api/settings/ai/gateway-usage${fresh ? '?fresh=1' : ''}`, {
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        const data = json?.data ?? json;
        const free = data?.free_requests;
        if (!alive) return;
        setQuota(
          free && Number(free.limit) > 0
            ? { used: Number(free.used || 0), limit: Number(free.limit) }
            : null
        );
      } catch {
        /* quota is cosmetic */
      }
    };
    void load();
    (window as any).__tpRefreshQuota = () => void load(true);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!researching) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [researching]);

  // The backend reports its real phase (search, read, merge, model, Google).
  useEffect(() => {
    if (!researching) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/ai/imports/changes/${change.id}/fetch-status`, {
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        const data = json?.data ?? json;
        if (alive && data?.phase && data.phase !== 'idle') setFetchStatus(data);
      } catch {
        /* status is cosmetic; the fetch itself still completes */
      }
    };
    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [researching, change.id]);

  // The backend is a single request, so the phase is derived from elapsed time:
  // search across shops, fetch pages, then the model pass.
  const fetchPhase =
    elapsed < 5 ? 'Searching' : elapsed < 10 ? 'Reading' : elapsed < 30 ? 'Filling' : 'Verifying';
  const PHASE_LABELS: Record<string, string> = {
    searching: 'Searching shops',
    reading: 'Reading shops',
    merging: 'Merging specs',
    filling: 'Writing copy',
    verifying: 'Verifying with Google',
  };
  const livePhase = fetchStatus?.phase ? PHASE_LABELS[fetchStatus.phase] : '';
  const fmtTokens = (value?: number) =>
    !value ? '0' : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

  const runFetch = async () => {
    if (change.entity !== 'product') return;
    setResearching(true);
    setElapsed(0);
    setResearchError('');
    setResearch(null);
    setFetchStatus(null);
    try {
      const res = await fetch(`/api/ai/imports/changes/${change.id}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || json?.error?.message || 'Could not research this product.');
      }
      const data = json?.data ?? json;
      const result = data?.research ?? {};
      const applied = formRef.current?.fill(result.patch || {}) ?? [];
      setResearch({ ...result, applied });
      if (applied.length > 0) setCanUndo(true);
      (window as any).__tpRefreshQuota?.();
    } catch (err: any) {
      setResearchError(err?.message || 'Could not research this product.');
    } finally {
      setResearching(false);
    }
  };

  const undoResearch = () => {
    formRef.current?.undoFill();
    setCanUndo(false);
    setResearch(null);
  };

  const suggestions = Array.isArray(research?.verification?.added?.items)
    ? [
        ...(research.verification.added.items || []),
        ...((research.verification.blocked || []) as any[]).flatMap(
          (entry: any) => entry.items || []
        ),
      ].filter((item: any) => item && item.label)
    : [];

  const initialData = toFormData(change.payload || {});

  const reviewSubmit = async (payload: Record<string, any>) => {
    savedRef.current = false;
    const res = await fetch(`/api/ai/imports/changes/${change.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        change.entity === 'product' ? fromFormData(payload) : { name: nameDraft }
      ),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.detail || 'Could not save the proposal');
    savedRef.current = true;
    onSaved();
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (change.entity !== 'product') {
        await reviewSubmit({});
        setSaving(false);
        return;
      }
      await formRef.current?.submit();
      if (!savedRef.current) setError('Could not save — check the fields above.');
    } catch (err: any) {
      setError(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    setError('');
    try {
      if (change.entity !== 'product') {
        await reviewSubmit({});
        if (savedRef.current) onApprove();
        return;
      }
      await formRef.current?.submit();
      if (!savedRef.current) {
        setError('Fix the highlighted fields before publishing.');
        return;
      }
      onApprove();
    } catch (err: any) {
      setError(err?.message || 'Could not publish');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-9">
      <button
        type="button"
        aria-label="Close product"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative flex h-full max-h-full w-full max-w-[1480px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-bg-secondary shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center gap-4 border-b border-black/5 bg-white px-6 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold tracking-tight text-text-primary">
              {change.payload?.name || '(unnamed)'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-text-muted">
              <span className="capitalize">{change.entity}</span>
              <span>·</span>
              <span className="capitalize">{change.status}</span>
              {change.payload?.sku && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[11px]">{change.payload.sku}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center gap-2">
            {change.entity === 'product' && (
              <>
                {quota && (
                  <span
                    title={`Free model requests today: ${quota.used} of ${quota.limit} used`}
                    className={
                      quota.limit - quota.used <= 5
                        ? 'hidden text-[11px] font-medium tabular-nums text-amber-600 sm:inline'
                        : 'hidden text-[11px] font-medium tabular-nums text-text-muted sm:inline'
                    }
                  >
                    {quota.used}/{quota.limit} free
                  </span>
                )}
                <ChatModelPicker
                  buttonClassName="h-8 w-[142px] max-w-none justify-between"
                  recommended="cohere/north-mini-code:free"
                />
                <button
                  type="button"
                  onClick={() => void runFetch()}
                  disabled={researching || busy !== null || saving || !pending}
                  aria-busy={researching}
                  aria-live="polite"
                  className={clsx(
                    'group inline-flex h-8 min-w-[112px] items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-3.5 text-[12px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(15,23,42,0.25)] ring-1 ring-inset ring-white/10 transition-all duration-150',
                    researching
                      ? 'cursor-progress shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_0_1px_rgba(96,165,250,0.35)]'
                      : 'cursor-pointer hover:bg-[#1d4ed8] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_18px_-8px_rgba(37,99,235,0.75)] active:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'
                  )}
                >
                  {researching ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span className="tabular-nums">
                        {livePhase || fetchPhase}… {elapsed}s
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="transition-transform duration-200 group-hover:rotate-[10deg]" />
                      Fetch
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="flex flex-1 justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-bg-secondary px-6 py-5">
          {researchError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{researchError}</span>
            </div>
          )}
          {research && (
            <div className="mb-4 rounded-xl border border-border-color bg-bg-primary px-4 py-3 text-[12px] text-text-primary">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Sparkles size={13} className="shrink-0 text-success" />
                <span className="text-text-secondary">
                  <strong className="text-text-primary">{research.applied?.length || 0} fields</strong>{' '}
                  filled
                  {research.sources?.length ? ` · ${research.sources.length} sources` : ''}
                  {research.duration_s ? ` · ${research.duration_s}s` : ''}
                  {research.usage?.prompt_tokens
                    ? ` · ${fmtTokens(research.usage.prompt_tokens)} in / ${fmtTokens(
                        research.usage.completion_tokens
                      )} out`
                    : ''}
                  {research.usage?.cost ? ` · $${Number(research.usage.cost).toFixed(4)}` : ''}
                </span>
                {research.applied?.length === 0 && (
                  <span className="text-warning">
                    Nothing empty to fill, or the model returned no text — try a stronger model.
                  </span>
                )}
                {research.conflicts?.length > 0 && (
                  <span className="text-warning">
                    kept sheet data for {research.conflicts.map((c: any) => c.field).join(', ')}
                  </span>
                )}
                {research.warnings?.length > 0 && (
                  <span className="text-warning" title={research.warnings.join(' · ')}>
                    {research.warnings[0]}
                  </span>
                )}
                {research.verification?.checked && (
                  <span
                    className={
                      research.verification.corrections?.length ? 'text-warning' : 'text-success'
                    }
                  >
                    {research.verification.corrections?.length
                      ? `Google corrected ${research.verification.corrections.length} value${
                          research.verification.corrections.length === 1 ? '' : 's'
                        }`
                      : research.verification.method === 'rules'
                        ? 'Verified by Google (rules)'
                        : 'Verified by Google'}
                  </span>
                )}
                {research.verification && research.verification.checked === false && (
                  <span className="text-warning" title={research.verification.error || ''}>
                    Google check skipped
                    {research.verification.error ? `: ${research.verification.error}` : ''}
                  </span>
                )}
                {canUndo && (
                  <button
                    type="button"
                    onClick={undoResearch}
                    className="ml-auto rounded-md border border-border-color bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary"
                  >
                    Undo
                  </button>
                )}
              </div>


              {research.verification?.blocked?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-warning">
                    Google filled gaps for{' '}
                    {research.verification.blocked.map((entry: any) => entry.shop).join(', ')}
                  </summary>
                  {research.verification.blocked.map((entry: any) => (
                    <div key={entry.shop} className="mt-1.5">
                      <div className="text-[11px] font-medium text-text-secondary">
                        {entry.shop} was unreadable — {entry.rows} rows suggested by Google
                      </div>
                      <ul className="mt-0.5 space-y-0.5">
                        {(entry.items || []).map((item: any) => (
                          <li key={`${entry.shop}-${item.label}`} className="text-[11px] text-text-secondary">
                            <span className="text-text-primary">{item.label}</span>: {item.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </details>
              )}

              {research.verification?.added?.rows > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-text-secondary">
                    Google suggested {research.verification.added.rows} spec row
                    {research.verification.added.rows === 1 ? '' : 's'} — add them below
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {(research.verification.added.items || []).map((item: any) => (
                      <li key={item.label} className="text-[11px] text-text-secondary">
                        <span className="text-text-primary">{item.label}</span>: {item.value}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {research.verification?.issues?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-warning">
                    Google flagged {research.verification.issues.length} differen
                    {research.verification.issues.length === 1 ? 'ce' : 'ces'}
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {research.verification.issues.map((issue: any, index: number) => (
                      <li key={`${issue.label}-${index}`} className="text-[11px] text-text-secondary">
                        <span className="text-text-primary">{issue.label}</span>: shops “
                        {issue.ours}” → Google “{issue.google}”
                      </li>
                    ))}
                  </ul>
                </details>
              )}

            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
              {error}
            </div>
          )}
          {pending && !change.ready && change.blocked_reason && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
              {change.blocked_reason}
            </div>
          )}
          {change.entity === 'product' ? (
            <ProductForm
              ref={formRef}
              mode="create"
              embedded
              initialData={initialData}
              reviewSubmit={reviewSubmit}
              storePrices={research?.prices || []}
              specSuggestions={suggestions}
            />
          ) : (
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
                {change.entity === 'brand' ? 'Brand name' : 'Category name'}
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  disabled={!pending}
                  className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[13.5px] text-text-primary outline-none transition-colors focus:border-accent-primary disabled:bg-bg-secondary"
                />
              </label>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-black/5 bg-white px-6 py-3.5">
          {pending ? (
            <>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy !== null || saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-[12.5px] font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                Save changes
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy !== null || saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Delete
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onReject}
                  disabled={busy !== null || saving}
                  className="inline-flex h-10 items-center rounded-xl border border-black/10 px-3.5 text-[12.5px] font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={busy !== null || saving || !change.ready}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
                >
                  {working || saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  Publish
                </button>
              </div>
            </>
          ) : (
            <span className="text-[12px] text-text-muted">
              This proposal is {change.status} and can no longer be edited.
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
