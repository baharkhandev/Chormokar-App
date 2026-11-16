export type BannerType = 'hero_slide' | 'hero_tile' | 'promo' | 'deals_hero';

export interface Banner {
  id: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  image: string;
  image_url: string;
  image_alt?: string;
  cta_label?: string;
  cta_href: string;
  banner_link?: string;
  secondary_cta_label?: string;
  secondary_cta_href?: string;
  banner_type: BannerType;
  show_text_overlay?: boolean;
  duration_seconds?: number;
  ends_at?: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BannerFormData {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  image?: File | null;
  image_alt?: string;
  cta_label?: string;
  cta_href?: string;
  banner_link?: string;
  secondary_cta_label?: string;
  secondary_cta_href?: string;
  banner_type: BannerType;
  show_text_overlay?: boolean;
  duration_seconds?: number;
  ends_at?: string | null;
  position: number;
  is_active: boolean;
}
