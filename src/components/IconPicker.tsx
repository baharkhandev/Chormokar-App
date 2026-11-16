'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ImagePlus, Loader2, Search, UploadCloud, X } from 'lucide-react';
import clsx from 'clsx';
import { ICON_BY_NAME, ICON_GROUPS, ICON_OPTIONS } from '../shared/icons/catalog';
import { UICON_NAMES } from '../shared/icons/uicons-names';
import { uicon } from '../shared/icons/uicons';
import { isUploadedIcon, uploadedIconUrl } from '../shared/icons/assets';

/**
 * Flaticon's free library has no literal TWS/earbud/neckband glyph, so common
 * shopper terms map to the closest exact glyphs it does have.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  tws: ['ear', 'headphones', 'headset'],
  earbuds: ['ear', 'headphones'],
  earbud: ['ear', 'headphones'],
  earphone: ['ear', 'headphones'],
  earphones: ['ear', 'headphones'],
  neckband: ['headphones', 'headset'],
  powerbank: ['battery-full', 'battery-bolt', 'battery-half'],
  airfryer: ['oven', 'microwave', 'blender'],
  gimbal: ['camera', 'drone', 'video'],
  ssd: ['server', 'database'],
  ram: ['microchip'],
  charger: ['plug', 'charging-station', 'battery-bolt'],
};

interface UploadedIcon {
  id: string;
  name: string;
  url: string;
}

interface IconPickerProps {
  /** Lucide icon name stored on the category, or an empty string. */
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
  hint?: string;
}

export function IconPicker({
  value,
  onChange,
  label = 'Category Icon',
  hint = 'Shown beside the category name on the storefront. Pick any icon, or leave it empty.',
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('All');
  const [uploads, setUploads] = useState<UploadedIcon[]>([]);
  const [uploadsLoaded, setUploadsLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedIsUpload = isUploadedIcon(value);
  const SelectedIcon = value && !selectedIsUpload ? ICON_BY_NAME[value] : undefined;

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  // Load the shared upload library the first time the panel opens.
  useEffect(() => {
    if (!open || uploadsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/category-icons', { cache: 'no-store' });
        const json = await res.json().catch(() => []);
        if (cancelled) return;
        setUploads(Array.isArray(json) ? json : (json.data ?? []));
      } catch {
        // Library is optional; ignore and let paste/upload still work.
      } finally {
        if (!cancelled) setUploadsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, uploadsLoaded]);

  const uploadIcon = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files can be used as an icon.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append('image', file);
      body.append('name', file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Uploaded icon');
      const res = await fetch('/api/category-icons', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || json?.detail || 'Upload failed');
      }
      const asset: UploadedIcon = json.data ?? json;
      setUploads((prev) => [asset, ...prev]);
      select(asset.url);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const item = Array.from(event.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    event.preventDefault();
    void uploadIcon(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadIcon(file);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ICON_OPTIONS.filter((option) => {
      if (group !== 'All' && option.group !== group) return false;
      if (!q) return true;
      return (
        option.name.toLowerCase().includes(q) ||
        option.label.toLowerCase().includes(q) ||
        option.group.toLowerCase().includes(q)
      );
    });
  }, [query, group]);

  const shownNames = useMemo(() => new Set(filtered.map((o) => o.name)), [filtered]);

  // The full Flaticon Uicons library (3,586 glyphs) joins the search results, so
  // anything in the free set is findable, not just our curated shortlist. Only
  // added while searching (2+ chars) to keep the browsing grid light.
  const libraryMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as typeof ICON_OPTIONS;

    const synonyms = SEARCH_SYNONYMS[q] ?? [];
    const seen = new Set<string>();

    return UICON_NAMES.filter(
      (name) => name.includes(q) || synonyms.includes(name)
    )
      .map((name) => `fi-rr-${name}`)
      .filter((name) => {
        if (shownNames.has(name) || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 72)
      .map((name) => ({
        name,
        label: name
          .slice('fi-rr-'.length)
          .replace(/-/g, ' ')
          .replace(/^./, (c) => c.toUpperCase()),
        group: 'Flaticon library',
        icon: uicon(name),
      }));
  }, [query, shownNames]);

  const results = useMemo(() => [...filtered, ...libraryMatches], [filtered, libraryMatches]);

  // Preserve catalog order while grouping for the browsable view.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof ICON_OPTIONS>();
    for (const option of results) {
      const bucket = map.get(option.group);
      if (bucket) {
        bucket.push(option);
      } else {
        map.set(option.group, [option]);
      }
    }
    return Array.from(map, ([group, options]) => ({ group, options }));
  }, [results]);

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className={clsx(
            'flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all',
            value ? 'pr-16' : 'pr-10',
            open
              ? 'border-accent-primary bg-white ring-2 ring-accent-primary/20'
              : 'border-black/10 bg-black/[0.02] hover:border-black/20 hover:bg-black/[0.04]'
          )}
        >
          <span
            className={clsx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
              SelectedIcon
                ? 'border-accent-primary/20 bg-accent-primary/10 text-accent-primary'
                : 'border-black/10 bg-white text-text-muted'
            )}
          >
            {SelectedIcon ? (
              <SelectedIcon size={18} />
            ) : selectedIsUpload ? (
              <img
                src={uploadedIconUrl(value)}
                alt=""
                className="h-6 w-6 object-contain"
                aria-hidden="true"
              />
            ) : (
              <span className="text-[15px] leading-none">—</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-text-primary">
              {value ? (
                selectedIsUpload ? (
                  value.split('/').pop()
                ) : (
                  value
                )
              ) : (
                <span className="font-normal text-text-muted">
                  No icon — use the default folder
                </span>
              )}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2 shrink-0 text-text-muted transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>

        {value && (
          <button
            type="button"
            aria-label="Clear icon"
            onClick={() => select('')}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div
          className="mt-2 rounded-xl border border-black/10 bg-white p-3 shadow-sm"
          onPaste={handlePaste}
        >
          <div className="relative mb-2.5">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // Search spans the whole catalog, so drop any group filter.
                if (group !== 'All') setGroup('All');
              }}
              placeholder="Search icons, incl. Flaticon…"
              autoFocus
              className="h-9 w-full rounded-lg border border-black/10 bg-black/[0.02] pl-9 pr-3 text-[13px] text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white"
            />
          </div>

          <div className="mb-3 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['All', ...ICON_GROUPS] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setGroup(name)}
                className={clsx(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  group === name
                    ? 'border-accent-primary bg-accent-primary text-white'
                    : 'border-black/10 bg-black/[0.02] text-text-secondary hover:bg-black/[0.05] hover:text-text-primary'
                )}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Paste / drop your own icon */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={clsx(
              'mb-3 flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed px-3 py-2 text-left transition-colors',
              dragging
                ? 'border-accent-primary bg-accent-primary/[0.06]'
                : 'border-black/15 bg-black/[0.015] hover:border-accent-primary/40 hover:bg-black/[0.03]'
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            </span>
            <span className="min-w-0 text-[11.5px] leading-tight text-text-secondary">
              {uploading ? (
                'Uploading…'
              ) : (
                <>
                  <strong className="font-semibold text-text-primary">Paste (⌘V)</strong>{' '}
                  or drop a PNG here to add it to your library
                </>
              )}
            </span>
            <UploadCloud size={14} className="ml-auto shrink-0 text-text-muted" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadIcon(file);
                event.target.value = '';
              }}
            />
          </div>

          {uploadError && (
            <p className="mb-2 rounded-md bg-danger/10 px-2 py-1.5 text-[11px] font-medium text-danger">
              {uploadError}
            </p>
          )}

          {uploads.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[9.5px] font-bold uppercase tracking-wider text-text-muted">
                Your uploads
              </p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {uploads.map((asset) => {
                  const isSelected = asset.url === value;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => select(asset.url)}
                      title={asset.name || 'Uploaded icon'}
                      className={clsx(
                        'relative flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 transition-all',
                        isSelected
                          ? 'border-accent-primary bg-accent-primary/[0.07]'
                          : 'border-transparent hover:border-black/10 hover:bg-black/[0.03]'
                      )}
                    >
                      <img
                        src={uploadedIconUrl(asset.url)}
                        alt=""
                        aria-hidden="true"
                        className="h-5 w-5 object-contain"
                      />
                      <span className="line-clamp-1 w-full text-center text-[10px] font-medium leading-tight text-text-secondary">
                        {asset.name || 'Upload'}
                      </span>
                      {isSelected && (
                        <Check size={11} className="absolute right-1 top-1 text-accent-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="max-h-[264px] overflow-y-auto pr-0.5">
            {results.length === 0 && (
              <p className="py-6 text-center text-[12.5px] text-text-secondary">
                No icons match “{query}”.
              </p>
            )}
            {grouped.map((section) => (
              <div key={section.group} className="mb-2.5 last:mb-0">
                <p className="mb-1 text-[9.5px] font-bold uppercase tracking-wider text-text-muted">
                  {section.group}
                </p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                  {section.options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = option.name === value;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => select(option.name)}
                        title={`${option.label} — ${option.name}`}
                        className={clsx(
                          'relative flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 transition-all',
                          isSelected
                            ? 'border-accent-primary bg-accent-primary/[0.07] text-accent-primary'
                            : 'border-transparent text-text-secondary hover:border-black/10 hover:bg-black/[0.03] hover:text-text-primary'
                        )}
                      >
                        <Icon size={20} strokeWidth={1.6} />
                        <span className="line-clamp-2 min-h-[22px] w-full text-center text-[10px] font-medium leading-[1.15]">
                          {option.label}
                        </span>
                        {isSelected && (
                          <Check size={11} className="absolute right-1 top-1 text-accent-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hint && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
