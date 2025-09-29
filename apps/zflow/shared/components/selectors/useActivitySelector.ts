'use client'

import { useState, useEffect, useMemo } from 'react'
import { activitiesApi } from '@/lib/api'
import { Activity } from '@/features/activities/types/activities'

export interface ActivitySelectorConfig {
  /** Which activity statuses to include */
  statuses?: ('active' | 'completed' | 'cancelled')[]
  /** Activity types to include */
  activityTypes?: string[]
  /** Maximum number of activities to load */
  limit?: number
  /** Sort order */
  sortBy?: 'updated_at' | 'created_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface ActivitySelectorState {
  activities: Activity[]
  loading: boolean
  error: string | null
  searchQuery: string
  filteredActivities: Activity[]
}

export interface ActivitySelectorActions {
  setSearchQuery: (query: string) => void
  refreshActivities: () => Promise<void>
  getActivityDisplayInfo: (activity: Activity) => {
    title: string
    subtitle: string
    statusColor: string
    typeColor: string
    typeIcon: string
  }
  formatDate: (dateStr: string) => string
}

const DEFAULT_CONFIG: Required<ActivitySelectorConfig> = {
  statuses: ['active', 'completed'],
  activityTypes: [],
  limit: 50,
  sortBy: 'updated_at',
  sortOrder: 'desc',
}

export function useActivitySelector(config: ActivitySelectorConfig = {}): ActivitySelectorState & ActivitySelectorActions {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load activities from API
  const loadActivities = async () => {
    setLoading(true)
    setError(null)
    try {
      const allActivities = await activitiesApi.getAll({
        limit: finalConfig.limit,
        sort_by: finalConfig.sortBy,
        sort_order: finalConfig.sortOrder
      })

      // Filter by configured statuses and activity types
      const filteredActivities = allActivities.filter(activity => {
        const statusMatch = finalConfig.statuses.includes(activity.status)
        const typeMatch = finalConfig.activityTypes.length === 0 ||
                         finalConfig.activityTypes.includes(activity.activity_type)
        return statusMatch && typeMatch
      })

      setActivities(filteredActivities)
    } catch (err) {
      console.error('Failed to load activities:', err)
      setError('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [])

  // Filter activities based on search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) {
      return activities
    }

    const query = searchQuery.toLowerCase()
    return activities.filter(activity => {
      const title = activity.title.toLowerCase()
      const description = (activity.description || '').toLowerCase()
      const activityType = activity.activity_type.toLowerCase()
      const status = activity.status.toLowerCase()

      return title.includes(query) ||
             description.includes(query) ||
             activityType.includes(query) ||
             status.includes(query) ||
             activity.id.toLowerCase().includes(query)
    })
  }, [activities, searchQuery])

  // Utility functions
  const getActivityDisplayInfo = (activity: Activity) => {
    const title = activity.title || 'Untitled Activity'

    // Build subtitle with category and status
    const parts = []
    if (activity.category_id) {
      parts.push(activity.category_id)
    }
    parts.push(activity.status.replace(/_/g, ' '))
    const subtitle = parts.join(' • ')

    return {
      title,
      subtitle,
      statusColor: getActivitySelectorStatusColor(activity.status),
      typeColor: getActivitySelectorTypeColor(activity.activity_type),
      typeIcon: getActivitySelectorTypeIcon(activity.activity_type)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return 'No date'
    }
  }

  return {
    // State
    activities,
    loading,
    error,
    searchQuery,
    filteredActivities,

    // Actions
    setSearchQuery,
    refreshActivities: loadActivities,
    getActivityDisplayInfo,
    formatDate,
  }
}

// Utility functions for styling
export function getActivitySelectorStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-50'
    case 'completed': return 'text-blue-600 bg-blue-50'
    case 'cancelled': return 'text-gray-600 bg-gray-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getActivitySelectorTypeColor(activityType: string): string {
  switch (activityType) {
    case 'exercise': return 'text-red-600 bg-red-50'
    case 'meditation': return 'text-purple-600 bg-purple-50'
    case 'reading': return 'text-blue-600 bg-blue-50'
    case 'music': return 'text-pink-600 bg-pink-50'
    case 'socializing': return 'text-yellow-600 bg-yellow-50'
    case 'gaming': return 'text-indigo-600 bg-indigo-50'
    case 'walking': return 'text-green-600 bg-green-50'
    case 'cooking': return 'text-orange-600 bg-orange-50'
    case 'rest': return 'text-gray-600 bg-gray-50'
    case 'creative': return 'text-purple-600 bg-purple-50'
    case 'learning': return 'text-teal-600 bg-teal-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getActivitySelectorTypeIcon(activityType: string): string {
  switch (activityType) {
    case 'exercise': return '🏃‍♂️'
    case 'meditation': return '🧘‍♀️'
    case 'reading': return '📚'
    case 'music': return '🎵'
    case 'socializing': return '👥'
    case 'gaming': return '🎮'
    case 'walking': return '🚶‍♀️'
    case 'cooking': return '👨‍🍳'
    case 'rest': return '😴'
    case 'creative': return '🎨'
    case 'learning': return '📖'
    case 'other': return '✨'
    default: return '⚡'
  }
}