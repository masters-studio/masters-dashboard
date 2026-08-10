import { apiFetch } from './client';

export type CategoryType = 'INCOME' | 'EXPENSE';

/**
 * Mirrors CategoryDto.java exactly — a flat representation of the category
 * tree. parentCategoryId is null for a top-level category, non-null for a
 * subcategory; a category is never more than one level deep, so consumers
 * reassemble the tree themselves (see topLevelOf/childrenOf below) rather
 * than the API nesting it.
 */
export interface Category {
  id: number;
  type: CategoryType;
  profitCenterId: number;
  parentCategoryId: number | null;
  name: string;
  budget: number | null;
  employeeRequired: boolean;
  active: boolean;
}

export interface CategoryListFilters {
  type?: CategoryType;
  profitCenterId?: number;
  parentCategoryId?: number;
  includeInactive?: boolean;
}

export function listCategories(filters: CategoryListFilters = {}): Promise<Category[]> {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.profitCenterId != null) params.set('profitCenterId', String(filters.profitCenterId));
  if (filters.parentCategoryId != null) params.set('parentCategoryId', String(filters.parentCategoryId));
  if (filters.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  return apiFetch<Category[]>(`/categories${query ? `?${query}` : ''}`);
}

/** Top-level categories (no parent) from a flat list already fetched via listCategories(). */
export function topLevelOf(categories: Category[]): Category[] {
  return categories.filter((c) => c.parentCategoryId === null);
}

/** Subcategories of a given parent from a flat list already fetched via listCategories(). */
export function childrenOf(categories: Category[], parentId: number): Category[] {
  return categories.filter((c) => c.parentCategoryId === parentId);
}

/**
 * Mirrors CategoryRequest.java exactly — shared shape for create (POST) and
 * update (PUT). CategoryService.resolveParent() enforces (not this shape):
 * a parent must itself be top-level, and must share both type and
 * profitCenterId with the child — CategoryForm.tsx mirrors that rule
 * client-side by only ever offering matching top-level categories as parent
 * options.
 */
export interface CategoryRequest {
  type: CategoryType;
  profitCenterId: number;
  parentCategoryId: number | null;
  name: string;
  budget: number | null;
  employeeRequired: boolean | null;
  active: boolean | null;
}

export function getCategory(id: number): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`);
}

export function createCategory(request: CategoryRequest): Promise<Category> {
  return apiFetch<Category>('/categories', { method: 'POST', body: request });
}

export function updateCategory(id: number, request: CategoryRequest): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`, { method: 'PUT', body: request });
}

/** Soft-deactivate (sets active=false) — not a real delete, see CategoryController. */
export function deactivateCategory(id: number): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}
