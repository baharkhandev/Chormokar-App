'use client';

import { CornerDownRight, Folder } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../../shared/categories/types';
import { Pagination } from '../../../../components/Pagination';
import { CategoryIcon } from '../../../../shared/icons/CategoryIcon';
import { CategoryStatusToggle } from './CategoryStatusToggle';
import { CategoryShopByToggle } from './CategoryShopByToggle';
import { CategoryActions } from './CategoryActions';
import { CategoryEmptyState } from './CategoryEmptyState';

export interface CategoryTableViewProps {
  categories: Category[];
  childrenByParent: Map<string, Category[]>;
  loading: boolean;
  searchQuery: string;
  togglingStatusId: string | null;
  togglingShopById: string | null;
  onToggleShopBy: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
  onSelectParentFilter: (parentId: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onResetFilters: () => void;
  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  showPagination: boolean;
}

export function CategoryTableView({
  categories,
  childrenByParent,
  loading,
  searchQuery,
  togglingStatusId,
  togglingShopById,
  onToggleShopBy,
  onToggleStatus,
  onSelectParentFilter,
  onEdit,
  onDelete,
  onResetFilters,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  showPagination,
}: CategoryTableViewProps) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black/5 bg-black/[0.02]">
              <th className="p-4 pl-6 text-xs font-bold uppercase tracking-wider text-text-muted">
                Category Name
              </th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                Hierarchy Type
              </th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                Parent Category
              </th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                Products
              </th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                Status
              </th>
              <th className="p-4 pr-6 text-xs font-bold uppercase tracking-wider text-text-muted text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color/70">
            {loading && categories.length === 0 ? (
              // Skeleton loading rows
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black/5 shrink-0" />
                      <div className="space-y-1.5 w-44">
                        <div className="h-4 bg-black/5 rounded-md" />
                        <div className="h-3 bg-black/5 rounded-md w-28" />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 bg-black/5 rounded-md w-20" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 bg-black/5 rounded-md w-24" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 bg-black/5 rounded-md w-8" />
                  </td>
                  <td className="p-4">
                    <div className="h-6 bg-black/5 rounded-full w-16" />
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="h-8 bg-black/5 rounded-lg w-16 ml-auto" />
                  </td>
                </tr>
              ))
            ) : categories.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={6}>
                  <CategoryEmptyState
                    searchQuery={searchQuery}
                    onResetFilters={onResetFilters}
                  />
                </td>
              </tr>
            ) : (
              categories.map((cat) => {
                const isSub = Boolean(cat.parent);
                const childCount = (childrenByParent.get(cat.id) || []).length;

                return (
                  <tr key={cat.id} className="hover:bg-bg-secondary/40 transition-colors group">
                    {/* Name & Slug (with Indentation for subcategories) */}
                    <td className="p-4 pl-6">
                      <div className={clsx('flex items-center gap-3', isSub && 'pl-6')}>
                        {isSub ? (
                          <>
                            <CornerDownRight size={16} className="text-accent-primary shrink-0 opacity-70" />
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                              <CategoryIcon name={cat.icon} size={14} />
                            </div>
                          </>
                        ) : (
                          <div
                            className={clsx(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                              cat.is_active
                                ? 'bg-accent-primary/10 text-accent-primary'
                                : 'bg-black/5 text-text-muted'
                            )}
                          >
                            <CategoryIcon name={cat.icon} size={18} />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                            {cat.name}
                            {!isSub && childCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 text-text-secondary font-medium">
                                {childCount} subs
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted font-mono mt-0.5">
                            /{cat.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Hierarchy Type Badge */}
                    <td className="p-4 text-xs">
                      {isSub ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 font-bold border border-amber-500/20">
                          <CornerDownRight size={12} /> Subcategory
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-primary/10 text-accent-primary font-bold border border-accent-primary/20">
                          <Folder size={12} /> Main Category
                        </span>
                      )}
                    </td>

                    {/* Parent Category */}
                    <td className="p-4 text-sm font-medium text-text-secondary">
                      {cat.parent_name ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (cat.parent) onSelectParentFilter(cat.parent);
                          }}
                          className="bg-black/5 hover:bg-black/10 px-2.5 py-1 rounded-md text-text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Filter by this parent"
                        >
                          <CornerDownRight size={12} className="text-text-muted" />
                          <span>{cat.parent_name}</span>
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs font-medium">
                          — Top Level (Root)
                        </span>
                      )}
                    </td>

                    {/* Product count */}
                    <td className="p-4 text-sm font-bold text-text-primary">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-black/[0.03] text-xs">
                        {cat.items_count}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CategoryStatusToggle
                          category={cat}
                          isToggling={togglingStatusId === cat.id}
                          onToggle={onToggleStatus}
                        />
                        <CategoryShopByToggle
                          category={cat}
                          size="sm"
                          isToggling={togglingShopById === cat.id}
                          onToggle={onToggleShopBy}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                        <CategoryActions
                          category={cat}
                          showAddSub={!isSub}
                          addSubVariant="icon"
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {showPagination && totalCount > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          itemLabel="categories"
          loading={loading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </>
  );
}
