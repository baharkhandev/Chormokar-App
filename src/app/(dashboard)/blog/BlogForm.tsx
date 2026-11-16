'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Save,
  Search,
  Share2,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader, RichTextEditor } from '../../../components';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { apiErrorMessage } from '../../../shared/api/errorMessage';
import { revalidateStorefront } from '../../../shared/api/revalidateStorefront';
import { mediaUrl } from '../../../shared/lib/media';
import { optimizeImageForUpload } from '../../../shared/lib/image-upload';

const STOREFRONT_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001').replace(
  /\/$/,
  ''
);

const inputClass =
  'h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  cover_image_url: string | null;
  cover_alt: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string | null;
  og_image_url: string | null;
  og_image_alt: string;
  seo_keywords: string;
  no_index: boolean;
  author_name: string;
  read_minutes: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogFormProps {
  mode: 'create' | 'edit';
  postId?: string;
}

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_alt: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image_alt: string;
  seo_keywords: string;
  no_index: boolean;
  author_name: string;
  read_minutes: string;
  is_published: boolean;
  published_at: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_alt: '',
    seo_title: '',
    seo_description: '',
    canonical_url: '',
    og_title: '',
    og_description: '',
    og_image_alt: '',
    seo_keywords: '',
    no_index: false,
    author_name: 'Chormokar',
    read_minutes: '',
    is_published: true,
    published_at: today(),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function textFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function unwrap(payload: any) {
  return payload?.data ?? payload;
}

export function BlogForm({ mode, postId }: BlogFormProps) {
  const router = useRouter();
  const adminFetch = useAdminFetch();
  const fileRef = useRef<HTMLInputElement>(null);
  const ogFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedPost, setSavedPost] = useState<BlogPost | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverProcessing, setCoverProcessing] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);

  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
  const [ogImageProcessing, setOgImageProcessing] = useState(false);
  const [removeOgImage, setRemoveOgImage] = useState(false);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (mode !== 'edit' || !postId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    adminFetch(`/api/blog/${postId}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiErrorMessage(json, 'Could not load this article.'));
        const post = unwrap(json) as BlogPost;
        if (cancelled) return;
        setSavedPost(post);
        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || '',
          content: post.content || '',
          cover_alt: post.cover_alt || '',
          seo_title: post.seo_title || '',
          seo_description: post.seo_description || '',
          canonical_url: post.canonical_url || '',
          og_title: post.og_title || '',
          og_description: post.og_description || '',
          og_image_alt: post.og_image_alt || '',
          seo_keywords: post.seo_keywords || '',
          no_index: Boolean(post.no_index),
          author_name: post.author_name || 'Chormokar',
          read_minutes: post.read_minutes ? String(post.read_minutes) : '',
          is_published: post.is_published,
          published_at: post.published_at
            ? post.published_at.slice(0, 10)
            : post.created_at.slice(0, 10),
        });
        setSlugTouched(true);
        setCoverPreview(post.cover_image_url ? mediaUrl(post.cover_image_url) : null);
        setOgImagePreview(post.og_image_url ? mediaUrl(post.og_image_url) : null);
      })
      .catch((err: any) => {
        if (!cancelled) setLoadError(err?.message || 'Could not load this article.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adminFetch, mode, postId]);

  const wordCount = useMemo(() => {
    const text = textFromHtml(form.content);
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [form.content]);

  const autoReadMinutes = Math.max(1, Math.round(wordCount / 200)) || 1;
  const readMinutes = form.read_minutes ? Number(form.read_minutes) : autoReadMinutes;
  const previewSlug = slugify(form.slug || form.title) || 'your-article';
  const storefrontUrl = `${STOREFRONT_URL}/en/blog/${previewSlug}`;

  const googleTitle = form.seo_title.trim() || form.title.trim() || 'Article title';
  const googleDescription =
    form.seo_description.trim() ||
    form.excerpt.trim() ||
    'Add a meta description to control how this article appears in search results.';
  const googleUrl = form.canonical_url.trim() || `https://chormokar.com/blog/${previewSlug}`;
  const socialTitle =
    form.og_title.trim() || form.seo_title.trim() || form.title.trim() || 'Article title';
  const socialDescription =
    form.og_description.trim() ||
    form.seo_description.trim() ||
    form.excerpt.trim() ||
    'Share preview description.';
  const socialImage = ogImagePreview || coverPreview;
  const seoChecks = [
    {
      label: 'SEO title is 30-60 characters',
      ok: googleTitle.length >= 30 && googleTitle.length <= 60,
    },
    {
      label: 'Meta description is 120-170 characters',
      ok: googleDescription.length >= 120 && googleDescription.length <= 170,
    },
    {
      label: 'Social share image is ready',
      ok: Boolean(socialImage),
    },
    {
      label: 'Focus keywords are added',
      ok: form.seo_keywords.trim().length > 0,
    },
  ];

  const handleTitle = (value: string) => {
    update({
      title: value,
      ...(slugTouched ? {} : { slug: slugify(value) }),
    });
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a JPG, PNG or WebP image for the cover.');
      return;
    }
    if (file.type === 'image/svg+xml') {
      setError('Use a JPG, PNG or WebP image for the cover.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Cover images must be smaller than 12 MB.');
      return;
    }

    setError('');
    setCoverProcessing(true);
    try {
      const optimized = await optimizeImageForUpload(file, {
        maxWidth: 1600,
        maxHeight: 900,
        crop: true,
        quality: 0.84,
      });
      setCoverFile(optimized.file);
      setRemoveCover(false);
      setCoverPreview(URL.createObjectURL(optimized.file));
    } catch (err: any) {
      setError(err?.message || 'Could not prepare the cover image.');
    } finally {
      setCoverProcessing(false);
    }
  };

  const handleOgImage = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      setError('Use a JPG, PNG or WebP image for social sharing.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Social images must be smaller than 12 MB.');
      return;
    }

    setError('');
    setOgImageProcessing(true);
    try {
      const optimized = await optimizeImageForUpload(file, {
        maxWidth: 1200,
        maxHeight: 630,
        crop: true,
        quality: 0.86,
      });
      setOgImageFile(optimized.file);
      setRemoveOgImage(false);
      setOgImagePreview(URL.createObjectURL(optimized.file));
    } catch (err: any) {
      setError(err?.message || 'Could not prepare the social image.');
    } finally {
      setOgImageProcessing(false);
    }
  };

  const uploadBlogImage = async (file: File) => {
    const optimized = await optimizeImageForUpload(file, {
      maxWidth: 1600,
      maxHeight: 2000,
      quality: 0.84,
    });
    const body = new FormData();
    body.append('image', optimized.file, optimized.file.name);

    const res = await adminFetch('/api/blog/images', { method: 'POST', body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(apiErrorMessage(json, 'Could not upload the image.'));
    }
    const data = unwrap(json) as { url: string; width?: number; height?: number };
    return {
      url: mediaUrl(data.url),
      width: data.width || optimized.width,
      height: data.height || optimized.height,
    };
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (coverProcessing) {
      setError('Wait for the cover image to finish processing.');
      return;
    }
    if (ogImageProcessing) {
      setError('Wait for the social image to finish processing.');
      return;
    }
    if (!form.title.trim()) {
      setError('Add a title before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const body = new FormData();
    body.append('title', form.title.trim());
    if (form.slug.trim()) body.append('slug', slugify(form.slug));
    body.append('excerpt', form.excerpt.trim());
    body.append('content', form.content);
    body.append('cover_alt', form.cover_alt.trim());
    body.append('seo_title', form.seo_title.trim());
    body.append('seo_description', form.seo_description.trim());
    body.append('canonical_url', form.canonical_url.trim());
    body.append('og_title', form.og_title.trim());
    body.append('og_description', form.og_description.trim());
    body.append('og_image_alt', form.og_image_alt.trim());
    body.append('seo_keywords', form.seo_keywords.trim());
    body.append('no_index', String(form.no_index));
    body.append('author_name', form.author_name.trim() || 'Chormokar');
    if (form.read_minutes) body.append('read_minutes', form.read_minutes);
    body.append('is_published', String(form.is_published));
    body.append(
      'published_at',
      `${form.published_at || today()}T09:00:00Z`
    );
    if (coverFile) body.append('cover_image', coverFile);
    if (removeCover) body.append('remove_cover', 'true');
    if (ogImageFile) body.append('og_image', ogImageFile);
    if (removeOgImage) body.append('remove_og_image', 'true');

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminFetch(mode === 'edit' ? `/api/blog/${postId}` : '/api/blog', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(json, 'Could not save the article.'));
        return;
      }

      const saved = unwrap(json) as BlogPost;
      setSavedPost(saved);
      setCoverFile(null);
      setRemoveCover(false);
      setCoverPreview(saved.cover_image_url ? mediaUrl(saved.cover_image_url) : null);
      setOgImageFile(null);
      setRemoveOgImage(false);
      setOgImagePreview(saved.og_image_url ? mediaUrl(saved.og_image_url) : null);
      void revalidateStorefront(['/', '/en/blog', `/en/blog/${saved.slug}`]);

      if (mode === 'create') {
        router.push('/blog?saved=created');
        return;
      }

      update({
        slug: saved.slug,
        read_minutes: saved.read_minutes ? String(saved.read_minutes) : form.read_minutes,
        published_at: saved.published_at
          ? saved.published_at.slice(0, 10)
          : form.published_at,
      });
      setSuccess(
        saved.is_published
          ? 'Article saved and published to the storefront.'
          : 'Draft saved. It stays hidden from the storefront until you publish it.'
      );
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-text-secondary">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="animate-fade-in pb-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={14} />
          Back to blog
        </Link>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-[14px] font-semibold text-red-800">Could not open this article</p>
          <p className="mt-1 text-[12.5px] text-red-700">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-16">
      <Link
        href="/blog"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to blog
      </Link>

      <PageHeader
        title={mode === 'create' ? 'Write a new article' : 'Edit article'}
        description="Tech and gadget stories for the Chormokar storefront. No category needed — every article belongs to the blog."
        actions={
          <div className="flex items-center gap-2">
            {mode === 'edit' && savedPost?.is_published ? (
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
              >
                <ExternalLink size={14} />
                Preview
              </a>
            ) : null}
            <Link
              href="/blog"
              className="inline-flex h-10 items-center rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : form.is_published ? 'Save & publish' : 'Save draft'}
            </button>
          </div>
        }
      />

      {success ? (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] font-medium text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-medium text-red-700">
          <FileText size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="admin-card p-5 sm:p-6">
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleTitle(event.target.value)}
                  placeholder="The tech and gadget stories worth your time"
                  className="w-full rounded-none border-x-0 border-t-0 border-b border-border-color bg-transparent px-0 pb-3 font-display text-[26px] font-semibold leading-tight tracking-[-0.03em] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary"
                  maxLength={200}
                />
                <p className="mt-2 text-[11px] text-text-muted">
                  {form.title.length}/200 characters
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Excerpt
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(event) => update({ excerpt: event.target.value })}
                  rows={3}
                  placeholder="One or two sentences shown on the blog card and in search results."
                  className="w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 py-2.5 text-[13px] leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Article body
                  </label>
                  <span className="text-[11px] text-text-muted">
                    {wordCount.toLocaleString()} words · {readMinutes} min read
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border-color bg-white">
                  <RichTextEditor
                    value={form.content}
                    onChange={(html) => update({ content: html })}
                    onImageUpload={uploadBlogImage}
                    placeholder="Write the article. Use headings, images and lists to make it easy to read."
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="admin-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-text-primary">Cover image</h2>
                <p className="mt-0.5 text-[11.5px] text-text-secondary">
                  JPG, PNG or WebP up to 12 MB. Saved as an optimised 16:9 WebP image.
                </p>
              </div>
              <ImageIcon size={18} className="text-text-muted" />
            </div>

            <div className="relative aspect-[16/8] w-full overflow-hidden rounded-xl border border-border-color bg-bg-secondary">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt={form.cover_alt || 'Article cover preview'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
                  <ImageIcon size={28} />
                  <p className="text-[12px]">No cover image selected</p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={coverProcessing}
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {coverProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {coverProcessing
                  ? 'Optimising…'
                  : coverPreview
                    ? 'Replace image'
                    : 'Upload image'}
              </button>
              {coverPreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                    setRemoveCover(true);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger/20 px-3 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              ) : null}
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Image alt text
              </span>
              <input
                type="text"
                value={form.cover_alt}
                onChange={(event) => update({ cover_alt: event.target.value })}
                placeholder="Describe the image for accessibility and SEO"
                className={inputClass}
                maxLength={255}
              />
            </label>
          </section>

          <section className="admin-card p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-[14px] font-semibold text-text-primary">
                  <Search size={16} className="text-accent-primary" />
                  SEO and social sharing
                </h2>
                <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-text-secondary">
                  Control the Google result and the image card shown when this article is shared
                  on Facebook, X, LinkedIn or WhatsApp.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    SEO title
                    <span className="font-normal normal-case tracking-normal text-text-muted">
                      {form.seo_title.length}/70
                    </span>
                  </span>
                  <input
                    type="text"
                    value={form.seo_title}
                    onChange={(event) => update({ seo_title: event.target.value })}
                    placeholder={form.title || 'Best AJAZZ keyboards in Bangladesh'}
                    className={inputClass}
                    maxLength={70}
                  />
                  <span className="mt-1 block text-[10.5px] text-text-muted">
                    Leave empty to use the article title.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Meta description
                    <span className="font-normal normal-case tracking-normal text-text-muted">
                      {form.seo_description.length}/170
                    </span>
                  </span>
                  <textarea
                    value={form.seo_description}
                    onChange={(event) => update({ seo_description: event.target.value })}
                    rows={3}
                    placeholder={form.excerpt || 'A short, useful summary for search results.'}
                    className="w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 py-2.5 text-[13px] leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
                    maxLength={170}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Canonical URL
                  </span>
                  <input
                    type="url"
                    value={form.canonical_url}
                    onChange={(event) => update({ canonical_url: event.target.value })}
                    placeholder={`https://chormokar.com/blog/${previewSlug}`}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Keywords
                  </span>
                  <input
                    type="text"
                    value={form.seo_keywords}
                    onChange={(event) => update({ seo_keywords: event.target.value })}
                    placeholder="AJAZZ, mechanical keyboard, Bangladesh"
                    className={inputClass}
                    maxLength={300}
                  />
                  <span className="mt-1 block text-[10.5px] text-text-muted">
                    Separate keywords with commas.
                  </span>
                </label>

                <label className="flex items-start justify-between gap-4 rounded-xl border border-border-color bg-bg-secondary/40 px-4 py-3">
                  <span>
                    <span className="block text-[12.5px] font-semibold text-text-primary">
                      Hide from search engines
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-text-secondary">
                      Adds noindex to the article. Useful for private or temporary posts.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.no_index}
                    onChange={(event) => update({ no_index: event.target.checked })}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent-primary)]"
                  />
                </label>

                <div className="rounded-xl border border-border-color bg-bg-secondary/30 p-3.5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    SEO checklist
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {seoChecks.map((check) => (
                      <li
                        key={check.label}
                        className="flex items-start gap-2 text-[11.5px] leading-snug"
                      >
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            check.ok ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <span className={check.ok ? 'text-text-secondary' : 'text-text-primary'}>
                          {check.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    <Search size={12} />
                    Google preview
                  </p>
                  <div className="rounded-xl border border-border-color bg-white p-4">
                    <p className="truncate text-[11px] text-[#3c4043]">{googleUrl}</p>
                    <p className="mt-1 line-clamp-2 text-[17px] font-medium leading-snug text-[#1a0dab]">
                      {googleTitle}
                    </p>
                    <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-[#4d5156]">
                      {googleDescription}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    <Share2 size={12} />
                    Social share preview
                  </p>
                  <div className="overflow-hidden rounded-xl border border-border-color bg-white">
                    <div className="relative aspect-[1.91/1] w-full bg-bg-secondary">
                      {socialImage ? (
                        <img
                          src={socialImage}
                          alt={form.og_image_alt || form.cover_alt || socialTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
                          <ImageIcon size={28} />
                          <span className="text-[11px]">No share image selected</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border-color p-3.5">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        chormokar.com
                      </p>
                      <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-text-primary">
                        {socialTitle}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-text-secondary">
                        {socialDescription}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Social image
                    </p>
                    <span className="text-[10.5px] text-text-muted">1200 x 630, WebP</span>
                  </div>
                  <div className="rounded-xl border border-border-color bg-bg-secondary/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={ogFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          void handleOgImage(event.target.files?.[0] ?? null);
                          event.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        disabled={ogImageProcessing}
                        onClick={() => ogFileRef.current?.click()}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {ogImageProcessing ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Upload size={14} />
                        )}
                        {ogImageProcessing
                          ? 'Optimising...'
                          : socialImage
                            ? 'Replace image'
                            : 'Upload social image'}
                      </button>
                      {ogImagePreview ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOgImageFile(null);
                            setOgImagePreview(null);
                            setRemoveOgImage(true);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger/20 px-3 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-text-muted">
                      {!ogImagePreview && coverPreview
                        ? 'Using the article cover as the social image. Upload one to override it.'
                        : 'If empty, the cover image is used for sharing.'}
                    </p>
                    <label className="mt-3 block">
                      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary">
                        Social image alt text
                      </span>
                      <input
                        type="text"
                        value={form.og_image_alt}
                        onChange={(event) => update({ og_image_alt: event.target.value })}
                        placeholder={form.cover_alt || socialTitle}
                        className={inputClass}
                        maxLength={255}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Social title
                  <span className="font-normal normal-case tracking-normal text-text-muted">
                    {form.og_title.length}/100
                  </span>
                </span>
                <input
                  type="text"
                  value={form.og_title}
                  onChange={(event) => update({ og_title: event.target.value })}
                  placeholder={form.seo_title || form.title || 'Social share title'}
                  className={inputClass}
                  maxLength={100}
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Social description
                  <span className="font-normal normal-case tracking-normal text-text-muted">
                    {form.og_description.length}/200
                  </span>
                </span>
                <input
                  type="text"
                  value={form.og_description}
                  onChange={(event) => update({ og_description: event.target.value })}
                  placeholder={form.seo_description || form.excerpt || 'Social share description'}
                  className={inputClass}
                  maxLength={200}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="admin-card p-5">
            <h2 className="text-[14px] font-semibold text-text-primary">Publishing</h2>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-text-secondary">
              Drafts stay private. Published articles appear on the storefront blog immediately.
            </p>

            <label className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-border-color bg-bg-secondary/40 px-4 py-3">
              <span>
                <span className="block text-[12.5px] font-semibold text-text-primary">
                  Published
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-text-secondary">
                  {form.is_published
                    ? 'Visible to everyone on the storefront.'
                    : 'Only visible here in the admin panel.'}
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => update({ is_published: event.target.checked })}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent-primary)]"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Publish date
              </span>
              <input
                type="date"
                value={form.published_at}
                onChange={(event) => update({ published_at: event.target.value })}
                className={inputClass}
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Author
                </span>
                <input
                  type="text"
                  value={form.author_name}
                  onChange={(event) => update({ author_name: event.target.value })}
                  className={inputClass}
                  maxLength={120}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Read time
                </span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.read_minutes}
                  onChange={(event) => update({ read_minutes: event.target.value })}
                  placeholder={`${autoReadMinutes} (auto)`}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="admin-card p-5">
            <h2 className="text-[14px] font-semibold text-text-primary">URL & preview</h2>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Slug
              </span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update({ slug: event.target.value });
                }}
                placeholder="tech-gadget-guide"
                className={clsx(inputClass, 'font-mono text-[12px]')}
              />
            </label>
            <p className="mt-2 break-all rounded-lg bg-bg-secondary/50 px-3 py-2 font-mono text-[11px] text-text-secondary">
              /blog/{previewSlug}
            </p>

            {mode === 'edit' && savedPost ? (
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-accent-primary hover:underline"
              >
                Open on storefront <ExternalLink size={12} />
              </a>
            ) : null}
          </section>

          <section className="admin-card p-5">
            <h2 className="text-[14px] font-semibold text-text-primary">Article facts</h2>
            <dl className="mt-3 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-text-secondary">
                  <FileText size={13} /> Words
                </dt>
                <dd className="font-semibold text-text-primary">{wordCount.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-text-secondary">
                  <Clock3 size={13} /> Read time
                </dt>
                <dd className="font-semibold text-text-primary">{readMinutes} min</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-text-secondary">
                  <User size={13} /> Author
                </dt>
                <dd className="truncate font-semibold text-text-primary">
                  {form.author_name || 'Chormokar'}
                </dd>
              </div>
              {mode === 'edit' && savedPost ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-secondary">Last updated</dt>
                  <dd className="font-semibold text-text-primary">
                    {formatDate(savedPost.updated_at)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : form.is_published ? 'Save & publish' : 'Save draft'}
          </button>
        </aside>
      </form>
    </div>
  );
}
