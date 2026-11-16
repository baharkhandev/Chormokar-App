/**
 * Ask the admin's server to trigger a storefront revalidation, so edits show
 * up immediately instead of waiting for the storefront's ISR window.
 * Pass the cache tags the changed content belongs to (e.g. 'brands').
 */
export async function revalidateStorefront(
  paths: string[] = ['/'],
  tags: string[] = ['banners']
): Promise<void> {
  const targets = paths.length > 0 ? paths : ['/'];
  await Promise.all(
    targets.map(async (path) => {
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, tags }),
        });
      } catch {
        // Revalidation is best-effort — never block the admin save on it.
      }
    })
  );
}
