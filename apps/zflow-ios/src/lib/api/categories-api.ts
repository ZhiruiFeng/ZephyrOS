import { API_BASE, authenticatedFetch, ApiError } from './api-base';
import { Category } from '../../types/task';

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const response = await authenticatedFetch(`${API_BASE}/categories`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch categories' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch categories');
    }

    const data = await response.json();
    // Handle both direct array and wrapped response formats
    return data.categories || (Array.isArray(data) ? data : []);
  },

  async get(id: string): Promise<Category> {
    const response = await authenticatedFetch(`${API_BASE}/categories/${id}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch category' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch category');
    }

    const data = await response.json();
    return data.category || data;
  },

  async create(category: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<Category> {
    const response = await authenticatedFetch(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create category' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create category');
    }

    const data = await response.json();
    return data.category || data;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const response = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update category' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update category');
    }

    const data = await response.json();
    return data.category || data;
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete category' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete category');
    }
  }
};