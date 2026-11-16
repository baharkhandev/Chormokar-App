import type { Category, CategoryListResponse } from './types';
import { apiErrorMessage } from '../api/errorMessage';

export async function fetchCategories(params?: {
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<CategoryListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));

  const query = searchParams.toString();
  const res = await fetch(`/api/categories${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(apiErrorMessage(json, 'Failed to fetch categories'));
  }

  // Handle both standard pagination response or direct array
  if (Array.isArray(json)) {
    return { success: true, data: json };
  }

  if (Array.isArray(json.data)) {
    return json as CategoryListResponse;
  }

  return { success: true, data: [] };
}

export async function createCategory(data: any): Promise<Category> {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg =
      json?.error ||
      (typeof json === 'object'
        ? Object.entries(json)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        : 'Failed to create category');
    throw new Error(errorMsg);
  }

  return (json.data || json) as Category;
}

export async function updateCategory(id: string, data: any): Promise<Category> {
  const res = await fetch(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    const errorMsg =
      json?.error ||
      (typeof json === 'object'
        ? Object.entries(json)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        : 'Failed to update category');
    throw new Error(errorMsg);
  }

  return (json.data || json) as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const errorMsg =
      json?.error ||
      json?.detail ||
      'Failed to delete category';
    throw new Error(errorMsg);
  }
}
