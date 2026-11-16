import type { LucideProps } from 'lucide-react';

/**
 * Adapter that lets Flaticon Uicons (free webfont set) be used anywhere a
 * Lucide icon is expected. Icons are rendered as a font glyph, so they inherit
 * `currentColor` and scale with `size` like the SVG icons do.
 *
 * License: free for commercial use with attribution —
 * "Uicons by Flaticon" (https://www.flaticon.com/uicons). See the storefront
 * footer for the required credit link.
 */
export function uicon(name: string) {
  function UiconGlyph({ size = 24, className }: LucideProps) {
    return (
      <i
        aria-hidden="true"
        data-uicon={name}
        className={className ? `fi ${name} ${className}` : `fi ${name}`}
        style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}
      />
    );
  }

  UiconGlyph.displayName = name;
  return UiconGlyph;
}

export const UICONS_ATTRIBUTION = {
  label: 'Uicons by Flaticon',
  href: 'https://www.flaticon.com/uicons',
} as const;
