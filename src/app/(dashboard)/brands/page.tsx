'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../../components';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { revalidateStorefront } from '../../../shared/api/revalidateStorefront';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  is_active: boolean;
  is_official_partner: boolean;
  position: number;
  products_count: number;
}

interface BrandForm {
  name: string;
  slug: string;
  position: string;
  isOfficialPartner: boolean;
}

const EMPTY_FORM: BrandForm = {
  name: '',
  slug: '',
  position: '0',
  isOfficialPartner: false,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BrandsPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/brands?page_size=100');
      if (!res.ok) return;
      const json = await res.json();
      const list: Brand[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.results)
            ? json.results
            : [];
      setBrands(list);
    } catch {
      // Keep the empty state when the API is unreachable.
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus === 'authenticated') void load();
  }, [authStatus, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return brands;
    return brands.filter(
      (brand) =>
        brand.name.toLowerCase().includes(term) || brand.slug.toLowerCase().includes(term)
    );
  }, [brands, search]);

  const partnerCount = brands.filter((brand) => brand.is_official_partner).length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setLogoPreview(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      position: String(brand.position ?? 0),
      isOfficialPartner: brand.is_official_partner,
    });
    setLogoFile(null);
    setLogoPreview(brand.logo || null);
    setError(null);
    setModalOpen(true);
  };

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Brand name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('name', form.name.trim());
      body.append('slug', form.slug.trim() || slugify(form.name));
      body.append('position', String(Number(form.position) || 0));
      if (!editing) body.append('is_active', 'true');
      body.append('is_official_partner', form.isOfficialPartner ? 'true' : 'false');
      if (logoFile) body.append('logo', logoFile);

      const res = await adminFetch(editing ? `/api/brands/${editing.id}` : '/api/brands', {
        method: editing ? 'PATCH' : 'POST',
        body,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.detail || json.slug?.[0] || 'Could not save the brand.');
      }

      setModalOpen(false);
      await load();
      void revalidateStorefront(['/en', '/'], ['brands']);
      showNotice(editing ? 'Brand updated.' : 'Brand added.');
    } catch (err: any) {
      setError(err?.message || 'Could not save the brand.');
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (brand: Brand, field: 'is_official_partner' | 'is_active') => {
    const nextValue = !brand[field];
    setBrands((prev) =>
      prev.map((item) => (item.id === brand.id ? { ...item, [field]: nextValue } : item))
    );

    const res = await adminFetch(`/api/brands/${brand.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: nextValue }),
    });

    if (!res.ok) {
      setBrands((prev) =>
        prev.map((item) => (item.id === brand.id ? { ...item, [field]: brand[field] } : item))
      );
      showNotice('Could not update the brand.');
      return;
    }

    void revalidateStorefront(['/en', '/'], ['brands']);
  };

  const handleDelete = async (brand: Brand) => {
    const res = await adminFetch(`/api/brands/${brand.id}`, { method: 'DELETE' });
    if (!res.ok) {
      showNotice('Could not delete the brand.');
      return;
    }
    setBrands((prev) => prev.filter((item) => item.id !== brand.id));
    void revalidateStorefront(['/en', '/'], ['brands']);
    showNotice('Brand deleted.');
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Brands"
        description="Brands shown across the storefront. Turn on “Featured” to show a brand in the homepage brand strip, in the order you set."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
          >
            <Plus size={16} />
            Add brand
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[12px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-2.5 py-1 font-semibold text-accent-primary">
            <BadgeCheck size={13} />
            {partnerCount} featured
          </span>
          <span>{brands.length} brands total</span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search brands..."
            className="h-9 w-full rounded-lg border border-border-color bg-white pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors focus:border-accent-primary"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-color bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-color text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {filtered.map((brand) => (
                <tr key={brand.id} className="text-[12.5px]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt=""
                          className="h-8 w-8 rounded-lg border border-border-color bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-secondary text-[11px] font-bold text-text-secondary">
                          {brand.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-text-primary">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{brand.slug}</td>
                  <td className="px-4 py-3 text-text-secondary">{brand.products_count}</td>
                  <td className="px-4 py-3 text-text-secondary">{brand.position}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={brand.is_official_partner}
                      aria-label={`Toggle featured for ${brand.name}`}
                      onClick={() => void toggleField(brand, 'is_official_partner')}
                      className={clsx(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        brand.is_official_partner ? 'bg-accent-primary' : 'bg-black/15'
                      )}
                    >
                      <span
                        className={clsx(
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                          brand.is_official_partner ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(brand)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-color text-text-secondary transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
                        aria-label={`Edit ${brand.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(brand)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-color text-text-secondary transition-colors hover:border-rose-300 hover:text-rose-600"
                        aria-label={`Delete ${brand.name}`}
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

        {!loading && filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-[14px] font-semibold text-text-primary">No brands found</p>
            <p className="mt-1 text-[12.5px] text-text-secondary">
              {search ? 'Try a different search.' : 'Add your first brand to get started.'}
            </p>
          </div>
        ) : null}
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-border-color bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-text-primary">
                  {editing ? 'Edit brand' : 'Add brand'}
                </h2>
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  Featured brands appear in the homepage strip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-text-secondary transition-colors hover:text-text-primary"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold text-text-secondary">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: editing ? prev.slug : slugify(name),
                    }));
                  }}
                  placeholder="e.g. ASUS"
                  className="h-9 w-full rounded-lg border border-border-color px-3 text-[13px] outline-none focus:border-accent-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-semibold text-text-secondary">
                    Slug
                  </label>
                  <input
                    value={form.slug}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                    className="h-9 w-full rounded-lg border border-border-color px-3 text-[13px] outline-none focus:border-accent-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-semibold text-text-secondary">
                    Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.position}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, position: event.target.value }))
                    }
                    className="h-9 w-full rounded-lg border border-border-color px-3 text-[13px] outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold text-text-secondary">
                  Logo (optional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border-color bg-bg-secondary">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <ImagePlus size={18} className="text-text-muted" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-color px-3 text-[11.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
                  >
                    <ImagePlus size={14} />
                    Choose image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-[12.5px] text-text-primary">
                <input
                  type="checkbox"
                  checked={form.isOfficialPartner}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isOfficialPartner: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border-color accent-[#8a5a2b]"
                />
                Show in the homepage brand strip
              </label>

              {error ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-9 items-center rounded-lg border border-border-color px-3.5 text-[12px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-lg bg-accent-primary px-4 text-[12px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add brand'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete brand?"
        message={
          <>
            This removes <strong className="font-semibold text-foreground">{deleteTarget?.name}</strong> from the
            brand list. Products keep their data but lose this brand. This cannot be undone.
          </>
        }
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-black/10 bg-text-primary px-4 py-3 text-[12.5px] font-medium text-white">
          <BadgeCheck size={16} className="shrink-0 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
