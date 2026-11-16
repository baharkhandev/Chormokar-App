'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../../components';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';

interface Section {
  title: string;
  aliases: string[];
  labels?: string[];
}

interface SpecTemplate {
  id: string;
  name: string;
  slug: string;
  match_words: string;
  sections: Section[];
  is_active: boolean;
  position: number;
  products_count: number;
}

interface Draft {
  name: string;
  slug: string;
  matchWords: string;
  isActive: boolean;
  sections: Array<{ title: string; aliases: string; labels: string }>;
}

const EMPTY: Draft = {
  name: '',
  slug: '',
  matchWords: '',
  isActive: true,
  sections: [{ title: '', aliases: '', labels: '' }],
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDraft(template: SpecTemplate): Draft {
  return {
    name: template.name,
    slug: template.slug,
    matchWords: template.match_words,
    isActive: template.is_active,
    sections: (template.sections || []).map((section) => ({
      title: section.title,
      aliases: (section.aliases || []).join(', '),
      labels: (section.labels || []).join(', '),
    })),
  };
}

export default function SpecTemplatesPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [templates, setTemplates] = useState<SpecTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SpecTemplate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpecTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/spec-templates?page_size=200');
      if (!res.ok) return;
      const json = await res.json();
      const list: SpecTemplate[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.results)
            ? json.results
            : [];
      setTemplates(list);
    } catch {
      // keep the empty state
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus === 'authenticated') void load();
  }, [authStatus, load]);

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (template: SpecTemplate) => {
    setEditing(template);
    setDraft(toDraft(template));
    setError(null);
    setModalOpen(true);
  };

  const updateSection = (
    index: number,
    patch: Partial<{ title: string; aliases: string; labels: string }>
  ) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section
      ),
    }));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev.sections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, sections: next };
    });
  };

  const removeSection = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const addSection = () => {
    setDraft((prev) => ({
      ...prev,
      sections: [...prev.sections, { title: '', aliases: '', labels: '' }],
    }));
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Give the template a name.');
      return;
    }
    const sections = draft.sections
      .filter((section) => section.title.trim())
      .map((section) => ({
        title: section.title.trim(),
        aliases: section.aliases
          .split(',')
          .map((alias) => alias.trim())
          .filter(Boolean),
        labels: section.labels
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean),
      }));
    if (sections.length === 0) {
      setError('Add at least one section.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: (draft.slug.trim() || slugify(draft.name)).slice(0, 120),
        match_words: draft.matchWords.trim(),
        sections,
        is_active: draft.isActive,
      };
      const res = await adminFetch(
        editing ? `/api/spec-templates/${editing.id}` : '/api/spec-templates',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.detail || 'Could not save the template.');
      }
      setModalOpen(false);
      setNotice(editing ? 'Template updated.' : 'Template created.');
      window.setTimeout(() => setNotice(null), 3200);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save the template.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (template: SpecTemplate) => {
    try {
      const res = await adminFetch(`/api/spec-templates/${template.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete the template.');
      setNotice('Template deleted.');
      window.setTimeout(() => setNotice(null), 3200);
      await load();
    } catch (err: any) {
      setNotice(err?.message || 'Could not delete the template.');
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Specification Templates"
        description="The section order and block names used for each product family. Products pick the template that matches their category, and the value is reused when a product is created or edited."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        }
      />

      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/[0.03] text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            <tr>
              <th className="px-5 py-3 font-semibold">Template</th>
              <th className="px-4 py-3 font-semibold">Matches</th>
              <th className="px-4 py-3 font-semibold">Sections</th>
              <th className="px-4 py-3 font-semibold">Products</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-text-secondary">
                  Loading templates…
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-text-secondary">
                  No templates yet. Create one, or run <code>manage.py seed_spec_templates</code>.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="align-top hover:bg-black/[0.015]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 font-medium text-text-primary">
                      <Layers className="h-4 w-4 text-brand" />
                      {template.name}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-text-secondary">
                      {template.slug}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary">{template.match_words || '—'}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(template.sections || []).slice(0, 4).map((section) => (
                        <span
                          key={section.title}
                          className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[11px] text-text-secondary"
                        >
                          {section.title}
                        </span>
                      ))}
                      {(template.sections?.length || 0) > 4 && (
                        <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[11px] text-text-secondary">
                          +{(template.sections?.length || 0) - 4}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 tabular text-text-secondary">
                    {template.products_count}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        template.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-black/[0.05] text-text-secondary'
                      )}
                    >
                      {template.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(template)}
                        className="rounded-lg p-2 text-text-secondary hover:bg-black/[0.05] hover:text-text-primary"
                        aria-label={`Edit ${template.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(template)}
                        className="rounded-lg p-2 text-text-secondary hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Delete ${template.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete template?"
        message={
          <>
            <strong className="font-semibold text-foreground">{deleteTarget?.name}</strong> will be
            removed. Products keep their current specifications, but they stop following this
            structure. This cannot be undone.
          </>
        }
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void remove(target);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-text-primary">
                  {editing ? `Edit ${editing.name}` : 'New specification template'}
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Sections render top to bottom; warranty belongs last.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-text-secondary hover:bg-black/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-text-secondary">Name</span>
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        name: event.target.value,
                        slug: editing ? prev.slug : slugify(event.target.value),
                      }))
                    }
                    placeholder="Charger"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-text-secondary">Slug</span>
                  <input
                    value={draft.slug}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, slug: slugify(event.target.value) }))
                    }
                    placeholder="charger"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 font-mono text-xs"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-text-secondary">
                  Auto-match words
                </span>
                <textarea
                  value={draft.matchWords}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, matchWords: event.target.value }))
                  }
                  placeholder="charger, power adapter"
                  rows={Math.max(1, Math.ceil(draft.matchWords.length / 70))}
                  className="w-full resize-none rounded-xl border border-black/10 px-3 py-2 text-sm leading-relaxed [field-sizing:content]"
                />
                <span className="mt-1 block text-[11px] text-text-secondary">
                  Comma separated. A product whose category or name contains one of these uses this
                  template.
                </span>
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Sections</span>
                  <button
                    type="button"
                    onClick={addSection}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-black/[0.03]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add section
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.sections.map((section, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-start gap-2 rounded-xl border border-black/5 bg-black/[0.015] p-2"
                    >
                      <input
                        value={section.title}
                        onChange={(event) => updateSection(index, { title: event.target.value })}
                        placeholder="Section title, e.g. Power Output"
                        className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm"
                      />
                      <textarea
                        value={section.labels}
                        onChange={(event) => updateSection(index, { labels: event.target.value })}
                        placeholder="expected fields: Connection Type, Bluetooth, Range"
                        rows={Math.max(1, Math.ceil(section.labels.length / 52))}
                        className="w-full resize-none rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs leading-relaxed [field-sizing:content]"
                      />
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveSection(index, -1)}
                          className="rounded-md p-1.5 text-text-secondary hover:bg-black/5"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(index, 1)}
                          className="rounded-md p-1.5 text-text-secondary hover:bg-black/5"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(index)}
                          className="rounded-md p-1.5 text-text-secondary hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Active
              </label>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-black/5 px-5 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
