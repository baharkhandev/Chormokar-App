'use client';

import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../../shared/categories/types';

export interface CategoryStatusToggleProps {
  category: Category;
  isToggling: boolean;
  onToggle: (category: Category) => void;
  size?: 'sm' | 'md';
}

export function CategoryStatusToggle({
  category,
  isToggling,
  onToggle,
  size = 'md',
}: CategoryStatusToggleProps) {
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      onClick={() => onToggle(category)}
      disabled={isToggling}
      className={clsx(
        'inline-flex items-center rounded-full font-bold border transition-all cursor-pointer',
        isSm ? 'gap-1 px-2.5 py-0.5 text-xs' : 'gap-1.5 px-3 py-1 text-xs',
        category.is_active
          ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
          : 'bg-black/5 text-text-muted border-black/10 hover:bg-black/10',
        isToggling && 'opacity-60 cursor-not-allowed'
      )}
      title="Click to toggle status"
    >
      {/* Fixed-width slot so swapping the dot for a spinner never reflows the row */}
      <span className="inline-flex w-3 shrink-0 items-center justify-center">
        {isToggling ? (
          <Loader2 size={isSm ? 10 : 12} className="animate-spin" />
        ) : (
          <span
            className={clsx(
              'rounded-full',
              isSm ? 'w-1 h-1' : 'w-1.5 h-1.5',
              category.is_active ? 'bg-success' : 'bg-text-muted'
            )}
          />
        )}
      </span>
      {category.is_active ? 'Active' : 'Inactive'}
    </button>
  );
}
