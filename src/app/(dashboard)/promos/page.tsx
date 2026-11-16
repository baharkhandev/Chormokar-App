'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  Copy,
  Clock3,
  ImageIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../../components';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { mediaUrl } from '../../../shared/lib/media';
import { revalidateStorefront } from '../../../shared/api/revalidateStorefront';
import { apiErrorMessage } from '../../../shared/api/errorMessage';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';

interface PromoPopup {
  id: string;
  title: string;
  display_title?: string;
  message: string;
  badge_label: string;
  image_url: string | null;
  promo_code: string;
  cta_label: string;
  cta_href: string;
  layout: 'simple' | 'images';
  logos?: Array<{ image_url?: string; caption?: string; href?: string }>;
  placement: 'home' | 'all';
  delay_seconds: number;
  show_once_per_session: boolean;
  starts_at: string | null;
  ends_at: string | null;
  position: number;
  is_active: boolean;
}

interface PopupForm {
  title: string;
  display_title: string;
  message: string;
  badge_label: string;
  promo_code: string;
  cta_label: string;
  cta_href: string;
  layout: 'simple' | 'images';
  logos: Array<{ caption: string; href: string }>;
  placement: 'home' | 'all';
  delay_seconds: number | '';
  show_once_per_session: boolean;
  starts_at: string;
  ends_at: string;
  position: number;
  is_active: boolean;
}

const EMPTY_FORM: PopupForm = {
  title: '',
  display_title: '',
  message: '',
  badge_label: '',
  promo_code: '',
  cta_label: '',
  cta_href: '',
  layout: 'simple',
  logos: [
    { caption: '', href: '' },
    { caption: '', href: '' },
    { caption: '', href: '' },
  ],
  placement: 'home',
  delay_seconds: '',
  show_once_per_session: true,
  starts_at: '',
  ends_at: '',
  position: 0,
  is_active: true,
};

export default function PromoPopupsPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [popups, setPopups] = useState<PromoPopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromoPopup | null>(null);
  const [form, setForm] = useState<PopupForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [logoFiles, setLogoFiles] = useState<(File | null)[]>([null, null, null]);
  const [logoPreviews, setLogoPreviews] = useState<(string | null)[]>([null, null, null]);
  const [logoRemoved, setLogoRemoved] = useState<boolean[]>([false, false, false]);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoPopup | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const fetchPopups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/promos?page_size=100');
      if (!res.ok) return;
      const json = await res.json();
      const list: PromoPopup[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : [];
      setPopups(list);
    } catch (e) {
      console.error('Failed to load promo popups', e);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus === 'authenticated') void fetchPopups();
  }, [authStatus, fetchPopups]);

  const openModal = (popup: PromoPopup | null = null) => {
    if (popup) {
      setForm({
        title: popup.title || '',
        display_title: popup.display_title || '',
        message: popup.message || '',
        badge_label: popup.badge_label || '',
        promo_code: popup.promo_code || '',
        cta_label: popup.cta_label || 'Shop Now',
        cta_href: popup.cta_href || '/',
        layout: popup.layout || 'simple',
        logos: [0, 1, 2].map((i) => ({
          caption: popup.logos?.[i]?.caption || '',
          href: popup.logos?.[i]?.href || '',
        })),
        placement: popup.placement || 'home',
        delay_seconds: popup.delay_seconds ?? '',
        show_once_per_session: popup.show_once_per_session ?? true,
        starts_at: popup.starts_at ? popup.starts_at.slice(0, 16) : '',
        ends_at: popup.ends_at ? popup.ends_at.slice(0, 16) : '',
        position: popup.position ?? 0,
        is_active: popup.is_active ?? true,
      });
      setPreview(popup.image_url ? mediaUrl(popup.image_url) : null);
      setImageRemoved(false);
      setLogoPreviews([0, 1, 2].map((i) => (popup.logos?.[i]?.image_url ? mediaUrl(popup.logos[i]!.image_url) : null)));
    } else {
      setForm(EMPTY_FORM);
      setPreview(null);
      setImageRemoved(false);
      setLogoPreviews([null, null, null]);
    }
    setImageFile(null);
    setImageRemoved(false);
    setLogoFiles([null, null, null]);
    setLogoRemoved([false, false, false]);
    setEditing(popup);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setImageFile(null);
    setPreview(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setFormError(null);

    // Tiles that were removed are dropped and the rest re-indexed.
    const activeTiles = form.logos
      .map((logo, index) => ({ logo, index }))
      .filter(({ index }) => !logoRemoved[index]);

    const fields: Record<string, string | undefined> = {
      title: form.title.trim(),
      display_title: form.display_title.trim(),
      message: form.message.trim(),
      badge_label: form.badge_label.trim(),
      promo_code: form.promo_code.trim().toUpperCase(),
      cta_label: form.cta_label.trim(),
      cta_href: form.cta_href.trim() || '/',
      layout: form.layout,
      logos: JSON.stringify(
        activeTiles.map(({ logo }) => ({
          caption: logo.caption.trim(),
          href: logo.href.trim(),
        }))
      ),
      placement: form.placement,
      delay_seconds: String(Number(form.delay_seconds) || 0),
      show_once_per_session: String(form.show_once_per_session),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
      position: String(form.position),
      is_active: String(form.is_active),
    };

    const hasUploads = Boolean(imageFile) || activeTiles.some(({ index }) => Boolean(logoFiles[index]));

    let body: FormData | string;
    if (hasUploads) {
      const payload = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) payload.set(key, value);
      });
      if (imageFile) payload.set('image', imageFile);
      activeTiles.forEach(({ index }, slot) => {
        const file = logoFiles[index];
        if (file) payload.set(`logo_${slot}`, file);
      });
      body = payload;
    } else {
      const json: Record<string, unknown> = {};
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) json[key] = value;
      });
      if (imageRemoved) json.image = null;
      body = JSON.stringify(json);
    }

    // No explicit Content-Type: useAdminFetch sets JSON for string bodies and
    // lets the browser set the multipart boundary for FormData.
    const res = editing
      ? await adminFetch(`/api/promos/${editing.id}`, { method: 'PATCH', body })
      : await adminFetch('/api/promos', { method: 'POST', body });

    if (res.ok) {
      closeModal();
      await fetchPopups();
      void revalidateStorefront(['/']);
      showNotice(editing ? 'Promo popup updated.' : 'Promo popup created.');
    } else {
      const data = await res.json().catch(() => ({}));
      const message = apiErrorMessage(data, 'Failed to save promo popup.');
      setFormError(message);
      showNotice(message);
    }
    setSaving(false);
  };

  const handleToggle = async (popup: PromoPopup) => {
    const res = await adminFetch(`/api/promos/${popup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !popup.is_active }),
    });
    if (res.ok) {
      setPopups((prev) => prev.map((p) => (p.id === popup.id ? { ...p, is_active: !p.is_active } : p)));
    }
  };

  const handleDelete = async (popup: PromoPopup) => {
    const res = await adminFetch(`/api/promos/${popup.id}`, { method: 'DELETE' });
    if (res.ok) {
      // Drop it locally right away, then re-sync with the server.
      setPopups((prev) => prev.filter((p) => p.id !== popup.id));
      await fetchPopups();
      showNotice('Promo popup deleted.');
    } else {
      const data = await res.json().catch(() => ({}));
      showNotice(apiErrorMessage(data, 'Could not delete the promo popup.'));
    }
  };

  const inputClass =
    'h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white';

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Promo popups"
        description="Control the offer popups customers see on the storefront."
        actions={
          <button
            type="button"
            onClick={() => openModal(null)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
          >
            <Plus size={16} />
            New popup
          </button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border-color bg-white">
        {loading ? (
          <div className="px-5 py-16 text-center text-[12.5px] text-text-secondary">Loading popups…</div>
        ) : popups.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-text-muted">
              <Megaphone size={22} />
            </div>
            <p className="text-[15px] font-semibold text-text-primary">No promo popups yet</p>
            <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-secondary">
              Create one to show a coupon offer or campaign popup to customers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-color bg-white text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">Popup</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Placement</th>
                  <th className="px-6 py-3.5">Delay</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {popups.map((popup) => (
                  <tr key={popup.id} className="transition-colors hover:bg-bg-secondary/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {popup.image_url ? (
                          <img
                            src={mediaUrl(popup.image_url)}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-lg border border-border-color object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-text-muted">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-text-primary">
                            {popup.display_title || popup.title}
                          </div>
                          {popup.display_title ? (
                            <div className="truncate text-[11.5px] text-text-secondary">
                              {popup.title}
                            </div>
                          ) : null}
                          {popup.badge_label && (
                            <div className="truncate text-[11.5px] text-text-secondary">
                              {popup.badge_label}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {popup.promo_code ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border-color bg-bg-secondary px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-text-primary">
                          <Copy size={11} />
                          {popup.promo_code}
                        </span>
                      ) : (
                        <span className="text-[12px] text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[12.5px] text-text-secondary">
                      {popup.placement === 'all' ? 'Everywhere' : 'Homepage'}
                    </td>
                    <td className="px-6 py-4 text-[12.5px] text-text-secondary">
                      {popup.delay_seconds}s
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={popup.is_active}
                          aria-label={`Toggle ${popup.title}`}
                          onClick={() => handleToggle(popup)}
                          className={clsx(
                            'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
                            popup.is_active ? 'bg-emerald-500' : 'bg-gray-200'
                          )}
                        >
                          <span
                            className={clsx(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-[#fff] transition-all duration-200',
                              popup.is_active ? 'left-[18px]' : 'left-0.5'
                            )}
                          />
                        </button>
                        <span
                          className={clsx(
                            'w-14 text-left text-[11.5px] font-semibold',
                            popup.is_active ? 'text-emerald-700' : 'text-text-secondary'
                          )}
                        >
                          {popup.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openModal(popup)}
                          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                          aria-label={`Edit ${popup.title}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(popup)}
                          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                          aria-label={`Delete ${popup.title}`}
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
      </div>

      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={closeModal}
            className="absolute inset-0 bg-black/30"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="popup-modal-title"
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border-color bg-white"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-color px-6 py-5">
              <div>
                <h2
                  id="popup-modal-title"
                  className="font-display text-[20px] font-semibold tracking-[-0.02em] text-text-primary"
                >
                  {editing ? 'Edit promo popup' : 'New promo popup'}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-text-secondary">
                  Set the offer, the audience and when it appears.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Internal name
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Summer GPU campaign"
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-[11px] text-text-muted">Only used to find this popup in the admin.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Popup title <span className="font-normal normal-case text-text-muted">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.display_title}
                    onChange={(e) => setForm((p) => ({ ...p, display_title: e.target.value }))}
                    placeholder="300TK DISCOUNT ON GAMEPAD"
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-[11px] text-text-muted">Headline shown to customers. Leave empty to hide it.</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Message
                </label>
                <textarea
                  rows={2}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Use the code below to get an instant discount."
                  className={`${inputClass} h-auto resize-none py-2.5`}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Badge / Eyebrow
                  </label>
                  <input
                    type="text"
                    value={form.badge_label}
                    onChange={(e) => setForm((p) => ({ ...p, badge_label: e.target.value }))}
                    placeholder="Limited time"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Promo code
                  </label>
                  <input
                    type="text"
                    value={form.promo_code}
                    onChange={(e) => setForm((p) => ({ ...p, promo_code: e.target.value.toUpperCase() }))}
                    placeholder="TECH10"
                    className={`${inputClass} font-bold uppercase tracking-[0.1em]`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Button label
                  </label>
                  <input
                    type="text"
                    value={form.cta_label}
                    onChange={(e) => setForm((p) => ({ ...p, cta_label: e.target.value }))}
                    placeholder="Shop Now"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Button link
                  </label>
                  <input
                    type="text"
                    value={form.cta_href}
                    onChange={(e) => setForm((p) => ({ ...p, cta_href: e.target.value }))}
                    placeholder="/deals"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Layout
                </label>
                <select
                  value={form.layout}
                  onChange={(e) => setForm((p) => ({ ...p, layout: e.target.value as PopupForm['layout'] }))}
                  className={inputClass}
                >
                  <option value="simple">Text offer — headline, message & coupon code</option>
                  <option value="images">Images only — linked image tiles</option>
                </select>
              </div>

              {form.layout === 'images' && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Image tiles
                  </label>
                  <div className="space-y-2">
                    {form.logos.map((logo, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-color bg-bg-secondary">
                          {logoPreviews[index] && !logoRemoved[index] ? (
                            <img
                              src={logoPreviews[index] ?? undefined}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <ImageIcon size={16} className="text-text-muted" />
                          )}
                          {(logoPreviews[index] || logoFiles[index]) && !logoRemoved[index] ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLogoRemoved((prev) => {
                                  const next = [...prev];
                                  next[index] = true;
                                  return next;
                                });
                                setLogoFiles((prev) => {
                                  const next = [...prev];
                                  next[index] = null;
                                  return next;
                                });
                                setLogoPreviews((prev) => {
                                  const next = [...prev];
                                  next[index] = null;
                                  return next;
                                });
                              }}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-text-primary/80 text-white transition-colors hover:bg-danger"
                              aria-label={`Remove image tile ${index + 1}`}
                            >
                              <X size={11} />
                            </button>
                          ) : null}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setLogoRemoved((prev) => {
                              const next = [...prev];
                              next[index] = false;
                              return next;
                            });
                            setLogoFiles((prev) => {
                              const next = [...prev];
                              next[index] = file;
                              return next;
                            });
                            if (file) {
                              setLogoPreviews((prev) => {
                                const next = [...prev];
                                next[index] = URL.createObjectURL(file);
                                return next;
                              });
                            }
                          }}
                          className="w-40 text-[11.5px] text-text-secondary file:mr-2 file:rounded-md file:border-0 file:bg-bg-secondary file:px-2 file:py-1 file:text-[11.5px] file:font-semibold file:text-text-primary"
                        />
                        <input
                          type="text"
                          value={logo.caption}
                          onChange={(e) =>
                            setForm((p) => {
                              const next = [...p.logos];
                              next[index] = { ...next[index], caption: e.target.value };
                              return { ...p, logos: next };
                            })
                          }
                          placeholder="Caption"
                          className={`${inputClass} flex-1`}
                        />
                        <input
                          type="text"
                          value={logo.href}
                          onChange={(e) =>
                            setForm((p) => {
                              const next = [...p.logos];
                              next[index] = { ...next[index], href: e.target.value };
                              return { ...p, logos: next };
                            })
                          }
                          placeholder="Link (optional)"
                          className={`${inputClass} flex-1`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  {form.layout === 'images' ? 'Fallback image (shown if no tiles)' : 'Image'}
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {preview && !imageRemoved ? (
                      <img
                        src={preview}
                        alt=""
                        className="h-16 w-24 rounded-lg border border-border-color object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-bg-secondary text-text-muted">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    {preview && !imageRemoved ? (
                      <button
                        type="button"
                        onClick={() => {
                          setImageRemoved(true);
                          setImageFile(null);
                          setPreview(null);
                        }}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-text-primary/80 text-white transition-colors hover:bg-danger"
                        aria-label="Remove image"
                      >
                        <X size={11} />
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImageFile(file);
                      setImageRemoved(false);
                      if (file) setPreview(URL.createObjectURL(file));
                    }}
                    className="text-[12px] text-text-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Placement
                  </label>
                  <select
                    value={form.placement}
                    onChange={(e) => setForm((p) => ({ ...p, placement: e.target.value as PopupForm['placement'] }))}
                    className={inputClass}
                  >
                    <option value="home">Homepage</option>
                    <option value="all">Everywhere</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.delay_seconds}
                    placeholder="3"
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        delay_seconds: e.target.value === '' ? '' : Number(e.target.value) || 0,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.position}
                    onChange={(e) => setForm((p) => ({ ...p, position: Number(e.target.value) || 0 }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Starts at
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Ends at
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-[12.5px] font-medium text-text-primary">
                <input
                  type="checkbox"
                  checked={form.show_once_per_session}
                  onChange={(e) => setForm((p) => ({ ...p, show_once_per_session: e.target.checked }))}
                  className="h-4 w-4 accent-[#8a5a2b]"
                />
                Show only once per session
              </label>

              <label className="flex items-center gap-2.5 text-[12.5px] font-medium text-text-primary">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-[#8a5a2b]"
                />
                Active
              </label>
            </div>

            {formError ? (
              <div className="mx-6 mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[12.5px] font-medium text-danger">
                {formError}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-border-color px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 items-center rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="inline-flex h-10 items-center rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save popup'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete promo popup?"
        message={
          <>
            This removes <strong className="font-semibold text-foreground">{deleteTarget?.title}</strong> from the
            storefront. This cannot be undone.
          </>
        }
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-black/10 bg-text-primary px-4 py-3 text-[12.5px] font-medium text-white">
          <Clock3 size={16} className="shrink-0 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
