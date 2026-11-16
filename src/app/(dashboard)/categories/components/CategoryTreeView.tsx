'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight, CornerDownRight, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { Category } from '../../../../shared/categories/types';
import { CategoryIcon } from '../../../../shared/icons/CategoryIcon';
import { CategoryStatusToggle } from './CategoryStatusToggle';
import { CategoryShopByToggle } from './CategoryShopByToggle';
import { CategoryActions } from './CategoryActions';
import { CategoryEmptyState } from './CategoryEmptyState';

export interface TreeItem {
  main: Category;
  children: Category[];
}

export interface CategoryTreeViewProps {
  treeData: TreeItem[];
  loading: boolean;
  searchQuery: string;
  expandedParents: Set<string>;
  togglingStatusId: string | null;
  togglingShopById: string | null;
  onToggleShopBy: (category: Category) => void;
  onToggleParent: (id: string) => void;
  onToggleStatus: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onResetFilters: () => void;
}

export function CategoryTreeView({
  treeData,
  loading,
  searchQuery,
  expandedParents,
  togglingStatusId,
  togglingShopById,
  onToggleShopBy,
  onToggleParent,
  onToggleStatus,
  onEdit,
  onDelete,
  onResetFilters,
}: CategoryTreeViewProps) {
  if (loading && treeData.length === 0) {
    return (
      <div className="divide-y divide-border-color/70">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/5" />
              <div className="w-10 h-10 rounded-xl bg-black/5" />
              <div className="space-y-1.5 w-48">
                <div className="h-4 bg-black/5 rounded-md" />
                <div className="h-3 bg-black/5 rounded-md w-28" />
              </div>
            </div>
            <div className="h-8 bg-black/5 rounded-lg w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <CategoryEmptyState
        searchQuery={searchQuery}
        onResetFilters={onResetFilters}
      />
    );
  }

  return (
    <div className="divide-y divide-border-color/70">
      {treeData.map(({ main, children }) => {
        const isExpanded = expandedParents.has(main.id);
        const hasChildren = children.length > 0;

        return (
          <div key={main.id} className="transition-colors group/item">
            {/* Main Category Header Row */}
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-bg-secondary/40 bg-white">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Expand / Collapse Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleParent(main.id)}
                  className={clsx(
                    'w-8 h-8 rounded-xl flex items-center justify-center transition-colors border cursor-pointer shrink-0',
                    hasChildren
                      ? 'border-black/10 bg-black/[0.02] hover:bg-black/5 text-text-primary'
                      : 'border-transparent text-text-muted/30 cursor-default'
                  )}
                  title={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'No subcategories'}
                  disabled={!hasChildren}
                >
                  {hasChildren ? (
                    isExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-black/20" />
                  )}
                </button>

                {/* Folder Icon */}
                <div
                  className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    main.is_active
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'bg-black/5 text-text-muted'
                  )}
                >
                  <CategoryIcon name={main.icon} size={20} />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-text-primary text-sm sm:text-base">
                      {main.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary font-bold border border-accent-primary/20">
                      Main Category
                    </span>
                    {hasChildren ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-bold border border-amber-500/20">
                        {children.length} {children.length === 1 ? 'subcategory' : 'subcategories'}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.03] text-text-muted font-medium">
                        0 subcategories
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted font-mono mt-0.5 flex items-center gap-3">
                    <span>/{main.slug}</span>
                    <span>•</span>
                    <span className="font-sans font-medium text-text-secondary">
                      {main.items_count} products
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Category Actions */}
              <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                <CategoryShopByToggle
                  category={main}
                  isToggling={togglingShopById === main.id}
                  onToggle={onToggleShopBy}
                />
                <CategoryStatusToggle
                  category={main}
                  isToggling={togglingStatusId === main.id}
                  onToggle={onToggleStatus}
                />

                <CategoryActions
                  category={main}
                  showAddSub
                  addSubVariant="pill"
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </div>

            {/* Subcategories (when expanded) */}
            {isExpanded && (
              <div className="bg-black/[0.015] border-t border-black/5 divide-y divide-border-color/70 pl-4 sm:pl-14 pr-4 sm:pr-6 py-2">
                {children.length === 0 ? (
                  <div className="py-3 text-xs text-text-muted flex items-center justify-between">
                    <span>No subcategories created yet under <strong>{main.name}</strong>.</span>
                    <Link
                      href={`/categories/new?parent=${main.id}`}
                      className="text-accent-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <Plus size={13} /> Add first subcategory
                    </Link>
                  </div>
                ) : (
                  children.map((child) => (
                    <div
                      key={child.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/child"
                    >
                      {/* Subcategory Name & Connector */}
                      <div className="flex items-center gap-3">
                        <CornerDownRight
                          size={16}
                          className="text-accent-primary shrink-0 ml-1 opacity-70"
                        />
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <CategoryIcon name={child.icon} size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary text-sm">
                              {child.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold border border-amber-500/20">
                              Subcategory
                            </span>
                          </div>
                          <div className="text-xs text-text-muted font-mono mt-0.5 flex items-center gap-2">
                            <span>/{child.slug}</span>
                            <span>•</span>
                            <span className="font-sans text-text-secondary">
                              {child.items_count} products
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subcategory Status & Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <CategoryShopByToggle
                          category={child}
                          size="sm"
                          isToggling={togglingShopById === child.id}
                          onToggle={onToggleShopBy}
                        />
                        <CategoryStatusToggle
                          category={child}
                          size="sm"
                          isToggling={togglingStatusId === child.id}
                          onToggle={onToggleStatus}
                        />

                        <div className="opacity-80 group-hover/child:opacity-100 transition-opacity">
                          <CategoryActions
                            category={child}
                            size="sm"
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  function toggleParent(id: string) {
    onToggleParent(id);
  }
}
