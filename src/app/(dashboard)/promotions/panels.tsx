'use client';

import { useEffect, useState } from 'react';
import { Trophy, Flame, Info } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand_name: string | null;
  category_name: string | null;
  primary_image: string | null;
  price: string | number | null;
  sale_price: string | number | null;
  compare_at_price: string | number | null;
  sale_ends_at: string | null;
  flash_deal_until?: string | null;
  live_deal_until?: string | null;
  rating_avg: string | number | null;
  rating_count: number | null;
  in_stock: boolean;
}

interface ApiPayload {
  data: Product[];
  meta?: { basis?: 'curated' | 'sales' | 'rating' };
}

function money(value: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `৳ ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function usePromotionPanels() {
  const [best, setBest] = useState<ApiPayload | null>(null);
  const [flash, setFlash] = useState<ApiPayload | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/promotions');
        if (!res.ok) return;
        const json = await res.json();
        setBest(json.bestSellers ?? null);
        setFlash(json.flashDeals ?? null);
      } catch {
        /* leave empty states */
      }
    })();
  }, []);

  return { best, flash };
}

export function FlashDealsPanel() {
  const { flash } = usePromotionPanels();
  const products = flash?.data ?? [];

  return (
    <section className="admin-card overflow-hidden">
      <div className="border-b border-border-color px-6 py-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
          <Flame size={16} className="text-rose-500" />
          This week&apos;s flash deals
        </h2>
        <p className="mt-0.5 text-[12px] text-text-secondary">
          Products currently placed on the homepage flash row. Place or remove them from the Products table.
        </p>
      </div>

      {flash === null ? (
        <div className="px-6 py-14 text-center text-[12.5px] text-text-secondary">Loading…</div>
      ) : products.length === 0 ? (
        <div className="px-6 py-14 text-center text-[12.5px] text-text-secondary">
          Nothing placed yet. Open Products and use the <strong>Flash</strong> button on a product.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border-color bg-bg-secondary/40 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                <th className="p-4 pl-6">Product</th>
                <th className="p-4">Price on card</th>
                <th className="p-4">Was</th>
                <th className="p-4 pr-6">Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/70">
              {products.map((product) => {
                const price = Number(product.sale_price ?? product.price ?? 0);
                const was = Number(product.compare_at_price ?? 0);
                return (
                  <tr key={product.id} className="hover:bg-bg-secondary/40">
                    <td className="p-4 pl-6">
                      <p className="text-[13px] font-semibold text-text-primary">{product.name}</p>
                      <p className="text-[11.5px] text-text-secondary">{product.brand_name}</p>
                    </td>
                    <td className="p-4 text-[12.5px] font-semibold text-text-primary">{money(price)}</td>
                    <td className="p-4 text-[12.5px] text-text-secondary line-through">{money(was || null)}</td>
                    <td className="p-4 pr-6 text-[12.5px] text-text-secondary">
                      {formatDate(product.flash_deal_until ?? product.sale_ends_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function BestSellersPanel() {
  const { best } = usePromotionPanels();
  const basis = best?.meta?.basis ?? 'sales';
  const products = best?.data ?? [];

  return (
    <section className="admin-card overflow-hidden">
      <div className="border-b border-border-color px-6 py-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
          <Trophy size={16} className="text-accent-primary" />
          Best sellers
        </h2>
        <p className="mt-0.5 text-[12px] text-text-secondary">
          {basis === 'curated'
            ? 'Manually selected from the Products table.'
            : basis === 'sales'
              ? 'Ranked by units sold in the last 30 days.'
              : 'No manual picks and no sales yet — showing top rated products.'}
        </p>
      </div>

      {basis === 'rating' ? (
        <div className="flex items-start gap-2 border-b border-border-color bg-amber-50 px-6 py-3 text-[11.5px] text-amber-900">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            The storefront labels this &ldquo;Top rated products&rdquo; until you pick best sellers or real sales
            exist.
          </span>
        </div>
      ) : null}

      {best === null ? (
        <div className="px-6 py-14 text-center text-[12.5px] text-text-secondary">Loading…</div>
      ) : products.length === 0 ? (
        <div className="px-6 py-14 text-center text-[12.5px] text-text-secondary">
          No products to rank yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border-color bg-bg-secondary/40 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                <th className="p-4 pl-6">#</th>
                <th className="p-4">Product</th>
                <th className="p-4">Price</th>
                <th className="p-4">Rating</th>
                <th className="p-4 pr-6">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/70">
              {products.map((product, index) => (
                <tr key={product.id} className="hover:bg-bg-secondary/40">
                  <td className="p-4 pl-6 text-[12px] font-semibold text-text-muted">{index + 1}</td>
                  <td className="p-4">
                    <p className="text-[13px] font-semibold text-text-primary">{product.name}</p>
                    <p className="text-[11.5px] text-text-secondary">
                      {[product.brand_name, product.category_name].filter(Boolean).join(' · ')}
                    </p>
                  </td>
                  <td className="p-4 text-[12.5px] font-semibold text-text-primary">{money(product.price)}</td>
                  <td className="p-4 text-[12.5px] text-text-secondary">
                    {product.rating_avg
                      ? `${Number(product.rating_avg).toFixed(1)} (${product.rating_count ?? 0})`
                      : '—'}
                  </td>
                  <td className="p-4 pr-6 text-[12.5px]">
                    <span className={product.in_stock ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
                      {product.in_stock ? 'In stock' : 'Out of stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
