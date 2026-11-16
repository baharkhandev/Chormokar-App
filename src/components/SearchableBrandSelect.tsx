'use client';

import { useState, useRef, useEffect, useMemo, useId, type KeyboardEvent } from 'react';
import { Search, ChevronDown, Check, X, Building2, ExternalLink, Plus } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

function resolveBrandLogo(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('/api/v1', '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

export interface BrandOption {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  is_official_partner?: boolean;
}

interface SearchableBrandSelectProps {
  value: string; // brand name or id
  brandId?: string;
  onChange: (brandName: string, brandId?: string) => void;
  brands: BrandOption[];
  loading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableBrandSelect({
  value,
  brandId,
  onChange,
  brands,
  loading = false,
  placeholder = 'Select a brand...',
  className,
  disabled = false,
}: SearchableBrandSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Find the selected brand by ID or name
  const selectedBrand = useMemo(() => {
    if (!value && !brandId) return null;
    return (
      brands.find(
        (b) =>
          (brandId && b.id === brandId) ||
          (value && (b.name.toLowerCase() === value.toLowerCase() || b.id === value || b.slug === value))
      ) || null
    );
  }, [brands, value, brandId]);

  // Filtered brands based on search query
  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.slug && b.slug.toLowerCase().includes(q))
    );
  }, [brands, search]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(-1);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelect = (brand: BrandOption | null) => {
    if (!brand) {
      onChange('', '');
    } else {
      onChange(brand.name, brand.id);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredBrands.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex === -1 && !search.trim()) {
        handleSelect(null);
      } else if (activeIndex >= 0 && activeIndex < filteredBrands.length) {
        handleSelect(filteredBrands[activeIndex]);
      } else if (filteredBrands.length === 1) {
        handleSelect(filteredBrands[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const displayName = selectedBrand ? selectedBrand.name : value || '';

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      {/* Trigger Button - Strictly selection only, no typing */}
      <button
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={clsx(
          'w-full bg-black/[0.02] border border-black/10 text-text-primary px-4 py-3 pr-3.5 rounded-xl text-sm',
          'hover:bg-black/[0.04] hover:border-black/20 focus:bg-white focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10 transition-all',
          'relative flex min-h-[46px] items-center justify-between gap-2 text-left cursor-pointer',
          isOpen && 'border-accent-primary ring-4 ring-accent-primary/10 bg-white',
          disabled && 'opacity-60 cursor-not-allowed bg-black/[0.04]'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          {selectedBrand ? (
            <>
              {selectedBrand.logo ? (
                <img
                  src={resolveBrandLogo(selectedBrand.logo)}
                  alt=""
                  className="h-5 w-5 rounded object-contain border border-black/10 bg-white p-0.5 shrink-0"
                />
              ) : (
                <div className="h-5 w-5 rounded bg-black/5 text-[10px] font-bold text-text-secondary flex items-center justify-center shrink-0">
                  {selectedBrand.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-text-primary truncate">{selectedBrand.name}</span>
              {selectedBrand.is_official_partner && (
                <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-accent-primary/10 text-accent-primary">
                  Official
                </span>
              )}
            </>
          ) : displayName ? (
            <>
              <Building2 size={16} className="text-text-muted shrink-0" />
              <span className="font-medium text-text-primary truncate">{displayName}</span>
            </>
          ) : (
            <span className="text-text-muted truncate select-none">{placeholder}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ChevronDown
            size={16}
            className={clsx(
              'text-text-muted transition-transform duration-200',
              isOpen && 'rotate-180 text-accent-primary'
            )}
          />
        </div>
      </button>

      {displayName && !disabled && (
        <button
          type="button"
          aria-label="Clear brand selection"
          onClick={(event) => {
            event.stopPropagation();
            handleSelect(null);
          }}
          className="absolute right-10 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary"
        >
          <X size={14} />
        </button>
      )}

      {/* Dropdown Menu with Live Search Option */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-black/10 shadow-[0_16px_40px_rgba(0,0,0,0.12)] p-2 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Search Bar inside Dropdown */}
          <div className="relative mb-2 px-1">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search existing brands..."
              className="w-full bg-black/[0.03] border border-black/10 rounded-xl pl-8 pr-8 py-2 text-xs text-text-primary placeholder:text-text-muted focus:bg-white focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin">
            {/* Clear / No brand option */}
            {!search && (
              <button
                type="button"
                role="option"
                aria-selected={!displayName}
                onClick={() => handleSelect(null)}
                className={clsx(
                  'w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between text-left transition-colors cursor-pointer',
                  !displayName ? 'bg-black/[0.04] text-text-primary' : 'text-text-secondary hover:bg-black/[0.02]',
                  activeIndex === -1 && 'bg-black/[0.04]'
                )}
              >
                <span className="italic text-text-muted">None / No Brand</span>
                {!displayName && <Check size={14} className="text-accent-primary shrink-0" />}
              </button>
            )}

            {loading ? (
              <div className="py-6 text-center text-xs text-text-muted">Loading brands...</div>
            ) : filteredBrands.length === 0 ? (
              <div className="py-6 px-3 text-center">
                <p className="text-xs text-text-muted mb-2">
                  No brands found matching <span className="font-semibold text-text-primary">&ldquo;{search}&rdquo;</span>
                </p>
                <Link
                  href="/brands"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline"
                >
                  <Plus size={12} />
                  Manage or create brands in Brands page
                  <ExternalLink size={10} />
                </Link>
              </div>
            ) : (
              filteredBrands.map((brand, idx) => {
                const isSelected = Boolean(
                  (brandId && brand.id === brandId) ||
                  (value && (brand.name.toLowerCase() === value.toLowerCase() || brand.id === value))
                );

                return (
                  <button
                    key={brand.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(brand)}
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-accent-primary/10 text-accent-primary font-semibold'
                        : activeIndex === idx
                        ? 'bg-black/[0.04] text-text-primary'
                        : 'text-text-primary hover:bg-black/[0.03]'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      {brand.logo ? (
                        <img
                          src={resolveBrandLogo(brand.logo)}
                          alt=""
                          className="h-5 w-5 rounded object-contain border border-black/10 bg-white p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded bg-black/5 text-[9px] font-bold text-text-secondary flex items-center justify-center shrink-0">
                          {brand.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{brand.name}</span>
                      {brand.is_official_partner && (
                        <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-medium bg-accent-primary/10 text-accent-primary">
                          Official
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-accent-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with link to Brands management */}
          <div className="mt-2 pt-2 border-t border-black/5 px-2 flex items-center justify-between text-[11px] text-text-muted">
            <span>{brands.length} brands total</span>
            <Link
              href="/brands"
              target="_blank"
              className="inline-flex items-center gap-1 font-semibold text-accent-primary hover:underline"
            >
              Manage Brands
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
