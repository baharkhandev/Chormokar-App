'use client';

import { Search, FolderTree, List } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../../shared/categories/types';

export interface CategoryToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onClearSearch: () => void;
  viewMode: 'tree' | 'table';
  onViewModeChange: (mode: 'tree' | 'table') => void;
  hasTreeData: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onHierarchyFilterChange: (filter: 'all' | 'main' | 'sub') => void;
  parentFilter: string;
  onParentFilterChange: (parentId: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void;
  parentsWithChildren: Category[];
  childrenByParent: Map<string, Category[]>;
}

export function CategoryToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  viewMode,
  onViewModeChange,
  hasTreeData,
  onExpandAll,
  onCollapseAll,
  onHierarchyFilterChange,
  parentFilter,
  onParentFilterChange,
  statusFilter,
  onStatusFilterChange,
  parentsWithChildren,
  childrenByParent,
}: CategoryToolbarProps) {
  return (
    <div className="border-b border-black/5 bg-black/[0.01] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
          <input
            type="text"
            placeholder="Search category, slug, or parent..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-14 text-sm text-text-primary transition-all placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted transition-colors hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {/* Parent filter */}
        {parentsWithChildren.length > 0 && (
          <select
            value={parentFilter}
            onChange={(e) => {
              onParentFilterChange(e.target.value);
              if (e.target.value !== 'all') {
                onHierarchyFilterChange('all');
              }
            }}
            className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-text-primary transition-all focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            aria-label="Filter by parent category"
          >
            <option value="all">All Parents</option>
            {parentsWithChildren.map((p) => {
              const count = (childrenByParent.get(p.id) || []).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.name} ({count} sub{count === 1 ? '' : 's'})
                </option>
              );
            })}
          </select>
        )}

        {/* Status filter */}
        <div className="flex items-center gap-0.5 rounded-lg bg-black/[0.04] p-0.5 text-xs">
          {([
            ['all', 'All Status'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onStatusFilterChange(key)}
              className={clsx(
                'rounded-md px-2.5 py-1.5 transition-all',
                statusFilter === key
                  ? 'bg-white font-semibold text-text-primary shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Expand / collapse */}
        {viewMode === 'tree' && hasTreeData && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExpandAll}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
              title="Expand all categories"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
              title="Collapse all categories"
            >
              Collapse All
            </button>
          </div>
        )}

        {/* View switch */}
        <div className="flex items-center rounded-xl bg-black/[0.04] p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => onViewModeChange('tree')}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all',
              viewMode === 'tree'
                ? 'bg-white font-bold text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            )}
            title="Hierarchical Tree View"
          >
            <FolderTree size={15} />
            <span>Tree View</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all',
              viewMode === 'table'
                ? 'bg-white font-bold text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            )}
            title="Flat Table View"
          >
            <List size={15} />
            <span>Table View</span>
          </button>
        </div>
      </div>
    </div>
  );
}
