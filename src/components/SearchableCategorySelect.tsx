'use client';

import { useState, useRef, useEffect, useMemo, useId, type KeyboardEvent } from 'react';
import { Search, ChevronDown, Check, X, FolderTree, ExternalLink, Plus } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parent?: string | null;
  parent_name?: string | null;
  path?: string;
  depth?: number;
  items_count?: number;
  is_active?: boolean;
}

interface SearchableCategorySelectProps {
  /** Selected category slug (or id). */
  value: string;
  onChange: (categorySlug: string, categoryId?: string) => void;
  categories: CategoryOption[];
  loading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function depthOf(category: CategoryOption): number {
  if (typeof category.depth === 'number' && category.depth > 0) return category.depth;
  if (category.path) return category.path.split('/').length;
  return 1;
}

export function SearchableCategorySelect({
  value,
  onChange,
  categories,
  loading = false,
  placeholder = 'Search or select a category...',
  className,
  disabled = false,
}: SearchableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const bySlug = useMemo(() => {
    const map = new Map<string, CategoryOption>();
    categories.forEach((category) => map.set(category.slug, category));
    return map;
  }, [categories]);

  const selectedCategory = useMemo(() => {
    if (!value) return null;
    const needle = value.toLowerCase();
    return (
      categories.find(
        (category) =>
          category.slug === value ||
          category.id === value ||
          category.name.toLowerCase() === needle
      ) || null
    );
  }, [categories, value]);

  /** Breadcrumb (ancestor names + own name) for the selected category. */
  const selectedTrail = useMemo(() => {
    if (!selectedCategory) return [] as string[];
    const slugs = selectedCategory.path?.split('/').filter(Boolean) || [];
    if (slugs.length === 0) return [selectedCategory.name];
    const names = slugs.map((slug) => bySlug.get(slug)?.name || slug);
    if (!names.includes(selectedCategory.name)) names.push(selectedCategory.name);
    return names;
  }, [selectedCategory, bySlug]);

  /** Searchable text includes ancestor names so a parent search finds children. */
  const withSearchText = useMemo(
    () =>
      categories.map((category) => {
        const slugs = category.path?.split('/').filter(Boolean) || [category.slug];
        const ancestorNames = slugs.map((slug) => bySlug.get(slug)?.name || slug);
        return {
          category,
          searchText: [
            category.name,
            category.slug,
            category.parent_name || '',
            ...ancestorNames,
          ]
            .join(' ')
            .toLowerCase(),
        };
      }),
    [categories, bySlug]
  );

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return withSearchText
      .filter((entry) => entry.searchText.includes(query))
      .map((entry) => entry.category);
  }, [categories, search, withSearchText]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const option = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );
    option?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const handleSelect = (category: CategoryOption | null) => {
    if (!category) {
      onChange('', '');
    } else {
      onChange(category.slug || category.id, category.id);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((previous) =>
        previous < filteredCategories.length - 1 ? previous + 1 : previous
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((previous) => (previous > -1 ? previous - 1 : -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex === -1 && !search.trim()) {
        handleSelect(null);
      } else if (activeIndex >= 0 && activeIndex < filteredCategories.length) {
        handleSelect(filteredCategories[activeIndex]);
      } else if (filteredCategories.length === 1) {
        handleSelect(filteredCategories[0]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const displayName = selectedCategory?.name || value;

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => !disabled && setIsOpen((previous) => !previous)}
        className={clsx(
          'w-full bg-black/[0.02] border border-black/10 text-text-primary px-4 py-3 pr-3.5 rounded-xl text-sm',
          'hover:bg-black/[0.04] hover:border-black/20 focus:bg-white focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10 transition-all',
          'relative flex min-h-[46px] items-center justify-between gap-2 text-left cursor-pointer',
          isOpen && 'border-accent-primary ring-4 ring-accent-primary/10 bg-white',
          disabled && 'opacity-60 cursor-not-allowed bg-black/[0.04]'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <FolderTree size={16} className="shrink-0 text-text-muted" />
          {selectedCategory ? (
            <div className="min-w-0">
              <div className="font-medium text-text-primary truncate">
                {selectedCategory.name}
              </div>
              {selectedTrail.length > 1 && (
                <div className="truncate text-[10px] text-text-muted">
                  {selectedTrail.slice(0, -1).join(' / ')}
                </div>
              )}
            </div>
          ) : displayName ? (
            <span className="font-medium text-text-primary truncate">{displayName}</span>
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
          aria-label="Clear category selection"
          onClick={(event) => {
            event.stopPropagation();
            handleSelect(null);
          }}
          className="absolute right-10 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary"
        >
          <X size={14} />
        </button>
      )}

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-black/10 shadow-[0_16px_40px_rgba(0,0,0,0.12)] p-2 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="relative mb-2 px-1">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search categories..."
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

          <div ref={listRef} className="max-h-64 overflow-y-auto space-y-0.5 scrollbar-thin">
            {!search && (
              <button
                type="button"
                role="option"
                aria-selected={!displayName}
                onClick={() => handleSelect(null)}
                className={clsx(
                  'w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between text-left transition-colors cursor-pointer',
                  !displayName
                    ? 'bg-black/[0.04] text-text-primary'
                    : 'text-text-secondary hover:bg-black/[0.02]',
                  activeIndex === -1 && 'bg-black/[0.04]'
                )}
              >
                <span className="italic text-text-muted">None / No Category</span>
                {!displayName && <Check size={14} className="text-accent-primary shrink-0" />}
              </button>
            )}

            {loading ? (
              <div className="py-6 text-center text-xs text-text-muted">Loading categories...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-6 px-3 text-center">
                <p className="text-xs text-text-muted mb-2">
                  {categories.length === 0 ? (
                    'No categories exist yet.'
                  ) : (
                    <>
                      No categories found matching{' '}
                      <span className="font-semibold text-text-primary">&ldquo;{search}&rdquo;</span>
                    </>
                  )}
                </p>
                <Link
                  href="/categories"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline"
                >
                  <Plus size={12} />
                  Manage or create categories
                  <ExternalLink size={10} />
                </Link>
              </div>
            ) : (
              filteredCategories.map((category, index) => {
                const isSelected =
                  category.id === selectedCategory?.id || category.slug === value;
                const depth = depthOf(category);
                const itemCount = category.items_count ?? 0;

                return (
                  <button
                    key={category.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-option-index={index}
                    onClick={() => handleSelect(category)}
                    title={category.path || category.name}
                    style={{ paddingLeft: `${12 + (depth - 1) * 16}px` }}
                    className={clsx(
                      'w-full py-2 pr-3 rounded-lg text-xs flex items-center justify-between text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-accent-primary/10 text-accent-primary font-semibold'
                        : activeIndex === index
                        ? 'bg-black/[0.04] text-text-primary'
                        : 'text-text-primary hover:bg-black/[0.03]',
                      category.is_active === false && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <FolderTree
                        size={13}
                        className={clsx(
                          'shrink-0',
                          isSelected ? 'text-accent-primary' : 'text-text-muted'
                        )}
                      />
                      <span className="truncate">{category.name}</span>
                      {category.is_active === false && (
                        <span className="shrink-0 rounded bg-black/5 px-1 py-0.5 text-[9px] font-medium text-text-muted">
                          Hidden
                        </span>
                      )}
                      {itemCount > 0 && (
                        <span className="shrink-0 text-[10px] font-normal text-text-muted">
                          {itemCount}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-accent-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-black/5 px-2 flex items-center justify-between text-[11px] text-text-muted">
            <span>
              {filteredCategories.length === categories.length
                ? `${categories.length} categories total`
                : `${filteredCategories.length} of ${categories.length} categories`}
            </span>
            <Link
              href="/categories"
              target="_blank"
              className="inline-flex items-center gap-1 font-semibold text-accent-primary hover:underline"
            >
              Manage Categories
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
