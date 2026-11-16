import { mediaUrl } from '../../../../shared/lib/media';
import { useState } from 'react';
import Link from 'next/link';
import { Edit2, Trash2, Package, Flame, Tag, Star, Trophy } from 'lucide-react';
import { PlacementModal } from './PlacementModal';
import { StatusBadge } from '../../../../components/StatusBadge';
import { EmptyState } from '../../../../components/EmptyState';
import type { ProductItem } from '../../../../shared/products/storage';

export type { ProductItem };

export interface ProductsTableProps {
  products: ProductItem[];
  onEdit?: (product: ProductItem) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

function isLive(until: string | null | undefined): boolean {
  if (!until) return false;
  const time = new Date(until).getTime();
  return Number.isFinite(time) && time > Date.now();
}

function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) {
    return raw.startsWith('blob:') ? raw : mediaUrl(raw);
  }
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace('/api/v1', '');
  return `${backendBase}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export function ProductsTable({ products, onDelete, onRefresh }: ProductsTableProps) {
  const [placement, setPlacement] = useState<{ product: ProductItem; section: 'live' | 'flash' } | null>(
    null
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleFlag = async (
    product: ProductItem,
    field: 'is_featured' | 'is_best_seller'
  ) => {
    setTogglingId(`${product.id}:${field}`);
    try {
      await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !product[field] }),
      });
      onRefresh?.();
    } finally {
      setTogglingId(null);
    }
  };

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        message="No products match your criteria. Add your first product to get started!"
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto admin-card">
      <table className="w-full border-collapse text-left">
        <thead className="bg-bg-secondary/40">
          <tr>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Product
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Category
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Price
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Stock
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Status
            </th>
            <th className="px-4 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Placements
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color/70">
          {products.map((product) => {
            const displayPrice = product.price ? Number(product.price) : 0;
            const formattedPrice = isNaN(displayPrice)
              ? product.price
              : displayPrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
            const dealerPrice =
              product.cost_price !== undefined && product.cost_price !== ''
                ? Number(product.cost_price)
                : null;
            const profit =
              dealerPrice !== null && !isNaN(dealerPrice)
                ? displayPrice - dealerPrice
                : null;
            const marginPercent =
              profit !== null && dealerPrice !== null && dealerPrice > 0
                ? (profit / dealerPrice) * 100
                : null;
            const plain = (value: number) =>
              value.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            const rawThumb =
              product.images && product.images.length > 0
                ? product.images[0]
                : null;
            const thumb = resolveImageUrl(rawThumb);

            return (
              <tr
                key={product.id}
                className="transition-colors duration-200 hover:bg-bg-secondary/40"
              >
                <td className="px-6 py-4 text-[0.95rem] text-text-primary font-semibold">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-black/[0.03] flex items-center justify-center">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package size={18} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <Link
                        href={`/products/${product.id}`}
                        className="hover:text-accent-primary transition-colors hover:underline font-semibold leading-snug line-clamp-1"
                      >
                        {product.name}
                      </Link>
                      {product.brand && (
                        <span className="text-xs text-text-muted font-normal">
                          {product.brand}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-[0.95rem] text-text-secondary capitalize">
                  {product.category}
                </td>
                <td className="px-6 py-4 text-[0.95rem] text-text-secondary font-medium tabular-nums">
                  <div>{formattedPrice}</div>
                  {profit !== null && dealerPrice !== null && (
                    <>
                      <div className="mt-0.5 text-[11.5px] font-normal text-text-muted">
                        {plain(dealerPrice)}
                      </div>
                      <div
                        className={`text-[11.5px] font-normal ${
                          profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {profit >= 0 ? '+' : ''}
                        {plain(profit)} (
                        {marginPercent !== null ? `${marginPercent.toFixed(1)}%` : '0.0%'})
                      </div>
                    </>
                  )}
                </td>
                <td className="px-6 py-4 text-[0.95rem] text-text-secondary">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      product.stock === '0' || product.stock === 'Out of Stock'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-[0.95rem]">
                  <StatusBadge status={product.status} size="sm" />
                </td>
                <td className="px-4 py-4">
                  <div className="grid w-[164px] grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={togglingId === `${product.id}:is_featured`}
                      onClick={() => void toggleFlag(product, 'is_featured')}
                      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                        product.is_featured
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-border-color bg-white text-text-secondary hover:bg-bg-secondary'
                      }`}
                      title="Featured on the homepage"
                    >
                      <Star size={13} />
                      Featured
                    </button>
                    <button
                      type="button"
                      disabled={togglingId === `${product.id}:is_best_seller`}
                      onClick={() => void toggleFlag(product, 'is_best_seller')}
                      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                        product.is_best_seller
                          ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                          : 'border-border-color bg-white text-text-secondary hover:bg-bg-secondary'
                      }`}
                      title="Show in Best sellers"
                    >
                      <Trophy size={13} />
                      Best
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacement({ product, section: 'flash' })}
                      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors ${
                        isLive(product.flash_deal_until)
                          ? 'border-rose-200 bg-rose-50 text-rose-600'
                          : 'border-border-color bg-white text-text-secondary hover:bg-bg-secondary'
                      }`}
                      title="This week's flash deals"
                    >
                      <Flame size={13} />
                      Flash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacement({ product, section: 'live' })}
                      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors ${
                        isLive(product.live_deal_until)
                          ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                          : 'border-border-color bg-white text-text-secondary hover:bg-bg-secondary'
                      }`}
                      title="Live deals page"
                    >
                      <Tag size={13} />
                      Live
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-[0.95rem] text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="p-2 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-all cursor-pointer"
                      title="Edit product"
                    >
                      <Edit2 size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(product.id)}
                      className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all cursor-pointer"
                      title="Delete product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {placement ? (
        <PlacementModal
          key={`${placement.product.id}-${placement.section}`}
          product={placement.product}
          section={placement.section}
          isOpen
          onClose={() => setPlacement(null)}
          onSaved={() => {
            setPlacement(null);
            onRefresh?.();
          }}
        />
      ) : null}
    </div>
  );
}
