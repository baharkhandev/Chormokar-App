'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { Banner, BannerType } from '../../../shared/banners/types';
import { mediaUrl } from '../../../shared/lib/media';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface BannerModalProps {
  banner: Banner | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (banner: Banner) => void;
  /** Preset for a brand new banner (ignored when editing). */
  initialType?: BannerType;
  initialPosition?: number;
  /** Lock the display order (used when filling a fixed side-tile slot). */
  lockPosition?: boolean;
}

export function BannerModal({
  banner,
  isOpen,
  onClose,
  onSaved,
  initialType = 'hero_slide',
  initialPosition = 0,
  lockPosition = false,
}: BannerModalProps) {
  const isEdit = Boolean(banner);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bannerLink, setBannerLink] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [bannerType, setBannerType] = useState<BannerType>('hero_slide');
  const [position, setPosition] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(6);
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adminFetch = useAdminFetch();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (banner) {
      setBannerLink(banner.banner_link || banner.cta_href || '');
      setImageAlt(banner.image_alt || banner.title || '');
      setBannerType(banner.banner_type || initialType);
      setPosition(banner.position || 0);
      setDurationSeconds(banner.duration_seconds ?? 6);
      setEndsAt(toDateTimeLocal(banner.ends_at));
      setIsActive(banner.is_active !== undefined ? banner.is_active : true);
      setPreviewUrl(mediaUrl(banner.image_url || banner.image) || null);
      setSelectedFile(null);
    } else {
      setBannerLink('');
      setImageAlt('');
      setBannerType(initialType);
      setPosition(initialPosition);
      setDurationSeconds(6);
      setEndsAt('');
      setIsActive(true);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
    setError(null);
  }, [banner, isOpen, initialType, initialPosition]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError(null);

    if (!imageAlt && file.name) {
      // Auto-suggest description if empty
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setImageAlt(nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && !selectedFile) {
      setError('Please upload an image for the hero banner.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      const trimmedLink = bannerLink.trim();
      const href = bannerType === 'hero_tile' && trimmedLink === '/' ? '' : trimmedLink;
      const altText = imageAlt.trim();

      formData.append('title', altText || 'Hero Banner');
      formData.append('subtitle', '');
      formData.append('eyebrow', '');
      formData.append('cta_label', '');
      formData.append('cta_href', href);
      formData.append('banner_link', href);
      formData.append('image_alt', altText);
      formData.append('banner_type', bannerType);
      formData.append('show_text_overlay', 'false');
      formData.append('position', String(position || 0));
      formData.append('duration_seconds', String(Math.min(60, Math.max(2, durationSeconds || 6))));
      formData.append('ends_at', endsAt ? new Date(endsAt).toISOString() : '');
      formData.append('is_active', String(isActive));

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const url = isEdit ? `/api/banners/${banner!.id}` : '/api/banners';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await adminFetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.detail || `Server responded with ${res.status}`);
      }

      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save banner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-border-color w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative z-10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-color bg-bg-secondary/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {bannerType === 'hero_tile'
                  ? isEdit
                    ? 'Edit Side Promo Tile'
                    : 'Add Side Promo Tile'
                  : bannerType === 'deals_hero'
                    ? isEdit
                      ? 'Edit Deals Banner'
                      : 'Add Deals Banner'
                    : isEdit
                      ? 'Edit Hero Slide'
                      : 'Add Hero Slide'}
              </h2>
              <p className="text-xs text-text-secondary">
                {bannerType === 'hero_tile'
                  ? 'Upload the tile artwork and choose where the user redirects when clicked.'
                  : isEdit
                    ? 'Update slide image and destination link.'
                    : 'Upload a banner image and configure where someone redirects when clicked.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
              {bannerType === 'hero_tile' ? 'Tile Image' : 'Banner Image'}{' '}
              {!isEdit && <span className="text-danger">*</span>}
            </label>

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-border-color bg-black/5 group aspect-[2/1] max-h-56">
                <img
                  src={previewUrl}
                  alt="Banner preview"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white text-text-primary font-semibold text-xs hover:bg-white/90 flex items-center gap-1.5 transition-transform hover:scale-105"
                  >
                    <Upload size={14} /> Change Image
                  </button>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(mediaUrl(banner?.image_url || banner?.image) || null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-danger text-white font-semibold text-xs hover:bg-danger/90 flex items-center gap-1.5 transition-transform hover:scale-105"
                    >
                      <X size={14} /> Revert
                    </button>
                  )}
                </div>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)` : 'Current Image'}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-color hover:border-accent-primary/50 bg-black/[0.02] hover:bg-accent-primary/[0.02] rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-border-color flex items-center justify-center text-text-secondary group-hover:text-accent-primary group-hover:border-accent-primary/40 transition-all group-hover:scale-110">
                  <Upload size={22} />
                </div>
                <p className="text-sm font-bold text-text-primary">
                  Click to upload image
                </p>
                <p className="text-xs text-text-secondary">
                  Supports JPG, PNG, WEBP, AVIF (Max 10MB)
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Banner Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Banner Link
            </label>
            <div className="relative">
              <input
                type="text"
                value={bannerLink}
                onChange={(e) => setBannerLink(e.target.value)}
                placeholder="/c/laptops or https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-border-color focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none text-sm transition-all pr-10"
              />
              <ExternalLink size={14} className="absolute right-3.5 top-3.5 text-text-muted pointer-events-none" />
            </div>
            <p className="mt-1.5 text-[11px] text-text-muted">
              Where the user should be redirected when they click on the banner image (e.g. <code className="font-mono text-[10.5px]">/c/graphics-cards</code>, <code className="font-mono text-[10.5px]">/deals</code>, or a full URL). Leave empty if not clickable.
            </p>
          </div>

          {/* Image Alt Text & Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Image Alt Text / Label
            </label>
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="e.g. GeForce RTX 5090 Launch Banner"
              className="w-full px-4 py-2.5 rounded-xl border border-border-color focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none text-sm transition-all"
            />
            <p className="mt-1.5 text-[11px] text-text-muted">
              Used for SEO, screen readers, and identifying this slide in the admin panel.
            </p>
          </div>

          {/* Position & Slide Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                {bannerType === 'hero_tile' ? 'Slot' : 'Display Order'}
              </label>
              <input
                type="number"
                min={0}
                max={bannerType === 'hero_tile' ? 1 : undefined}
                disabled={lockPosition}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value) || 0)}
                className={clsx(
                  'w-full px-4 py-2.5 rounded-xl border border-border-color outline-none text-sm transition-all',
                  lockPosition
                    ? 'bg-bg-secondary text-text-secondary cursor-not-allowed'
                    : 'focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                )}
              />
              {lockPosition ? (
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Locked to slot {position + 1} of 2.
                </p>
              ) : bannerType === 'hero_tile' ? (
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Side tiles have two slots (1 and 2). Each slot holds one tile.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Slides with lower numbers appear earlier in the rotation.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Slide Duration (seconds)
              </label>
              <input
                type="number"
                min={2}
                max={60}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value) || 6)}
                className="w-full px-4 py-2.5 rounded-xl border border-border-color outline-none text-sm transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              />
              <p className="mt-1.5 text-[11px] text-text-muted">
                How long this slide stays before rotating to the next (2–60s).
              </p>
            </div>
          </div>

          {bannerType === 'deals_hero' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Sale Ends At
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border-color focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none text-sm transition-all"
              />
              <p className="mt-1.5 text-[11px] text-text-muted">
                Drives the countdown on the deals hero. Leave empty to use the nearest coupon expiry.
              </p>
            </div>
          ) : null}

          {/* Status Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] border border-border-color">
            <div>
              <p className="text-sm font-bold text-text-primary">Active on Storefront</p>
              <p className="text-xs text-text-secondary">
                When enabled, this banner is immediately visible to visitors on Chormokar
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={clsx(
                'w-12 h-6 rounded-full transition-colors relative cursor-pointer',
                isActive ? 'bg-accent-primary' : 'bg-gray-300'
              )}
            >
              <div
                className={clsx(
                  'w-5 h-5 rounded-full bg-[#fff] transition-transform absolute top-0.5 left-0.5',
                  isActive ? 'translate-x-6' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent-primary hover:bg-accent-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>{isEdit ? 'Update Banner' : 'Upload & Save Banner'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

