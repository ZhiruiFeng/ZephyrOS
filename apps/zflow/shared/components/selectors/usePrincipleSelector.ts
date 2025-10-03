'use client'

import { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '@/lib/api'
import { authManager } from '@/lib/auth-manager'

// Core principle types based on the schema
export interface CorePrincipleMemory {
  id: string
  type: 'core_principle'
  content: {
    title: string
    description?: string
    category: 'work_principles' | 'life_principles' | 'decision_making' | 'relationships' | 'learning' | 'leadership' | 'custom'
    status: 'active' | 'deprecated' | 'archived'
    is_default: boolean
    source: 'ray_dalio' | 'user_custom'
    trigger_questions: string[]
    application_examples: string[]
    personal_notes?: string
    importance_level: number
    application_count: number
    last_applied_at?: string
    deprecated_at?: string
    deprecation_reason?: string
  }
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  user_id: string
}

export interface PrincipleSelectorConfig {
  /** Which principle statuses to include */
  statuses?: ('active' | 'deprecated' | 'archived')[]
  /** Categories to include */
  categories?: ('work_principles' | 'life_principles' | 'decision_making' | 'relationships' | 'learning' | 'leadership' | 'custom')[]
  /** Sources to include */
  sources?: ('ray_dalio' | 'user_custom')[]
  /** Whether to include only default principles */
  isDefault?: boolean
  /** Importance levels to include (1-5) */
  importanceLevels?: number[]
  /** Maximum number of principles to load */
  limit?: number
  /** Sort order */
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'importance_level' | 'application_count' | 'last_applied_at'
  sortOrder?: 'asc' | 'desc'
}

export interface PrincipleSelectorState {
  principles: CorePrincipleMemory[]
  loading: boolean
  error: string | null
  searchQuery: string
  filteredPrinciples: CorePrincipleMemory[]
}

export interface PrincipleSelectorActions {
  setSearchQuery: (query: string) => void
  refreshPrinciples: () => Promise<void>
  getPrincipleDisplayInfo: (principle: CorePrincipleMemory) => {
    title: string
    subtitle: string
    statusColor: string
    categoryColor: string
    categoryIcon: string
    sourceLabel: string
    importanceLevel: number
  }
  formatDate: (dateStr: string) => string
}

const DEFAULT_CONFIG: Required<PrincipleSelectorConfig> = {
  statuses: ['active'],
  categories: [],
  sources: ['user_custom'], // Only show user's own principles
  isDefault: undefined as any,
  importanceLevels: [],
  limit: 50,
  sortBy: 'importance_level',
  sortOrder: 'desc',
}

export function usePrincipleSelector(config: PrincipleSelectorConfig = {}): PrincipleSelectorState & PrincipleSelectorActions {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const [principles, setPrinciples] = useState<CorePrincipleMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load principles from API
  const loadPrinciples = async () => {
    setLoading(true)
    setError(null)
    try {
      const searchParams = new URLSearchParams()

      // Add filtering parameters
      if (finalConfig.categories.length > 0) {
        searchParams.set('category', finalConfig.categories[0])
      }

      if (finalConfig.statuses.length > 0) {
        searchParams.set('status', finalConfig.statuses[0])
      }

      if (finalConfig.sources.length > 0) {
        searchParams.set('source', finalConfig.sources[0])
      }

      if (finalConfig.isDefault !== undefined) {
        searchParams.set('is_default', String(finalConfig.isDefault))
      }

      if (finalConfig.importanceLevels.length > 0) {
        searchParams.set('importance_level', String(finalConfig.importanceLevels[0]))
      }

      searchParams.set('limit', String(finalConfig.limit))
      searchParams.set('sort_by', finalConfig.sortBy)
      searchParams.set('sort_order', finalConfig.sortOrder)

      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${API_BASE}/core-principles?${searchParams.toString()}`, {
        headers: authHeaders
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch principles: ${response.status}`)
      }

      const data = await response.json()
      setPrinciples(data || [])
    } catch (err) {
      console.error('Failed to load principles:', err)
      setError('Failed to load principles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrinciples()
  }, [])

  // Filter principles based on search query
  const filteredPrinciples = useMemo(() => {
    if (!searchQuery.trim()) {
      return principles
    }

    const query = searchQuery.toLowerCase()
    return principles.filter(principle => {
      const title = principle.content.title.toLowerCase()
      const description = (principle.content.description || '').toLowerCase()
      const category = principle.content.category.toLowerCase()
      const status = principle.content.status.toLowerCase()
      const source = principle.content.source.toLowerCase()
      const personalNotes = (principle.content.personal_notes || '').toLowerCase()
      const triggerQuestions = principle.content.trigger_questions.join(' ').toLowerCase()
      const applicationExamples = principle.content.application_examples.join(' ').toLowerCase()

      return title.includes(query) ||
             description.includes(query) ||
             category.includes(query) ||
             status.includes(query) ||
             source.includes(query) ||
             personalNotes.includes(query) ||
             triggerQuestions.includes(query) ||
             applicationExamples.includes(query) ||
             principle.id.toLowerCase().includes(query)
    })
  }, [principles, searchQuery])

  // Utility functions
  const getPrincipleDisplayInfo = (principle: CorePrincipleMemory) => {
    const title = principle.content.title

    // Build subtitle with category and source
    const parts = []
    parts.push(principle.content.category.replace(/_/g, ' '))
    if (principle.content.is_default) {
      parts.push('Default')
    }
    if (principle.content.application_count > 0) {
      parts.push(`Applied ${principle.content.application_count}x`)
    }
    const subtitle = parts.join(' • ')

    return {
      title,
      subtitle,
      statusColor: getPrincipleStatusColor(principle.content.status),
      categoryColor: getPrincipleCategoryColor(principle.content.category),
      categoryIcon: getPrincipleCategoryIcon(principle.content.category),
      sourceLabel: principle.content.is_default ? 'Ray Dalio' : 'Custom',
      importanceLevel: principle.content.importance_level
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
    principles,
    loading,
    error,
    searchQuery,
    filteredPrinciples,

    // Actions
    setSearchQuery,
    refreshPrinciples: loadPrinciples,
    getPrincipleDisplayInfo,
    formatDate,
  }
}

// Utility functions for styling
export function getPrincipleStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-50'
    case 'deprecated': return 'text-orange-600 bg-orange-50'
    case 'archived': return 'text-gray-600 bg-gray-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getPrincipleCategoryColor(category: string): string {
  switch (category) {
    case 'work_principles': return 'text-blue-600 bg-blue-50'
    case 'life_principles': return 'text-purple-600 bg-purple-50'
    case 'decision_making': return 'text-green-600 bg-green-50'
    case 'relationships': return 'text-pink-600 bg-pink-50'
    case 'learning': return 'text-yellow-600 bg-yellow-50'
    case 'leadership': return 'text-indigo-600 bg-indigo-50'
    case 'custom': return 'text-gray-600 bg-gray-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getPrincipleCategoryIcon(category: string): string {
  switch (category) {
    case 'work_principles': return '💼'
    case 'life_principles': return '🌟'
    case 'decision_making': return '🎯'
    case 'relationships': return '🤝'
    case 'learning': return '📚'
    case 'leadership': return '👑'
    case 'custom': return '✨'
    default: return '📋'
  }
}

export function getPrincipleImportanceColor(level: number): string {
  if (level >= 4) return 'text-red-600 bg-red-50'
  if (level === 3) return 'text-yellow-600 bg-yellow-50'
  return 'text-green-600 bg-green-50'
}
