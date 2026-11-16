/**
 * Extract a human-readable message from a backend error payload.
 *
 * The API wraps errors as `{ success: false, error: { code, message, details } }`,
 * so `error` can be an object — never render it directly.
 */
export function apiErrorMessage(payload: any, fallback = 'Something went wrong'): string {
  const err = payload?.error ?? payload;

  if (typeof err === 'string' && err.trim()) return err;
  if (err?.message && typeof err.message === 'string') return err.message;

  if (Array.isArray(payload?.details) && payload.details.length > 0) {
    const messages = payload.details
      .map((d: any) => (typeof d === 'string' ? d : d?.message))
      .filter(Boolean);
    if (messages.length) return messages.join(', ');
  }

  if (Array.isArray(payload?.detail)) {
    const messages = payload.detail
      .map((d: any) => (typeof d === 'string' ? d : d?.message))
      .filter(Boolean);
    if (messages.length) return messages.join(', ');
  }

  if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;

  return fallback;
}
