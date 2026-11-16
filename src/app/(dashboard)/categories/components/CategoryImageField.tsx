'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import { mediaUrl } from '../../../../shared/lib/media';

interface CategoryImageFieldProps {
  categoryId: string;
  image: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Large category artwork used by the "Cards" homepage layout. Transparent PNG
 * is the intended format; the preview sits on a checkerboard so it's obvious.
 */
export function CategoryImageField({ categoryId, image, onChange }: CategoryImageFieldProps) {
  const [preview, setPreview] = useState<string | null>(image);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`/api/categories/${categoryId}/image`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || json?.error || 'Upload failed');
      const url = json.image ?? json.data?.image ?? null;
      setPreview(url);
      onChange(url);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${categoryId}/image`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not remove the image');
      setPreview(null);
      onChange(null);
    } catch (err: any) {
      setError(err?.message || 'Could not remove the image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Card image
      </label>

      <div
        className={clsx(
          'flex items-center gap-3 rounded-xl border border-dashed p-3 transition-colors',
          dragging
            ? 'border-accent-primary bg-accent-primary/[0.06]'
            : 'border-black/15 bg-black/[0.015]'
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        onPaste={(event) => {
          const item = Array.from(event.clipboardData.items).find((i) =>
            i.type.startsWith('image/')
          );
          const file = item?.getAsFile();
          if (file) {
            event.preventDefault();
            void upload(file);
          }
        }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10"
          style={{
            backgroundImage:
              'repeating-conic-gradient(#eef2f7 0% 25%, #ffffff 0% 50%)',
            backgroundSize: '14px 14px',
          }}
        >
          {preview ? (
            <img
              src={mediaUrl(preview)}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          ) : busy ? (
            <Loader2 size={18} className="animate-spin text-text-muted" />
          ) : (
            <ImagePlus size={20} className="text-text-muted" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-primary hover:text-accent-primary disabled:opacity-60"
          >
            <UploadCloud size={14} />
            {preview ? 'Replace image' : 'Upload, paste or drop'}
          </button>
          <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
            Transparent PNG, square. Shown on the homepage card.
          </p>
          {preview && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-danger hover:underline disabled:opacity-60"
            >
              <Trash2 size={11} />
              Remove
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = '';
          }}
        />
      </div>

      {error && (
        <p className="mt-1.5 rounded-md bg-danger/10 px-2 py-1.5 text-[11px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}


interface PendingCategoryImageProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

/**
 * Card image picker for a category that hasn't been created yet — the file is
 * held in memory and uploaded right after the category is saved.
 */
export function PendingCategoryImage({ file, onChange }: PendingCategoryImageProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (next: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
    onChange(next);
  };

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Card image
      </label>
      <div
        className={clsx(
          'flex items-center gap-3 rounded-xl border border-dashed p-3 transition-colors',
          dragging ? 'border-accent-primary bg-accent-primary/[0.06]' : 'border-black/15 bg-black/[0.015]'
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) pick(dropped);
        }}
        onPaste={(event) => {
          const item = Array.from(event.clipboardData.items).find((i) => i.type.startsWith('image/'));
          const pasted = item?.getAsFile();
          if (pasted) {
            event.preventDefault();
            pick(pasted);
          }
        }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10"
          style={{
            backgroundImage: 'repeating-conic-gradient(#eef2f7 0% 25%, #ffffff 0% 50%)',
            backgroundSize: '14px 14px',
          }}
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <ImagePlus size={20} className="text-text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-primary hover:text-accent-primary"
          >
            <UploadCloud size={14} />
            {file ? 'Replace image' : 'Upload, paste or drop'}
          </button>
          <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
            Transparent PNG, square. Uploaded when you save.
          </p>
          {file && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-danger hover:underline"
            >
              <Trash2 size={11} />
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) pick(selected);
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
