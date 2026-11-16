'use client';

import { FolderTree } from 'lucide-react';

export interface CategoryEmptyStateProps {
  searchQuery?: string;
  onResetFilters: () => void;
}

export function CategoryEmptyState({
  searchQuery,
  onResetFilters,
}: CategoryEmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="max-w-xs mx-auto flex flex-col items-center justify-center gap-3 text-text-muted">
        <div className="w-12 h-12 rounded-2xl bg-black/[0.03] flex items-center justify-center text-text-muted">
          <FolderTree size={24} />
        </div>
        <p className="font-semibold text-text-primary text-base">No categories match your filters</p>
        <p className="text-xs text-text-secondary text-center">
          {searchQuery
            ? `No categories match "${searchQuery}".`
            : 'Try resetting the hierarchy, parent, or status filter.'}
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-2 btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
