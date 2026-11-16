'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiErrorMessage } from '../../../shared/api/errorMessage';
import { Plus, AlertCircle, Pencil, Trash2, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import clsx from 'clsx';
import type { Category } from '../../../shared/categories/types';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../shared/auth/AuthContext';
import { EditCategoryModal } from './EditCategoryModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { IconPicker } from '../../../components/IconPicker';
import { CategoryIcon } from '../../../shared/icons/CategoryIcon';
import { CategoryImageField, PendingCategoryImage } from './components/CategoryImageField';
import { mediaUrl } from '../../../shared/lib/media';
import {
  CategoryStatsCards,
  CategoryToolbar,
  CategoryTreeView,
  CategoryTableView,
} from './components';

export default function CategoriesPage() {
  return (
    <Suspense fallback={null}>
      <CategoriesPageContent />
    </Suspense>
  );
}

function CategoriesPageContent() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placementSaving, setPlacementSaving] = useState<string | null>(null);
  const [deletePlacementTarget, setDeletePlacementTarget] = useState<Category | null>(null);
  const [placementTab, setPlacementTabState] = useState<'nav' | 'shop'>(
    () => (searchParams?.get('tab') === 'shop' ? 'shop' : 'nav')
  );

  // Keep the active storefront-placement tab in the URL so a reload (or a
  // shared link) lands on the same tab.
  const setPlacementTab = (tab: 'nav' | 'shop') => {
    setPlacementTabState(tab);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (tab === 'shop') {
      params.set('tab', 'shop');
    } else {
      params.delete('tab');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Sync when the query changes from outside (back/forward, pasted link).
  useEffect(() => {
    setPlacementTabState(searchParams?.get('tab') === 'shop' ? 'shop' : 'nav');
  }, [searchParams]);
  const [placementModal, setPlacementModal] = useState<{ section: 'nav' | 'shop'; category: Category | null } | null>(null);
  const [placementForm, setPlacementForm] = useState({ name: '', slug: '', position: 0, icon: '' });
  const [placementBusy, setPlacementBusy] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [hierarchyFilter, setHierarchyFilter] = useState<'all' | 'main' | 'sub'>('all');
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Pagination state (for Table View)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<{
    count: number;
    page: number;
    total_pages: number;
  }>({ count: 0, page: 1, total_pages: 1 });

  // Refs to avoid stale closures in debounced effects
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const pageRef = useRef(page);
  pageRef.current = page;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;

  // Modals state
  const [selectedForEdit, setSelectedForEdit] = useState<Category | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Category | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [togglingShopById, setTogglingShopById] = useState<string | null>(null);
  const [shopByTarget, setShopByTarget] = useState<Category | null>(null);
  const [shopByForm, setShopByForm] = useState({ icon: '', position: 0 });
  const [shopByBusy, setShopByBusy] = useState(false);
  const [homepageStyle, setHomepageStyle] = useState<'icons' | 'cards' | 'hidden' | null>(null);
  const [homepageStyleBusy, setHomepageStyleBusy] = useState(false);
  const [imageFill, setImageFill] = useState(100);
  const imageFillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [layoutDraft, setLayoutDraft] = useState<'icons' | 'cards' | 'hidden'>('icons');
  const [pendingCardImage, setPendingCardImage] = useState<File | null>(null);

  // Fetch full category catalog (for Tree View, Parent Filter dropdown & counts)
  const fetchAllCategories = useCallback(async () => {
    try {
      const res = await adminFetch('/api/categories?all=true');
      if (!res.ok) return;
      const json = await res.json();
      const list: Category[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : [];
      setAllCategories(list);
    } catch (e) {
      console.error('Failed to load full category catalog:', e);
    }
  }, [adminFetch]);

  // Fetch paginated categories (for Table View)
  const fetchCategoriesData = useCallback(
    async (
      search: string = searchQueryRef.current,
      pageNum: number = pageRef.current,
      size: number = pageSizeRef.current
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        params.set('page', String(pageNum));
        params.set('page_size', String(size));

        const res = await adminFetch(`/api/categories?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(apiErrorMessage(errData, 'Failed to fetch categories'));
        }

        const json = await res.json();
        const dataList: Category[] = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
          ? json.data
          : [];

        setCategories(dataList);

        if (json.meta) {
          setMeta({
            count: json.meta.count ?? dataList.length,
            page: json.meta.page ?? pageNum,
            total_pages:
              json.meta.total_pages ??
              Math.max(1, Math.ceil((json.meta.count ?? dataList.length) / size)),
          });
        } else {
          setMeta({
            count: dataList.length,
            page: 1,
            total_pages: 1,
          });
        }
      } catch (err: any) {
        console.error('Error loading categories:', err);
        setError(err?.message || 'Error loading categories from backend');
      } finally {
        setLoading(false);
      }
    },
    [adminFetch]
  );

  // Initial load & search debounce
  useEffect(() => {
    if (authStatus === 'loading' || authStatus === 'idle' || authStatus === 'unauthenticated') {
      return;
    }

    fetchAllCategories();

    const timer = setTimeout(() => {
      setPage(1);
      fetchCategoriesData(searchQuery, 1, pageSizeRef.current);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, authStatus, fetchCategoriesData, fetchAllCategories]);

  // Expand / collapse parents in Tree View
  const toggleParent = (parentId: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allParentIds = new Set(allCategories.filter((c) => !c.parent).map((c) => c.id));
    setExpandedParents(allParentIds);
  };

  const collapseAll = () => {
    setExpandedParents(new Set());
  };

  const openPlacementModal = (section: 'nav' | 'shop', category: Category | null = null) => {
    setPlacementForm({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      position:
        section === 'nav' ? category?.position ?? 0 : category?.shop_by_position ?? 0,
      icon: category?.icon ?? '',
    });
    setPlacementModal({ section, category });
    setPlacementError(null);
    setPendingCardImage(null);
  };

  const savePlacement = async () => {
    if (!placementModal || !placementForm.name.trim()) return;
    const { section, category } = placementModal;
    const order = Number(placementForm.position) || 0;

    const payload = {
      name: placementForm.name.trim(),
      slug:
        placementForm.slug.trim() ||
        placementForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      position: section === 'nav' ? order : 0,
      show_in_nav: section === 'nav',
      show_in_shop_by: section === 'shop',
      shop_by_position: section === 'shop' ? order : 0,
      icon: placementForm.icon,
    };

    setPlacementBusy(true);
    setPlacementError(null);
    try {
      const res = category
        ? await adminFetch(`/api/categories/${category.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await adminFetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(apiErrorMessage(json, 'Failed to save category'));
      }

      // New category + a card image picked before saving: upload it now.
      const createdId: string | undefined = category?.id ?? json?.data?.id ?? json?.id;
      if (!category && pendingCardImage && createdId) {
        const form = new FormData();
        form.append('image', pendingCardImage);
        const upload = await fetch(`/api/categories/${createdId}/image`, {
          method: 'POST',
          body: form,
        });
        if (!upload.ok) {
          const uploadJson = await upload.json().catch(() => ({}));
          throw new Error(
            uploadJson?.detail ||
              uploadJson?.error ||
              'Category created, but the card image failed to upload.'
          );
        }
      }

      await fetchAllCategories();
      setPlacementModal(null);
      setPendingCardImage(null);
    } catch (err: any) {
      setPlacementError(err?.message || 'Failed to save category');
    } finally {
      setPlacementBusy(false);
    }
  };

  const deletePlacement = async (category: Category) => {
    const res = await adminFetch(`/api/categories/${category.id}`, { method: 'DELETE' });
    if (res.ok) {
      setAllCategories((prev) => prev.filter((c) => c.id !== category.id));
      await fetchAllCategories();
    }
  };

  const updatePlacement = async (
    id: string,
    patch: Partial<Pick<Category, 'position' | 'show_in_nav' | 'show_in_shop_by' | 'shop_by_position'>>
  ) => {
    setPlacementSaving(id);
    try {
      const res = await adminFetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setAllCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      }
    } finally {
      setPlacementSaving(null);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > meta.total_pages || newPage === page) return;
    setPage(newPage);
    fetchCategoriesData(searchQuery, newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    fetchCategoriesData(searchQuery, 1, newSize);
  };

  // Toggle active status
  const handleToggleStatus = async (cat: Category) => {
    setTogglingStatusId(cat.id);
    try {
      const newStatus = !cat.is_active;
      const res = await adminFetch(`/api/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(apiErrorMessage(json, 'Failed to toggle status'));
      }

      setCategories((prev) =>
        prev.map((item) => (item.id === cat.id ? { ...item, is_active: newStatus } : item))
      );
      setAllCategories((prev) =>
        prev.map((item) => (item.id === cat.id ? { ...item, is_active: newStatus } : item))
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update category status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // "Shop by" row button: open a confirm popup where icon/position are optional
  const nextShopByPosition = () =>
    Math.max(
      0,
      ...allCategories
        .filter((item) => item.show_in_shop_by === true)
        .map((item) => item.shop_by_position ?? 0)
    ) + 1;

  // Homepage layout switch (icon tiles / product cards / hidden)
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/homepage-settings', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const payload = json?.data ?? json;
        if (payload?.shop_by_category_style) setHomepageStyle(payload.shop_by_category_style);
        if (typeof payload?.category_image_fill === 'number') setImageFill(payload.category_image_fill);
      } catch {
        // Non-fatal: keep the control showing the default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  const updateHomepageStyle = async (style: 'icons' | 'cards' | 'hidden') => {
    setHomepageStyleBusy(true);
    const previous = homepageStyle;
    setHomepageStyle(style);
    try {
      const res = await adminFetch('/api/homepage-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_by_category_style: style }),
      });
      if (!res.ok) throw new Error('Failed to update layout');
    } catch {
      setHomepageStyle(previous);
    } finally {
      setHomepageStyleBusy(false);
    }
  };

  // Slider: moves locally, persists once the drag stops.
  const updateImageFill = (value: number) => {
    setImageFill(value);
    if (imageFillTimer.current) clearTimeout(imageFillTimer.current);
    imageFillTimer.current = setTimeout(() => {
      void adminFetch('/api/homepage-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_image_fill: value }),
      }).catch(() => undefined);
    }, 400);
  };

  const openShopByModal = (cat: Category) => {
    setShopByForm({
      icon: cat.icon ?? '',
      position:
        cat.show_in_shop_by === true ? cat.shop_by_position ?? 0 : nextShopByPosition(),
    });
    setShopByTarget(cat);
  };

  const applyShopBy = async (patch: Partial<Category>) => {
    const cat = shopByTarget;
    if (!cat) return;

    setShopByBusy(true);
    setTogglingShopById(cat.id);
    try {
      const res = await adminFetch(`/api/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(json, 'Failed to update shop placement'));
      }

      setCategories((prev) => prev.map((item) => (item.id === cat.id ? { ...item, ...patch } : item)));
      setAllCategories((prev) =>
        prev.map((item) => (item.id === cat.id ? { ...item, ...patch } : item))
      );
      setShopByTarget(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update shop placement');
    } finally {
      setShopByBusy(false);
      setTogglingShopById(null);
    }
  };

  const saveShopBy = () =>
    applyShopBy({
      show_in_shop_by: true,
      icon: shopByForm.icon,
      shop_by_position: Number(shopByForm.position) || 0,
    });

  const removeShopBy = () => applyShopBy({ show_in_shop_by: false });

  const updateCategoryImage = (categoryId: string, url: string | null) => {
    const patch = { image: url } as Partial<Category>;
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, ...patch } : c)));
    setAllCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, ...patch } : c)));
    setPlacementModal((prev) =>
      prev && prev.category && prev.category.id === categoryId
        ? { ...prev, category: { ...prev.category, ...patch } }
        : prev
    );
    setShopByTarget((prev) => (prev && prev.id === categoryId ? { ...prev, ...patch } : prev));
  };

  // Callback after category edited
  const handleSaveUpdated = (updatedCat: Category) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCat.id ? { ...c, ...updatedCat } : c))
    );
    setAllCategories((prev) =>
      prev.map((c) => (c.id === updatedCat.id ? { ...c, ...updatedCat } : c))
    );
  };

  // Callback after category deleted
  const handleDeleted = (deletedId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== deletedId));
    setAllCategories((prev) => prev.filter((c) => c.id !== deletedId));
    setMeta((prev) => {
      const newCount = Math.max(0, prev.count - 1);
      return {
        ...prev,
        count: newCount,
        total_pages: Math.max(1, Math.ceil(newCount / pageSize)),
      };
    });
  };

  // Hierarchy statistics & parent mapping
  const mainCategoriesList = useMemo(
    () => allCategories.filter((c) => !c.parent),
    [allCategories]
  );

  const subCategoriesList = useMemo(
    () => allCategories.filter((c) => Boolean(c.parent)),
    [allCategories]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    allCategories.forEach((c) => {
      if (c.parent) {
        const current = map.get(c.parent) || [];
        current.push(c);
        map.set(c.parent, current);
      }
    });
    return map;
  }, [allCategories]);

  // Parents that currently have at least one subcategory
  const parentsWithChildren = useMemo(
    () => mainCategoriesList.filter((m) => (childrenByParent.get(m.id) || []).length > 0),
    [mainCategoriesList, childrenByParent]
  );

  // Filtered categories for Table View
  const filteredCategoriesForTable = useMemo(() => {
    const baseList =
      hierarchyFilter !== 'all' || parentFilter !== 'all' ? allCategories : categories;

    return baseList.filter((cat) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = cat.name.toLowerCase().includes(query);
        const matchesSlug = cat.slug.toLowerCase().includes(query);
        const matchesParent = cat.parent_name?.toLowerCase().includes(query);
        if (!matchesName && !matchesSlug && !matchesParent) return false;
      }

      // Status filter
      if (statusFilter === 'active' && !cat.is_active) return false;
      if (statusFilter === 'inactive' && cat.is_active) return false;

      // Hierarchy filter
      if (hierarchyFilter === 'main' && cat.parent) return false;
      if (hierarchyFilter === 'sub' && !cat.parent) return false;

      // Specific parent filter
      if (parentFilter !== 'all') {
        const isChildOfParent = cat.parent === parentFilter;
        const isParentItself = cat.id === parentFilter;
        if (!isChildOfParent && !isParentItself) return false;
      }

      return true;
    });
  }, [categories, allCategories, searchQuery, statusFilter, hierarchyFilter, parentFilter]);

  // Filtered Tree Structure for Tree View
  const treeData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return mainCategoriesList
      .filter((main) => {
        if (parentFilter !== 'all' && main.id !== parentFilter) return false;

        const children = childrenByParent.get(main.id) || [];
        if (hierarchyFilter === 'sub' && children.length === 0) return false;

        if (statusFilter === 'active' && !main.is_active && !children.some((c) => c.is_active)) {
          return false;
        }
        if (statusFilter === 'inactive' && main.is_active && !children.some((c) => !c.is_active)) {
          return false;
        }

        if (query) {
          const matchesMain =
            main.name.toLowerCase().includes(query) || main.slug.toLowerCase().includes(query);
          const matchesChild = children.some(
            (c) => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query)
          );
          if (!matchesMain && !matchesChild) return false;
        }

        return true;
      })
      .map((main) => {
        let children = childrenByParent.get(main.id) || [];

        if (statusFilter === 'active') {
          children = children.filter((c) => c.is_active);
        } else if (statusFilter === 'inactive') {
          children = children.filter((c) => !c.is_active);
        }

        if (query) {
          const mainMatches =
            main.name.toLowerCase().includes(query) || main.slug.toLowerCase().includes(query);
          if (!mainMatches) {
            children = children.filter(
              (c) => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query)
            );
          }
        }

        return { main, children };
      });
  }, [mainCategoriesList, childrenByParent, searchQuery, statusFilter, hierarchyFilter, parentFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setHierarchyFilter('all');
    setParentFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-text-primary">Categories</h1>
            {!loading && (
              <span className="rounded-md border border-border-color bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                {allCategories.length || meta.count} total
              </span>
            )}
          </div>
          <p className="text-text-secondary text-[0.95rem] mt-1">
            Organize main product categories and their nested subcategories.
          </p>
        </div>

      </header>

      {/* KPI Stats Cards */}
      <CategoryStatsCards
        totalCount={allCategories.length || meta.count}
        mainCount={mainCategoriesList.length}
        subCount={subCategoriesList.length}
      />

      {/* Storefront tabs */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border-color bg-white p-1">
          {([
            ['nav', 'Top navigation'],
            ['shop', 'Shop by category'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlacementTab(key)}
              className={clsx(
                'rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition-colors',
                placementTab === key
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openPlacementModal(placementTab)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-primary px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {placementTab === 'shop' && (() => {
        const items = allCategories
          .filter((c) => c.show_in_shop_by === true)
          .sort(
            (a, b) =>
              (a.shop_by_position ?? 0) - (b.shop_by_position ?? 0) ||
              a.path.localeCompare(b.path)
          );
        const byId = new Map(allCategories.map((c) => [c.id, c]));

        // Drag to reorder: positions are rewritten 0..n so the storefront order
        // follows the list exactly.
        const onDragEnd = (result: DropResult) => {
          if (!result.destination || result.destination.index === result.source.index) return;
          const next = Array.from(items);
          const [moved] = next.splice(result.source.index, 1);
          if (!moved) return;
          next.splice(result.destination.index, 0, moved);
          next.forEach((cat, index) => {
            if ((cat.shop_by_position ?? 0) !== index) {
              updatePlacement(cat.id, { shop_by_position: index });
            }
          });
        };
        const layoutLabel =
          homepageStyle === 'cards'
            ? 'Product cards'
            : homepageStyle === 'hidden'
              ? 'Hidden'
              : 'Icon tiles';
        return (
          <section className="mb-6 overflow-hidden rounded-2xl border border-border-color bg-white">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-color bg-bg-secondary/30 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-text-primary">Homepage layout</p>
                <p className="text-[11.5px] text-text-secondary">
                  How the “Shop by category” section looks on the storefront.
                </p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[12px] text-text-secondary">
                  Current:{' '}
                  <strong className="font-semibold text-text-primary">{layoutLabel}</strong>
                </span>
                <button
                  type="button"
                  disabled={homepageStyleBusy || homepageStyle === null}
                  onClick={() => {
                    setLayoutDraft(homepageStyle ?? 'icons');
                    setLayoutPickerOpen(true);
                  }}
                  className="inline-flex h-8 items-center rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary disabled:opacity-60"
                >
                  Change
                </button>
              </div>
            </div>

            {homepageStyle === 'cards' && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-color bg-bg-secondary/20 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-text-primary">Image size</p>
                  <p className="text-[11.5px] text-text-secondary">
                    100% is the current size; lower it to shrink the artwork.
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={imageFill}
                    onChange={(event) => updateImageFill(Number(event.target.value))}
                    aria-label="Category image size"
                    className="h-1.5 w-44 cursor-pointer accent-accent-primary"
                  />
                  <span className="w-10 text-right text-[12px] font-semibold tabular text-text-primary">
                    {imageFill}%
                  </span>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <p className="px-5 py-10 text-center text-[12.5px] text-text-secondary">
                Nothing here yet. Open any category (subcategories work best) and tick{' '}
                <strong className="font-semibold text-text-primary">Shop by category</strong>.
              </p>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="shop-by-category">
                  {(dropProvided) => (
                    <ul
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      className="divide-y divide-border-color"
                    >
                      {items.map((cat, index) => {
                        const order = cat.shop_by_position ?? 0;
                        const parent = cat.parent ? byId.get(cat.parent) : undefined;
                      return (
                        <Draggable key={cat.id} draggableId={cat.id} index={index}>
                          {(dragProvided, snapshot) => (
                            <li
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`flex items-center gap-2 px-5 py-3 ${snapshot.isDragging ? 'bg-bg-secondary/70 shadow-lg' : ''}`}
                            >
                              <button
                                type="button"
                                {...dragProvided.dragHandleProps}
                                className="cursor-grab rounded-md p-1 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary active:cursor-grabbing"
                                aria-label={`Reorder ${cat.name}`}
                              >
                                <GripVertical size={14} />
                              </button>
                              <span className="w-6 shrink-0 text-[11.5px] tabular text-text-muted">
                                {order}
                              </span>
                      {homepageStyle === 'cards' && cat.image ? (
                        <img
                          src={mediaUrl(cat.image)}
                          alt=""
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0 rounded object-contain"
                        />
                      ) : (
                        <CategoryIcon
                          name={cat.icon ?? parent?.icon}
                          size={15}
                          className="shrink-0 text-accent-primary"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">
                        {parent && (
                          <span className="text-text-muted">{parent.name} / </span>
                        )}
                        {cat.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => openPlacementModal('shop', cat)}
                        className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                        aria-label={`Edit ${cat.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletePlacementTarget(cat)}
                        className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                            </li>
                          )}
                        </Draggable>
                      );
                    })}
                      {dropProvided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </section>
        );
      })()}

      {placementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPlacementModal(null)}
            className="absolute inset-0 bg-black/30"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl border border-border-color bg-white"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-color px-6 py-5">
              <div>
                <h2 className="font-display text-[19px] font-semibold tracking-[-0.02em] text-text-primary">
                  {placementModal.category ? 'Edit category' : 'Add category'}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-text-secondary">
                  {placementModal.section === 'nav'
                    ? 'This category will appear in the top navigation.'
                    : 'This category will appear in Shop by category.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlacementModal(null)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {placementError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-[12px] font-medium text-danger">
                  {placementError}
                </p>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Name
                </label>
                <input
                  type="text"
                  value={placementForm.name}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none focus:border-accent-primary dark:focus:bg-white/[0.07]"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Slug
                </label>
                <input
                  type="text"
                  value={placementForm.slug}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, slug: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 font-mono text-[12.5px] text-text-primary outline-none focus:border-accent-primary dark:focus:bg-white/[0.07]"
                  placeholder="auto-generated"
                />
              </div>
              {placementModal.section === 'shop' && (
                <>
                  {homepageStyle === 'cards' && (
                    placementModal.category ? (
                      <CategoryImageField
                        categoryId={placementModal.category.id}
                        image={placementModal.category.image ?? null}
                        onChange={(url) => updateCategoryImage(placementModal.category!.id, url)}
                      />
                    ) : (
                      <PendingCategoryImage file={pendingCardImage} onChange={setPendingCardImage} />
                    )
                  )}
                  <IconPicker
                    value={placementForm.icon}
                    onChange={(icon) => setPlacementForm((p) => ({ ...p, icon }))}
                    label={homepageStyle === 'cards' ? 'Fallback icon' : 'Category Icon'}
                    hint={
                      homepageStyle === 'cards'
                        ? 'Only used when the card image is missing.'
                        : "Shown on the homepage tile. Leave empty to inherit the parent's icon."
                    }
                  />
                </>
              )}
              {/* Shop by category is ordered by dragging the list itself, so the
                  numeric field is only useful for the top navigation. */}
              {placementModal.section === 'nav' && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={placementForm.position}
                    onChange={(e) =>
                      setPlacementForm((p) => ({ ...p, position: Number(e.target.value) || 0 }))
                    }
                    className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none focus:border-accent-primary dark:focus:bg-white/[0.07]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border-color px-6 py-4">
              <button
                type="button"
                onClick={() => setPlacementModal(null)}
                className="inline-flex h-10 items-center rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePlacement}
                disabled={placementBusy || !placementForm.name.trim()}
                className="inline-flex h-10 items-center rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {placementBusy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shopByTarget && (() => {
        const isPlaced = shopByTarget.show_in_shop_by === true;
        const parent = shopByTarget.parent
          ? allCategories.find((c) => c.id === shopByTarget.parent)
          : undefined;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShopByTarget(null)}
              className="absolute inset-0 bg-black/30"
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-md rounded-2xl border border-border-color bg-white"
            >
              <div className="flex items-start justify-between gap-3 border-b border-border-color px-6 py-5">
                <div>
                  <h2 className="font-display text-[19px] font-semibold tracking-[-0.02em] text-text-primary">
                    {isPlaced ? 'Shop by category placement' : 'Add to Shop by category'}
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-text-secondary">
                    {parent && <span className="text-text-muted">{parent.name} / </span>}
                    {shopByTarget.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShopByTarget(null)}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <p className="text-[12.5px] leading-relaxed text-text-secondary">
                  {isPlaced ? (
                    <>Update the tile icon or its position, or just hit <strong className="font-semibold text-text-primary">Save</strong>.</>
                  ) : (
                    <>
                      Both fields are optional — hit{' '}
                      <strong className="font-semibold text-text-primary">Add to Shop by</strong>{' '}
                      to keep the defaults (parent&apos;s icon, last position).
                    </>
                  )}
                </p>

                {homepageStyle === 'cards' && (
                  <CategoryImageField
                    categoryId={shopByTarget.id}
                    image={shopByTarget.image ?? null}
                    onChange={(url) => updateCategoryImage(shopByTarget.id, url)}
                  />
                )}

                <IconPicker
                  value={shopByForm.icon}
                  onChange={(icon) => setShopByForm((prev) => ({ ...prev, icon }))}
                  label={homepageStyle === 'cards' ? 'Fallback icon' : 'Category Icon'}
                  hint={
                    homepageStyle === 'cards'
                      ? 'Only used when the card image is missing.'
                      : "Leave empty to inherit the parent category's icon."
                  }
                />

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Position
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={shopByForm.position}
                    onChange={(e) =>
                      setShopByForm((prev) => ({
                        ...prev,
                        position: Number(e.target.value) || 0,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[13px] text-text-primary outline-none focus:border-accent-primary dark:focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border-color px-6 py-4">
                <div>
                  {isPlaced && (
                    <button
                      type="button"
                      onClick={removeShopBy}
                      disabled={shopByBusy}
                      className="inline-flex h-10 items-center rounded-lg px-2 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShopByTarget(null)}
                    className="inline-flex h-10 items-center rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveShopBy}
                    disabled={shopByBusy}
                    className="inline-flex h-10 items-center rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
                  >
                    {shopByBusy ? 'Saving...' : isPlaced ? 'Save' : 'Add to Shop by'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {placementTab === 'nav' && (
        <>
      {/* Error notification if backend fails */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-between text-danger text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              fetchAllCategories();
              fetchCategoriesData(searchQuery, page, pageSize);
            }}
            className="px-3 py-1 bg-danger text-white rounded-lg text-xs font-semibold hover:bg-danger/90 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="admin-card overflow-hidden">
        {/* Toolbar */}
        <CategoryToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hasTreeData={treeData.length > 0}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onHierarchyFilterChange={setHierarchyFilter}
          parentFilter={parentFilter}
          onParentFilterChange={setParentFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          parentsWithChildren={parentsWithChildren}
          childrenByParent={childrenByParent}
        />

        {/* Content View */}
        {viewMode === 'tree' ? (
          <CategoryTreeView
            treeData={treeData}
            loading={loading}
            searchQuery={searchQuery}
            expandedParents={expandedParents}
            togglingStatusId={togglingStatusId}
            togglingShopById={togglingShopById}
            onToggleShopBy={openShopByModal}
            onToggleParent={toggleParent}
            onToggleStatus={handleToggleStatus}
            onEdit={setSelectedForEdit}
            onDelete={setSelectedForDelete}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <CategoryTableView
            categories={filteredCategoriesForTable}
            childrenByParent={childrenByParent}
            loading={loading}
            searchQuery={searchQuery}
            togglingStatusId={togglingStatusId}
            togglingShopById={togglingShopById}
            onToggleShopBy={openShopByModal}
            onToggleStatus={handleToggleStatus}
            onSelectParentFilter={setParentFilter}
            onEdit={setSelectedForEdit}
            onDelete={setSelectedForDelete}
            onResetFilters={handleResetFilters}
            page={page}
            pageSize={pageSize}
            totalCount={meta.count}
            totalPages={meta.total_pages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            showPagination={hierarchyFilter === 'all' && parentFilter === 'all'}
          />
        )}
      </div>

      {/* Modals */}
        </>
      )}

      <EditCategoryModal
        isOpen={Boolean(selectedForEdit)}
        category={selectedForEdit}
        allCategories={allCategories.length > 0 ? allCategories : categories}
        shopByLayout={homepageStyle ?? 'icons'}
        onClose={() => setSelectedForEdit(null)}
        onSave={handleSaveUpdated}
        onImageChange={updateCategoryImage}
      />

      <ConfirmDialog
        open={Boolean(deletePlacementTarget)}
        title="Delete category?"
        message={
          <>
            <strong className="font-semibold text-foreground">{deletePlacementTarget?.name}</strong> will be removed
            from the catalog. This cannot be undone.
          </>
        }
        onConfirm={() => {
          if (deletePlacementTarget) void deletePlacement(deletePlacementTarget);
        }}
        onClose={() => setDeletePlacementTarget(null)}
      />

      <DeleteConfirmModal
        isOpen={Boolean(selectedForDelete)}
        category={selectedForDelete}
        allCategories={allCategories.length > 0 ? allCategories : categories}
        onClose={() => setSelectedForDelete(null)}
        onDeleted={handleDeleted}
      />

      {layoutPickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLayoutPickerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose homepage layout"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border-color bg-white"
          >
            <div className="border-b border-border-color px-6 py-5">
              <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
                Homepage layout
              </h2>
              <p className="mt-1 text-[12.5px] text-text-secondary">
                This changes what every visitor sees. Pick a style, then apply it.
              </p>
            </div>

            <div className="space-y-2 px-6 py-5">
              {(
                [
                  {
                    value: 'icons' as const,
                    label: 'Icon tiles',
                    description: 'Compact icon grid. Two rows, then Show more.',
                  },
                  {
                    value: 'cards' as const,
                    label: 'Product cards',
                    description: 'Large image cards. Uses the category card image, falls back to the icon.',
                  },
                  {
                    value: 'hidden' as const,
                    label: 'Hidden',
                    description: 'Remove the Shop by category section from the homepage.',
                  },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLayoutDraft(option.value)}
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                    layoutDraft === option.value
                      ? 'border-accent-primary bg-accent-primary/[0.04]'
                      : 'border-border-color hover:bg-bg-secondary/50'
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      layoutDraft === option.value
                        ? 'border-accent-primary'
                        : 'border-border-color'
                    )}
                  >
                    {layoutDraft === option.value && (
                      <span className="h-2 w-2 rounded-full bg-accent-primary" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-text-primary">
                      {option.label}
                      {homepageStyle === option.value && (
                        <span className="ml-2 rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-text-secondary">
                      {option.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border-color px-6 py-4">
              <button
                type="button"
                onClick={() => setLayoutPickerOpen(false)}
                className="inline-flex h-9 items-center rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayoutPickerOpen(false);
                  if (layoutDraft !== homepageStyle) void updateHomepageStyle(layoutDraft);
                }}
                disabled={homepageStyleBusy || layoutDraft === homepageStyle}
                className="inline-flex h-9 items-center rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                Apply layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
