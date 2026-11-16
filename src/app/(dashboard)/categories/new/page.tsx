'use client';

import { useState, useEffect, Suspense } from 'react';
import { apiErrorMessage } from '../../../../shared/api/errorMessage';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../../shared/categories/types';
import { useAdminFetch } from '../../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../../shared/auth/AuthContext';

function AddCategoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParent = searchParams?.get('parent') || '';
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parent: initialParent,
    position: '0',
    status: 'active',
    meta_title: '',
    meta_description: '',
  });

  const [slugModified, setSlugModified] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available parent categories from backend
  useEffect(() => {
    if (authStatus === 'loading' || authStatus === 'idle' || authStatus === 'unauthenticated') {
      return;
    }

    async function fetchParents() {
      try {
        const res = await adminFetch('/api/categories?page_size=100');
        if (res.ok) {
          const json = await res.json();
          const list: Category[] = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : [];
          setParentCategories(list);
        }
      } catch (err) {
        console.error('Failed to load parent categories:', err);
      } finally {
        setLoadingParents(false);
      }
    }

    fetchParents();
  }, [authStatus, adminFetch]);

  // Auto-slugify name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (!slugModified) {
        updated.slug = val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return updated;
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugModified(true);
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        parent: formData.parent ? formData.parent : null,
        position: Number(formData.position) || 0,
        status: formData.status,
        meta_title: formData.meta_title.trim(),
        meta_description: formData.meta_description.trim(),
      };

      const res = await adminFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        let msg = apiErrorMessage(json, 'Failed to create category');
        if (json?.slug) {
          msg = `Slug: ${Array.isArray(json.slug) ? json.slug.join(', ') : json.slug}`;
        }
        throw new Error(msg);
      }

      router.push('/categories');
    } catch (err: any) {
      console.error('Error creating category:', err);
      setError(err?.message || 'Failed to save category');
      setSubmitting(false);
    }
  };

  const inputClasses =
    'w-full rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-text-primary transition-all hover:border-black/20 hover:bg-black/[0.04] focus:border-accent-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-text-primary dark:hover:bg-white/[0.06] dark:focus:border-accent-primary dark:focus:bg-white/[0.07] dark:focus:ring-accent-primary/25';
  const labelClasses =
    'text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2';
  const cardClasses =
    'admin-card p-7';
  const cardTitleClasses =
    'text-lg font-bold text-text-primary tracking-tight mb-6';

  return (
    <div className="animate-fade-in pb-12 max-w-[1300px] mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-black/5">
        <div className="flex items-center gap-4">
          <Link
            href="/categories"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-black/10 hover:bg-black/5 text-text-primary transition-all group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <h1 className="mb-1 font-display text-[28px] font-semibold tracking-[-0.03em] text-text-primary">
              Add New Category
            </h1>
            <p className="text-text-secondary text-[0.95rem]">
              Configure category details, parent hierarchy, and SEO meta tags.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/categories"
            className="btn bg-white border border-black/10 hover:bg-black/5 text-text-secondary hover:text-text-primary px-5 py-2.5 rounded-xl font-semibold transition-all shadow-2xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="add-category-form"
            disabled={submitting}
            className="btn btn-primary px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            <span>{submitting ? 'Creating...' : 'Create Category'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-danger/10 border border-danger/20 flex items-center gap-3 text-danger text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="add-category-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Info & SEO */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Information Card */}
          <div className={cardClasses}>
            <h2 className={cardTitleClasses}>General Information</h2>

            <div className="space-y-6">
              <div>
                <label className={labelClasses}>
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  className={inputClasses}
                  placeholder="e.g. Mechanical Keyboards"
                />
              </div>

              <div>
                <label className={labelClasses}>
                  Slug (URL Key) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono select-none">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={handleSlugChange}
                    className={clsx(inputClasses, 'pl-8 font-mono')}
                    placeholder="mechanical-keyboards"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  Unique identifier used in URLs. Auto-generated from name.
                </p>
              </div>

              <div>
                <label className={labelClasses}>Parent Category</label>
                <select
                  value={formData.parent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, parent: e.target.value }))}
                  disabled={loadingParents}
                  className={clsx(inputClasses, 'cursor-pointer')}
                >
                  <option value="">— None (Make this a Main/Root Category) —</option>
                  {parentCategories
                    .filter((c) => !c.parent)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-text-muted mt-1.5">
                  Leave empty if this is a top-level department, or choose a parent category.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visibility & Meta */}
        <div className="space-y-8">
          {/* Status & Position Card */}
          <div className={cardClasses}>
            <h2 className={cardTitleClasses}>Publishing & Hierarchy</h2>

            <div className="space-y-6">
              <div>
                <label className={labelClasses}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className={clsx(inputClasses, 'cursor-pointer')}
                >
                  <option value="active">Active (Visible to customers)</option>
                  <option value="draft">Draft (Hidden in store)</option>
                </select>
              </div>

              <div>
                <label className={labelClasses}>Sort Position</label>
                <input
                  type="number"
                  min="0"
                  value={formData.position}
                  onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                  className={inputClasses}
                  placeholder="0"
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Categories with lower numbers appear first in navigations.
                </p>
              </div>
            </div>
          </div>

          {/* Search Engine Optimization Card */}
          <div className={cardClasses}>
            <h2 className={cardTitleClasses}>Search Engine Optimization</h2>

            <div className="space-y-6">
              <div>
                <label className={labelClasses}>Meta Title</label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  className={inputClasses}
                  placeholder="Defaults to category name"
                />
              </div>
              <div>
                <label className={labelClasses}>Meta Description</label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  rows={3}
                  className={clsx(inputClasses, 'resize-none')}
                  placeholder="Leave empty to auto-generate"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function AddCategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-accent-primary" />
        </div>
      }
    >
      <AddCategoryForm />
    </Suspense>
  );
}
