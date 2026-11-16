'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';
import type { Banner } from '../../../shared/banners/types';
import { mediaUrl } from '../../../shared/lib/media';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';

interface DeleteBannerModalProps {
  banner: Banner | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteBannerModal({
  banner,
  isOpen,
  onClose,
  onDeleted,
}: DeleteBannerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adminFetch = useAdminFetch();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setError(null);
    setDeleting(false);
  }, [banner, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleting, onClose]);

  const handleDelete = async () => {
    if (!banner) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await adminFetch(`/api/banners/${banner.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete banner');
      }

      onDeleted(banner.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete banner. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (isOpen && banner) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, banner]);

  if (!mounted || !isOpen || !banner) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-border-color w-full max-w-md overflow-hidden relative z-10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
              <AlertTriangle size={24} />
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="text-lg font-bold text-text-primary mb-2">
            Delete Hero Banner?
          </h2>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            Are you sure you want to delete <strong className="text-text-primary">"{banner.title}"</strong>? This will immediately remove it from the Chormokar storefront carousel.
          </p>

          {/* Banner Thumbnail Preview */}
          {(banner.image_url || banner.image) && (
            <div className="relative rounded-xl overflow-hidden border border-border-color mb-4 aspect-[2/1] max-h-32 bg-black/5">
              <img
                src={mediaUrl(banner.image_url || banner.image)}
                alt={banner.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
          )}

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-danger hover:bg-danger/90 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Banner
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
