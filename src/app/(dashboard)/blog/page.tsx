'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, Newspaper, Clock, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader, Pagination, StatusBadge } from '../../../components';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { apiErrorMessage } from '../../../shared/api/errorMessage';
import { revalidateStorefront } from '../../../shared/api/revalidateStorefront';
import type { BlogPost } from './BlogForm';

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search.trim()) params.set('search', search.trim());
      if (filter === 'published') params.set('is_published', 'true');
      if (filter === 'draft') params.set('is_published', 'false');

      const res = await adminFetch(`/api/blog?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      const rows: BlogPost[] = Array.isArray(json.data) ? json.data : [];
      setPosts(rows);
      setTotalCount(Number(json.meta?.count ?? rows.length));
    } catch {
      /* keep previous rows */
    } finally {
      setLoading(false);
    }
  }, [adminFetch, page, pageSize, search, filter]);

  useEffect(() => {
    if (authStatus === 'authenticated') void load();
  }, [authStatus, load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('saved') === 'created') {
      const timer = window.setTimeout(
        () => setNotice('Article created. It is now in your blog list.'),
        0
      );
      window.history.replaceState({}, '', '/blog');
      return () => window.clearTimeout(timer);
    }
  }, []);

  const stats = useMemo(
    () => ({
      published: posts.filter((p) => p.is_published).length,
      drafts: posts.filter((p) => !p.is_published).length,
    }),
    [posts]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/blog/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        showNotice(apiErrorMessage(json, 'Could not delete the article.'));
        return;
      }
      setDeleteTarget(null);
      await load();
      void revalidateStorefront(['/', '/en/blog', `/en/blog/${deleteTarget.slug}`]);
      showNotice('Article deleted.');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Blog"
        description="Tech and gadget stories shown on the storefront. Open the full-page editor to write, format and publish an article."
        actions={
          <Link
            href="/blog/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
          >
            <Plus size={16} />
            New article
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Articles', value: totalCount, tone: 'text-text-primary bg-bg-secondary' },
          { label: 'Published (this page)', value: stats.published, tone: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'Drafts (this page)', value: stats.drafts, tone: 'text-accent-primary bg-accent-primary/10' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
            <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}>
              <Newspaper size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{label}</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border-color p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1 px-2">
            {[
              ['all', 'All'],
              ['published', 'Published'],
              ['draft', 'Drafts'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key as typeof filter);
                  setPage(1);
                }}
                className={clsx(
                  'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
                  filter === key
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search articles..."
              className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center text-[12.5px] text-text-secondary">Loading articles…</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-text-muted">
              <Newspaper size={22} />
            </div>
            <p className="text-[15px] font-semibold text-text-primary">No articles yet</p>
            <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-secondary">
              Publish your first guide and it will appear on the storefront homepage.
            </p>
            <Link
              href="/blog/new"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
            >
              <Plus size={16} />
              Write an article
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-color bg-bg-secondary/40 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  <th className="p-4 pl-6">Article</th>
                  <th className="p-4">Read</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/70">
                {posts.map((post) => (
                  <tr key={post.id} className="group transition-colors hover:bg-bg-secondary/40">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt=""
                            className="h-12 w-20 shrink-0 rounded-lg border border-border-color object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-text-muted">
                            <Newspaper size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/blog/${post.id}/edit`}
                            className="block truncate text-[13px] font-semibold text-text-primary hover:text-accent-primary"
                          >
                            {post.title}
                          </Link>
                          <p className="truncate text-[11.5px] text-text-secondary">
                            /blog/{post.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[12px] text-text-secondary">
                        <Clock size={12} />
                        {post.read_minutes} min
                      </span>
                    </td>
                    <td className="p-4 text-[12.5px] text-text-secondary">
                      {formatDate(post.published_at || post.created_at)}
                    </td>
                    <td className="p-4">
                      <StatusBadge
                        status={post.is_published ? 'active' : 'draft'}
                        label={post.is_published ? 'Published' : 'Draft'}
                      />
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`${STOREFRONT_URL}/en/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                          aria-label={`Open ${post.title}`}
                        >
                          <ExternalLink size={14} />
                        </a>
                        <Link
                          href={`/blog/${post.id}/edit`}
                          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                          aria-label={`Edit ${post.title}`}
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(post)}
                          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                          aria-label={`Delete ${post.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          itemLabel="articles"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this article?"
        message={
          <>
            “{deleteTarget?.title}” will be removed from the storefront and its cover image deleted.
          </>
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete article'}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />

      {notice && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-white/10 bg-text-primary px-4 py-3 text-[12.5px] font-medium text-white">
          {notice}
        </div>
      )}
    </div>
  );
}
