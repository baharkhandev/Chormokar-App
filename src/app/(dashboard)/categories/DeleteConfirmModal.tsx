'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiErrorMessage } from '../../../shared/api/errorMessage';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import type { Category } from '../../../shared/categories/types';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';

interface DeleteConfirmModalProps {
  category: Category | null;
  allCategories?: Category[];
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteConfirmModal({
  category,
  allCategories = [],
  isOpen,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const adminFetch = useAdminFetch();

  // Mount tracking for React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter available alternative categories for reassignment
  const availableTargetCategories = useMemo(() => {
    if (!category) return [];
    return allCategories.filter((c) => c.id !== category.id);
  }, [allCategories, category]);

  // Reset state when category or open status changes
  useEffect(() => {
    setError(null);
    setDeleting(false);
    if (availableTargetCategories.length > 0) {
      setReassignTargetId(availableTargetCategories[0].id);
    } else {
      setReassignTargetId('');
    }
  }, [category, isOpen, availableTargetCategories]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleting, onClose]);

  useEffect(() => {
    if (isOpen && category) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, category]);

  if (!mounted || !isOpen || !category) return null;

  const hasProducts = category.items_count > 0;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('force', 'true');
      if (hasProducts && reassignTargetId) {
        params.set('reassign_to', reassignTargetId);
      }

      const res = await adminFetch(`/api/categories/${category.id}?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          apiErrorMessage(json) ||
          json?.detail ||
          'Failed to delete category'
        );
      }

      onDeleted(category.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
    >
      <div 
        className="admin-card shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative z-10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 id="delete-category-title" className="text-base font-bold text-text-primary">
              Delete Category
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-text-primary">"{category.name}"</span>?
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content & Warnings */}
        <div className="px-6 py-2 space-y-3">
          {hasProducts && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-2">
              <div className="font-semibold text-amber-800">
                Notice: {category.items_count} product(s) are assigned to this category.
              </div>
              <p className="text-amber-700 text-[11px] leading-relaxed">
                Products will automatically be safely reassigned to the selected category below:
              </p>
              {availableTargetCategories.length > 0 ? (
                <div className="pt-1">
                  <label htmlFor="reassign-category-select" className="block text-[11px] font-bold text-amber-900 mb-1">
                    Reassign products to:
                  </label>
                  <select
                    id="reassign-category-select"
                    value={reassignTargetId}
                    onChange={(e) => setReassignTargetId(e.target.value)}
                    disabled={deleting}
                    className="w-full px-3 py-2 bg-white border border-amber-500/30 rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    {availableTargetCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.items_count} products)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[11px] text-amber-700 italic">
                  No other categories available. Create another category first to move products.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 flex items-center justify-end gap-3 border-t border-black/5 bg-black/[0.01]">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-black/10 rounded-xl text-sm font-medium text-text-secondary hover:bg-black/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-danger/90 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {deleting && <Loader2 size={16} className="animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete Category'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
