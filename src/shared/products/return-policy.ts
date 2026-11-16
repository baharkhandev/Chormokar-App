/**
 * The shop no longer offers a replacement guarantee. Products created before
 * that decision still carry the old text, so it is dropped when the form loads
 * the product instead of being re-saved.
 */
const REPLACEMENT_PROMISE = /replac/i;

export function returnPolicyForForm(value: string | null | undefined): string {
  const text = (value || '').trim();
  return REPLACEMENT_PROMISE.test(text) ? '' : text;
}
