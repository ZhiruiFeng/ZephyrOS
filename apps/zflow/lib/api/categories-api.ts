import { Category } from '../../app/types/task'
import { API_BASE, authenticatedFetch } from './api-base'

// Categories API
export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const response = await authenticatedFetch(`${API_BASE}/categories`)
    if (!response.ok) throw new Error('Failed to fetch categories')
    const data = await response.json()
    return data.categories || []
  },

  async create(category: { name: string; description?: string; color?: string; icon?: string }): Promise<Category> {
    const response = await authenticatedFetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    })
    if (!response.ok) throw new Error('Failed to create category')
    const data = await response.json()
    return data.category
  },

  async update(id: string, category: Partial<Category>): Promise<Category> {
    const response = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    })
    if (!response.ok) throw new Error('Failed to update category')
    const data = await response.json()
    return data.category
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete category')
  }
}