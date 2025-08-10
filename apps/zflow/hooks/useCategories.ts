import useSWR, { mutate } from 'swr'
import { categoriesApi } from '../lib/api'
import { Category } from '../app/types/task'
import { categoriesConfig } from '../lib/swr-config'
import { useAuth } from '../contexts/AuthContext'

// Categories cache key
const CATEGORIES_KEY = 'categories'

// Hook to get categories with caching (only when authenticated)
export function useCategories() {
  const { user } = useAuth()
  
  const { data, error, isLoading, mutate: refetch } = useSWR(
    user ? CATEGORIES_KEY : null, // Only fetch when user is authenticated
    user ? categoriesApi.getAll : null,
    categoriesConfig
  )

  const categories = (data as Category[]) || []

  return {
    categories,
    isLoading: user ? isLoading : false, // Not loading if user not authenticated
    error: user ? error : null, // No error if user not authenticated
    refetch,
  }
}

// Hook to create category with cache invalidation
export function useCreateCategory() {
  const { user } = useAuth()
  
  const createCategory = async (data: {
    name: string
    description?: string
    color?: string
    icon?: string
  }) => {
    if (!user) {
      throw new Error('Must be authenticated to create category')
    }
    
    try {
      const newCategory = await categoriesApi.create(data)
      
      // Update the cache optimistically
      await mutate(CATEGORIES_KEY, (categories: Category[] = []) => {
        return [...categories, newCategory]
      }, false) // false = don't revalidate immediately
      
      console.log('✨ Category created and cache updated')
      return newCategory
    } catch (error) {
      console.error('Failed to create category:', error)
      // Revalidate on error to sync with server state
      await mutate(CATEGORIES_KEY)
      throw error
    }
  }

  return { createCategory }
}

// Hook to update category with cache invalidation  
export function useUpdateCategory() {
  const { user } = useAuth()
  
  const updateCategory = async (id: string, data: Partial<Category>) => {
    if (!user) {
      throw new Error('Must be authenticated to update category')
    }
    
    try {
      const updatedCategory = await categoriesApi.update(id, data)
      
      // Update the cache optimistically
      await mutate(CATEGORIES_KEY, (categories: Category[] = []) => {
        return categories.map(cat => cat.id === id ? updatedCategory : cat)
      }, false)
      
      console.log('🔄 Category updated and cache refreshed')
      return updatedCategory
    } catch (error) {
      console.error('Failed to update category:', error)
      // Revalidate on error
      await mutate(CATEGORIES_KEY)
      throw error
    }
  }

  return { updateCategory }
}

// Hook to delete category with cache invalidation
export function useDeleteCategory() {
  const { user } = useAuth()
  
  const deleteCategory = async (id: string) => {
    if (!user) {
      throw new Error('Must be authenticated to delete category')
    }
    
    try {
      await categoriesApi.delete(id)
      
      // Update the cache optimistically
      await mutate(CATEGORIES_KEY, (categories: Category[] = []) => {
        return categories.filter(cat => cat.id !== id)
      }, false)
      
      console.log('🗑️ Category deleted and cache updated')
      return { success: true }
    } catch (error) {
      console.error('Failed to delete category:', error)
      // Revalidate on error
      await mutate(CATEGORIES_KEY)
      throw error
    }
  }

  return { deleteCategory }
}

// Utility to manually refresh categories cache
export const refreshCategoriesCache = () => {
  console.log('🔄 Manually refreshing categories cache')
  return mutate(CATEGORIES_KEY)
}

// Utility to clear categories cache
export const clearCategoriesCache = () => {
  console.log('🗑️ Clearing categories cache')
  return mutate(CATEGORIES_KEY, undefined, false)
}