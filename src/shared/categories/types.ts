export interface Category {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  parent_name: string | null;
  path: string;
  depth: number;
  position: number;
  is_active: boolean;
  show_in_nav?: boolean;
  show_in_shop_by?: boolean;
  shop_by_position?: number;
  image: string | null;
  icon?: string;
  meta_title: string;
  meta_description: string;
  seo_h1?: string;
  seo_subtitle?: string;
  seo_intro?: string;
  seo_sections?: { title: string; body: string }[];
  seo_faqs?: { question: string; answer: string }[];
  items_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryListResponse {
  success: boolean;
  data: Category[];
  meta?: {
    count: number;
    page: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
    page_size: number;
  };
}

export interface CategoryFormData {
  name: string;
  slug: string;
  parent: string;
  position: string | number;
  status: 'active' | 'draft';
  icon?: string;
  meta_title: string;
  meta_description: string;
}
