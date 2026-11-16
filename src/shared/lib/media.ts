/**
 * Media host mapping.
 *
 * The API can return local media paths (e.g. http://localhost:8000/media/...).
 * When media lives in Cloudflare R2, rewrite those to the public media domain
 * so the admin console always loads the real asset.
 */
const configuredMediaBase = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? '').replace(/\/$/, '');
const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api(?:\/v\d+)?\/?$/, '');
const MEDIA_BASE_URL = (configuredMediaBase || apiBase).replace(/\/$/, '');

const LOCAL_MEDIA_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/media\//i;

export function mediaUrl(url?: string | null): string {
  if (!url) return '';
  if (!MEDIA_BASE_URL) return url;
  return url.replace(LOCAL_MEDIA_PATTERN, `${MEDIA_BASE_URL}/`);
}
