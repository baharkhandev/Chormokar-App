'use client';

import Link from 'next/link';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../../shared/categories/types';

export interface CategoryActionsProps {
  category: Category;
  showAddSub?: boolean;
  addSubVariant?: 'pill' | 'icon';
  size?: 'sm' | 'md';
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryActions({
  category,
  showAddSub = false,
  addSubVariant = 'pill',
  size = 'md',
  onEdit,
  onDelete,
}: CategoryActionsProps) {
  const isSm = size === 'sm';

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Optional + Subcategory Action for Root/Main Categories */}
      {showAddSub && !category.parent && (
        addSubVariant === 'pill' ? (
          <Link
            href={`/categories/new?parent=${category.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-2xs mr-1"
            title={`Add subcategory under ${category.name}`}
          >
            <Plus size={14} className="text-accent-primary" />
            <span>+ Subcategory</span>
          </Link>
        ) : (
          <Link
            href={`/categories/new?parent=${category.id}`}
            className="p-1.5 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors cursor-pointer mr-1"
            title={`Add subcategory under ${category.name}`}
          >
            <Plus size={16} />
          </Link>
        )
      )}

      {/* Edit Category Button */}
      <button
        type="button"
        onClick={() => onEdit(category)}
        className={clsx(
          'text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors cursor-pointer',
          isSm ? 'p-1.5' : 'p-2'
        )}
        title={isSm ? 'Edit subcategory' : 'Edit category'}
      >
        <Edit2 size={isSm ? 15 : 16} />
      </button>

      {/* Delete Category Button */}
      <button
        type="button"
        onClick={() => onDelete(category)}
        className={clsx(
          'text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer',
          isSm ? 'p-1.5' : 'p-2'
        )}
        title={isSm ? 'Delete subcategory' : 'Delete category'}
      >
        <Trash2 size={isSm ? 15 : 16} />
      </button>
    </div>
  );
}
