'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Package,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../../../components';
import { ProductsTable, type ProductItem } from './components/ProductsTable';
import {
  deleteStoredProduct,
} from '../../../shared/products/storage';
import { useAdminFetch } from '../../../shared/api/useAdminFetch';

export default function ProductsPage() {
  const router = useRouter();
  const adminFetch = useAdminFetch();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadProducts = async () => {
    try {
      // 1. Fetch from backend API
      const res = await adminFetch('/api/products?page_size=200');
      let apiItems: any[] = [];

      if (res.ok) {
        const json = await res.json();
        apiItems = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.results)
          ? json.results
          : [];
      } else {
        // Fallback to direct fetch if admin fetch had an issue
        const fallbackRes = await fetch('/api/products?page_size=200');
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          apiItems = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.results)
            ? json.results
            : [];
        }
      }

      // Convert backend catalog products to admin ProductItem format
      const mappedApiProducts: ProductItem[] = apiItems.map((item: any) => {
        const primaryImg =
          item.primary_image ||
          (item.images && item.images[0]?.image) ||
          (item.images && item.images[0]) ||
          null;

        const priceVal =
          item.price !== null && item.price !== undefined
            ? String(item.price)
            : '0.00';

        const compareVal =
          item.compare_at_price !== null && item.compare_at_price !== undefined
            ? String(item.compare_at_price)
            : '';

        const costVal =
          item.cost_price !== null && item.cost_price !== undefined
            ? String(item.cost_price)
            : '';

        let stockLabel = '0';
        if (item.stock !== undefined && item.stock !== null) {
          stockLabel = String(item.stock);
        } else if (item.in_stock !== undefined) {
          stockLabel = item.in_stock ? 'In Stock' : 'Out of Stock';
        }

        return {
          id: String(item.id),
          name: item.name || 'Untitled Product',
          slug: item.slug || '',
          category:
            item.category_name ||
            item.primary_category?.name ||
            item.category ||
            'General',
          brand: item.brand_name || item.brand?.name || item.brand || '',
          price: priceVal,
          compare_at_price: compareVal,
          cost_price: costVal,
          stock: stockLabel,
          status: item.status || (item.in_stock ? 'active' : 'draft'),
          is_featured: Boolean(item.is_featured),
          is_best_seller: Boolean(item.is_best_seller),
          sale_price: item.sale_price ? String(item.sale_price) : '',
          live_deal_until: item.live_deal_until || null,
          flash_deal_until: item.flash_deal_until || null,
          short_description: item.short_description || '',
          description: item.description || '',
          sku: item.sku || `SKU-${String(item.id).slice(0, 8)}`,
          images: primaryImg ? [primaryImg] : [],
        };
      });

      // Display real catalog products from backend API
      setProducts(mappedApiProducts);
    } catch (e) {
      console.error('Failed to load products from API:', e);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Purge any stale demo products from browser localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('tp_admin_products');
      } catch {}
    }
    loadProducts();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleEditClick = (product: ProductItem) => {
    router.push(`/products/${product.id}`);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      // 1. Delete from backend if exists
      try {
        await adminFetch(`/api/products/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend delete request skipped or failed:', e);
      }

      // 2. Delete from local storage & state
      deleteStoredProduct(id);
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    }
  };

  // Unique categories list for filtering
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filtered products list based on search and filters
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(
        (p) => p.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(
        (p) => (p.status || 'active').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return result;
  }, [products, searchQuery, categoryFilter, statusFilter]);

  // Statistics counters
  const activeCount = products.filter(
    (p) => (p.status || 'active').toLowerCase() === 'active'
  ).length;
  const inStockCount = products.filter(
    (p) => p.stock !== '0' && p.stock !== 'Out of Stock'
  ).length;

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Products Management"
        description="View, add, and manage your complete live store inventory."
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-black/10 bg-white text-text-secondary hover:text-text-primary hover:bg-black/5 transition-all cursor-pointer"
              title="Refresh product list"
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'animate-spin text-accent-primary' : ''}
              />
            </button>
            <Link
              href="/products/new"
              className="btn btn-primary px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus size={18} />
              <span>Add Product</span>
            </Link>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Products
            </span>
            <Package size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-black text-text-primary">
            {products.length}
          </div>
          <span className="text-xs text-text-muted">In store catalog</span>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Active Status
            </span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {activeCount}
          </div>
          <span className="text-xs text-text-muted">Live on storefront</span>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              In Stock
            </span>
            <Layers size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">
            {inStockCount}
          </div>
          <span className="text-xs text-text-muted">Ready to fulfill</span>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Categories
            </span>
            <Filter size={18} className="text-brand" />
          </div>
          <div className="text-2xl font-black text-brand">
            {availableCategories.length}
          </div>
          <span className="text-xs text-text-muted">Unique departments</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="admin-card p-4 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-3 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, brand, SKU..."
            className="w-full rounded-xl border border-black/10 bg-black/[0.02] pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-text-muted hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-2 text-sm text-text-primary focus:border-accent-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all cursor-pointer"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-2 text-sm text-text-primary focus:border-accent-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="w-full admin-card p-8 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-accent-primary" />
          <span className="text-sm font-medium text-text-muted">
            Loading store products...
          </span>
        </div>
      ) : (
        <ProductsTable
          products={filteredProducts}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onRefresh={() => void loadProducts()}
        />
      )}
    </div>
  );
}
