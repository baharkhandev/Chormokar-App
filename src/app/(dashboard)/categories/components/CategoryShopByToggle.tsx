'use client';

import { Loader2, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../../shared/categories/types';

export interface CategoryShopByToggleProps {
  category: Category;
  isToggling: boolean;
  onToggle: (category: Category) => void;
  size?: 'sm' | 'md';
}

/**
 * One-click placement in the homepage "Shop by category" grid. Turns green when
 * the category is in that grid, matching the status pill beside it.
 */
export function CategoryShopByToggle({
  category,
  isToggling,
  onToggle,
  size = 'md',
}: CategoryShopByToggleProps) {
  const isSm = size === 'sm';
  const active = category.show_in_shop_by === true;

  return (
    <button
      type="button"
      onClick={() => onToggle(category)}
      disabled={isToggling}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center rounded-full font-bold border transition-all cursor-pointer',
        isSm ? 'gap-1 px-2.5 py-0.5 text-xs' : 'gap-1.5 px-3 py-1 text-xs',
        active
          ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
          : 'bg-black/5 text-text-muted border-black/10 hover:bg-black/10',
        isToggling && 'opacity-60 cursor-not-allowed'
      )}
      title={
        active
          ? 'Shown in Shop by category — click to change its icon or position'
          : 'Add this category to the homepage "Shop by category" grid'
      }
    >
      {isToggling ? (
        <Loader2 size={isSm ? 10 : 12} className="animate-spin" />
      ) : (
        <LayoutGrid size={isSm ? 10 : 12} />
      )}
      {isSm ? 'Shop by' : 'Shop by category'}
    </button>
  );
}
