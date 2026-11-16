'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Download,
  Plus,
  Printer,
  Check,
  RefreshCw,
  Search,
  Eye,
  X,
  Package,
  Clock3,
  Truck,
  CreditCard,
  User,
  MapPin,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader, Pagination, StatusBadge, EmptyState } from '../../../components';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { apiErrorMessage } from '../../../shared/api/errorMessage';

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'return_requested'],
  delivered: ['return_requested'],
  return_requested: ['returned'],
  returned: [],
  cancelled: [],
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on delivery',
  cash: 'Cash',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  bank: 'Bank transfer',
  card: 'Card (POS)',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  returned: 'Returned',
};

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items_count: number;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

interface OrderDetail extends OrderRow {
  items: Array<{
    id: string;
    sku: string;
    product_name: string;
    variant_name: string;
    product_slug: string;
    image_url: string | null;
    unit_price: string;
    quantity: number;
    line_total: string;
  }>;
  customer: { id: string; name: string; email: string; phone: string };
  shipment: {
    id: string;
    carrier: string;
    carrier_code: string;
    tracking_number: string;
    tracking_url: string;
    consignment_id: string;
    provider_status: string;
    sync_error: string;
    dispatch_attempts: number;
    last_synced_at: string | null;
    status: string;
    shipped_at: string | null;
    delivered_at: string | null;
  } | null;
  status_history: Array<{
    id: string;
    from_status: string;
    to_status: string;
    reason: string;
    created_at: string;
  }>;
  coupon_code: string;
  customer_notes: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_state_division: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  shipping_cost: string;
}

interface OrderStats {
  total: number;
  pending: number;
  unpaid: number;
  today: number;
  revenue: number;
  by_status: Record<string, number>;
}

function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `৳ ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OrdersPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [mounted, setMounted] = useState(false);

  const knownTotal = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const loadStats = useCallback(async () => {
    try {
      const res = await adminFetch('/api/orders/stats');
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.data ?? json);
    } catch {
      /* non-blocking */
    }
  }, [adminFetch]);

  const loadOrders = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const res = await adminFetch(`/api/orders?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        const rows: OrderRow[] = Array.isArray(json.data) ? json.data : [];
        const count = Number(json.meta?.count ?? rows.length);

        if (options.silent && knownTotal.current !== null && count > knownTotal.current) {
          showToast(`${count - knownTotal.current} new order${count - knownTotal.current === 1 ? '' : 's'} received`);
        }
        knownTotal.current = count;

        setOrders(rows);
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
    if (authStatus === 'authenticated') void loadOrders({});
  }, [authStatus, loadOrders]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    void loadStats();
    // Light polling so new orders surface without a manual refresh.
    const interval = window.setInterval(() => {
      void loadOrders({ silent: true });
      void loadStats();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [authStatus, loadOrders, loadStats]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const created = new URLSearchParams(window.location.search).get('created');
    if (!created) return;
    window.history.replaceState({}, '', '/orders');
    (async () => {
      try {
        const res = await adminFetch(`/api/orders/${created}`);
        if (!res.ok) return;
        const json = await res.json();
        setDetail(json.data ?? json);
        showToast('Manual order created.');
      } catch {
        /* list is still there */
      }
    })();
  }, [authStatus, adminFetch, showToast]);

  const openDetail = async (order: OrderRow) => {
    setDetailLoading(true);
    setDetail({ ...order } as OrderDetail);
    try {
      const res = await adminFetch(`/api/orders/${order.id}`);
      if (res.ok) {
        const json = await res.json();
        setDetail(json.data ?? json);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (order: OrderDetail, nextStatus: string) => {
    setSavingStatus(true);
    try {
      const res = await adminFetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(apiErrorMessage(json, 'Could not update the order status.'));
        return;
      }
      setDetail(json.data ?? json);
      await loadOrders({ silent: true });
      await loadStats();
      showToast(`Order marked ${STATUS_LABELS[nextStatus] ?? nextStatus}.`);
    } finally {
      setSavingStatus(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const statCards = useMemo(
    () => [
      { label: 'Total orders', value: stats?.total ?? 0, tone: 'text-text-primary bg-bg-secondary' },
      { label: 'Needs action', value: stats?.pending ?? 0, tone: 'text-accent-primary bg-accent-primary/10' },
      { label: 'Unpaid', value: stats?.unpaid ?? 0, tone: 'text-amber-600 bg-amber-500/10' },
      { label: 'Paid revenue', value: money(stats?.revenue ?? 0), tone: 'text-emerald-600 bg-emerald-500/10' },
    ],
    [stats]
  );

  const handleExportCsv = () => {
    const rows = [
      ['Order ID', 'Customer', 'Email', 'Date', 'Items', 'Total (BDT)', 'Status', 'Payment'],
      ...orders.map((o) => [
        o.order_number,
        o.customer_name,
        o.customer_email,
        formatDate(o.created_at),
        String(o.items_count),
        o.total_amount,
        STATUS_LABELS[o.status] ?? o.status,
        o.payment_status,
      ]),
    ];
    const csv =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map((cell) => {
              const str = String(cell ?? '');
              return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            })
            .join(',')
        )
        .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chormokar_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${orders.length} orders to CSV`);
  };

  const printInvoice = async (order: OrderDetail) => {
    const win = window.open('', '_blank');
    try {
      const res = await adminFetch(`/api/orders/${order.id}/invoice`);
      if (!res.ok) {
        win?.close();
        showToast('Could not load the invoice.');
        return;
      }
      const html = await res.text();
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    } catch {
      win?.close();
      showToast('Could not load the invoice.');
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Orders"
        description="Every customer order, updated live. New orders appear automatically."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/orders/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-text-primary px-4 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New order
            </Link>
            <button
              type="button"
              onClick={() => {
                void loadOrders({});
                void loadStats();
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, tone }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
            <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}>
              <Package size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{label}</p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border-color p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1 px-2">
            {[
              ['all', 'All'],
              ['pending', 'Pending'],
              ['confirmed', 'Confirmed'],
              ['processing', 'Processing'],
              ['shipped', 'Shipped'],
              ['delivered', 'Delivered'],
              ['cancelled', 'Cancelled'],
            ].map(([key, label]) => (
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

          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search order #, customer, phone..."
              className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center text-[12.5px] text-text-secondary">Loading orders…</div>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders found" message="New customer orders will appear here automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-color bg-bg-secondary/40">
                  {['Order', 'Customer', 'Date', 'Payment', 'Status', 'Total', ''].map((heading, i) => (
                    <th
                      key={heading || i}
                      className={clsx(
                        'p-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted',
                        i === 0 && 'pl-6',
                        (i === 5 || i === 6) && 'text-right',
                        i === 6 && 'pr-6'
                      )}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/70">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => void openDetail(order)}
                    className="group cursor-pointer transition-colors hover:bg-bg-secondary/40"
                  >
                    <td className="py-4 pl-6 pr-4">
                      <p className="text-[13px] font-semibold text-text-primary">{order.order_number}</p>
                      <p className="text-[11px] text-text-muted">
                        {order.items_count} item{order.items_count === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-[13px] font-medium text-text-primary">{order.customer_name}</p>
                      <p className="text-[11px] text-text-muted">{order.customer_email}</p>
                    </td>
                    <td className="p-4 text-[12.5px] text-text-secondary">{formatDate(order.created_at)}</td>
                    <td className="p-4">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={order.status} label={STATUS_LABELS[order.status] ?? order.status} />
                    </td>
                    <td className="p-4 text-right text-[13px] font-semibold text-text-primary">
                      {money(order.total_amount)}
                    </td>
                    <td className="py-4 pr-6 pl-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openDetail(order);
                        }}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-accent-primary"
                        aria-label={`View ${order.order_number}`}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          itemLabel="orders"
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {detail && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-8">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setDetail(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-border-color bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-border-color px-6 py-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em] text-text-primary">
                    {detail.order_number}
                  </h2>
                  <StatusBadge status={detail.status} label={STATUS_LABELS[detail.status] ?? detail.status} />
                </div>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  {formatDate(detail.created_at)} · {detail.items?.length ?? 0} line item
                  {(detail.items?.length ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void printInvoice(detail)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-color px-3 text-[12px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
                >
                  <Printer size={14} />
                  Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border-color bg-bg-secondary/40 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    <User size={12} /> Customer
                  </p>
                  <p className="text-[13px] font-semibold text-text-primary">{detail.customer?.name}</p>
                  <p className="text-[12px] text-text-secondary">{detail.customer?.email}</p>
                  {detail.customer?.phone ? (
                    <p className="text-[12px] text-text-secondary">{detail.customer.phone}</p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-border-color bg-bg-secondary/40 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    <MapPin size={12} /> Shipping
                  </p>
                  <p className="text-[12.5px] text-text-primary">{detail.shipping_full_name}</p>
                  <p className="text-[12px] text-text-secondary">
                    {[detail.shipping_line1, detail.shipping_line2, detail.shipping_city]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="text-[12px] text-text-secondary">
                    {[detail.shipping_state_division, detail.shipping_postal_code]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-1 text-[12px] text-text-secondary">{detail.shipping_phone}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border-color">
                {(detail.items ?? []).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border-b border-border-color p-3 last:border-b-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-11 w-11 rounded-lg border border-border-color object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-secondary text-text-muted">
                        <Package size={16} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text-primary">{item.product_name}</p>
                      <p className="text-[11.5px] text-text-muted">
                        {item.variant_name} · {item.sku}
                      </p>
                    </div>
                    <p className="text-[12px] text-text-secondary">
                      {item.quantity} × {money(item.unit_price)}
                    </p>
                    <p className="w-24 text-right text-[13px] font-semibold text-text-primary">
                      {money(item.line_total)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 rounded-xl border border-border-color p-4 text-[12.5px]">
                  {[
                    ['Subtotal', money(detail.subtotal)],
                    ['Discount', detail.discount_amount && Number(detail.discount_amount) > 0 ? `− ${money(detail.discount_amount)}` : '—'],
                    ['Shipping', money(detail.shipping_cost)],
                    ['Tax', money(detail.tax_amount)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-medium text-text-primary">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border-color pt-2">
                    <span className="font-semibold text-text-primary">Total</span>
                    <span className="text-[14px] font-bold text-text-primary">{money(detail.total_amount)}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border-color p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    <CreditCard size={12} /> Payment
                  </p>
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <StatusBadge status={detail.payment_status} />
                    {detail.payment_method ? (
                      <span className="text-text-secondary">
                        {PAYMENT_METHOD_LABELS[detail.payment_method] ?? detail.payment_method}
                      </span>
                    ) : null}
                  </div>
                  {detail.coupon_code ? (
                    <p className="text-[12px] text-text-secondary">
                      Coupon <span className="font-semibold text-text-primary">{detail.coupon_code}</span>
                    </p>
                  ) : null}
                  {detail.shipment ? (
                    <div className="space-y-1 text-[12px] text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Truck size={13} />
                        {detail.shipment.carrier}
                        {detail.shipment.tracking_number
                          ? ` · ${detail.shipment.tracking_number}`
                          : ' · awaiting booking'}
                      </div>
                      {detail.shipment.provider_status ? (
                        <p className="pl-[19px] text-[11px]">
                          Courier status:{' '}
                          <span className="font-semibold text-text-primary">
                            {detail.shipment.provider_status}
                          </span>
                        </p>
                      ) : null}
                      {detail.shipment.sync_error ? (
                        <p className="pl-[19px] text-[11px] leading-relaxed text-red-600">
                          {detail.shipment.sync_error}
                        </p>
                      ) : null}
                      {detail.shipment.tracking_url ? (
                        <a
                          href={detail.shipment.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-[19px] inline-flex text-[11px] font-semibold text-accent-primary hover:underline"
                        >
                          Open courier tracking
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {detail.customer_notes ? (
                <div className="rounded-xl border border-border-color bg-bg-secondary/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Customer notes</p>
                  <p className="mt-1 text-[12.5px] text-text-primary">{detail.customer_notes}</p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  <Clock3 size={12} /> Status history
                </p>
                <div className="space-y-1.5">
                  {(detail.status_history ?? []).slice().reverse().map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-text-primary">
                        {entry.from_status ? `${STATUS_LABELS[entry.from_status] ?? entry.from_status} → ` : ''}
                        <strong>{STATUS_LABELS[entry.to_status] ?? entry.to_status}</strong>
                        {entry.reason ? <span className="text-text-muted"> · {entry.reason}</span> : null}
                      </span>
                      <span className="text-text-muted">{formatDate(entry.created_at)}</span>
                    </div>
                  ))}
                  {(detail.status_history ?? []).length === 0 ? (
                    <p className="text-[12px] text-text-muted">No status changes recorded yet.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border-color px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11.5px] text-text-muted">
                {detailLoading ? 'Loading full order…' : 'Status changes are recorded in the order history.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(NEXT_STATUSES[detail.status] ?? []).filter((next) => next !== 'cancelled').map((next) => (
                  <button
                    key={next}
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void changeStatus(detail, next)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-primary px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
                  >
                    <Check size={14} />
                    Mark {STATUS_LABELS[next] ?? next}
                  </button>
                ))}
                {(NEXT_STATUSES[detail.status] ?? []).includes('cancelled') ? (
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void changeStatus(detail, 'cancelled')}
                    className="inline-flex h-9 items-center rounded-lg border border-danger/30 px-3.5 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  >
                    Cancel order
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-text-primary px-5 py-3 text-sm font-semibold text-white shadow-2xl">
          <Check size={18} className="shrink-0 text-success" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
