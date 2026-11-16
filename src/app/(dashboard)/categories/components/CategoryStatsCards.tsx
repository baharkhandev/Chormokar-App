'use client';

import { FolderTree, Folder, CornerDownRight } from 'lucide-react';

export interface CategoryStatsCardsProps {
  totalCount: number;
  mainCount: number;
  subCount: number;
}

export function CategoryStatsCards({ totalCount, mainCount, subCount }: CategoryStatsCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Card 1: All Categories */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-4.5 text-left">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            All Categories
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-text-secondary">
            <FolderTree size={16} />
          </div>
        </div>
        <div className="text-2xl font-bold text-text-primary">{totalCount}</div>
        <p className="mt-1 text-xs text-text-secondary">Entire catalog hierarchy</p>
      </div>

      {/* Card 2: Main Categories */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-4.5 text-left">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Main Categories
            </span>
            <span className="rounded bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-primary">
              Root
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <Folder size={16} />
          </div>
        </div>
        <div className="text-2xl font-bold text-accent-primary">{mainCount}</div>
        <p className="mt-1 text-xs text-text-secondary">Top-level parent categories</p>
      </div>

      {/* Card 3: Subcategories */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-4.5 text-left">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Subcategories
            </span>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
              Nested
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <CornerDownRight size={16} />
          </div>
        </div>
        <div className="text-2xl font-bold text-text-primary">{subCount}</div>
        <p className="mt-1 text-xs text-text-secondary">Child categories under parents</p>
      </div>
    </div>
  );
}
