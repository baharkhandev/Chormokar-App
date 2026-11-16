'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Ticket,
  Plus,
  Search,
  CheckCircle2,
  CalendarClock,
  Clock3,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../../components';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { apiErrorMessage } from '../../../shared/api/errorMessage';
import { Pencil, Trash2 } from 'lucide-react';

type CouponStatus = 'active' | 'scheduled' | 'expired';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: string;
  minimum_order_value: string | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  times_used: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

interface CouponForm {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  minOrder: string;
  usageLimit: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  type: 'percentage',
  value: '',
  minOrder: '',
  usageLimit: '',
  startsAt: '',
  endsAt: '',
};

export default function CouponsPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | CouponStatus>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      type: coupon.discount_type === 'fixed' ? 'fixed' : 'percentage',
      value: coupon.discount_value ?? '',
      minOrder: coupon.minimum_order_value ?? '',
      usageLimit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      startsAt: coupon.valid_from ? coupon.valid_from.slice(0, 16) : '',
      endsAt: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
    });
    setIsModalOpen(true);
  };

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/coupons?page_size=100');

      if (!res.ok) return;
      const json = await res.json();
      const list: Coupon[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.results)
            ? json.results
            : [];
      setCoupons(list);
    } catch (e) {
      console.error('Failed to load coupons', e);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus === 'authenticated') void fetchCoupons();
  }, [authStatus, fetchCoupons]);

  const statusOf = (coupon: Coupon): CouponStatus => {
    const now = Date.now();
    if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) return 'scheduled';
    if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) return 'expired';
    return coupon.is_active ? 'active' : 'expired';
  };

  const filtered = coupons.filter((coupon) => {
    if (status !== 'all' && statusOf(coupon) !== status) return false;
    if (search.trim() && !coupon.code.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const stats = useMemo(
    () => ({
      active: coupons.filter((c) => statusOf(c) === 'active').length,
      scheduled: coupons.filter((c) => statusOf(c) === 'scheduled').length,
      expired: coupons.filter((c) => statusOf(c) === 'expired').length,
    }),
    [coupons]
  );

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.type,
      discount_value: form.value || '0',
      minimum_order_value: form.minOrder || null,
      usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
      usage_limit_per_user: 1,
      is_active: true,
      valid_from: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      valid_until: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };

    setSaving(true);
    const res = editing
      ? await adminFetch(`/api/coupons/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await adminFetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      closeModal();
      await fetchCoupons();
      showNotice(editing ? 'Coupon updated.' : 'Coupon created.');
    } else {
      const data = await res.json().catch(() => ({}));
      showNotice(apiErrorMessage(data, 'Failed to save coupon.'));
    }
    setSaving(false);
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    const res = await adminFetch(`/api/coupons/${coupon.id}`, { method: 'DELETE' });
    if (res.ok) {
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      showNotice('Coupon deleted.');
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Coupons"
        description="Create discount codes, set their value and limits, and control when they can be redeemed."
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
          >
            <Plus size={16} />
            New coupon
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Active coupons', value: stats.active, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'Scheduled', value: stats.scheduled, icon: CalendarClock, tone: 'text-accent-primary bg-accent-primary/10' },
          { label: 'Expired', value: stats.expired, icon: Clock3, tone: 'text-text-secondary bg-bg-secondary' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
            <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{label}</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border-color bg-white">
        <div className="flex flex-col gap-3 border-b border-border-color p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            {([
              ['all', 'All'],
              ['active', 'Active'],
              ['scheduled', 'Scheduled'],
              ['expired', 'Expired'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={clsx(
                  'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
                  status === key
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code..."
              className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-color bg-white text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Discount</th>
                <th className="px-6 py-3.5">Minimum</th>
                <th className="px-6 py-3.5">Usage</th>
                <th className="px-6 py-3.5">Valid until</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-[12.5px] text-text-secondary">
                    Loading coupons…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-text-muted">
                        <Ticket size={22} />
                      </div>
                      <p className="text-[15px] font-semibold text-text-primary">
                        {coupons.length === 0 ? 'No coupons yet' : 'No matching coupons'}
                      </p>
                      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-secondary">
                        Create a coupon code customers can redeem at checkout.
                      </p>
                      {coupons.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
                        >
                          <Plus size={16} />
                          Create your first coupon
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((coupon) => {
                  const couponStatus = statusOf(coupon);
                  return (
                    <tr key={coupon.id} className="transition-colors hover:bg-bg-secondary/40">
                      <td className="px-6 py-3.5">
                        <span className="rounded-md border border-border-color bg-bg-secondary px-2 py-0.5 font-mono text-[11.5px] font-semibold uppercase tracking-wide text-text-primary">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] text-text-secondary">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : coupon.discount_type === 'free_shipping'
                            ? 'Free shipping'
                            : `৳ ${coupon.discount_value}`}
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] text-text-secondary">
                        {coupon.minimum_order_value ? `৳ ${coupon.minimum_order_value}` : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] text-text-secondary">
                        {coupon.usage_limit ? `${coupon.times_used} / ${coupon.usage_limit}` : 'Unlimited'}
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] text-text-secondary">
                        {coupon.valid_until
                          ? new Date(coupon.valid_until).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No end date'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                            couponStatus === 'active'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : couponStatus === 'scheduled'
                                ? 'bg-accent-primary/10 text-accent-primary'
                                : 'bg-bg-secondary text-text-secondary'
                          )}
                        >
                          {couponStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(coupon)}
                            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                            aria-label={`Edit ${coupon.code}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(coupon)}
                            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                            aria-label={`Delete ${coupon.code}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={closeModal} className="absolute inset-0 bg-black/30" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-modal-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-border-color bg-white"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-color px-6 py-5">
              <div>
                <h2 id="coupon-modal-title" className="font-display text-[20px] font-semibold tracking-[-0.02em] text-text-primary">
                  {editing ? 'Edit coupon' : 'New coupon'}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-text-secondary">
                  Set the code, discount, and the window it is valid for.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Coupon code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="CHORMOKAR10"
                  className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 font-mono text-[13px] uppercase text-text-primary outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Discount type
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['percentage', 'Percentage'],
                    ['fixed', 'Fixed amount'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, type: key })}
                      className={clsx(
                        'h-10 rounded-lg border text-[12.5px] font-semibold transition-colors',
                        form.type === key
                          ? 'border-accent-primary bg-accent-primary/5 text-accent-primary'
                          : 'border-border-color bg-white text-text-secondary hover:bg-bg-secondary'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Value
                  </label>
                  <input
                    type="text"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value.replace(/[^0-9.]/g, '') })}
                    placeholder={form.type === 'percentage' ? '10' : '৳ 500'}
                    className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Min order
                  </label>
                  <input
                    type="text"
                    value={form.minOrder}
                    onChange={(e) => setForm({ ...form, minOrder: e.target.value.replace(/[^0-9.]/g, '') })}
                    placeholder="৳ 0"
                    className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Usage limit
                  </label>
                  <input
                    type="text"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="Unlimited"
                    className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Starts at
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Ends at
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border-color px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 items-center rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.code.trim()}
                className="inline-flex h-10 items-center rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save coupon'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-black/10 bg-text-primary px-4 py-3 text-[12.5px] font-medium text-white">
          <Clock3 size={16} className="shrink-0 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
