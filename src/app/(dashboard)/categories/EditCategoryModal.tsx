'use client';

import { useState, useEffect } from 'react';
import { apiErrorMessage } from '../../../shared/api/errorMessage';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../shared/categories/types';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { IconPicker } from '../../../components/IconPicker';
import { CategoryImageField } from './components/CategoryImageField';

interface EditCategoryModalProps {
  category: Category | null;
  allCategories: Category[];
  isOpen: boolean;
  /** Active homepage layout, so the shop-by inputs match what the card shows. */
  shopByLayout?: 'icons' | 'cards' | 'hidden';
  onClose: () => void;
  onSave: (updated: Category) => void;
  onImageChange?: (categoryId: string, url: string | null) => void;
}

export function EditCategoryModal({
  category,
  allCategories,
  isOpen,
  shopByLayout = 'icons',
  onClose,
  onSave,
  onImageChange,
}: EditCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parent: '',
    position: 0,
    is_active: true,
    show_in_nav: true,
    show_in_shop_by: false,
    shop_by_position: 0,
    icon: '',
    meta_title: '',
    meta_description: '',
    seo_h1: '',
    seo_subtitle: '',
    seo_intro: '',
    seo_sections: [] as { title: string; body: string }[],
    seo_faqs: [] as { question: string; answer: string }[],
  });
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const adminFetch = useAdminFetch();

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        parent: category.parent || '',
        position: category.position || 0,
        is_active: category.is_active ?? true,
        show_in_nav: category.show_in_nav ?? true,
        show_in_shop_by: category.show_in_shop_by ?? false,
        shop_by_position: category.shop_by_position ?? 0,
        icon: category.icon || '',
        meta_title: category.meta_title || '',
        meta_description: category.meta_description || '',
        seo_h1: category.seo_h1 || '',
        seo_subtitle: category.seo_subtitle || '',
        seo_intro: category.seo_intro || '',
        seo_sections: category.seo_sections ?? [],
        seo_faqs: category.seo_faqs ?? [],
      });
      setError(null);
    }
  }, [category]);

  if (!mounted || !isOpen || !category) return null;

  // Filter out self and any immediate children to avoid circular dependency
  const availableParents = allCategories.filter((c) => c.id !== category.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await adminFetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          parent: formData.parent ? formData.parent : null,
          position: Number(formData.position) || 0,
          is_active: formData.is_active,
          show_in_nav: formData.show_in_nav,
          show_in_shop_by: formData.show_in_shop_by,
          shop_by_position: Number(formData.shop_by_position) || 0,
          icon: formData.icon,
          meta_title: formData.meta_title.trim(),
          meta_description: formData.meta_description.trim(),
          seo_h1: formData.seo_h1.trim(),
          seo_subtitle: formData.seo_subtitle.trim(),
          seo_intro: formData.seo_intro.trim(),
          seo_sections: formData.seo_sections.filter((row) => row.title.trim() || row.body.trim()),
          seo_faqs: formData.seo_faqs.filter((row) => row.question.trim() || row.answer.trim()),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(apiErrorMessage(json, 'Failed to update category'));
      }

      onSave(json.data || json);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const inputClasses =
    'w-full rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-2.5 text-sm text-text-primary transition-all ' +
    'hover:bg-black/[0.04] focus:border-accent-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/20 ' +
    // Dark theme: the light-mode focus fill turns the field white, which made
    // the text unreadable. Keep a dark fill and the same border highlight.
    'dark:border-white/10 dark:bg-white/[0.04] dark:text-text-primary dark:hover:bg-white/[0.06] ' +
    'dark:focus:border-accent-primary dark:focus:bg-white/[0.07] dark:focus:ring-accent-primary/25';
  const labelClasses =
    'text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5';

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="admin-card shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Edit Category</h2>
            <p className="text-xs text-text-secondary">Update category information and visibility</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-black/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form id="edit-category-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className={labelClasses}>Category Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Slug / URL *</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Parent Category</label>
              <select
                value={formData.parent}
                onChange={(e) => setFormData((prev) => ({ ...prev, parent: e.target.value }))}
                className={inputClasses}
              >
                <option value="">None (Top Level)</option>
                {availableParents.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.depth > 1 ? `${'— '.repeat(cat.depth - 1)}${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>Display Position</label>
              <input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: Number(e.target.value) || 0 }))}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Status</label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="edit-status"
                  checked={formData.is_active}
                  onChange={() => setFormData((prev) => ({ ...prev, is_active: true }))}
                  className="accent-accent-primary"
                />
                <span className="font-medium text-text-primary">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="edit-status"
                  checked={!formData.is_active}
                  onChange={() => setFormData((prev) => ({ ...prev, is_active: false }))}
                  className="accent-accent-primary"
                />
                <span className="font-medium text-text-secondary">Draft / Inactive</span>
              </label>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Storefront placement</label>
            <div className="space-y-2 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.show_in_nav}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, show_in_nav: e.target.checked }))
                  }
                  className="accent-accent-primary"
                />
                <span className="font-medium text-text-primary">Top navigation</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.show_in_shop_by}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, show_in_shop_by: e.target.checked }))
                  }
                  className="accent-accent-primary"
                />
                <span className="font-medium text-text-primary">
                  Shop by category{' '}
                  <span className="font-normal text-text-muted">(homepage grid)</span>
                </span>
              </label>
              {formData.show_in_shop_by && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[12.5px] text-text-secondary">Position</span>
                    <input
                      type="number"
                      min={0}
                      value={formData.shop_by_position}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shop_by_position: Number(e.target.value) || 0,
                        }))
                      }
                      className={clsx(inputClasses, 'h-9 w-20 py-1.5')}
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    {shopByLayout === 'cards' && (
                      <CategoryImageField
                        categoryId={category.id}
                        image={category.image ?? null}
                        onChange={(url) => onImageChange?.(category.id, url)}
                      />
                    )}
                    <IconPicker
                      value={formData.icon}
                      onChange={(icon) => setFormData((prev) => ({ ...prev, icon }))}
                      label={shopByLayout === 'cards' ? 'Fallback icon' : 'Category Icon'}
                      hint={
                        shopByLayout === 'cards'
                          ? 'Only used when the card image is missing.'
                          : "Shown on the homepage tile. Leave empty to inherit the parent category's icon."
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className={labelClasses}>SEO Meta Title</label>
            <input
              type="text"
              value={formData.meta_title}
              onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
              placeholder="Defaults to category name"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>SEO Meta Description</label>
            <textarea
              rows={3}
              value={formData.meta_description}
              onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
              placeholder="Optional summary for search results"
              className={clsx(inputClasses, 'resize-none')}
            />
          </div>

          {/* Category SEO copy: rendered on the storefront category page */}
          <div className="sm:col-span-2 border-t border-black/5 pt-4 mt-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Category SEO content
            </p>
            <label className="text-xs font-medium text-text-secondary">H1 (optional)</label>
            <input
              value={formData.seo_h1}
              onChange={(e) => setFormData((prev) => ({ ...prev, seo_h1: e.target.value }))}
              placeholder="Earbuds Price in Bangladesh"
              className={clsx(inputClasses, 'mt-1')}
            />
            <p className="mt-1 text-[11px] text-text-muted">
              Leave empty to use “{'{category name}'} Price in Bangladesh”.
            </p>

            <label className="mt-3 block text-xs font-medium text-text-secondary">Subtitle (optional)</label>
            <input
              value={formData.seo_subtitle}
              onChange={(e) => setFormData((prev) => ({ ...prev, seo_subtitle: e.target.value }))}
              placeholder="Short supporting line under the H1"
              className={clsx(inputClasses, 'mt-1')}
            />

            <label className="mt-3 block text-xs font-medium text-text-secondary">Intro</label>
            <textarea
              rows={2}
              value={formData.seo_intro}
              onChange={(e) => setFormData((prev) => ({ ...prev, seo_intro: e.target.value }))}
              placeholder="1–2 sentences shown under the H1"
              className={clsx(inputClasses, 'resize-y mt-1')}
            />

            <div className="mt-4 flex items-center justify-between">
              <label className="text-xs font-medium text-text-secondary">Sections</label>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, seo_sections: [...prev.seo_sections, { title: '', body: '' }] }))}
                className="text-xs font-semibold text-accent-primary hover:underline"
              >
                + Add section
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {formData.seo_sections.map((row, index) => (
                <div key={index} className="rounded-xl border border-black/10 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={row.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          seo_sections: prev.seo_sections.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)),
                        }))
                      }
                      placeholder="Section title"
                      className={inputClasses}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, seo_sections: prev.seo_sections.filter((_, i) => i !== index) }))}
                      className="text-xs text-rose-600 px-2"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={row.body}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        seo_sections: prev.seo_sections.map((item, i) => (i === index ? { ...item, body: e.target.value } : item)),
                      }))
                    }
                    placeholder="What should a shopper know? Keep it specific to this category."
                    className={clsx(inputClasses, 'resize-y')}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="text-xs font-medium text-text-secondary">FAQs</label>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, seo_faqs: [...prev.seo_faqs, { question: '', answer: '' }] }))}
                className="text-xs font-semibold text-accent-primary hover:underline"
              >
                + Add FAQ
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {formData.seo_faqs.map((row, index) => (
                <div key={index} className="rounded-xl border border-black/10 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={row.question}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          seo_faqs: prev.seo_faqs.map((item, i) => (i === index ? { ...item, question: e.target.value } : item)),
                        }))
                      }
                      placeholder="Question"
                      className={inputClasses}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, seo_faqs: prev.seo_faqs.filter((_, i) => i !== index) }))}
                      className="text-xs text-rose-600 px-2"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={row.answer}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        seo_faqs: prev.seo_faqs.map((item, i) => (i === index ? { ...item, answer: e.target.value } : item)),
                      }))
                    }
                    placeholder="Answer"
                    className={clsx(inputClasses, 'resize-y')}
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5 bg-black/[0.01] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-black/10 rounded-xl text-sm font-medium text-text-secondary hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-category-form"
            disabled={saving}
            className="btn btn-primary px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
