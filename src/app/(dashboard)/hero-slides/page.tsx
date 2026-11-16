'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  RotateCw, 
  Image as ImageIcon, 
  Sliders, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  Search, 
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import type { Banner, BannerType } from '../../../shared/banners/types';
import { mediaUrl } from '../../../shared/lib/media';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { revalidateStorefront } from '../../../shared/api/revalidateStorefront';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { BannerModal } from './BannerModal';
import { DeleteBannerModal } from './DeleteBannerModal';

export default function HeroSlidesPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState<'all' | BannerType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [selectedForEdit, setSelectedForEdit] = useState<Banner | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ type: BannerType; position: number } | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Banner | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/api/banners?page_size=100');
      if (!res.ok) {
        throw new Error(`Failed to fetch banners (${res.status})`);
      }
      const data = await res.json();
      const list: Banner[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setBanners(list);
    } catch (err: any) {
      setError(err?.message || 'Error loading banners');
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchBanners();
    }
  }, [authStatus, fetchBanners]);

  // Quick toggle active status
  const handleToggleActive = async (banner: Banner) => {
    setTogglingId(banner.id);
    try {
      const newStatus = !banner.is_active;
      const res = await adminFetch(`/api/banners/${banner.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (res.ok) {
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, is_active: newStatus } : b))
        );
        void revalidateStorefront(['/']);
      }
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // Filtered banners
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      if (typeFilter !== 'all' && b.banner_type !== typeFilter) return false;
      if (statusFilter === 'active' && !b.is_active) return false;
      if (statusFilter === 'inactive' && b.is_active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = b.title?.toLowerCase().includes(q);
        const matchesAlt = b.image_alt?.toLowerCase().includes(q);
        const matchesLink = (b.banner_link || b.cta_href)?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAlt && !matchesLink) return false;
      }
      return true;
    });
  }, [banners, typeFilter, statusFilter, searchQuery]);

  // Hero slides (unlimited) and the two fixed side-tile slots
  const slides = useMemo(
    () => filteredBanners.filter((b) => b.banner_type === 'hero_slide'),
    [filteredBanners]
  );

  // Slot occupancy always reflects the real catalogue, not the filters
  const tiles = useMemo(
    () => banners.filter((b) => b.banner_type === 'hero_tile'),
    [banners]
  );

  const showSlides = typeFilter === 'all' || typeFilter === 'hero_slide';
  const showTiles = typeFilter === 'all' || typeFilter === 'hero_tile';

  // Metrics
  const stats = useMemo(() => {
    const total = banners.length;
    const slides = banners.filter((b) => b.banner_type === 'hero_slide');
    const activeSlides = slides.filter((b) => b.is_active).length;
    const tiles = banners.filter((b) => b.banner_type === 'hero_tile');
    const activeTiles = tiles.filter((b) => b.is_active).length;
    return {
      total,
      slidesCount: slides.length,
      activeSlides,
      tilesCount: tiles.length,
      activeTiles,
    };
  }, [banners]);

  const openAddModal = (type: BannerType, position: number) => {
    setAddTarget({ type, position });
    setIsAddModalOpen(true);
  };

  const renderBannerCard = (banner: Banner) => {
          const isSlide = banner.banner_type === 'hero_slide';
          const imageUrl = mediaUrl(banner.image_url || banner.image);
          const link = banner.banner_link || banner.cta_href || '';

          return (
            <div
              key={banner.id}
              className={clsx(
                'bg-white rounded-2xl border overflow-hidden transition-all flex flex-col group',
                banner.is_active ? 'border-border-color' : 'border-border-color/60 opacity-80'
              )}
            >
              {/* Image Showcase */}
              <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border-color bg-bg-secondary">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={banner.image_alt || banner.title || 'Banner Image'}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <ImageIcon size={32} />
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="rounded-md border border-black/5 bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-primary backdrop-blur-md">
                    {isSlide ? 'Hero slide' : 'Promo tile'}
                  </span>
                  <span className="rounded-md border border-black/5 bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-text-secondary backdrop-blur-md">
                    #{banner.position}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner)}
                    disabled={togglingId === banner.id}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-semibold backdrop-blur-md transition-colors',
                      banner.is_active
                        ? 'border-emerald-600/20 bg-white/95 text-emerald-700 hover:bg-emerald-50'
                        : 'border-black/5 bg-white/95 text-text-secondary hover:bg-bg-secondary'
                    )}
                  >
                    {banner.is_active ? (
                      <>
                        <Eye size={12} /> Active
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} /> Inactive
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Banner Content Card Body */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 line-clamp-1 text-[15px] font-semibold leading-snug text-text-primary">
                  {banner.image_alt || banner.title || (isSlide ? `Hero Slide #${banner.position}` : `Promo Tile #${banner.position + 1}`)}
                </h3>

                <div className="mt-auto flex items-center justify-between border-t border-border-color pt-3 text-[11.5px] text-text-secondary">
                  <div className="flex items-center gap-1.5 truncate max-w-[180px]" title={link || 'No redirect link'}>
                    <ExternalLink size={12} className="shrink-0 text-text-muted" />
                    <span className="truncate font-mono">{link || 'No link'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={banner.is_active}
                      aria-label={`${banner.is_active ? 'Deactivate' : 'Activate'} ${banner.title}`}
                      onClick={() => handleToggleActive(banner)}
                      disabled={togglingId === banner.id}
                      className={clsx(
                        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
                        banner.is_active ? 'bg-emerald-500' : 'bg-bg-secondary'
                      )}
                      title={banner.is_active ? 'Deactivate banner' : 'Activate banner'}
                    >
                      <span
                        className={clsx(
                          'absolute h-4 w-4 rounded-full bg-[#fff] transition-all',
                          banner.is_active ? 'left-[18px]' : 'left-0.5'
                        )}
                      />
                    </button>
                    <span
                      className={clsx(
                        'text-[11px] font-semibold',
                        banner.is_active ? 'text-emerald-700' : 'text-text-secondary'
                      )}
                    >
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedForEdit(banner)}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-accent-primary hover:bg-accent-primary/5 transition-colors cursor-pointer"
                      title="Edit banner"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedForDelete(banner)}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors cursor-pointer"
                      title="Delete banner"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-text-primary">
            Hero Banners
          </h1>
          <p className="mt-1 text-sm text-text-secondary max-w-xl">
            Upload images, configure links, and organize the hero carousel and promo tiles on the storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchBanners()}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-color bg-white text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
            title="Refresh banners"
          >
            <RotateCw size={16} className={clsx(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Total Banners
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">
              {stats.total}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <Sliders size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Hero Slides
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-text-primary">
                {stats.activeSlides}
              </span>
              <span className="text-xs font-medium text-text-muted">
                / {stats.slidesCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <ImageIcon size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Side Promo Tiles
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-text-primary">
                {stats.activeTiles}
              </span>
              <span className="text-xs font-medium text-text-muted">
                / {stats.tilesCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Filters & View Switch */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-border-color bg-white p-3 md:flex-row md:items-center">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={clsx(
              'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors whitespace-nowrap',
              typeFilter === 'all'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-black/5'
            )}
          >
            All Placements ({banners.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('hero_slide')}
            className={clsx(
              'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors whitespace-nowrap',
              typeFilter === 'hero_slide'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-black/5'
            )}
          >
            Slider Slides ({stats.slidesCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('hero_tile')}
            className={clsx(
              'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors whitespace-nowrap',
              typeFilter === 'hero_tile'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-black/5'
            )}
          >
            Side Promo Tiles ({stats.tilesCount})
          </button>
        </div>

        {/* Search & Status Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-60">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-border-color bg-white px-3 text-[12.5px] font-medium text-text-primary outline-none cursor-pointer focus:border-accent-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <div className="flex items-center rounded-lg border border-border-color bg-bg-secondary p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={clsx(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={clsx(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'table'
                  ? 'bg-white text-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border-color overflow-hidden p-4 animate-pulse space-y-4">
              <div className="aspect-[2/1] bg-bg-secondary rounded-xl" />
              <div className="h-4 bg-bg-secondary rounded w-3/4" />
              <div className="h-3 bg-bg-secondary/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-color bg-white px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-text-muted">
            <ImageIcon size={22} />
          </div>
          <h3 className="text-[15px] font-semibold text-text-primary">
            {banners.length === 0 ? 'No hero banners yet' : 'No matching banners'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-text-secondary">
            {banners.length === 0
              ? 'Upload your first hero slider image or promotional tile to populate the storefront.'
              : 'Try clearing your search query or filters to see all uploaded hero banners.'}
          </p>
          <button
            type="button"
            onClick={() => openAddModal('hero_slide', 0)}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
          >
            <Plus size={16} />
            Upload hero image
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="flex flex-col gap-8">
          {/* Hero slides — unlimited */}
          {showSlides && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-[13px] font-semibold text-text-primary">Hero slides</h2>
                <span className="rounded-md bg-bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                  {slides.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slides.map(renderBannerCard)}
                <button
                  type="button"
                  onClick={() => openAddModal('hero_slide', slides.length)}
                  className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-color bg-white/50 p-6 text-center transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
                    <Plus size={20} />
                  </span>
                  <span className="text-[13px] font-semibold text-text-primary">Add a slide</span>
                  <span className="text-[12px] text-text-secondary">
                    Add as many slides as you need — they rotate in the hero carousel.
                  </span>
                </button>
              </div>
            </section>
          )}

          {/* Side promo tiles — two fixed slots */}
          {showTiles && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-[13px] font-semibold text-text-primary">Side promo tiles</h2>
                <span className="rounded-md bg-bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                  {tiles.length} / 2
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1].map((slot) => {
                  const tile = tiles.find((t) => t.position === slot);
                  if (tile) return renderBannerCard(tile);

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => openAddModal('hero_tile', slot)}
                      className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-color bg-white/50 p-6 text-center transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/5"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
                        <Plus size={20} />
                      </span>
                      <span className="text-[13px] font-semibold text-text-primary">Slot {slot + 1} is empty</span>
                      <span className="text-[12px] text-text-secondary">
                        Click to fill this spot with a promo tile. Two slots, one tile each.
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-border-color overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-color bg-white text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                <tr>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Banner / Alt Text</th>
                  <th className="px-6 py-4">Slot</th>
                  <th className="px-6 py-4">Banner Link</th>
                  <th className="px-6 py-4 text-center">Order</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredBanners.map((banner) => {
                  const isSlide = banner.banner_type === 'hero_slide';
                  const imageUrl = mediaUrl(banner.image_url || banner.image);
                  const link = banner.banner_link || banner.cta_href || '';

                  return (
                    <tr key={banner.id} className="transition-colors hover:bg-bg-secondary/40">
                      <td className="px-6 py-4">
                        <div className="w-20 h-12 rounded-xl overflow-hidden border border-border-color bg-black/5 shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={banner.image_alt || banner.title || 'Banner'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted">
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary text-sm">
                          {banner.image_alt || banner.title || (isSlide ? `Hero Slide #${banner.position}` : `Promo Tile #${banner.position + 1}`)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            isSlide
                              ? 'bg-brand/10 text-brand'
                              : 'bg-bg-secondary text-text-secondary'
                          )}
                        >
                          {isSlide ? 'Hero Slide' : 'Promo Tile'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-text-secondary">{link || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-xs text-text-primary">
                        {banner.position}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(banner)}
                          disabled={togglingId === banner.id}
                          className={clsx(
                            'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                            banner.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                              : 'bg-bg-secondary text-text-secondary hover:bg-black/5'
                          )}
                        >
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedForEdit(banner)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-accent-primary hover:bg-accent-primary/5 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedForDelete(banner)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors cursor-pointer"
                            title="Delete"
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
          </div>
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {(isAddModalOpen || selectedForEdit) && (
        <BannerModal
          banner={selectedForEdit}
          isOpen={isAddModalOpen || Boolean(selectedForEdit)}
          initialType={addTarget?.type ?? 'hero_slide'}
          initialPosition={addTarget?.position ?? 0}
          lockPosition={
            addTarget?.type === 'hero_tile' || selectedForEdit?.banner_type === 'hero_tile'
          }
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedForEdit(null);
            setAddTarget(null);
          }}
          onSaved={(saved) => {
            setBanners((prev) => {
              const exists = prev.some((b) => b.id === saved.id);
              if (exists) {
                return prev.map((b) => (b.id === saved.id ? saved : b));
              }
              return [saved, ...prev];
            });
            void revalidateStorefront(['/']);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {selectedForDelete && (
        <DeleteBannerModal
          banner={selectedForDelete}
          isOpen={Boolean(selectedForDelete)}
          onClose={() => setSelectedForDelete(null)}
          onDeleted={(id) => {
            setBanners((prev) => prev.filter((b) => b.id !== id));
            void revalidateStorefront(['/']);
          }}
        />
      )}
    </div>
  );
}
