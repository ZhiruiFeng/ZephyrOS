import { SWRConfiguration } from 'swr'

// Global SWR configuration for optimal performance
export const globalSWRConfig: SWRConfiguration = {
  // Deduplication - prevent duplicate requests
  dedupingInterval: 5000, // 5 seconds
  
  // Focus and network revalidation
  revalidateOnFocus: false, // Don't revalidate on window focus
  revalidateOnReconnect: true, // Revalidate when network comes back
  
  // Error handling
  errorRetryInterval: 30000, // Retry failed requests every 30 seconds
  errorRetryCount: 3, // Maximum 3 retries
  
  // Loading states
  loadingTimeout: 3000, // Show loading state after 3 seconds
  
  // Performance optimization
  refreshInterval: 0, // Don't auto-refresh by default (each hook can override)
  
  // Error boundaries
  onError: (error, key) => {
    console.error(`SWR Error for key "${key}":`, error)
    
    // Track specific API errors
    if (error?.message?.includes('Failed to fetch')) {
      console.warn('🌐 Network error detected - check connection')
    }
    
    if (error?.status === 401) {
      console.warn('🔐 Authentication error - token may be expired')
    }
  },
  
  // Success logging (can be disabled in production)
  onSuccess: (data, key) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ SWR Success for key "${key}"`)
    }
  },
}

// Specific configurations for different data types
export const categoriesConfig: SWRConfiguration = {
  ...globalSWRConfig,
  refreshInterval: 5 * 60 * 1000, // Auto-refresh categories every 5 minutes
  onSuccess: (data, key) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Categories loaded and cached')
    }
  }
}

export const tasksConfig: SWRConfiguration = {
  ...globalSWRConfig,
  refreshInterval: 2 * 60 * 1000, // Auto-refresh tasks every 2 minutes
  onSuccess: (data, key) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Tasks loaded and cached')
    }
  }
}

export const taskDetailsConfig: SWRConfiguration = {
  ...globalSWRConfig,
  refreshInterval: 0, // Don't auto-refresh individual task details
  onSuccess: (data, key) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Task details loaded and cached')
    }
  }
}

// Utility functions for cache management
export const cacheUtils = {
  // Clear all caches
  clearAll: async () => {
    const { mutate } = await import('swr')
    await mutate(() => true, undefined, { revalidate: false })
    console.log('🗑️ All SWR caches cleared')
  },
  
  // Clear caches by pattern
  clearPattern: async (pattern: string) => {
    const { mutate } = await import('swr')
    await mutate(
      (key) => typeof key === 'string' && key.includes(pattern),
      undefined,
      { revalidate: false }
    )
    console.log(`🗑️ Caches matching "${pattern}" cleared`)
  },
  
  // Refresh caches by pattern
  refreshPattern: async (pattern: string) => {
    const { mutate } = await import('swr')
    await mutate(
      (key) => typeof key === 'string' && key.includes(pattern),
      undefined,
      { revalidate: true }
    )
    console.log(`🔄 Caches matching "${pattern}" refreshed`)
  }
}