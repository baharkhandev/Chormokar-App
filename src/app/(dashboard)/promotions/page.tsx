'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Clock3,
  Sparkles,
  Pencil,
  ExternalLink,
  Trash2,
  Ticket,
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import clsx from 'clsx';
import { PageHeader } from '../../../components';
import { BannerModal } from '../hero-slides/BannerModal';
import type { Banner } from '../../../shared/banners/types';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { revalidateStorefront } from '../../../shared/api/revalidateStorefront';
import { FlashDealsPanel, BestSellersPanel } from './panels';

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000';

interface SaleProduct {
  id: string;
  name: string;
  slug: string;
  brand_name: string | null;
  category_name: string | null;
  price: string | number | null;
  sale_price: string | number | null;
  compare_at_price: string | number | null;
  primary_image: string | null;
  in_stock: boolean;
}

function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `৳ ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function discountPercent(product: SaleProduct): number {
  const price = Number(product.sale_price ?? product.price ?? 0);
  const compare = Number(product.compare_at_price ?? 0);
  if (!compare || !price || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

export default function DealsPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [activeTab, setActiveTab] = useState<'live' | 'flash' | 'best'>('live');
  const [dealsBanners, setDealsBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [couponCount, setCouponCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bannerRes, productsRes, couponsRes] = await Promise.all([
        adminFetch('/api/banners?banner_type=deals_hero&page_size=10'),
        adminFetch('/api/deals?page_size=60'),
        adminFetch('/api/coupons?page_size=100'),
      ]);

      if (bannerRes.ok) {
        const json = await bannerRes.json();
        const list: Banner[] = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.results)
              ? json.results
              : [];
        setDealsBanners(list);
      }

      if (productsRes.ok) {
        const json = await productsRes.json();
        const list: SaleProduct[] = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.results)
              ? json.results
              : [];
        setProducts(list);
      }

      if (couponsRes.ok) {
        const json = await couponsRes.json();
        const list: unknown[] = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.results)
              ? json.results
              : [];
        setCouponCount(list.length);
      }
    } catch (e) {
      console.error('Failed to load deals data', e);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus === 'authenticated') void load();
  }, [authStatus, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (stockFilter === 'in_stock' && !product.in_stock) return false;
      if (stockFilter === 'out_of_stock' && product.in_stock) return false;
      if (term) {
        const haystack = `${product.name} ${product.brand_name ?? ''} ${product.category_name ?? ''}`
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [products, search, stockFilter]);

  const stats = useMemo(
    () => [
      {
        label: 'Deals banners',
        value: dealsBanners.length > 0 ? dealsBanners.length : 'Not set',
        icon: Sparkles,
        tone: 'text-accent-primary bg-accent-primary/10',
      },
      {
        label: 'Live deals',
        value: products.length,
        icon: CheckCircle2,
        tone: 'text-accent-primary bg-accent-primary/10',
      },
      {
        label: 'Coupons',
        value: couponCount,
        icon: Ticket,
        tone: 'text-accent-primary bg-accent-primary/10',
      },
    ],
    [dealsBanners.length, products.length, couponCount]
  );

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Promotions"
        description="Curate the storefront: live deals, this week's flash deals, and best sellers."
      />

      <div className="mb-6 flex items-center gap-1 rounded-xl border border-border-color bg-white p-1">
        {[
          ['live', 'Live deals'],
          ['flash', "This week's flash deals"],
          ['best', 'Best sellers'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as 'live' | 'flash' | 'best')}
            className={clsx(
              'rounded-lg px-4 py-2 text-[12.5px] font-semibold transition-colors',
              activeTab === key
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'live' ? (
      <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
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

      {/* Deals page banner */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border-color bg-white">
        <div className="flex flex-col gap-3 border-b border-border-color p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="px-1">
            <h2 className="text-[15px] font-semibold text-text-primary">Deals page banners</h2>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              The hero at the top of the storefront /deals page. Add as many as you like — one shows as-is,
              several rotate like the homepage hero.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingBanner(null);
              setIsBannerModalOpen(true);
            }}
            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
          >
            <Plus size={14} />
            Add banner
          </button>
        </div>

        {dealsBanners.length > 0 ? (
          <ul className="divide-y divide-border-color">
            {dealsBanners.map((banner, index) => (
              <li key={banner.id} className="flex items-center gap-4 p-4">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt=""
                    className="h-16 w-28 shrink-0 rounded-lg border border-border-color object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-text-muted">
                    <Sparkles size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                      Slide {index + 1}
                    </span>
                    {!banner.is_active ? (
                      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Hidden
                      </span>
                    ) : null}
                  </div>
                  {banner.eyebrow ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-accent-primary">
                      {banner.eyebrow}
                    </p>
                  ) : null}
                  <p className="truncate text-[14px] font-semibold text-text-primary">
                    {banner.title || 'Untitled banner'}
                  </p>
                  {banner.subtitle ? (
                    <p className="truncate text-[12px] text-text-secondary">{banner.subtitle}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBanner(banner);
                      setIsBannerModalOpen(true);
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-color bg-white px-2.5 text-[11.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(banner)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-color bg-white text-text-secondary transition-colors hover:border-rose-300 hover:text-rose-600"
                    aria-label={`Delete ${banner.title || 'banner'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
              <Sparkles size={22} />
            </div>
            <p className="text-[15px] font-semibold text-text-primary">No deals banner yet</p>
            <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-secondary">
              The storefront uses its built-in default until you add a banner here.
            </p>
          </div>
        )}
      </section>

      {/* Live deals */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border-color bg-white">
        <div className="flex flex-col gap-3 border-b border-border-color p-3 md:flex-row md:items-center md:justify-between">
          <div className="px-2">
            <h2 className="text-[15px] font-semibold text-text-primary">Live deals</h2>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              Products placed in the storefront live deals. Use the Live button on the Products table to add or remove them.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1">
              {([
                ['all', 'All'],
                ['in_stock', 'In stock'],
                ['out_of_stock', 'Out of stock'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStockFilter(key)}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
                    stockFilter === key
                      ? 'bg-accent-primary text-white'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-color bg-white text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              <tr>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Deal price</th>
                <th className="px-6 py-3.5">Compare at</th>
                <th className="px-6 py-3.5">Discount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-[12.5px] text-text-secondary">
                    Loading deals…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-text-muted">
                        <Tag size={22} />
                      </div>
                      <p className="text-[15px] font-semibold text-text-primary">
                        {products.length === 0 ? 'No live deals yet' : 'No matching products'}
                      </p>
                      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-secondary">
                        {products.length === 0
                          ? 'Use the Live button on the Products table to place a product here.'
                          : 'Try a different search or filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const percent = discountPercent(product);
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-bg-secondary/40">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {product.primary_image ? (
                            <img
                              src={product.primary_image}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg border border-border-color object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-text-muted">
                              <Tag size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-text-primary">
                              {product.name}
                            </p>
                            <p className="truncate text-[11.5px] text-text-secondary">
                              {[product.brand_name, product.category_name].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] font-semibold text-text-primary">
                        {formatPrice(product.sale_price ?? product.price)}
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] text-text-secondary line-through">
                        {formatPrice(product.compare_at_price)}
                      </td>
                      <td className="px-6 py-3.5 text-[12.5px] text-text-secondary">
                        {percent > 0 ? `-${percent}%` : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                            product.in_stock
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-bg-secondary text-text-secondary'
                          )}
                        >
                          {product.in_stock ? 'In stock' : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <a
                          href={`${STOREFRONT_URL}/en/p/${product.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-accent-primary"
                        >
                          View
                          <ExternalLink size={13} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      </>
      ) : activeTab === 'flash' ? (
        <FlashDealsPanel />
      ) : (
        <BestSellersPanel />
      )}

      {isBannerModalOpen && mounted && createPortal(
        <BannerModal
          banner={editingBanner}
          isOpen={isBannerModalOpen}
          initialType="deals_hero"
          onClose={() => setIsBannerModalOpen(false)}
          onSaved={(saved) => {
            setDealsBanners((prev) => {
              const exists = prev.some((item) => item.id === saved.id);
              return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved];
            });
            setIsBannerModalOpen(false);
            void revalidateStorefront(['/en/deals', '/en'], ['banners']);
            showNotice(editingBanner ? 'Deals banner updated.' : 'Deals banner added.');
          }}
        />,
        document.body
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete deals banner?"
        message={
          <>
            This removes <strong className="font-semibold text-foreground">{deleteTarget?.title || 'this banner'}</strong>{' '}
            from the storefront deals page. This cannot be undone.
          </>
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          void (async () => {
            const res = await adminFetch(`/api/banners/${target.id}`, { method: 'DELETE' });
            if (!res.ok) {
              showNotice('Could not delete the banner.');
              return;
            }
            setDealsBanners((prev) => prev.filter((item) => item.id !== target.id));
            void revalidateStorefront(['/en/deals', '/en'], ['banners']);
            showNotice('Deals banner deleted.');
          })();
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-black/10 bg-text-primary px-4 py-3 text-[12.5px] font-medium text-white">
          <Clock3 size={16} className="shrink-0 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
