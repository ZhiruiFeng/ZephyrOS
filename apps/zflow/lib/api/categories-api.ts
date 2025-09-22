import { Category } from '../../app/types/task'
import { API_BASE, authenticatedFetch } from './api-base'

// Mock categories for fallback
const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Strategic Projects',
    description: 'High-level strategic initiatives',
    color: '#3b82f6',
    icon: '🎯',
    user_id: 'mock-user',
    task_count: 5,
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z'
  },
  {
    id: 'cat-2',
    name: 'Process Improvement',
    description: 'Workflow and efficiency enhancements',
    color: '#10b981',
    icon: '⚡',
    user_id: 'mock-user',
    task_count: 3,
    created_at: '2024-09-05T00:00:00Z',
    updated_at: '2024-09-18T00:00:00Z'
  },
  {
    id: 'cat-3',
    name: 'Analysis',
    description: 'Research and data analysis tasks',
    color: '#f59e0b',
    icon: '📊',
    user_id: 'mock-user',
    task_count: 2,
    created_at: '2024-09-10T00:00:00Z',
    updated_at: '2024-09-15T00:00:00Z'
  }
]

// Categories API
export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    try {
      const response = await authenticatedFetch(`${API_BASE}/categories`)
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      return data.categories || []
    } catch (error) {
      console.warn('Categories API failed, using mock data:', error)
      return mockCategories
    }
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