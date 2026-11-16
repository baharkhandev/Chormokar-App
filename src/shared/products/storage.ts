export interface SpecificationGroup {
  title: string;
  items: Array<{ label: string; value: string }>;
}

export interface ProductHighlight {
  title: string;
  description: string;
}

export interface ProductVariantItem {
  id?: string;
  sku: string;
  name: string;
  price: string;
  compare_at_price?: string;
  cost_price?: string;
  sale_price?: string;
  stock?: string;
  weight_grams?: string;
  attributes?: Record<string, string>;
  is_default?: boolean;
  image?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  slug?: string;
  category: string;
  brand?: string;
  brand_id?: string;
  price: string;
  compare_at_price?: string;
  cost_price?: string;
  sale_price?: string;
  sale_ends_at?: string;
  live_deal_until?: string | null;
  flash_deal_until?: string | null;
  stock: string;
  status: string;
  is_featured?: boolean;
  is_best_seller?: boolean;
  short_description?: string;
  description?: string;
  sku?: string;
  product_code?: string;
  supplier_sku?: string;
  meta_title?: string;
  meta_description?: string;
  images?: string[];
  warranty?: string;
  return_policy?: string;
  highlights?: ProductHighlight[];
  specifications?: SpecificationGroup[];
  variants?: ProductVariantItem[];
}

export const INITIAL_PRODUCTS: ProductItem[] = [];

const STORAGE_KEY = 'tp_admin_products';

const DEMO_PRODUCT_IDENTIFIERS = new Set([
  '1',
  '2',
  '3',
  'apple-macbook-pro-16',
  'apple-macbook-pro-16-m3-max',
  'sony-wh-1000xm5',
  'nvidia-geforce-rtx-4090',
  'nvidia-geforce-rtx-4090-founders-edition',
  'MBP-16-M3-SILVER',
  'SONY-WH1000XM5-BLK',
  'GPU-RTX4090-24G',
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
]);

export function getStoredProducts(): ProductItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter(
      (item: any) =>
        item &&
        !DEMO_PRODUCT_IDENTIFIERS.has(String(item.id)) &&
        !DEMO_PRODUCT_IDENTIFIERS.has(String(item.slug)) &&
        !DEMO_PRODUCT_IDENTIFIERS.has(String(item.sku)) &&
        !String(item.name || '').toLowerCase().includes('macbook pro 16') &&
        !String(item.name || '').toLowerCase().includes('rtx 4090') &&
        !String(item.name || '').toLowerCase().includes('wh-1000xm5')
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

export function getStoredProductById(id: string): ProductItem | null {
  const products = getStoredProducts();
  return products.find((p) => String(p.id) === String(id)) || null;
}

export function saveStoredProduct(product: Partial<ProductItem> & { name: string }): ProductItem {
  const products = getStoredProducts();
  const id = product.id || String(Date.now());
  const existingIndex = products.findIndex((p) => String(p.id) === String(id));

  const completeProduct: ProductItem = {
    id,
    name: product.name,
    slug: product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    category: product.category || 'general',
    brand: product.brand || '',
    price: product.price || '0.00',
    compare_at_price: product.compare_at_price || '',
    stock: product.stock !== undefined ? String(product.stock) : '0',
    status: product.status || 'draft',
    is_featured: Boolean(product.is_featured),
    short_description: product.short_description || '',
    description: product.description || '',
    sku: product.sku || '',
    meta_title: product.meta_title || '',
    meta_description: product.meta_description || '',
    images: product.images || [],
    specifications: product.specifications || []
  };

  let updated: ProductItem[];
  if (existingIndex >= 0) {
    updated = [...products];
    updated[existingIndex] = { ...products[existingIndex], ...completeProduct };
  } else {
    updated = [completeProduct, ...products];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to write products to localStorage', e);
    }
  }

  return completeProduct;
}

export function deleteStoredProduct(id: string): void {
  const products = getStoredProducts();
  const updated = products.filter((p) => String(p.id) !== String(id));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete product from localStorage', e);
    }
  }
}
