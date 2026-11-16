'use client';

import { mediaUrl } from '../../../../shared/lib/media';
import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { revalidateStorefront } from '../../../../shared/api/revalidateStorefront';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  Check,
  Loader2,
  Sparkles,
  ShieldCheck,
  Tag,
  ExternalLink,
  Image as ImageIcon,
  Building2,
  Banknote,
  GripVertical,
  Database,
  CircleCheck,
  Eye,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { ChatModelPicker } from '../../../../widgets/ai-chat';
import clsx from 'clsx';
import { RichTextEditor, SearchableBrandSelect, SearchableCategorySelect } from '../../../../components';
import { SelectMenu } from '../../../../components/SelectMenu';
import { ColorPicker } from '../../../../components/ColorPicker';
import type { BrandOption } from '../../../../components/SearchableBrandSelect';
import type { CategoryOption } from '../../../../components/SearchableCategorySelect';
import {
  deleteStoredProduct,
  saveStoredProduct,
  type ProductItem,
  type ProductHighlight,
  type SpecificationGroup,
  type ProductVariantItem,
} from '../../../../shared/products/storage';
import { returnPolicyForForm } from '../../../../shared/products/return-policy';

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  /** Render inside a dialog: no page header, no page chrome. */
  embedded?: boolean;
  /** Values to prefill, e.g. an AI proposal awaiting approval. */
  initialData?: Partial<ProductItem>;
  /** When set, submit hands the payload back instead of creating a product. */
  reviewSubmit?: (payload: Record<string, any>) => Promise<void> | void;
  /** Prices found in other shops, shown under Pricing & Inventory. */
  storePrices?: Array<{ shop: string; price: number; url?: string }>;
  /** Spec rows a shop/Google suggested but the shops did not have. */
  specSuggestions?: Array<{ label: string; value: string; shop?: string; section?: string }>;
}

const STOREFRONT_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  slug: 'Slug',
  sku: 'SKU',
  price: 'Price',
  compare_at_price: 'Compare at price',
  sale_price: 'Sale price',
  sale_ends_at: 'Sale end date',
  stock: 'Stock',
  brand: 'Brand',
  brand_id: 'Brand',
  category: 'Category',
  category_id: 'Category',
  status: 'Status',
  variants: 'Variants',
  images: 'Images',
};

/**
 * Turn a DRF error payload (field -> [messages]) into a readable sentence.
 * Without this the UI only ever showed "Failed to create product".
 */
function formatApiError(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();

  // Admin API routes wrap backend payloads as `{ success, data }`.
  const data =
    typeof raw === 'object' && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? raw.data
      : raw;

  const messages: string[] = [];
  const push = (value: any) => {
    if (typeof value === 'string' && value.trim()) messages.push(value.trim());
    else if (Array.isArray(value)) value.forEach(push);
  };

  if (data.error && typeof data.error === 'object') {
    push(data.error.message);
    if (Array.isArray(data.error.details)) {
      for (const detail of data.error.details) {
        const label = detail?.field
          ? FIELD_LABELS[detail.field] || String(detail.field).replace(/_/g, ' ')
          : '';
        const detailMessages: string[] = [];
        if (Array.isArray(detail?.messages)) {
          for (const message of detail.messages) {
            if (typeof message === 'string' && message.trim()) {
              detailMessages.push(message.trim());
            }
          }
        }
        for (const message of detailMessages) {
          messages.push(label ? `${label}: ${message}` : message);
        }
      }
    }
  } else {
    push(data.error);
  }
  push(data.detail);
  push(data.message);

  for (const [key, value] of Object.entries(data)) {
    if (['error', 'detail', 'message', 'success', 'data'].includes(key)) continue;
    const label = FIELD_LABELS[key] || key.replace(/_/g, ' ');
    const before = messages.length;
    push(value);
    for (let i = before; i < messages.length; i += 1) {
      messages[i] = `${label}: ${messages[i]}`;
    }
  }

  return Array.from(new Set(messages)).join(' · ');
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function resolveImageUrl(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) {
    return raw.startsWith('blob:') ? raw : mediaUrl(raw);
  }
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('/api/v1', '');
  return `${backendBase}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function normalizeHighlights(raw: any): ProductHighlight[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ title: '', description: '' }];
  }
  return raw.map((h: any) => ({
    title: typeof h === 'string' ? h : h.title || '',
    description: typeof h === 'string' ? '' : h.description || '',
  }));
}

function normalizeSpecifications(raw: any): SpecificationGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  // Already grouped [{ title, items: [{ label, value }] }]
  if (raw[0] && Array.isArray(raw[0].items)) {
    return raw.map((group: any) => ({
      title: group.title || 'General',
      items:
        Array.isArray(group.items) && group.items.length > 0
          ? group.items.map((it: any) => ({
              label: it.label || it.key || '',
              value: it.value || '',
            }))
          : [{ label: '', value: '' }],
    }));
  }

  // Flat list of { key/label, value }
  return [
    {
      title: 'General Specifications',
      items: raw.map((it: any) => ({
        label: it.label || it.key || '',
        value: it.value || '',
      })),
    },
  ];
}

export interface ProductFormHandle {
  /** Run the same submit path the page uses; resolves false when validation failed. */
  submit: () => Promise<boolean>;
  /** Merge a research patch into the form, touching only empty fields. Returns the field names applied. */
  fill: (patch: Record<string, any>) => string[];
  /** Restore the form to its state before the last fill(). */
  undoFill: () => void;
}

export const ProductForm = forwardRef<ProductFormHandle, ProductFormProps>(function ProductForm(
  {
    mode,
    productId,
    embedded = false,
    initialData,
    reviewSubmit,
    storePrices = [],
    specSuggestions = [],
  },
  ref
) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [researching, setResearching] = useState(false);
  const [researchNote, setResearchNote] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [fetchedPrices, setFetchedPrices] = useState<
    Array<{ shop: string; price: number; url?: string }>
  >([]);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [galleryPickerVariantIndex, setGalleryPickerVariantIndex] = useState<number | null>(null);
  const [dismissedSpecs, setDismissedSpecs] = useState<string[]>([]);
  const [extraSpecs, setExtraSpecs] = useState<
    Array<{ label: string; value: string; shop?: string; section?: string }>
  >([]);
  const [duplicate, setDuplicate] = useState<{
    id: string;
    name: string;
    matched: string[];
  } | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const imageIdsRef = useRef<Record<string, string>>({});
  const [specTemplates, setSpecTemplates] = useState<any[]>([]);
  const [specTemplateId, setSpecTemplateId] = useState<string>('');

  const [formData, setFormData] = useState<ProductItem>({
    id: productId || '',
    name: '',
    slug: '',
    brand: '',
    brand_id: '',
    category: '',
    short_description: '',
    description: '',
    status: 'draft',
    is_featured: false,
    sku: '',
    supplier_sku: '',
    price: '',
    cost_price: '',
    compare_at_price: '',
    sale_price: '',
    sale_ends_at: '',
    stock: '',
    meta_title: '',
    meta_description: '',
    images: [],
    warranty: '1 Year Official Authorized Warranty',
    return_policy: '',
    highlights: [{ title: '', description: '' }],
    specifications: [],
    variants: [],
  });

  // An AI proposal arrives after mount, so prefill once instead of threading a
  // second prop into every input.
  useEffect(() => {
    if (!initialData) return;
    setFormData((prev) => ({ ...prev, ...initialData }));
    if ((initialData as any).spec_template_id) {
      setSpecTemplateId(String((initialData as any).spec_template_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/spec-templates?page_size=200');
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.results || json?.data || [];
        if (!cancelled) setSpecTemplates(list.filter((item: any) => item.is_active !== false));
      } catch {
        // A missing template list should never block the form.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySpecTemplate = (templateId: string) => {
    setSpecTemplateId(templateId);
    const template = specTemplates.find((item) => item.id === templateId);
    if (!template) return;

    const sections: Array<{ title: string; aliases?: string[] }> = template.sections || [];

    setFormData((prev: any) => {
      const groups = [...(prev.specifications || [])];

      // Strip container words from a block name ("Physical Specification" is
      // the Physical block, not General) and keep the plain lower-case form
      // for aliases, which are matched as-is.
      const NOISE = new Set([
        'specifications',
        'specification',
        'features',
        'feature',
        'information',
        'details',
        'detail',
        'attributes',
        'attribute',
        'info',
      ]);
      const words = (value: string) =>
        String(value || '')
          .toLowerCase()
          .replace(/[^a-z0-9& ]+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
      const titleKey = (value: string) => {
        const parts = words(value);
        while (parts.length && NOISE.has(parts[parts.length - 1])) parts.pop();
        if (parts.length && parts[parts.length - 1].endsWith('s') && parts[parts.length - 1].length > 3) {
          parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1);
        }
        return parts.join(' ');
      };
      const aliasKey = (value: string) => words(value).join(' ');

      const matchSection = (title: string) => {
        const key = titleKey(title) || aliasKey(title);
        if (!key) return -1;
        let best = -1;
        let bestScore = 0;
        sections.forEach((section, index) => {
          const candidates = [titleKey(section.title), ...(section.aliases || []).map(aliasKey)];
          candidates.forEach((word) => {
            if (!word) return;
            let score = 0;
            if (key === word) score = 1000;
            else if (key.startsWith(`${word} `)) score = 500 + word.length;
            else if (word.startsWith(`${key} `)) score = 400 + key.length;
            else if (key.includes(word)) score = 100 + word.length;
            else if (word.includes(key)) score = 50 + key.length;
            if (score > bestScore) {
              bestScore = score;
              best = index;
            }
          });
        });
        return best;
      };

      // Fold the existing groups into the template's slots, keeping their rows.
      const buckets: Record<number, { title: string; items: any[] }> = {};
      const extras: any[] = [];
      groups.forEach((group: any) => {
        const slot = matchSection(group.title);
        if (slot === -1) {
          // Keep groups with real data; drop the empty skeleton of a
          // previously selected template so switching stays clean.
          const hasContent = (group.items || []).some(
            (item: any) => String(item?.label || '').trim() || String(item?.value || '').trim()
          );
          if (hasContent) extras.push(group);
          return;
        }
        const bucket = buckets[slot];
        if (!bucket) {
          buckets[slot] = { title: sections[slot].title, items: [...(group.items || [])] };
        } else {
          bucket.items = [...bucket.items, ...(group.items || [])];
        }
      });

      // Every template section now exists, even the empty ones, so the form
      // shows the full skeleton the moment a template is picked.
      const ordered = sections.map((section, index) => {
        const bucket = buckets[index];
        const items = bucket && bucket.items.length > 0 ? [...bucket.items] : [];
        // The template also names the fields it expects, so the editor starts
        // with a labelled row per field and only has to fill the value.
        const known = new Set(
          items.map((item: any) => String(item?.label || '').trim().toLowerCase()).filter(Boolean)
        );
        for (const label of (section as any).labels || []) {
          const key = String(label).trim().toLowerCase();
          if (!key || known.has(key)) continue;
          items.push({ label, value: '' });
          known.add(key);
        }
        if (items.length === 0) items.push({ label: '', value: '' });
        return { ...(bucket || {}), title: section.title, items };
      });

      return { ...prev, specifications: [...ordered, ...extras] };
    });
  };

  // Load categories from API
  useEffect(() => {
    // `all=true` bypasses admin pagination so every category is available,
    // even when the catalogue grows past the default page size.
    setLoadingCategories(true);
    fetch('/api/categories?all=true')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setCategories(list);
      })
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, []);

  // Load brands from API
  useEffect(() => {
    setLoadingBrands(true);
    fetch('/api/brands?page_size=200')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
          ? data.data
          : [];
        if (list.length > 0) {
          setBrands(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBrands(false));
  }, []);

  // Load product data from backend API
  useEffect(() => {
    if (mode === 'edit' && productId) {
      setLoading(true);
      fetch(`/api/products/${productId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const item = data?.data || data;
          if (item && item.name) {
            const primaryImg =
              item.primary_image ||
              (item.images && item.images[0]?.image) ||
              (item.images && item.images[0]?.url) ||
              (item.images && item.images[0]) ||
              null;

            const allImages: string[] = [];
            if (Array.isArray(item.images) && item.images.length > 0) {
              for (const img of item.images) {
                const u = typeof img === 'string' ? img : img.url || img.image || '';
                if (u && !allImages.includes(u)) allImages.push(u);
                if (u && typeof img === 'object' && img.id) imageIdsRef.current[u] = String(img.id);
              }
            }
            if (primaryImg && typeof primaryImg === 'string' && !allImages.includes(primaryImg)) {
              allImages.unshift(primaryImg);
            }

            // Variants normalization
            const rawVariants = Array.isArray(item.variants) ? item.variants : [];
            const defaultVar = rawVariants.find((v: any) => v.is_default) || rawVariants[0];

            setFormData({
              id: String(item.id),
              name: item.name || '',
              slug: item.slug || '',
              brand: item.brand?.name || item.brand_name || item.brand || '',
              brand_id: item.brand?.id || item.brand_id || '',
              category: item.primary_category?.slug || item.category_name || item.category || '',
              short_description: item.short_description || '',
              description: item.description || '',
              status: (item.status || 'draft').toLowerCase(),
              is_featured: Boolean(item.is_featured),
              sku: defaultVar?.sku || item.sku || `SKU-${String(item.id).slice(0, 8)}`,
              price: defaultVar?.price !== undefined ? String(defaultVar.price) : item.price !== undefined ? String(item.price) : '',
              compare_at_price: defaultVar?.compare_at_price ? String(defaultVar.compare_at_price) : item.compare_at_price ? String(item.compare_at_price) : '',
              cost_price: defaultVar?.cost_price != null ? String(defaultVar.cost_price) : item.cost_price != null ? String(item.cost_price) : '',
              // Only prefill a deal that is actually set; a bare end date with no
              // sale price is leftover data and must not look like an active deal.
              sale_price: defaultVar?.sale_price ? String(defaultVar.sale_price) : '',
              sale_ends_at: defaultVar?.sale_price ? toDateTimeLocal(defaultVar.sale_ends_at) : '',
              stock: item.stock !== undefined ? String(item.stock) : defaultVar?.available_qty !== undefined ? String(defaultVar.available_qty) : '10',
              meta_title: item.meta_title || '',
              meta_description: item.meta_description || '',
              images: allImages,
              warranty: item.warranty || '1 Year Official Warranty',
              return_policy: returnPolicyForForm(item.return_policy),
              highlights: normalizeHighlights(item.highlights),
              specifications: normalizeSpecifications(item.specifications),
              variants: rawVariants.map((v: any) => ({
                id: v.id,
                sku: v.sku || '',
                name: v.name || 'Standard',
                price: String(v.price || '0'),
                compare_at_price: v.compare_at_price ? String(v.compare_at_price) : '',
                cost_price: v.cost_price ? String(v.cost_price) : '',
                sale_price: v.sale_price ? String(Number(v.sale_price)) : '',
                sale_ends_at: v.sale_price ? toDateTimeLocal(v.sale_ends_at) : '',
                stock: String(v.stock_quantity ?? v.available_qty ?? v.stock ?? 10),
                weight_grams: v.weight_grams ? String(v.weight_grams) : '',
                attributes: v.attributes || {},
                is_default: Boolean(v.is_default),
                image: v.image || v.attributes?.image || '',
              })),
            });
            setError(null);
          } else {
            setError(`Product with ID "${productId}" not found.`);
          }
        })
        .catch((err) => {
          console.error('Failed to load product:', err);
          setError(`Failed to load product with ID "${productId}".`);
        })
        .finally(() => setLoading(false));
    }
  }, [mode, productId]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => {
      const next = { ...prev, name: val };
      if (mode === 'create' || !prev.slug) {
        next.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
      return next;
    });
  };

  // Highlights handlers
  const updateHighlight = (index: number, field: 'title' | 'description', value: string) => {
    setFormData((prev) => {
      const next = [...(prev.highlights || [])];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return { ...prev, highlights: next };
    });
  };

  const addHighlight = () => {
    setFormData((prev) => ({
      ...prev,
      highlights: [...(prev.highlights || []), { title: '', description: '' }],
    }));
  };

  const removeHighlight = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      highlights: (prev.highlights || []).filter((_, i) => i !== index),
    }));
  };

  // Specifications handlers
  const updateGroupTitle = (groupIndex: number, title: string) => {
    setFormData((prev) => {
      const next = [...(prev.specifications || [])];
      if (next[groupIndex]) {
        next[groupIndex] = { ...next[groupIndex], title };
      }
      return { ...prev, specifications: next };
    });
  };

  const addSpecificationGroup = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [
        ...(prev.specifications || []),
        { title: 'New Specification Group', items: [{ label: '', value: '' }] },
      ],
    }));
  };

  const removeSpecificationGroup = (groupIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: (prev.specifications || []).filter((_, i) => i !== groupIndex),
    }));
  };

  const updateSpecItem = (groupIndex: number, itemIndex: number, field: 'label' | 'value', val: string) => {
    setFormData((prev) => {
      const nextGroups = [...(prev.specifications || [])];
      if (nextGroups[groupIndex]) {
        const nextItems = [...nextGroups[groupIndex].items];
        if (nextItems[itemIndex]) {
          nextItems[itemIndex] = { ...nextItems[itemIndex], [field]: val };
          nextGroups[groupIndex] = { ...nextGroups[groupIndex], items: nextItems };
        }
      }
      return { ...prev, specifications: nextGroups };
    });
  };

  const addSpecItem = (groupIndex: number) => {
    setFormData((prev) => {
      const nextGroups = [...(prev.specifications || [])];
      if (nextGroups[groupIndex]) {
        nextGroups[groupIndex] = {
          ...nextGroups[groupIndex],
          items: [...nextGroups[groupIndex].items, { label: '', value: '' }],
        };
      }
      return { ...prev, specifications: nextGroups };
    });
  };

  const removeSpecItem = (groupIndex: number, itemIndex: number) => {
    setFormData((prev) => {
      const nextGroups = [...(prev.specifications || [])];
      if (nextGroups[groupIndex]) {
        nextGroups[groupIndex] = {
          ...nextGroups[groupIndex],
          items: nextGroups[groupIndex].items.filter((_, i) => i !== itemIndex),
        };
      }
      return { ...prev, specifications: nextGroups };
    });
  };

const onSpecDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    if (type === 'GROUP') {
      moveGroup(source.index, destination.index);
      return;
    }

    const fromGi = Number(source.droppableId.replace('spec-items-', ''));
    const toGi = Number(destination.droppableId.replace('spec-items-', ''));
    moveItem(
      { gi: fromGi, ii: source.index },
      { gi: toGi, ii: destination.index }
    );
  };

  const moveGroup = (from: number, to: number) => {
    if (from === to) return;
    setFormData((prev) => {
      const list = [...(prev.specifications || [])];
      if (!list[from] || to < 0 || to >= list.length) return prev;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...prev, specifications: list };
    });
  };

  const moveItem = (from: { gi: number; ii: number }, to: { gi: number; ii: number }) => {
    setFormData((prev) => {
      const groups = (prev.specifications || []).map((group) => ({
        ...group,
        items: [...group.items],
      }));
      if (!groups[from.gi]?.items[from.ii] || !groups[to.gi]) return prev;
      const [moved] = groups[from.gi].items.splice(from.ii, 1);
      groups[to.gi].items.splice(to.ii, 0, moved);
      return { ...prev, specifications: groups };
    });
  };

  const addSuggestedSpec = (label: string, value: string) => {
    setFormData((prev) => {
      const groups = (prev.specifications || []).map((group) => ({
        ...group,
        items: [...group.items],
      }));
      const template = specTemplates.find((item) => item.id === specTemplateId);
      const key = String(label || '').toLowerCase();
      const section = (template?.sections || []).find((candidate: any) =>
        [candidate.title, ...(candidate.aliases || []), ...(candidate.labels || [])]
          .map((word: any) => String(word || '').toLowerCase())
          .some((word: string) => word && (key.includes(word) || word.includes(key)))
      );
      const target = section
        ? groups.find((group) => group.title.toLowerCase() === String(section.title).toLowerCase())
        : undefined;
      if (target) {
        target.items.push({ label, value });
      } else if (groups.length) {
        groups[groups.length - 1].items.push({ label, value });
      } else {
        groups.push({
          title: section?.title || 'Specifications',
          items: [{ label, value }],
        });
      }
      return { ...prev, specifications: groups };
    });
    setDismissedSpecs((prev) => [...prev, label]);
  };

  // Variant editing handlers
  const updateVariantField = (index: number, field: string, val: any) => {
    setFormData((prev) => {
      const next = [...(prev.variants || [])];
      if (next[index]) {
        const updated = { ...next[index], [field]: val };
        const currentAttrs = { ...(updated.attributes || {}) };

        if (field === 'name') {
          currentAttrs.color = val;
        } else if (field === 'image') {
          currentAttrs.image = val;
        } else if (field === 'color_hex') {
          currentAttrs.color_hex = val;
        }

        updated.attributes = currentAttrs;
        next[index] = updated;
      }
      return { ...prev, variants: next };
    });
  };

  const addVariant = () => {
    setFormData((prev) => {
      const list = prev.variants || [];
      const num = list.length + 1;
      const baseSlug =
        prev.slug ||
        (prev.name ? prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'prod');
      const newVar: ProductVariantItem = {
        id: '',
        name: `Color ${num}`,
        sku: `${baseSlug.slice(0, 8).toUpperCase()}-C${num}`,
        price: prev.price || '0',
        compare_at_price: prev.compare_at_price || '',
        cost_price: prev.cost_price || '',
        stock: '10',
        weight_grams: '',
        attributes: { color: `Color ${num}`, color_hex: '#1e293b' },
        is_default: list.length === 0,
        image: '',
      };
      return { ...prev, variants: [...list, newVar] };
    });
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => {
      const list = [...(prev.variants || [])];
      const removed = list.splice(index, 1)[0];
      if (removed?.is_default && list.length > 0) {
        list[0].is_default = true;
      }
      return { ...prev, variants: list };
    });
  };

  const setVariantDefault = (index: number) => {
    setFormData((prev) => {
      const list = (prev.variants || []).map((v, i) => ({
        ...v,
        is_default: i === index,
      }));
      return { ...prev, variants: list };
    });
  };

  const handleVariantImageUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<boolean> => {
    const file = e.target.files?.[0];
    if (!file) return false;

    if (reviewSubmit) {
      setImageBusy(true);
      setImageError('');
      try {
        const url = await uploadForReview(file);
        if (url) {
          updateVariantField(index, 'image', url);
          setFormData((prev) => {
            const existing = prev.images || [];
            return existing.includes(url)
              ? prev
              : { ...prev, images: [...existing, url] };
          });
        }
        return true;
      } catch (err: any) {
        setImageError(err?.message || 'Could not upload that image');
        return false;
      } finally {
        setImageBusy(false);
      }
    }

    const url = URL.createObjectURL(file);
    setPendingFiles((prev) => ({ ...prev, [url]: file }));

    // Assign to variant
    updateVariantField(index, 'image', url);

    // Also add to product images list so it appears in the main bottom image list!
    setFormData((prev) => {
      const existing = prev.images || [];
      if (!existing.includes(url)) {
        return { ...prev, images: [...existing, url] };
      }
      return prev;
    });
    return true;
  };

  const handleSelectGalleryImageForVariant = (variantIndex: number, imageUrl: string) => {
    updateVariantField(variantIndex, 'image', imageUrl);
    setGalleryPickerVariantIndex(null);
  };

  // Image handlers
  const uploadForReview = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/ai/uploads', { method: 'POST', body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.detail || 'Could not upload that image');
    const data = json?.data ?? json;
    return String(data?.url || '');
  };

  const processImageFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    // In review mode there is no product to attach to yet, so images go to a
    // temporary store and keep their real URL instead of a blob preview.
    if (reviewSubmit) {
      try {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          if (!files[i].type.startsWith('image/')) continue;
          const url = await uploadForReview(files[i]);
          if (url) urls.push(url);
        }
        if (urls.length > 0) {
          setFormData((prev) => ({ ...prev, images: [...(prev.images || []), ...urls] }));
        }
      } catch (err: any) {
        setError(err?.message || 'Could not upload that image');
      }
      return;
    }

    const newImageUrls: string[] = [];
    const nextPending: Record<string, File> = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newImageUrls.push(url);
        nextPending[url] = file;
      }
    }

    setPendingFiles((prev) => ({ ...prev, ...nextPending }));
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), ...newImageUrls],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    void processImageFiles(e.target.files);
  };

  const removeImage = async (index: number) => {
    const image = (formData.images || [])[index];
    if (!image) return;

    if (pendingFiles[image]) {
      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[image];
        return next;
      });
    } else if (productId && imageIdsRef.current[image]) {
      try {
        const res = await fetch(
          `/api/products/${productId}/images/${imageIdsRef.current[image]}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(formatApiError(errData) || 'Failed to delete the image.');
        }
        delete imageIdsRef.current[image];
      } catch (err: any) {
        setError(err?.message || 'Failed to delete the image.');
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
      // Variants share the gallery image, so dropping it from the gallery has to
      // drop it from the variant tile too — the backend clears the same pointer.
      variants: (prev.variants || []).map((v) =>
        v.image === image ? { ...v, image: undefined } : v
      ),
    }));
  };

  const setAsMainImage = async (index: number) => {
    const images = [...(formData.images || [])];
    if (index <= 0 || index >= images.length) return;

    const [selected] = images.splice(index, 1);
    images.unshift(selected);
    setFormData((prev) => ({ ...prev, images }));

    // Persist the primary flag for images that already exist in the backend.
    const imageId = imageIdsRef.current[selected];
    if (mode === 'edit' && productId && imageId) {
      try {
        const res = await fetch(`/api/products/${productId}/images/${imageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_primary: true }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(formatApiError(errData) || 'Failed to set the main image.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to set the main image.');
      }
    }
  };

  // Snapshot taken right before an AI fill, so the popup can undo it.
  const fillSnapshot = useRef<typeof formData | null>(null);

  const slugify = (value: string) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const isEmptyValue = (value: any) =>
    value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0);

  const fill = (patch: Record<string, any>): string[] => {
    const applied: string[] = [];
    const next: any = { ...formData };
    const setIfEmpty = (key: string, value: any, label = key) => {
      if (isEmptyValue(next[key]) && !isEmptyValue(value)) {
        next[key] = value;
        applied.push(label);
      }
    };

    if (patch.brand_name) {
      setIfEmpty('brand', patch.brand_name);
      const match = brands.find(
        (brand) => brand.name.toLowerCase() === String(patch.brand_name).toLowerCase()
      );
      if (match && isEmptyValue(next.brand_id)) {
        next.brand_id = match.id;
        applied.push('brand_id');
      }
    }

    if (patch.category_name) {
      const match = categories.find(
        (category) => category.name.toLowerCase() === String(patch.category_name).toLowerCase()
      );
      setIfEmpty('category', match?.slug || slugify(patch.category_name));
      if (match && isEmptyValue(next.category_id)) {
        next.category_id = match.id;
        applied.push('category_id');
      }
    }

    if (patch.name) {
      const nextName = String(patch.name);
      if (nextName && nextName !== next.name) {
        next.name = nextName;
        applied.push('name');
      }
    }
    if (patch.slug) setIfEmpty('slug', patch.slug);
    setIfEmpty('short_description', patch.short_description);
    setIfEmpty('description', patch.description);
    setIfEmpty('warranty', patch.warranty);
    setIfEmpty('meta_title', patch.meta_title);
    setIfEmpty('meta_description', patch.meta_description);

    if (Array.isArray(patch.variants) && patch.variants.length) {
      // Fetch re-reads the variants (labels, SKUs, prices); apply its cleaned set.
      next.variants = patch.variants.map((variant: any, index: number) => ({
        id: variant?.sku || `v-${index}`,
        name: variant?.name || '',
        sku: variant?.sku || '',
        price: variant?.online_price ?? variant?.price ?? '',
        compare_at_price: variant?.mrp ?? '',
        cost_price: variant?.dealer_price ?? '',
        stock: variant?.stock ?? 0,
        attributes: variant?.attributes || {},
        is_default: index === 0,
      }));
      applied.push('variants');
    }

    if (Array.isArray(patch.highlights) && patch.highlights.length) {
      const cleaned = patch.highlights
        .map((item: any) =>
          typeof item === 'string'
            ? { title: item, description: '' }
            : { title: item?.title || '', description: item?.description || '' }
        )
        .filter((item: any) => item.title.trim());
      if (cleaned.length) setIfEmpty('highlights', cleaned);
    }

    if (Array.isArray(patch.specifications) && patch.specifications.length) {
      const first = patch.specifications[0];
      const groups = Array.isArray(first?.items)
        ? patch.specifications
        : [{ title: 'Specifications', items: patch.specifications }];
      const cleaned = groups
        .map((group: any) => ({
          title: group?.title || 'Specifications',
          items: (group?.items || [])
            .map((item: any) => ({ label: String(item?.label || ''), value: String(item?.value || '') }))
            .filter((item: any) => item.label.trim() && item.value.trim()),
        }))
        .filter((group: any) => group.items.length);
      // Fetch brings the shops' own order; use it instead of the sheet's
      // arbitrary grouping. Only an empty patch leaves the current rows.
      if (cleaned.length) {
        const template = specTemplates.find(
          (item) => item.id === (patch.spec_template_id || specTemplateId)
        );
        if (template && (template.sections || []).some((section: any) => (section.labels || []).length)) {
          const compact = (value: string) =>
            String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
          const values = new Map<string, string>();
          const overflow: Array<{ label: string; value: string }> = [];

          for (const group of cleaned) {
            const section = (template.sections || []).find(
              (candidate: any) =>
                String(candidate.title || '').toLowerCase() ===
                String(group.title || '').toLowerCase()
            );
            if (!section) {
              overflow.push(...group.items);
              continue;
            }
            for (const item of group.items) {
              const match = (section.labels || []).find((label: any) => {
                const key = compact(label);
                const actual = compact(item.label);
                return (
                  key === actual || `${key}s` === actual || key === `${actual}s`
                );
              });
              if (match) values.set(compact(match), item.value);
              else overflow.push(item);
            }
          }

          // The template owns the structure: only its sections and fields are
          // created, and Fetch merely fills the values it found.
          next.specifications = (template.sections || [])
            .filter((section: any) => (section.labels || []).length)
            .map((section: any) => ({
              title: section.title,
              items: section.labels.map((label: any) => ({
                label,
                value: values.get(compact(label)) || '',
              })),
            }));

          if (Array.isArray(patch.spec_suggestions)) {
            overflow.push(...patch.spec_suggestions);
          }
          if (overflow.length) {
            setExtraSpecs((prev) => [...prev, ...overflow]);
          }
        } else {
          next.specifications = cleaned;
          if (Array.isArray(patch.spec_suggestions) && patch.spec_suggestions.length) {
            setExtraSpecs((prev) => [...prev, ...patch.spec_suggestions]);
          }
        }
        applied.push('specifications');
      }
      if (patch.spec_template_id) {
        setSpecTemplateId(String(patch.spec_template_id));
        applied.push('spec_template_id');
      }
    }

    if (Array.isArray(patch.image_urls) && patch.image_urls.length) {
      const existing = next.images || [];
      const additions = patch.image_urls.filter(
        (url: string) => typeof url === 'string' && !existing.includes(url)
      );
      if (additions.length) {
        next.images = [...existing, ...additions];
        applied.push('image_urls');
      }
    }

    if (!applied.length) return applied;
    fillSnapshot.current = formData;
    setFormData(next);
    return applied;
  };

  const undoFill = () => {
    if (!fillSnapshot.current) return;
    setFormData(fillSnapshot.current);
    fillSnapshot.current = null;
  };

  // Warn as soon as the name matches something already in the catalogue.
  useEffect(() => {
    const name = String(formData.name || '').trim();
    const slug = String(formData.slug || '').trim();
    const sku = String(formData.sku || '').trim();
    if (name.length < 3 && !slug && !sku) {
      setDuplicate(null);
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (name.length >= 3) params.set('name', name);
      if (slug) params.set('slug', slug);
      if (sku) params.set('sku', sku);
      if (productId) params.set('exclude', productId);
      void (async () => {
        try {
          const res = await fetch(`/api/products/check-duplicate?${params}`, {
            cache: 'no-store',
          });
          const json = await res.json().catch(() => ({}));
          const data = json?.data ?? json;
          const match = Array.isArray(data?.matches) ? data.matches[0] : null;
          setDuplicate(
            match
              ? {
                  id: String(match.id),
                  name: String(match.name),
                  matched: Array.isArray(match.matched) ? match.matched : [],
                }
              : null
          );
        } catch {
          setDuplicate(null);
        }
      })();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [formData.name, formData.slug, formData.sku, productId]);

  const runFetch = async () => {
    const name = String(formData.name || '').trim();
    if (!name) {
      setFetchError('Type a product name first, then fetch.');
      return;
    }
    setResearching(true);
    setFetchError('');
    setResearchNote('');
    try {
      const res = await fetch('/api/ai/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          brand_name: formData.brand,
          category_name: formData.category,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || json?.error?.message || 'Could not fetch this product.');
      }
      const data = json?.data ?? json;
      const result = data?.research || {};
      const applied = fill(result.patch || {});
      setFetchedPrices(Array.isArray(result.prices) ? result.prices : []);
      setResearchNote(
        [
          `${applied.length} field${applied.length === 1 ? '' : 's'} filled`,
          result.sources?.length ? `${result.sources.length} shops` : '',
          result.verification?.checked ? 'verified with Google' : '',
          result.model ? `via ${String(result.model).split('/').pop()}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      );
    } catch (err: any) {
      setFetchError(err?.message || 'Could not fetch this product.');
    } finally {
      setResearching(false);
    }
  };

  // Delete product
  useImperativeHandle(ref, () => ({
    submit: async () => {
      await handleSubmit();
      return true;
    },
    fill,
    undoFill,
  }));

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${formData.name}"? This action cannot be undone.`)) {
      try {
        if (productId) {
          await fetch(`/api/products/${productId}`, { method: 'DELETE' });
          deleteStoredProduct(productId);
        }
        if (formData.slug) {
          void revalidateStorefront(
            [`/p/${formData.slug}`, `/en/p/${formData.slug}`, '/', '/en'],
            ['products']
          );
        }
        router.push('/products');
      } catch (err: any) {
        alert(err?.message || 'Failed to delete product.');
      }
    }
  };

  // Save changes to backend database
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!formData.price && (!formData.variants || formData.variants.length === 0)) {
      setError('Product price is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Clean highlights and specs
      const cleanedHighlights = (formData.highlights || []).filter(
        (h) => h.title.trim() || h.description.trim()
      );

      const hasVariants = (formData.variants?.length || 0) > 0;

      const cleanedSpecifications = (formData.specifications || [])
        .map((g) => ({
          title: g.title.trim() || 'General Specifications',
          // Label-only rows are template placeholders, not data.
          items: g.items.filter((it) => it.value.trim()),
        }))
        .filter((g) => g.items.length > 0);

      const payload = {
        name: formData.name,
        slug: formData.slug,
        brand: formData.brand,
        brand_id: formData.brand_id || undefined,
        category: formData.category,
        status: formData.status,
        is_featured: formData.is_featured,
        short_description: formData.short_description,
        description: formData.description,
        warranty: formData.warranty,
        return_policy: formData.return_policy,
        highlights: cleanedHighlights,
        specifications: cleanedSpecifications,
        spec_template_id: specTemplateId || null,
        price: formData.price,
        compare_at_price: formData.compare_at_price || null,
        cost_price: formData.cost_price || null,
        // With variants the deal lives on each one; a product-level value would
        // only overwrite the default variant.
        sale_price: hasVariants ? undefined : formData.sale_price || null,
        sale_ends_at: hasVariants
          ? undefined
          : formData.sale_ends_at
            ? new Date(formData.sale_ends_at).toISOString()
            : null,
        stock: formData.stock ? parseInt(formData.stock, 10) : 0,
        sku: formData.sku,
        ...(formData.supplier_sku ? { supplier_sku: formData.supplier_sku } : {}),
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        // The review popup builds the proposal from this payload; without the
        // gallery here an approved product is created with no images.
        images: formData.images || [],
        variants: (formData.variants || []).map((variant) => {
          // Local `blob:` previews are uploaded after the product exists; do not
          // persist them as the variant image in the initial payload.
          const isLocalPreview = Boolean(variant.image?.startsWith('blob:'));
          const attributes = { ...(variant.attributes || {}) };
          // attributes.image duplicates variant.image and would resurrect a
          // cleared photo, so the explicit `image` field is the only source.
          delete attributes.image;
          const saleWindow = formData.sale_ends_at
            ? new Date(formData.sale_ends_at).toISOString()
            : undefined;
          return {
            ...variant,
            image: isLocalPreview ? '' : variant.image,
            attributes,
            sale_price: variant.sale_price ? variant.sale_price : null,
            ...(saleWindow && variant.sale_price ? { sale_ends_at: saleWindow } : {}),
          };
        }),
      };

      if (reviewSubmit) {
        try {
          await reviewSubmit(payload);
          setSuccessMsg('Changes saved to the proposal.');
        } catch (err: any) {
          setError(err?.message || 'Could not save the proposal.');
          setSaving(false);
          return;
        }
        setSaving(false);
        return;
      }

      let createdId = '';
      let createdSlug = '';
      if (mode === 'edit' && productId) {
        const res = await fetch(`/api/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            formatApiError(errData) || 'Failed to update product in database.'
          );
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            formatApiError(errData) || 'Failed to create product in database.'
          );
        }
        const created = await res.json().catch(() => ({}));
        createdId = String((created.data ?? created)?.id ?? '');
        createdSlug = String((created.data ?? created)?.slug ?? '');
      }

      // Upload any newly picked images now that the product exists.
      const savedId = mode === 'edit' && productId ? productId : createdId;
      const pendingUrls = Object.keys(pendingFiles);
      let failedUploads = 0;
      if (savedId && pendingUrls.length > 0) {
        const hasExisting = Object.keys(imageIdsRef.current).length > 0;
        for (let index = 0; index < pendingUrls.length; index += 1) {
          const file = pendingFiles[pendingUrls[index]];
          if (!file) continue;
          const body = new FormData();
          body.append('image', file);
          if (index === 0 && !hasExisting) body.append('is_primary', 'true');

          const matchedVar = (formData.variants || []).find(
            (v) => v.image === pendingUrls[index]
          );
          if (matchedVar?.id) {
            body.append('variant_id', matchedVar.id);
          } else if (matchedVar?.sku) {
            body.append('variant_id', matchedVar.sku);
          }

          try {
            const uploadRes = await fetch(`/api/products/${savedId}/images`, {
              method: 'POST',
              body,
            });
            if (!uploadRes.ok) failedUploads += 1;
          } catch {
            failedUploads += 1;
          }
        }
        setPendingFiles({});
      }

      // Sync local storage for mock fallback
      try {
        saveStoredProduct(formData);
      } catch {}

      // Refresh the storefront so the new/updated product (warranty, price,
      // stock, variants, images) is visible immediately.
      const savedSlug = mode === 'edit' ? formData.slug : createdSlug || formData.slug;
      if (savedSlug) {
        void revalidateStorefront(
          [`/p/${savedSlug}`, `/en/p/${savedSlug}`, '/', '/en'],
          ['products']
        );
      }

      if (failedUploads > 0) {
        setSuccessMsg(
          `Product saved, but ${failedUploads} image${failedUploads === 1 ? '' : 's'} failed to upload. Re-upload ${failedUploads === 1 ? 'it' : 'them'} from the product editor.`
        );
      } else {
        setSuccessMsg('Product details saved and synchronized successfully!');
      }
      setTimeout(() => {
        router.push('/products');
      }, failedUploads > 0 ? 2500 : 1000);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const inputClasses =
    'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[13.5px] text-text-primary transition-all placeholder:text-text-muted/70 hover:border-black/20 focus:border-accent-primary focus:outline-none focus:ring-4 focus:ring-accent-primary/10';
  const priceValue = Number(formData.price) || 0;
  const compareValue = Number(formData.compare_at_price) || 0;
  const costValue = Number(formData.cost_price) || 0;
  const discountValue = compareValue > priceValue ? compareValue - priceValue : 0;
  const marginPct =
    priceValue > 0 && costValue > 0 ? ((priceValue - costValue) / priceValue) * 100 : 0;

  const missingFields: string[] = [];
  if (!String(formData.name || '').trim()) missingFields.push('product name');
  if (!String(formData.category || '').trim()) missingFields.push('category');
  if (!(Number(formData.price) > 0)) missingFields.push('price');
  if ((formData.variants?.length || 0) > 0) {
    const badVariant = (formData.variants || []).some(
      (variant) => !String(variant.name || '').trim() || !(Number(variant.price) > 0)
    );
    if (badVariant) missingFields.push('variant name and price');
  }
  const canSubmit = missingFields.length === 0;

  const existingSpecLabels = new Set(
    (formData.specifications || []).flatMap((group) =>
      group.items.map((item) => String(item.label || '').trim().toLowerCase())
    )
  );
  const pendingSpecs = [...(specSuggestions || []), ...extraSpecs].filter(
    (item) =>
      item.label &&
      !dismissedSpecs.includes(item.label) &&
      !existingSpecLabels.has(item.label.trim().toLowerCase())
  );

  const labelClasses =
    'mb-2 block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary';
  const cardClasses =
    'rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)]';
  const cardTitleClasses =
    'mb-6 flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] text-text-primary';
  const addButtonClasses =
    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-black/20 hover:text-text-primary';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="animate-spin text-accent-primary" size={36} />
        <p className="text-sm text-text-secondary font-medium">Loading product details from backend...</p>
      </div>
    );
  }

  return (
    <div className={embedded ? 'animate-fade-in' : 'animate-fade-in pb-16 max-w-[1400px] mx-auto'}>
      {/* Header */}
      {!embedded && (
      <header className="mb-6 flex flex-col gap-4 border-b border-black/[0.06] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-text-secondary transition-colors hover:border-black/20 hover:text-text-primary"
            title="Back to products"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {mode === 'edit' ? 'Edit Product' : 'New Product'}
              </span>
              {mode === 'edit' && formData.slug && (
                <a
                  href={`${STOREFRONT_URL}/en/p/${formData.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
                >
                  View on Store <ExternalLink size={12} />
                </a>
              )}
            </div>
            <h1 className="font-display text-[27px] font-semibold leading-tight tracking-[-0.03em] text-text-primary">
              {formData.name || (mode === 'edit' ? 'Edit Product' : 'Create Product')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-xl border border-danger/20 text-danger hover:bg-danger/10 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={16} /> Delete
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            title={
              canSubmit
                ? undefined
                : `Add a ${missingFields.join(', ')} to ${mode === 'edit' ? 'save' : 'create'}`
            }
            className={clsx(
              'inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold transition-all',
              canSubmit
                ? 'cursor-pointer bg-accent-primary text-white shadow-[0_1px_2px_rgba(16,24,40,0.12)] hover:bg-accent-primary/90'
                : 'cursor-not-allowed bg-black/[0.06] text-text-muted'
            )}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} /> {mode === 'edit' ? 'Save Changes' : 'Create Product'}
              </>
            )}
          </button>
        </div>
      </header>
      )}

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-700 flex items-center gap-3">
          <Check size={20} className="shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {mode === 'create' && !embedded && (
        <div className="mb-6 rounded-2xl border border-border-color bg-white px-4 py-3 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              <Sparkles size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-text-primary">AI Fetch</p>
              <p className="text-[11.5px] text-text-muted">
                Type a product name, fetch specs, copy and shop prices, then fill the empty fields.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ChatModelPicker
                buttonClassName="h-9 w-[150px] max-w-none justify-between"
                recommended="cohere/north-mini-code:free"
              />
              <button
                type="button"
                onClick={() => void runFetch()}
                disabled={researching || saving}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-progress disabled:opacity-70"
              >
                {researching ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Fetching…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Fetch with AI
                  </>
                )}
              </button>
            </div>
          </div>
          {(researchNote || fetchError) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border-color pt-2 text-[11.5px]">
              {fetchError ? (
                <span className="flex items-center gap-1.5 text-danger">
                  <AlertCircle size={12} /> {fetchError}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Check size={12} className="text-success" /> {researchNote}
                </span>
              )}
              {researchNote && (
                <button
                  type="button"
                  onClick={() => {
                    undoFill();
                    setResearchNote('');
                    setFetchedPrices([]);
                  }}
                  className="ml-auto rounded-md border border-border-color px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:text-text-primary"
                >
                  Undo
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Core Content */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Basic Details */}
          <div className={cardClasses}>
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <Tag size={17} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                  General Information
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">
                  Name, slug, brand and the customer-facing description.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <label className={labelClasses}>Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  className={inputClasses}
                  placeholder="e.g. Samsung Galaxy S24 Ultra 512GB"
                  required
                />
                {duplicate && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-warning">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>
                      {duplicate.matched.includes('sku')
                        ? `SKU “${String(formData.sku || '').trim()}” is already used by “${duplicate.name}”.`
                        : duplicate.matched.includes('similar')
                          ? `Similar product exists: “${duplicate.name}”.`
                          : `“${duplicate.name}” already exists in the catalogue.`}
                    </span>
                    <Link
                      href={`/products/${duplicate.id}`}
                      target="_blank"
                      className="font-semibold underline"
                    >
                      Open it
                    </Link>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Slug (URL identifier)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    className={inputClasses}
                    placeholder="e.g. samsung-galaxy-s24-ultra-512gb"
                  />
                </div>

                <div>
                  <label className={labelClasses}>SKU (default variant)</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => {
                      const value = e.target.value;
                      // The product-level SKU belongs to the default variant, so
                      // keep the variant row in sync instead of only changing a
                      // value the API ignores when variants exist.
                      setFormData((prev) => {
                        const variants = [...(prev.variants || [])];
                        const defaultIndex = variants.findIndex((variant) => variant.is_default);
                        const index = defaultIndex >= 0 ? defaultIndex : 0;
                        if (variants[index]) {
                          variants[index] = { ...variants[index], sku: value };
                        }
                        return { ...prev, sku: value, variants };
                      });
                    }}
                    className={inputClasses}
                    placeholder="e.g. S24U-512-GRAY"
                  />
                </div>

                <div>
                  <label className={labelClasses}>Product Code (ours)</label>
                  <input
                    type="text"
                    value={formData.product_code || ''}
                    readOnly
                    disabled
                    className={`${inputClasses} cursor-not-allowed opacity-70`}
                    placeholder="Generated when the product is saved"
                  />
                </div>

              </div>

              <div>
                <label className={labelClasses}>Short Summary (Bullet intro on detail page)</label>
                <textarea
                  value={formData.short_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                  className={clsx(inputClasses, 'h-20 resize-none')}
                  placeholder="Key features separated by commas or lines (e.g. Snapdragon 8 Gen 3, Titanium Frame, 200MP Quad Tele System with Galaxy AI)"
                />
              </div>

              <div>
                <label className={labelClasses}>Full Description</label>
                <div className="[&_.rte-content]:min-h-[170px] [&_.rte-content]:p-4">
                  <RichTextEditor
                    value={formData.description || ''}
                    onChange={(content) => setFormData((prev) => ({ ...prev, description: content }))}
                    placeholder="Detailed product overview, craftsmanship, and specs overview..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Key Highlights (as displayed on detail page) */}
          <div className={cardClasses}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={cardTitleClasses}>
                  <Sparkles size={18} className="text-amber-500" />
                  Key Selling Highlights
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Prominent feature cards shown in the storefront detail page
                </p>
              </div>
              <button
                type="button"
                onClick={addHighlight}
                className={addButtonClasses}
              >
                <Plus size={14} /> Add highlight
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {(formData.highlights || []).map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-2xl border border-black/10 bg-black/[0.01] p-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="text"
                      value={highlight.title}
                      onChange={(e) => updateHighlight(idx, 'title', e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[12.5px] font-medium text-text-primary outline-none focus:border-accent-primary"
                      placeholder="Highlight title (e.g. Galaxy AI Suite, 200MP Quad Tele System)"
                    />
                    <input
                      type="text"
                      value={highlight.description}
                      onChange={(e) => updateHighlight(idx, 'description', e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px] text-text-secondary outline-none focus:border-accent-primary"
                      placeholder="Short supporting line shown under the title"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHighlight(idx)}
                    className="mt-1 shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Delete highlight"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Grouped Specifications (as displayed on detail page) */}
          <div className={cardClasses}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                  <Database size={17} />
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                    Grouped Technical Specifications
                  </h3>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Structured category data (Display, Chipset, Camera, Battery).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addSpecificationGroup}
                className={addButtonClasses}
              >
                <Plus size={14} /> Add category group
              </button>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-black/5 bg-black/[0.015] px-3 py-2.5">
              <label htmlFor="spec-template" className="text-xs font-semibold text-text-secondary">
                Template
              </label>
              <select
                id="spec-template"
                value={specTemplateId}
                onChange={(event) => applySpecTemplate(event.target.value)}
                className="min-w-[220px] rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-text-primary"
              >
                <option value="">Auto (by category)</option>
                {specTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-text-muted">
                Reorders and renames the groups below to match the template.
              </span>
            </div>

            {(formData.specifications || []).length === 0 && (
              <p className="mb-4 rounded-xl border border-dashed border-black/10 bg-black/[0.015] px-4 py-6 text-center text-xs text-text-muted">
                No specification groups yet — choose a template above or add a category group.
              </p>
            )}

            <DragDropContext onDragEnd={onSpecDragEnd}>
              <Droppable droppableId="spec-groups" type="GROUP">
                {(groupDrop) => (
                  <div
                    ref={groupDrop.innerRef}
                    {...groupDrop.droppableProps}
                    className="flex flex-col gap-6"
                  >
                    {(formData.specifications || []).map((group, gi) => (
                      <Draggable
                        key={`group-${gi}`}
                        draggableId={`group-${gi}`}
                        index={gi}
                      >
                        {(groupDrag) => (
                          <div
                            ref={groupDrag.innerRef}
                            {...groupDrag.draggableProps}
                            className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-black/[0.01] p-4"
                          >
                            <div className="flex items-center gap-2 rounded-lg border-b border-black/5 px-1 pb-3">
                              <span
                                {...groupDrag.dragHandleProps}
                                className="shrink-0 cursor-grab rounded p-0.5 text-text-muted hover:text-text-primary active:cursor-grabbing"
                              >
                                <GripVertical size={14} />
                              </span>
                              <span className="h-2 w-2 shrink-0 rounded-full bg-accent-primary" />
                              <input
                                type="text"
                                value={group.title}
                                onChange={(e) => updateGroupTitle(gi, e.target.value)}
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-semibold text-text-primary outline-none placeholder:text-text-muted/70"
                                placeholder="Group title (e.g. Performance & Hardware)"
                              />
                              <button
                                type="button"
                                onClick={() => addSpecItem(gi)}
                                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
                              >
                                <Plus size={12} /> Add row
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSpecificationGroup(gi)}
                                className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                                title="Delete group"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <Droppable droppableId={`spec-items-${gi}`} type="ITEM">
                              {(itemDrop) => (
                                <div
                                  ref={itemDrop.innerRef}
                                  {...itemDrop.droppableProps}
                                  className="space-y-2.5"
                                >
                                  {group.items.map((it, ii) => (
                                    <Draggable
                                      key={`item-${gi}-${ii}`}
                                      draggableId={`item-${gi}-${ii}`}
                                      index={ii}
                                    >
                                      {(itemDrag) => (
                                        <div
                                          ref={itemDrag.innerRef}
                                          {...itemDrag.draggableProps}
                                          className="flex items-center gap-2.5 rounded-lg bg-white"
                                        >
                                          <span
                                            {...itemDrag.dragHandleProps}
                                            className="shrink-0 cursor-grab rounded p-0.5 text-text-muted hover:text-text-primary active:cursor-grabbing"
                                          >
                                            <GripVertical size={13} />
                                          </span>
                                          <input
                                            type="text"
                                            value={it.label}
                                            onChange={(e) =>
                                              updateSpecItem(gi, ii, 'label', e.target.value)
                                            }
                                            className="w-1/3 min-w-0 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[12.5px] text-text-primary outline-none transition-all placeholder:text-text-muted/70 focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10"
                                            placeholder="Label (e.g. Processor, Screen)"
                                          />
                                          <input
                                            type="text"
                                            value={it.value}
                                            onChange={(e) =>
                                              updateSpecItem(gi, ii, 'value', e.target.value)
                                            }
                                            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[12.5px] text-text-primary outline-none transition-all placeholder:text-text-muted/70 focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10"
                                            placeholder="Value (e.g. Snapdragon 8 Gen 3, Dynamic AMOLED 2X)"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => removeSpecItem(gi, ii)}
                                            className="shrink-0 cursor-pointer rounded-lg p-2 text-text-muted transition-all hover:bg-danger/10 hover:text-danger"
                                            title="Remove Row"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {itemDrop.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {groupDrop.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {pendingSpecs.length > 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-accent-primary/35 bg-accent-primary/[0.04] p-3.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent-primary">
                  Found in other sources — click + to add
                </p>
                <ul className="mt-2 space-y-1.5">
                  {pendingSpecs.map((item) => (
                    <li
                      key={`${item.label}-${item.value}`}
                      className="flex items-start gap-2 text-[12px]"
                    >
                      <button
                        type="button"
                        onClick={() => addSuggestedSpec(item.label, item.value)}
                        title="Add this specification"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent-primary/40 text-accent-primary transition-colors hover:bg-accent-primary hover:text-white"
                      >
                        <Plus size={11} />
                      </button>
                      <span className="min-w-0">
                        <span className="font-semibold text-text-primary">{item.label}</span>
                        <span className="text-text-secondary"> — {item.value}</span>
                        {(item.shop || item.section) && (
                          <span className="ml-1.5 whitespace-nowrap text-[10.5px] text-text-muted">
                            ({[item.shop, item.section].filter(Boolean).join(' · ')})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Pricing, Inventory & Variants */}
          <div className={cardClasses}>
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Banknote size={17} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                  Pricing & Inventory
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">
                  Retail rates, cost margins, live stock and variant pricing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex h-5 items-center">
                  <label className={clsx(labelClasses, 'mb-0 whitespace-nowrap')}>
                    Regular Price (৳) *
                  </label>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  className={inputClasses}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex h-5 items-center justify-between gap-2">
                  <label className={clsx(labelClasses, 'mb-0 whitespace-nowrap')}>
                    Compare Price (৳)
                  </label>
                  {discountValue > 0 && (
                    <span className="whitespace-nowrap rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                      −৳{discountValue.toLocaleString()} off
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.compare_at_price || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, compare_at_price: e.target.value }))}
                  className={inputClasses}
                  placeholder="0.00"
                />
              </div>

              <div>
                <div className="mb-2 flex h-5 items-center justify-between gap-2">
                  <label className={clsx(labelClasses, 'mb-0 whitespace-nowrap')}>
                    Cost Price (৳)
                  </label>
                  {marginPct > 0 && (
                    <span className="whitespace-nowrap rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                      {marginPct.toFixed(1)}% margin
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_price || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost_price: e.target.value }))}
                  className={inputClasses}
                  placeholder="0.00"
                />
              </div>

              <div>
                <div className="mb-2 flex h-5 items-center">
                  <label className={clsx(labelClasses, 'mb-0 whitespace-nowrap')}>
                    Available Stock
                  </label>
                </div>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                  className={inputClasses}
                  placeholder="0"
                  disabled={(formData.variants?.length || 0) > 0}
                  title={
                    (formData.variants?.length || 0) > 0
                      ? 'Stock is tracked per variant'
                      : undefined
                  }
                />
              </div>
            </div>

            {(formData.variants?.length || 0) > 0 && (
              <p className="mt-3 text-[11px] text-text-muted">
                Stock and price are tracked per variant below. The product-level
                stock field is ignored while variants exist.
              </p>
            )}

            {(fetchedPrices.length > 0 ? fetchedPrices : storePrices).length > 0 && (
              <div className="mt-4 rounded-xl border border-border-color bg-bg-secondary px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Found at other stores
                </p>
                <ul className="mt-1 space-y-0.5">
                  {(fetchedPrices.length > 0 ? fetchedPrices : storePrices).map((entry) => (
                    <li
                      key={entry.url || entry.shop}
                      className="flex items-center justify-between gap-4 text-[12px]"
                    >
                      <span className="text-text-secondary">{entry.shop}</span>
                      <span className="font-semibold tabular-nums text-text-primary">
                        ৳{Number(entry.price).toLocaleString('en-US')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mode === 'edit' ? (
              <div className="mb-6 border-t border-black/5 pt-6">
                {(formData.variants?.length || 0) > 0 ? (
                  <>
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <span className={labelClasses}>Flash sale price (৳)</span>
                        <p className="text-[11px] text-text-muted">
                          One deal price per variant. Leave a row empty to keep it out of the sale.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {(formData.variants || []).map((variant, index) => {
                        const base = Number(variant.price || 0);
                        const deal = Number(variant.sale_price || 0);
                        const filled = String(variant.sale_price || '').trim() !== '';
                        const invalid = filled && (deal <= 0 || (base > 0 && deal >= base));
                        const percent = filled && !invalid && base > 0
                          ? Math.round(((base - deal) / base) * 100)
                          : null;
                        return (
                          <div
                            key={variant.id || index}
                            className={clsx(
                              'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors',
                              invalid
                                ? 'border-rose-500/40 bg-rose-500/[0.04]'
                                : filled
                                  ? 'border-black/10 bg-white'
                                  : 'border-black/[0.07] bg-black/[0.015]'
                            )}
                          >
                            <span
                              className="h-5 w-5 shrink-0 rounded-md border border-black/10"
                              style={{ backgroundColor: variant.attributes?.color_hex || '#cbd5e1' }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-semibold text-text-primary">
                                {variant.name || `Variant ${index + 1}`}
                              </p>
                              <p className="text-[10.5px] text-text-muted">
                                {base > 0 ? `৳${base.toLocaleString('en-US')}` : '—'}
                              </p>
                            </div>
                            <div className="relative w-[104px] shrink-0">
                              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-text-muted">
                                ৳
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="1"
                                value={variant.sale_price || ''}
                                onChange={(e) =>
                                  updateVariantField(index, 'sale_price', e.target.value)
                                }
                                placeholder="—"
                                aria-label={`Deal price for ${variant.name || 'variant'}`}
                                className={clsx(
                                  'h-9 w-full rounded-lg border bg-white pl-5 pr-2 text-right text-[12.5px] tabular-nums text-text-primary outline-none transition-colors',
                                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                  invalid
                                    ? 'border-rose-500/50 focus:border-rose-500'
                                    : 'border-black/10 focus:border-accent-primary'
                                )}
                              />
                            </div>
                            <span
                              className={clsx(
                                'w-[46px] shrink-0 text-right text-[10.5px] font-semibold tabular-nums',
                                invalid
                                  ? 'text-rose-500'
                                  : percent !== null
                                    ? 'text-emerald-600'
                                    : 'text-text-muted'
                              )}
                            >
                              {invalid ? 'too high' : percent !== null ? `−${percent}%` : 'no deal'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-4">
                      <div>
                        <label className={labelClasses}>Sale ends at</label>
                        <input
                          type="datetime-local"
                          value={formData.sale_ends_at || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, sale_ends_at: e.target.value }))
                          }
                          className={inputClasses}
                        />
                      </div>
                      <p className="max-w-[280px] pb-2 text-[11px] leading-relaxed text-text-muted">
                        Applies to every variant deal above. Leave it empty for no deadline.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label className={labelClasses}>Sale price (৳)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sale_price || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, sale_price: e.target.value }))
                        }
                        className={inputClasses}
                        placeholder="Leave empty for no sale"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Sale ends at</label>
                      <input
                        type="datetime-local"
                        value={formData.sale_ends_at || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, sale_ends_at: e.target.value }))
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-[11px] leading-relaxed text-text-muted">
                        Leave both empty for no sale.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Variants */}
            <div className="mt-6 border-t border-black/5 pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    Product Variants
                  </h4>
                  <p className="mt-1 text-xs text-text-muted">
                    Add variations like colour options, storage, or bundle tiers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className={addButtonClasses}
                >
                  <Plus size={14} /> Add color / variant
                </button>
              </div>

              {(formData.variants?.length || 0) > 0 && (
                <div className="flex flex-col gap-2.5">
                  {(formData.variants || []).map((v, vi) => (
                    <div
                      key={v.id || vi}
                      className={clsx(
                        'relative rounded-xl border bg-white p-3 transition-colors',
                        v.is_default ? 'border-emerald-500/45' : 'border-black/10'
                      )}
                    >
                      {v.is_default && (
                        <span className="pointer-events-none absolute -top-2 right-2.5 rounded-full bg-white px-2 py-[3px] text-[8.5px] font-bold uppercase leading-none tracking-[0.08em] text-emerald-600 ring-1 ring-emerald-500/45">
                          Default
                        </span>
                      )}
                      <div className="flex gap-3">
                        <div className="flex w-[92px] shrink-0 flex-col items-center self-stretch">
                          <span className="mb-1 w-full text-center text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                            Image
                          </span>
                          <button
                            type="button"
                            onClick={() => setGalleryPickerVariantIndex(vi)}
                            className="flex min-h-[76px] w-full flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-black/10 bg-black/[0.02] text-text-muted transition-colors hover:border-accent-primary/50 hover:text-accent-primary"
                          >
                            {v.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={resolveImageUrl(v.image)} alt="" className="h-full w-full object-contain p-1" />
                            ) : (
                              <>
                                <ImageIcon size={16} />
                                <span className="text-[9.5px] font-medium leading-none">Pick image</span>
                              </>
                            )}
                          </button>
                          <span className="mt-1 text-center text-[8.5px] leading-tight text-text-muted">
                            2048 × 2048px
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_auto]">
                            <label className="block sm:col-start-1 sm:row-start-1">
                              <span className="mb-1 block whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Variant name *
                              </span>
                              <input
                                type="text"
                                value={v.name}
                                onChange={(e) => updateVariantField(vi, 'name', e.target.value)}
                                placeholder="e.g. Blue"
                                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] font-medium text-text-primary outline-none focus:border-accent-primary"
                                required
                              />
                            </label>

                            <label className="block sm:col-start-3 sm:row-start-2">
                              <span className="mb-1 block whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Weight
                              </span>
                              <input
                                type="number"
                                value={v.weight_grams || ''}
                                onChange={(e) => updateVariantField(vi, 'weight_grams', e.target.value)}
                                placeholder="0"
                                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] tabular-nums text-text-primary outline-none focus:border-accent-primary"
                              />
                            </label>

                            <label className="block sm:col-start-2 sm:row-start-2">
                              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Stock
                              </span>
                              <input
                                type="number"
                                value={v.stock ?? ''}
                                onChange={(e) => updateVariantField(vi, 'stock', e.target.value)}
                                placeholder="0"
                                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] tabular-nums text-text-primary outline-none focus:border-accent-primary"
                              />
                            </label>

                            <label className="block sm:col-start-1 sm:row-start-2">
                              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                SKU
                              </span>
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFormData((prev) => {
                                    const variants = [...(prev.variants || [])];
                                    if (!variants[vi]) return prev;
                                    variants[vi] = { ...variants[vi], sku: value };
                                    const isDefault =
                                      Boolean(variants[vi].is_default) || variants.length === 1;
                                    return {
                                      ...prev,
                                      variants,
                                      ...(isDefault ? { sku: value } : {}),
                                    };
                                  });
                                }}
                                placeholder="PROD-C1"
                                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 font-mono text-[11.5px] text-text-primary outline-none focus:border-accent-primary"
                              />
                            </label>

                            <label className="block sm:col-start-2 sm:row-start-1">
                              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Price *
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={v.price || ''}
                                onChange={(e) => updateVariantField(vi, 'price', e.target.value)}
                                placeholder="0.00"
                                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] tabular-nums text-text-primary outline-none focus:border-accent-primary"
                                required
                              />
                            </label>

                            <label className="block sm:col-start-3 sm:row-start-1">
                              <span className="mb-1 block whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Compare
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={v.compare_at_price || ''}
                                onChange={(e) => updateVariantField(vi, 'compare_at_price', e.target.value)}
                                placeholder="0.00"
                                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] tabular-nums text-text-primary outline-none focus:border-accent-primary"
                              />
                            </label>


                            <label className="block sm:col-start-4 sm:row-start-1">
                              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Dealer
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={v.cost_price || ''}
                                onChange={(e) => updateVariantField(vi, 'cost_price', e.target.value)}
                                placeholder="0.00"
                                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] tabular-nums text-text-primary outline-none focus:border-accent-primary"
                              />
                            </label>

                            <div className="relative sm:col-start-5 sm:row-start-1">
                              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-transparent">
                                &nbsp;
                              </span>
                              <button
                                type="button"
                                onClick={() => setVariantDefault(vi)}
                                title={v.is_default ? 'Default variant' : 'Set as default'}
                                aria-pressed={v.is_default}
                                className={clsx(
                                  'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                                  v.is_default
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                                    : 'border-black/10 bg-white text-text-muted hover:text-text-primary'
                                )}
                              >
                                <CircleCheck size={15} />
                              </button>
                            </div>

                            <div className="sm:col-start-4 sm:row-start-2">
                              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Colour
                              </span>
                              <ColorPicker
                                value={v.attributes?.color_hex || '#3b82f6'}
                                onChange={(hex) => updateVariantField(vi, 'color_hex', hex)}
                              />
                            </div>

                            <div className="sm:col-start-5 sm:row-start-2">
                              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-transparent">
                                &nbsp;
                              </span>
                              <button
                                type="button"
                                onClick={() => removeVariant(vi)}
                                title="Delete variant"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/15"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Media / Images */}
          <div className={cardClasses}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <ImageIcon size={17} />
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                    Product Images &amp; Gallery
                  </h3>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Drop to add, hover a tile to set the main image. Recommended 2048 × 2048px.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                <Upload size={14} /> Select files
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              multiple
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void processImageFiles(event.dataTransfer.files);
              }}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.01] px-6 py-10 text-center transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/[0.02]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-text-secondary">
                <Plus size={20} />
              </span>
              <span className="text-[13px] font-semibold text-text-primary">
                Drop high-resolution images here or browse
              </span>
              <span className="text-[11.5px] text-text-muted">
                WebP, PNG or JPEG · up to 25 MB · 2048 × 2048 px on a transparent background
              </span>
            </button>

            {(formData.images || []).length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(formData.images || []).map((img, idx) => {
                  const resolved = resolveImageUrl(img);
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        'group relative aspect-square overflow-hidden rounded-xl border bg-black/[0.02] p-2',
                        idx === 0 ? 'border-accent-primary/50 ring-1 ring-accent-primary/20' : 'border-black/10'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolved} alt="" className="h-full w-full object-contain" />

                      {idx === 0 && (
                        <span className="absolute left-2 top-2 z-10 rounded bg-accent-primary px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                          Main
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label="Remove image"
                        className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X size={11} />
                      </button>

                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => setAsMainImage(idx)}
                            className="rounded bg-white px-2 py-1 text-[10.5px] font-bold text-text-primary hover:bg-gray-100"
                          >
                            Make main
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Status & Organization */}
        <div className="flex flex-col gap-6 xl:col-span-1">
          {/* Status & Visibility */}
          <div className={cardClasses}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-text-secondary">
                <Eye size={17} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                  Status &amp; Visibility
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">
                  Draft, active or archived, plus homepage placement.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <label className={labelClasses}>Product Status</label>
                <SelectMenu
                  value={formData.status}
                  onChange={(next) => setFormData((prev) => ({ ...prev, status: next }))}
                  options={[
                    { value: 'draft', label: 'Draft (hidden from store)' },
                    { value: 'active', label: 'Active (visible in catalog)' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
              </div>

              <label
                htmlFor="featured"
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/5 bg-black/[0.02] p-4 transition-colors hover:border-black/10"
              >
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-black/20 bg-white transition-colors checked:border-accent-primary checked:bg-accent-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-primary/20"
                  />
                  <Check
                    size={13}
                    strokeWidth={3}
                    className="pointer-events-none absolute text-white opacity-0 transition-opacity peer-checked:opacity-100"
                  />
                </span>
                <span className="select-none text-[13.5px] font-semibold text-text-primary">
                  Featured on Homepage
                </span>
              </label>
            </div>
          </div>

          {/* Organization */}
          <div className={cardClasses}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-text-secondary">
                <Building2 size={17} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                  Organization
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">Brand and primary category.</p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClasses}>Brand</label>
                  <Link
                    href="/brands"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Manage brands <ExternalLink size={10} />
                  </Link>
                </div>
                <SearchableBrandSelect
                  value={formData.brand || ''}
                  brandId={formData.brand_id}
                  onChange={(brandName, brandId) =>
                    setFormData((prev) => ({ ...prev, brand: brandName, brand_id: brandId || '' }))
                  }
                  brands={brands}
                  loading={loadingBrands}
                  placeholder="Select a brand..."
                />
                <p className="mt-1.5 text-xs text-text-muted">
                  Choose from existing registered brands. No custom text typing.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClasses}>Primary Category</label>
                  <Link
                    href="/categories"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Manage categories <ExternalLink size={10} />
                  </Link>
                </div>
                <SearchableCategorySelect
                  value={formData.category}
                  onChange={(categorySlug) =>
                    setFormData((prev) => ({ ...prev, category: categorySlug }))
                  }
                  categories={categories}
                  loading={loadingCategories}
                  placeholder="Select a category"
                />
                <p className="mt-1.5 text-xs text-text-muted">
                  Type to search by name or parent category. Choose from existing categories only.
                </p>
              </div>
            </div>
          </div>

          {/* Warranty & Return Policy (as displayed on detail page) */}
          <div className={cardClasses}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck size={17} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                  Warranty &amp; Service
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">
                  Shown on the product page.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClasses}>Official Warranty</label>
                <input
                  type="text"
                  value={formData.warranty || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, warranty: e.target.value }))}
                  className={inputClasses}
                  placeholder="e.g. 1 Year Official Authorized Service Warranty"
                />
              </div>

              <div>
                <label className={labelClasses}>Return Policy</label>
                <input
                  type="text"
                  value={formData.return_policy || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, return_policy: e.target.value }))}
                  className={inputClasses}
                  placeholder="e.g. Warranty support as per brand policy"
                />
              </div>
            </div>
          </div>

          {/* Search Engine Optimization */}
          <div className={cardClasses}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-text-secondary">
                <Search size={17} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
                  Search engine listing
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">
                  How this product appears in search results.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <label className={labelClasses}>Meta Title</label>
                <input
                  type="text"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  className={inputClasses}
                  placeholder="SEO page title"
                />
              </div>

              <div>
                <label className={labelClasses}>Meta Description</label>
                <textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  className={clsx(inputClasses, 'h-24 resize-none text-xs')}
                  placeholder="SEO meta description snippet"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Variant Image Selector Modal — portaled to <body>. Rendering a
            `fixed` overlay inside the form would anchor it to the animated
            wrapper (which keeps an identity transform) and push the dialog
            outside the viewport. */}
        {galleryPickerVariantIndex !== null &&
          formData.variants?.[galleryPickerVariantIndex] &&
          createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
              role="dialog"
              aria-modal="true"
              onClick={() => setGalleryPickerVariantIndex(null)}
            >
            <div
              className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-black/10">
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Select Image for {formData.variants[galleryPickerVariantIndex].name || `Variant ${galleryPickerVariantIndex + 1}`}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Choose from images already uploaded for this product to avoid duplicates, or upload a new photo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGalleryPickerVariantIndex(null)}
                  className="h-8 w-8 rounded-full border border-black/10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {imageError && (
                <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-600">
                  <AlertCircle size={12} /> {imageError}
                </p>
              )}
              <div className="flex-1 overflow-y-auto py-5 [scrollbar-width:thin]">
                {formData.images && formData.images.length > 0 ? (
                  <div>
                    <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">
                      Uploaded Product Images ({formData.images.length})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {formData.images.map((imgUrl, i) => {
                        const isCurrentVariantImg =
                          formData.variants?.[galleryPickerVariantIndex]?.image === imgUrl;
                        const resolved = resolveImageUrl(imgUrl);
                        const usedByVariants = (formData.variants || [])
                          .filter((v, vi) => vi !== galleryPickerVariantIndex && v.image === imgUrl)
                          .map((v) => v.name || 'Variant');

                        return (
                          <div
                            key={i}
                            onClick={() => handleSelectGalleryImageForVariant(galleryPickerVariantIndex, imgUrl)}
                            className={clsx(
                              'group relative aspect-square rounded-2xl border-2 overflow-hidden cursor-pointer transition-all p-2 flex flex-col items-center justify-center bg-black/[0.02]',
                              isCurrentVariantImg
                                ? 'border-accent-primary ring-2 ring-accent-primary/20 bg-accent-primary/[0.04]'
                                : 'border-black/10 hover:border-black/30 hover:shadow-xs'
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolved}
                              alt=""
                              className="h-full w-full object-contain transition-transform group-hover:scale-105"
                            />
                            {isCurrentVariantImg && (
                              <span className="absolute top-2 right-2 bg-accent-primary text-white p-1 rounded-full shadow-xs">
                                <Check size={12} />
                              </span>
                            )}
                            {usedByVariants.length > 0 && !isCurrentVariantImg && (
                              <span className="absolute bottom-1.5 inset-x-1.5 text-center bg-black/75 text-white text-[9px] font-medium py-0.5 px-1 rounded-md truncate">
                                {usedByVariants.join(', ')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-black/15 rounded-2xl bg-black/[0.01]">
                    <ImageIcon size={32} className="mx-auto text-text-muted/60 mb-2" />
                    <p className="text-sm font-semibold text-text-primary">No product images uploaded yet</p>
                    <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                      Upload images in the Product Gallery section above, or upload a photo directly below.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
                <label
                  htmlFor={`modal-upload-variant-img-${galleryPickerVariantIndex}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-black/15 hover:border-black/30 bg-white text-text-primary text-xs font-semibold hover:bg-black/5 transition-all cursor-pointer shadow-2xs"
                >
                  {imageBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {imageBusy ? 'Uploading…' : 'Upload New Image'}
                  <input
                    id={`modal-upload-variant-img-${galleryPickerVariantIndex}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleVariantImageUpload(galleryPickerVariantIndex, e).then(
                        (ok) => {
                          if (ok) setGalleryPickerVariantIndex(null);
                        }
                      );
                    }}
                  />
                </label>

                <div className="flex items-center gap-2">
                  {formData.variants[galleryPickerVariantIndex].image && (
                    <button
                      type="button"
                      onClick={() => {
                        updateVariantField(galleryPickerVariantIndex, 'image', '');
                        setGalleryPickerVariantIndex(null);
                      }}
                      className="px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Clear Image
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setGalleryPickerVariantIndex(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
            document.body
          )}
      </form>
    </div>
  );
});
