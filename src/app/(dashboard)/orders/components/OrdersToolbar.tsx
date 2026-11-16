'use client';

import { Search, Filter } from 'lucide-react';

export interface OrdersToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalOrders: number;
  showingCount: number;
}

export function OrdersToolbar({
  searchQuery,
  onSearchChange,
  totalOrders,
  showingCount,
}: OrdersToolbarProps) {
  return (
    <div className="p-4 sm:p-5 border-b border-black/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-black/[0.01]">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search by order ID or customer..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all shadow-2xs"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-medium text-text-secondary hover:bg-black/[0.02] transition-colors cursor-pointer"
        >
          <Filter size={16} /> Filters
        </button>
      </div>

      <div className="text-xs text-text-muted font-medium self-end sm:self-auto">
        Showing <strong className="text-text-primary">1–{showingCount}</strong> of{' '}
        <strong className="text-text-primary">{totalOrders}</strong> orders
      </div>
    </div>
  );
}
