/**
 * Helpers for icons uploaded to the category-icon library.
 *
 * Uploaded icons are stored as media paths (e.g. `/media/categories/icons/...png`)
 * in `Category.icon`; everything else is a Lucide or custom icon name.
 */
import { mediaUrl } from '../lib/media';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/v1\/?$/, '');

export function isUploadedIcon(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith('/media/') || /^https?:\/\//i.test(value);
}

/** Absolute URL for an uploaded icon, honouring the R2 media base when set. */
export function uploadedIconUrl(value: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return mediaUrl(value);

  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || API_ORIGIN).replace(/\/$/, '');
  return mediaUrl(`${base}${value.startsWith('/') ? '' : '/'}${value}`);
}
