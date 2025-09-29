'use client'

import { useState, useEffect, useMemo } from 'react'
import { memoriesApi } from '@/lib/api'
import { Memory } from 'types'

export interface MemorySelectorConfig {
  /** Which memory statuses to include */
  statuses?: ('active' | 'deleted' | 'archived')[]
  /** Memory types to include */
  memoryTypes?: ('note' | 'link' | 'file' | 'thought' | 'quote' | 'insight')[]
  /** Importance levels to include */
  importanceLevels?: ('low' | 'medium' | 'high')[]
  /** Maximum number of memories to load */
  limit?: number
  /** Sort order */
  sortBy?: 'updated_at' | 'created_at' | 'captured_at' | 'importance'
  sortOrder?: 'asc' | 'desc'
  /** Whether to include highlights only */
  highlightsOnly?: boolean
}

export interface MemorySelectorState {
  memories: Memory[]
  loading: boolean
  error: string | null
  searchQuery: string
  filteredMemories: Memory[]
}

export interface MemorySelectorActions {
  setSearchQuery: (query: string) => void
  refreshMemories: () => Promise<void>
  getMemoryDisplayInfo: (memory: Memory) => {
    title: string
    subtitle: string
    statusColor: string
    typeColor: string
    typeIcon: string
    isHighlight: boolean
    importanceColor: string
  }
  formatDate: (dateStr: string) => string
}

const DEFAULT_CONFIG: Required<MemorySelectorConfig> = {
  statuses: ['active'],
  memoryTypes: [],
  importanceLevels: [],
  limit: 50,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  highlightsOnly: false,
}

export function useMemorySelector(config: MemorySelectorConfig = {}): MemorySelectorState & MemorySelectorActions {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load memories from API
  const loadMemories = async () => {
    setLoading(true)
    setError(null)
    try {
      const searchParams: any = {
        limit: finalConfig.limit,
      }

      // Add filtering parameters
      if (finalConfig.memoryTypes.length > 0) {
        searchParams.memory_type = finalConfig.memoryTypes.join(',')
      }

      if (finalConfig.importanceLevels.length > 0) {
        searchParams.importance_level = finalConfig.importanceLevels.join(',')
      }

      if (finalConfig.highlightsOnly) {
        searchParams.is_highlight = true
      }

      const result = await memoriesApi.search(searchParams)
      const allMemories = result.memories || []

      // Filter by configured statuses
      const filteredMemories = allMemories.filter(memory =>
        finalConfig.statuses.includes(memory.status)
      )

      // Sort memories
      const sortedMemories = [...filteredMemories].sort((a, b) => {
        let aValue: any, bValue: any

        switch (finalConfig.sortBy) {
          case 'captured_at':
            aValue = new Date(a.captured_at).getTime()
            bValue = new Date(b.captured_at).getTime()
            break
          case 'created_at':
            aValue = new Date(a.created_at).getTime()
            bValue = new Date(b.created_at).getTime()
            break
          case 'updated_at':
            aValue = new Date(a.updated_at).getTime()
            bValue = new Date(b.updated_at).getTime()
            break
          case 'importance':
            const importanceOrder = { low: 1, medium: 2, high: 3 }
            aValue = importanceOrder[a.importance_level] || 0
            bValue = importanceOrder[b.importance_level] || 0
            break
          default:
            aValue = a.updated_at
            bValue = b.updated_at
        }

        if (finalConfig.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })

      setMemories(sortedMemories)
    } catch (err) {
      console.error('Failed to load memories:', err)
      setError('Failed to load memories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMemories()
  }, [])

  // Filter memories based on search query
  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) {
      return memories
    }

    const query = searchQuery.toLowerCase()
    return memories.filter(memory => {
      const title = (memory.title || memory.title_override || '').toLowerCase()
      const note = memory.note.toLowerCase()
      const description = (memory.description || '').toLowerCase()
      const memoryType = memory.memory_type.toLowerCase()
      const status = memory.status.toLowerCase()
      const tags = memory.tags.join(' ').toLowerCase()

      return title.includes(query) ||
             note.includes(query) ||
             description.includes(query) ||
             memoryType.includes(query) ||
             status.includes(query) ||
             tags.includes(query) ||
             memory.id.toLowerCase().includes(query)
    })
  }, [memories, searchQuery])

  // Utility functions
  const getMemoryDisplayInfo = (memory: Memory) => {
    const title = memory.title || memory.title_override || 'Untitled Memory'

    // Build subtitle with type and category
    const parts = []
    parts.push(memory.memory_type.replace(/_/g, ' '))
    if (memory.category?.name) {
      parts.push(memory.category.name)
    }
    if (memory.importance_level !== 'medium') {
      parts.push(`${memory.importance_level} priority`)
    }
    const subtitle = parts.join(' • ')

    return {
      title,
      subtitle,
      statusColor: getMemorySelectorStatusColor(memory.status),
      typeColor: getMemorySelectorTypeColor(memory.memory_type),
      typeIcon: getMemorySelectorTypeIcon(memory.memory_type),
      isHighlight: memory.is_highlight,
      importanceColor: getMemorySelectorImportanceColor(memory.importance_level)
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
    memories,
    loading,
    error,
    searchQuery,
    filteredMemories,

    // Actions
    setSearchQuery,
    refreshMemories: loadMemories,
    getMemoryDisplayInfo,
    formatDate,
  }
}

// Utility functions for styling
export function getMemorySelectorStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-50'
    case 'archived': return 'text-yellow-600 bg-yellow-50'
    case 'deleted': return 'text-red-600 bg-red-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getMemorySelectorTypeColor(memoryType: string): string {
  switch (memoryType) {
    case 'note': return 'text-blue-600 bg-blue-50'
    case 'link': return 'text-purple-600 bg-purple-50'
    case 'file': return 'text-green-600 bg-green-50'
    case 'thought': return 'text-yellow-600 bg-yellow-50'
    case 'quote': return 'text-pink-600 bg-pink-50'
    case 'insight': return 'text-indigo-600 bg-indigo-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getMemorySelectorTypeIcon(memoryType: string): string {
  switch (memoryType) {
    case 'note': return '📝'
    case 'link': return '🔗'
    case 'file': return '📁'
    case 'thought': return '💭'
    case 'quote': return '💬'
    case 'insight': return '💡'
    default: return '📄'
  }
}

export function getMemorySelectorImportanceColor(importance: string): string {
  switch (importance) {
    case 'high': return 'text-red-600 bg-red-50'
    case 'medium': return 'text-yellow-600 bg-yellow-50'
    case 'low': return 'text-green-600 bg-green-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}