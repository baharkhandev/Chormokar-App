'use client';

import { useEffect } from 'react';

const TABLE_SELECTOR = 'main table';

/**
 * Turns data tables into stacked cards on small screens by copying each
 * table's header labels onto its cells as `data-label`. The matching layout
 * lives in globals.css (`.responsive-table` at <= 767px).
 *
 * Kept generic on purpose: the admin has ~15 bespoke tables, and this keeps
 * them responsive without duplicating every row as a separate mobile list.
 */
function labelTable(table: HTMLTableElement) {
  if (table.dataset.responsive === 'off') return;
  if (table.closest('[data-no-responsive], [contenteditable="true"], .ProseMirror')) return;

  const headerRow = table.tHead?.rows?.[0];
  if (!headerRow) return;

  const labels = Array.from(headerRow.cells).map((cell) =>
    (cell.textContent || '').replace(/\s+/g, ' ').trim()
  );

  table.classList.add('responsive-table');

  table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
    Array.from(row.cells).forEach((cell, index) => {
      if (!cell.hasAttribute('data-label')) {
        cell.setAttribute('data-label', labels[index] || '');
      }
    });
  });
}

export function ResponsiveTables() {
  useEffect(() => {
    const scan = () => {
      document.querySelectorAll<HTMLTableElement>(TABLE_SELECTOR).forEach(labelTable);
    };

    scan();

    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
