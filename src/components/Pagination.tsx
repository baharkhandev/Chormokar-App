'use client';

import { useState, type FormEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import clsx from 'clsx';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'items',
  loading = false,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const [jumpPage, setJumpPage] = useState('');

  const handleJumpSubmit = (e: FormEvent) => {
    e.preventDefault();
    const targetPage = parseInt(jumpPage, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      onPageChange(targetPage);
      setJumpPage('');
    }
  };

  const startItem = totalCount === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="p-4 sm:p-5 border-t border-black/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-secondary bg-black/[0.01]">
      {/* Summary & Page Size */}
      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-1.5 font-medium">
          <span>Showing</span>
          <strong className="text-text-primary">{startItem}</strong>
          <span>–</span>
          <strong className="text-text-primary">{endItem}</strong>
          <span>of</span>
          <strong className="text-text-primary">{totalCount}</strong>
          <span>{itemLabel}</span>
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size-select" className="text-text-muted">
              Per page:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={loading}
              className="px-2.5 py-1.5 bg-white border border-black/10 rounded-xl text-xs font-semibold text-text-primary focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all cursor-pointer hover:border-black/20"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center gap-1.5 self-center md:self-auto">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || loading}
          className="p-1.5 rounded-xl border border-black/10 bg-white hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="p-1.5 rounded-xl border border-black/10 bg-white hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers(currentPage, totalPages).map((p, idx) =>
            p === 'ellipsis' ? (
              <span
                key={`dots-${idx}`}
                className="w-8 h-8 flex items-center justify-center text-text-muted font-bold select-none text-xs"
              >
                …
              </span>
            ) : (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                disabled={loading}
                className={clsx(
                  'w-8 h-8 rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer',
                  p === currentPage
                    ? 'bg-accent-primary text-white shadow-xs font-bold'
                    : 'bg-white border border-black/10 text-text-secondary hover:text-text-primary hover:bg-black/5'
                )}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="p-1.5 rounded-xl border border-black/10 bg-white hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || loading}
          className="p-1.5 rounded-xl border border-black/10 bg-white hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>

        {/* Jump to page */}
        {totalPages > 5 && (
          <form
            onSubmit={handleJumpSubmit}
            className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-black/10"
          >
            <span className="text-text-muted text-[11px]">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={String(currentPage)}
              className="w-12 px-1.5 py-1 text-center bg-white border border-black/10 rounded-lg text-xs font-medium focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
            />
            <button
              type="submit"
              disabled={!jumpPage}
              className="px-2 py-1 bg-black/5 hover:bg-black/10 disabled:opacity-40 rounded-lg text-[11px] font-semibold text-text-primary transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
