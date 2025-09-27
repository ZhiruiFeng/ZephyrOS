import useSWR, { mutate } from 'swr'
import { useState, useCallback } from 'react'
import { type RelationType } from '../components/RelationTypeBadge'
import { type MemoryAnchor } from '../components/MemoryAnchorCard'
import { API_BASE } from '@/lib/api'
import { authManager } from '@/lib/auth-manager'

interface Memory {
  id: string
  title: string
  note: string
  tags?: string[]
  created_at: string
  updated_at: string
}

interface CreateMemoryRequest {
  title: string
  note: string
  tags?: string[]
}

interface CreateAnchorRequest {
  anchor_item_id: string
  relation_type: RelationType
  weight?: number
  local_time_range?: {
    start: string
    end?: string
  }
  notes?: string
}

// Memory API functions
const memoryApi = {
  async createMemory(data: CreateMemoryRequest): Promise<Memory> {
    const authHeaders = await authManager.getAuthHeaders()

    const requestBody = {
      title: data.title,
      note: data.note,
      memory_type: 'note',
      tags: data.tags || [],
      // Required/optional fields with defaults
      emotion_valence: 0,
      emotion_arousal: 0,
      energy_delta: 0,
      is_highlight: false,
      salience_score: 0.5,
      source: 'manual'
    }

    const response = await fetch(`${API_BASE}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Memory creation error response:', errorText)
      throw new Error(`Failed to create memory: ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    return result
  },

  async getMemories(params?: {
    limit?: number
    offset?: number
    search?: string
    tags?: string[]
  }): Promise<Memory[]> {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const searchParams = new URLSearchParams()

      if (params?.limit) searchParams.set('limit', params.limit.toString())
      if (params?.offset) searchParams.set('offset', params.offset.toString())
      if (params?.search) searchParams.set('search', params.search)
      if (params?.tags?.length) searchParams.set('tags', params.tags.join(','))

      const response = await fetch(`${API_BASE}/memories?${searchParams}`, {
        headers: {
          ...authHeaders
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch memories: ${response.statusText}`)
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error('getMemories error:', error)
      return []
    }
  },

  async getTaskAnchors(taskId: string): Promise<MemoryAnchor[]> {
    try {
      const authHeaders = await authManager.getAuthHeaders()

      const url = `${API_BASE}/timeline-items/${taskId}/anchors`

      const response = await fetch(url, {
        headers: {
          ...authHeaders
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)

        if (response.status === 404) {
          return [] // No anchors found
        }
        throw new Error(`Failed to fetch task anchors: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('getTaskAnchors error:', error)
      // Return empty array instead of throwing to prevent UI breakage during debugging
      return []
    }
  },

  async createAnchor(memoryId: string, data: CreateAnchorRequest): Promise<MemoryAnchor> {
    const authHeaders = await authManager.getAuthHeaders()

    const response = await fetch(`${API_BASE}/memories/${memoryId}/anchors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anchor creation error response:', errorText)
      throw new Error(`Failed to create anchor: ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    return result
  },

  async deleteAnchor(memoryId: string, anchorItemId: string): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/memories/${memoryId}/anchors/${anchorItemId}`, {
      method: 'DELETE',
      headers: {
        ...authHeaders
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to delete anchor: ${response.statusText}`)
    }
  }
}

// Hook to get all memories for linking
export function useMemories(params?: {
  limit?: number
  offset?: number
  search?: string
  tags?: string[]
}) {
  const key = params ? `memories-${JSON.stringify(params)}` : 'memories'

  const { data, error, isLoading, mutate: refetch } = useSWR(
    key,
    () => memoryApi.getMemories(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000 // 30 seconds
    }
  )

  return {
    memories: (data as Memory[]) || [],
    isLoading,
    error,
    refetch
  }
}

// Hook to get memory anchors for a specific task
export function useTaskMemoryAnchors(taskId: string) {
  const { data, error, isLoading, mutate: refetch } = useSWR(
    taskId ? `task-anchors-${taskId}` : null,
    () => memoryApi.getTaskAnchors(taskId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000 // 10 seconds
    }
  )

  return {
    anchors: (data as MemoryAnchor[]) || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for memory and anchor management actions
export function useMemoryActions() {
  const [isLoading, setIsLoading] = useState(false)

  const createMemoryWithAnchor = useCallback(async (
    memoryData: CreateMemoryRequest,
    anchorData: CreateAnchorRequest
  ) => {
    setIsLoading(true)
    try {
      // Create the memory first
      const memory = await memoryApi.createMemory(memoryData)

      // Then create the anchor
      const anchor = await memoryApi.createAnchor(memory.id, anchorData)

      // Invalidate relevant caches
      await mutate('memories', undefined, { revalidate: true })
      await mutate(`task-anchors-${anchorData.anchor_item_id}`, undefined, { revalidate: true })

      return { memory, anchor }
    } catch (error) {
      console.error('Failed to create memory with anchor:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const linkMemoryToTask = useCallback(async (
    memoryId: string,
    anchorData: CreateAnchorRequest
  ) => {
    setIsLoading(true)
    try {
      const anchor = await memoryApi.createAnchor(memoryId, anchorData)

      // Invalidate relevant caches
      await mutate(`task-anchors-${anchorData.anchor_item_id}`, undefined, { revalidate: true })

      return anchor
    } catch (error) {
      console.error('Failed to link memory to task:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeMemoryFromTask = useCallback(async (
    memoryId: string,
    taskId: string
  ) => {
    setIsLoading(true)
    try {
      await memoryApi.deleteAnchor(memoryId, taskId)

      // Invalidate relevant caches
      await mutate(`task-anchors-${taskId}`, undefined, { revalidate: true })

      return { success: true }
    } catch (error) {
      console.error('Failed to remove memory from task:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    createMemoryWithAnchor,
    linkMemoryToTask,
    removeMemoryFromTask,
    isLoading
  }
}

// Hook for memory search and filtering
export function useMemorySearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const searchMemories = useCallback(async (
    term: string,
    tags: string[] = []
  ) => {
    if (!term.trim() && tags.length === 0) {
      return []
    }

    setIsSearching(true)
    try {
      const memories = await memoryApi.getMemories({
        search: term.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        limit: 50
      })
      return memories
    } catch (error) {
      console.error('Failed to search memories:', error)
      throw error
    } finally {
      setIsSearching(false)
    }
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    selectedTags,
    setSelectedTags,
    searchMemories,
    isSearching
  }
}

export type { Memory, CreateMemoryRequest, CreateAnchorRequest }
