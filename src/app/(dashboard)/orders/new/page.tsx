'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Search,
  Trash2,
  User,
  MapPin,
  CreditCard,
  Package,
  Save,
} from 'lucide-react';
import { PageHeader } from '../../../../components';
import { useAdminFetch } from '../../../../shared/api/useAdminFetch';
import { apiErrorMessage } from '../../../../shared/api/errorMessage';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'card', label: 'Card (POS)' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'authorized', label: 'Authorized' },
  { value: 'partially_refunded', label: 'Partially refunded' },
  { value: 'refunded', label: 'Refunded' },
];

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
];

interface VariantResult {
  id: string;
  sku: string;
  name: string;
  price: string;
  effective_price: string;
  stock_quantity: number;
  product_name: string;
}

interface Line {
  key: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
  unitPrice: string;
  quantity: string;
  discount: string;
  stock: number;
}

const inputClass =
  'h-10 w-full rounded-lg border border-border-color bg-white px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-text-primary';
const labelClass =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted';

function money(value: number): string {
  return `৳ ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-color bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-secondary text-text-secondary">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function NewOrderPage() {
  const router = useRouter();
  const adminFetch = useAdminFetch();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('BD');

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [orderStatus, setOrderStatus] = useState('confirmed');
  const [deductStock, setDeductStock] = useState(true);

  const [shippingCost, setShippingCost] = useState('0');
  const [orderDiscount, setOrderDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VariantResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await adminFetch(
          `/api/variants?search=${encodeURIComponent(term)}&page_size=8`
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        setResults(Array.isArray(json.data) ? json.data : []);
        setSearchOpen(true);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, adminFetch]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const addVariant = (variant: VariantResult) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.variantId === variant.id);
      if (existing) {
        return prev.map((line) =>
          line.variantId === variant.id
            ? { ...line, quantity: String(Number(line.quantity || 0) + 1) }
            : line
        );
      }
      return [
        ...prev,
        {
          key: variant.id,
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product_name,
          variantName: variant.name,
          unitPrice: String(Number(variant.effective_price || variant.price || 0)),
          quantity: '1',
          discount: '0',
          stock: Number(variant.stock_quantity || 0),
        },
      ];
    });
    setQuery('');
    setResults([]);
    setSearchOpen(false);
  };

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const price = Number(line.unitPrice) || 0;
      const qty = Number(line.quantity) || 0;
      const discount = Number(line.discount) || 0;
      return sum + Math.max(0, price * qty - discount);
    }, 0);
    const shipping = Number(shippingCost) || 0;
    const discount = Number(orderDiscount) || 0;
    const taxValue = Number(tax) || 0;
    return {
      subtotal,
      shipping,
      discount,
      tax: taxValue,
      total: Math.max(0, subtotal - discount + shipping + taxValue),
    };
  }, [lines, shippingCost, orderDiscount, tax]);

  const submit = useCallback(async () => {
    setError('');
    if (!fullName.trim() || !phone.trim() || !line1.trim() || !city.trim()) {
      setError('Customer name, phone, address and city are required.');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one product to the invoice.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
        },
        shipping: {
          line1: line1.trim(),
          line2: line2.trim(),
          city: city.trim(),
          district: district.trim(),
          postal_code: postalCode.trim(),
          country: country.trim().toUpperCase() || 'BD',
        },
        items: lines.map((line) => ({
          variant_id: line.variantId,
          quantity: Math.max(1, Number(line.quantity) || 1),
          unit_price: Number(line.unitPrice) || 0,
          discount_amount: Number(line.discount) || 0,
        })),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status: orderStatus,
        shipping_cost: Number(shippingCost) || 0,
        discount_amount: Number(orderDiscount) || 0,
        tax_amount: Number(tax) || 0,
        customer_notes: customerNotes.trim(),
        internal_notes: internalNotes.trim(),
        deduct_stock: deductStock,
      };

      const res = await adminFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(json, 'Could not create the order.'));
        return;
      }
      const created = json.data ?? json;
      router.push(`/orders?created=${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Could not create the order.');
    } finally {
      setSaving(false);
    }
  }, [
    adminFetch,
    city,
    country,
    customerNotes,
    deductStock,
    district,
    email,
    fullName,
    internalNotes,
    line1,
    line2,
    lines,
    orderDiscount,
    orderStatus,
    paymentMethod,
    paymentStatus,
    phone,
    postalCode,
    router,
    shippingCost,
    tax,
  ]);

  return (
    <div className="pb-16">
      <PageHeader
        title="New order"
        description="Create an invoice for a phone, walk-in or otherwise offline purchase."
        actions={
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
          >
            <ArrowLeft size={15} />
            Back to orders
          </button>
        }
      />

      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <SectionCard title="Customer" icon={<User size={15} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Full name *</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className={labelClass}>Phone *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Shipping address" icon={<MapPin size={15} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Address line 1 *</label>
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className={inputClass}
                  placeholder="House, road, area"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address line 2</label>
                <input
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                  placeholder="Dhaka"
                />
              </div>
              <div>
                <label className={labelClass}>District</label>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={inputClass}
                  placeholder="Dhaka"
                />
              </div>
              <div>
                <label className={labelClass}>Postal code</label>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={inputClass}
                  placeholder="1216"
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={2}
                  className={inputClass}
                  placeholder="BD"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Products" icon={<Package size={15} />}>
            <div ref={searchRef} className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setSearchOpen(true)}
                className={`${inputClass} pl-9`}
                placeholder="Search by product name, SKU or variant…"
              />
              {searching && (
                <Loader2
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-muted"
                />
              )}

              {searchOpen && results.length > 0 && (
                <div className="absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-border-color bg-white shadow-lg">
                  {results.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => addVariant(variant)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border-color/60 px-3 py-2.5 text-left last:border-0 hover:bg-bg-secondary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-text-primary">
                          {variant.product_name}
                        </span>
                        <span className="block truncate text-[11.5px] text-text-muted">
                          {variant.name} · {variant.sku} · {variant.stock_quantity} in stock
                        </span>
                      </span>
                      <span className="shrink-0 text-[12.5px] font-semibold text-text-primary">
                        {money(Number(variant.effective_price || variant.price || 0))}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border-color px-4 py-8 text-center text-[13px] text-text-muted">
                Search above to add the products this customer bought.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {lines.map((line) => (
                  <div
                    key={line.key}
                    className="rounded-xl border border-border-color/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-text-primary">
                          {line.productName}
                        </p>
                        <p className="truncate text-[11.5px] text-text-muted">
                          {line.variantName} · {line.sku}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Remove ${line.productName}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Unit price</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Line discount</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.discount}
                          onChange={(e) => updateLine(line.key, { discount: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-right text-[12px] font-semibold text-text-primary">
                      {money(
                        Math.max(
                          0,
                          (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0) -
                            (Number(line.discount) || 0)
                        )
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Payment and status" icon={<CreditCard size={15} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Payment method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Payment status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Order status</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className={inputClass}
                >
                  {ORDER_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex h-10 items-center gap-2 text-[12.5px] font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={deductStock}
                    onChange={(e) => setDeductStock(e.target.checked)}
                    className="h-4 w-4 rounded border-border-color accent-black"
                  />
                  Take these items out of stock
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Customer notes</label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="min-h-20 w-full rounded-lg border border-border-color bg-white px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-primary"
                  placeholder="Visible on the invoice"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Internal notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="min-h-20 w-full rounded-lg border border-border-color bg-white px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-primary"
                  placeholder="Staff only"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <section className="sticky top-6 rounded-2xl border border-border-color bg-white p-5 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Invoice summary</h2>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Shipping charge</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Order discount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tax</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <dl className="mt-5 space-y-2 border-t border-border-color pt-4 text-[13px]">
              <div className="flex items-center justify-between text-text-secondary">
                <dt>Subtotal</dt>
                <dd>{money(totals.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <dt>Shipping</dt>
                <dd>{money(totals.shipping)}</dd>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <dt>Tax</dt>
                <dd>{money(totals.tax)}</dd>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <dt>Discount</dt>
                <dd>-{money(totals.discount)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border-color pt-3 text-base font-semibold text-text-primary">
                <dt>Total</dt>
                <dd>{money(totals.total)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-text-primary text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Creating order…' : 'Create order'}
            </button>
            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-text-muted">
              The order number and invoice are generated automatically.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
