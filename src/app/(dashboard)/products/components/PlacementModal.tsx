'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Flame, Loader2, Tag, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { apiErrorMessage } from '../../../../shared/api/errorMessage';
import type { ProductItem } from '../../../../shared/products/storage';

type Section = 'live' | 'flash';

interface PlacementModalProps {
  product: ProductItem;
  section: Section;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface VariantRow {
  id: string;
  name: string;
  sku: string;
  price: string;
  colorHex?: string;
  isDefault: boolean;
}

const DURATIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

const money = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return '—';
  return `৳${parsed.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
};

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function PlacementModal({
  product,
  section,
  isOpen,
  onClose,
  onSaved,
}: PlacementModalProps) {
  const field = section === 'live' ? 'live_deal_until' : 'flash_deal_until';
  const current = section === 'live' ? product.live_deal_until : product.flash_deal_until;
  const isFlash = section === 'flash';

  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [applyAll, setApplyAll] = useState(false);
  const [duration, setDuration] = useState<string>('24');
  const [customEnd, setCustomEnd] = useState(() =>
    toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the variant list (the products table payload does not carry variants).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingVariants(true);
    setError(null);
    fetch(`/api/products/${product.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
      .then((json) => {
        if (cancelled) return;
        const raw: any[] = Array.isArray(json?.data?.variants) ? json.data.variants : [];
        const rows: VariantRow[] = raw.map((v, index) => ({
          id: String(v.id ?? index),
          name: v.name || `Variant ${index + 1}`,
          sku: v.sku || '',
          price: String(v.price ?? ''),
          colorHex: v.attributes?.color_hex,
          isDefault: Boolean(v.is_default),
        }));
        if (rows.length === 0 && product.price) {
          rows.push({
            id: '__base__',
            name: 'This product',
            sku: product.sku || '',
            price: String(product.price),
            isDefault: true,
          });
        }
        setVariants(rows);
        // Start empty on purpose: an untouched field means "not on deal",
        // so saving clears any previous sale price instead of carrying it over.
        setValues(Object.fromEntries(rows.map((row) => [row.id, ''])));
        setApplyAll(false);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this product’s variants.');
      })
      .finally(() => {
        if (!cancelled) setLoadingVariants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, product.id, product.price, product.sale_price, product.sku]);

  useEffect(() => {
    if (!isOpen) return;
    setDuration('24');
    setCustomEnd(toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    setError(null);
  }, [isOpen]);

  const endsAtDate = useMemo(() => {
    if (duration === 'custom') {
      if (!customEnd) return null;
      const date = new Date(customEnd);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return new Date(Date.now() + Number(duration) * 60 * 60 * 1000);
  }, [duration, customEnd]);

  const rows = useMemo(
    () =>
      variants.map((variant) => {
        const raw = values[variant.id] ?? '';
        const trimmed = raw.trim();
        const price = Number(variant.price);
        const deal = Number(trimmed);
        const filled = trimmed !== '';
        const invalid =
          filled && (!Number.isFinite(deal) || deal <= 0 || (Number.isFinite(price) && deal >= price));
        const percent =
          filled && !invalid && price > 0 ? Math.round(((price - deal) / price) * 100) : null;
        return { ...variant, raw, filled, invalid, percent };
      }),
    [variants, values]
  );

  const updateValue = useCallback(
    (id: string, raw: string) => {
      setValues((previous) => {
        if (!applyAll) return { ...previous, [id]: raw };
        const next: Record<string, string> = {};
        Object.keys(previous).forEach((key) => {
          next[key] = raw;
        });
        return next;
      });
    },
    [applyAll]
  );

  const toggleApplyAll = () => {
    setApplyAll((previous) => {
      const next = !previous;
      if (next) {
        const source =
          rows.find((row) => row.filled)?.raw ?? rows[0]?.raw ?? '';
        setValues(Object.fromEntries(rows.map((row) => [row.id, source])));
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(json, 'Could not update the placement.'));
        return false;
      }
      onSaved();
      onClose();
      return true;
    } catch {
      setError('Could not reach the server. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const until = endsAtDate ? endsAtDate.toISOString() : null;
    if (!until) {
      setError('Choose how long this should show.');
      return;
    }
    const invalidRow = rows.find((row) => row.invalid);
    if (invalidRow) {
      setError(`${invalidRow.name}: the deal price must be lower than ${money(invalidRow.price)}.`);
      return;
    }

    const realVariants = rows.filter((row) => row.id !== '__base__');

    if (realVariants.length === 0) {
      // Single-variant product: fall back to the product-level sale fields.
      const salePrice = rows[0]?.raw.trim() ? rows[0].raw.trim() : null;
      void patch({
        [field]: until,
        ...(isFlash || section === 'live'
          ? { sale_price: salePrice, sale_ends_at: salePrice ? until : null }
          : {}),
      });
      return;
    }

    void patch({
      [field]: until,
      ...(isFlash || section === 'live'
        ? {
            variant_sales: realVariants.map((row) => ({
              id: row.id,
              sale_price: row.filled ? row.raw.trim() : null,
              sale_ends_at: row.filled ? until : null,
            })),
          }
        : {}),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[520px] rounded-2xl border border-border-color bg-white p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                isFlash ? 'bg-rose-50 text-rose-600' : 'bg-accent-primary/10 text-accent-primary'
              )}
            >
              {isFlash ? <Flame size={18} /> : <Tag size={18} />}
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-text-primary">
                {isFlash ? 'This week’s flash deals' : 'Live deals'}
              </h2>
              <p className="mt-0.5 line-clamp-1 text-[12px] text-text-secondary">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Deal price per variant
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={toggleApplyAll}
                  aria-pressed={applyAll}
                  className="group inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  <span
                    className={clsx(
                      'flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition-colors',
                      applyAll
                        ? 'border-accent-primary bg-accent-primary text-white'
                        : 'border-border-color bg-white text-transparent'
                    )}
                  >
                    <Check size={9} strokeWidth={3} />
                  </span>
                  Same price for all
                </button>
              )}
            </div>

            {loadingVariants ? (
              <div className="flex items-center gap-2 rounded-xl border border-border-color bg-bg-secondary/40 px-3 py-4 text-[12px] text-text-muted">
                <Loader2 size={14} className="animate-spin" />
                Loading variants…
              </div>
            ) : (
              <div className="max-h-[248px] space-y-1.5 overflow-y-auto pr-0.5">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors',
                      row.invalid
                        ? 'border-rose-500/40 bg-rose-500/[0.04]'
                        : row.filled
                          ? 'border-black/10 bg-white'
                          : 'border-black/[0.07] bg-bg-secondary/30'
                    )}
                  >
                    <span
                      className="h-5 w-5 shrink-0 rounded-md border border-black/10"
                      style={{ backgroundColor: row.colorHex || '#cbd5e1' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-text-primary">
                        {row.name}
                        {row.isDefault && (
                          <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-[0.06em] text-emerald-600">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-[10.5px] text-text-muted">
                        {money(row.price)}
                        {row.sku ? ` · ${row.sku}` : ''}
                      </p>
                    </div>

                    <div className="relative w-[104px] shrink-0">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-text-muted">
                        ৳
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="1"
                        value={row.raw}
                        onChange={(event) => updateValue(row.id, event.target.value)}
                        placeholder="—"
                        aria-label={`Deal price for ${row.name}`}
                        className={clsx(
                          'h-9 w-full rounded-lg border bg-white pl-5 pr-2 text-right text-[12.5px] tabular-nums text-text-primary outline-none transition-colors',
                          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                          row.invalid
                            ? 'border-rose-500/50 focus:border-rose-500'
                            : 'border-black/10 focus:border-accent-primary'
                        )}
                      />
                    </div>

                    <span
                      className={clsx(
                        'w-[46px] shrink-0 text-right text-[10.5px] font-semibold tabular-nums',
                        row.invalid
                          ? 'text-rose-500'
                          : row.percent !== null
                            ? 'text-emerald-600'
                            : 'text-text-muted'
                      )}
                    >
                      {row.invalid
                        ? 'too high'
                        : row.percent !== null
                          ? `−${row.percent}%`
                          : row.filled
                            ? '—'
                            : 'no deal'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2 text-[11px] text-text-muted">
              {rows.length > 1
                ? 'Leave a variant empty to keep it out of the deal.'
                : 'Leave it empty to show at the normal price.'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Show for
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((option) => (
                <button
                  key={option.hours}
                  type="button"
                  onClick={() => setDuration(String(option.hours))}
                  className={clsx(
                    'h-9 rounded-lg border text-[12px] font-medium transition-colors',
                    duration === String(option.hours)
                      ? 'border-accent-primary bg-accent-primary/5 text-accent-primary'
                      : 'border-border-color bg-white text-text-secondary hover:bg-bg-secondary'
                  )}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDuration('custom')}
                className={clsx(
                  'h-9 rounded-lg border text-[12px] font-medium transition-colors',
                  duration === 'custom'
                    ? 'border-accent-primary bg-accent-primary/5 text-accent-primary'
                    : 'border-border-color bg-white text-text-secondary hover:bg-bg-secondary'
                )}
              >
                Custom
              </button>
            </div>
            {duration === 'custom' ? (
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none focus:border-accent-primary focus:bg-white"
              />
            ) : null}
            {endsAtDate ? (
              <p className="mt-2 text-[11px] text-text-muted">
                Ends{' '}
                <span className="font-medium text-text-secondary">
                  {endsAtDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            ) : null}
          </div>

          {current ? (
            <p className="text-[11.5px] text-text-secondary">
              Currently live until{' '}
              <span className="font-semibold text-text-primary">
                {new Date(current).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              .
            </p>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[11.5px] font-medium text-danger">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {current ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const realVariants = rows.filter((row) => row.id !== '__base__');
                void patch({
                  [field]: null,
                  sale_price: null,
                  sale_ends_at: null,
                  ...(realVariants.length
                    ? {
                        variant_sales: realVariants.map((row) => ({
                          id: row.id,
                          sale_price: null,
                          sale_ends_at: null,
                        })),
                      }
                    : {}),
                });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger/20 px-3 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              <Trash2 size={13} />
              Remove
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingVariants}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Saving…' : 'Place product'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
