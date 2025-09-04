import { 
  Memory, 
  MemoryCreateInput, 
  MemoryUpdateInput, 
  MemorySearchParams, 
  MemorySearchResult, 
  WeeklyReview 
} from '../app/types/memory'
import { authManager } from './auth-manager'

// Use the same pattern as api.ts for consistency
const API_BASE = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE ? process.env.NEXT_PUBLIC_API_BASE : ''
const IS_CROSS_ORIGIN = API_BASE && API_BASE.length > 0
// Ensure we target the Next.js API routes under /api when using a cross-origin base
const MEMORIES_API_BASE = API_BASE ? `${API_BASE}/api/memories` : '/api/memories'

// Debug logging
if (typeof window !== 'undefined') {
  console.log('Memories API Configuration:', {
    API_BASE,
    IS_CROSS_ORIGIN,
    MEMORIES_API_BASE,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE
  })
}

class MemoryAPIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'MemoryAPIError'
  }
}

async function memoryApiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${MEMORIES_API_BASE}${endpoint}`
  
  // Get authentication headers
  const authHeaders = await authManager.getAuthHeaders()
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new MemoryAPIError(response.status, errorData.error || 'Request failed')
  }

  return response.json()
}

export const memoriesApi = {
  // Create a new memory
  async create(data: MemoryCreateInput): Promise<Memory> {
    return memoryApiRequest('', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get a specific memory by ID
  async getById(id: string): Promise<Memory> {
    return memoryApiRequest(`/${id}`)
  },

  // Update a memory
  async update(id: string, data: MemoryUpdateInput): Promise<Memory> {
    return memoryApiRequest(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete a memory (soft delete)
  async delete(id: string): Promise<{ message: string }> {
    return memoryApiRequest(`/${id}`, {
      method: 'DELETE',
    })
  },

  // Search/list memories
  async search(params: MemorySearchParams = {}): Promise<MemorySearchResult> {
    const searchParams = new URLSearchParams()
    
    // Map our parameters to the API's expected parameters
    const mappedParams: any = {}
    
    if (params.q) mappedParams.search = params.q
    if (params.tags && params.tags.length > 0) mappedParams.tags = params.tags.join(',')
    if (params.category_id) mappedParams.category_id = params.category_id
    if (params.memory_type) mappedParams.memory_type = params.memory_type
    if (params.importance_level) mappedParams.importance_level = params.importance_level
    if (params.is_highlight !== undefined) mappedParams.is_highlight = params.is_highlight
    if (params.date_from) mappedParams.captured_from = params.date_from
    if (params.date_to) mappedParams.captured_to = params.date_to
    if (params.emotion_valence_min !== undefined) mappedParams.min_emotion_valence = params.emotion_valence_min
    if (params.emotion_valence_max !== undefined) mappedParams.max_emotion_valence = params.emotion_valence_max
    if (params.mood_min !== undefined) mappedParams.min_mood = params.mood_min
    if (params.mood_max !== undefined) mappedParams.max_mood = params.mood_max
    if (params.limit) mappedParams.limit = params.limit
    if (params.offset) mappedParams.offset = params.offset
    
    Object.entries(mappedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString())
      }
    })

    const queryString = searchParams.toString()
    const endpoint = queryString ? `?${queryString}` : ''
    
    try {
      const memories = await memoryApiRequest(endpoint)
      return {
        memories: Array.isArray(memories) ? memories : [],
        total: Array.isArray(memories) ? memories.length : 0,
        has_more: false // API doesn't provide pagination info
      }
    } catch (error) {
      console.warn('Memories search failed, returning empty results:', error)
      return {
        memories: [],
        total: 0,
        has_more: false
      }
    }
  },

  // Get recent memories (simplified search)
  async getRecent(limit: number = 20): Promise<Memory[]> {
    const result = await this.search({ limit })
    return result.memories
  },

  // Get highlights
  async getHighlights(limit: number = 10): Promise<Memory[]> {
    const result = await this.search({ is_highlight: true, limit })
    return result.memories
  },

  // Auto-enhance a memory
  async autoEnhance(memoryId: string): Promise<Memory> {
    return memoryApiRequest(`/${memoryId}/auto-enhance`, {
      method: 'POST',
    })
  },

  // Analyze memory content
  async analyze(content: string): Promise<{
    emotion_valence?: number
    emotion_arousal?: number
    mood?: number
    importance_level?: 'low' | 'medium' | 'high'
    suggested_tags?: string[]
    salience_score?: number
  }> {
    return memoryApiRequest('/analyze', {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  },

  // Get weekly review
  async getWeeklyReview(weekStart: string): Promise<WeeklyReview> {
    return memoryApiRequest(`/reviews/weekly?week_start=${weekStart}`)
  },

  // Memory assets
  async addAsset(memoryId: string, file: File): Promise<{ id: string; url: string }> {
    const formData = new FormData()
    formData.append('file', file)

    // Get authentication headers
    const authHeaders = await authManager.getAuthHeaders()

    const response = await fetch(`${MEMORIES_API_BASE}/${memoryId}/assets`, {
      method: 'POST',
      body: formData,
      headers: authHeaders,
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new MemoryAPIError(response.status, errorData.error || 'Upload failed')
    }

    return response.json()
  },

  async deleteAsset(memoryId: string, assetId: string): Promise<{ message: string }> {
    return memoryApiRequest(`/${memoryId}/assets/${assetId}`, {
      method: 'DELETE',
    })
  },

  // Memory anchors
  async addAnchor(memoryId: string, anchor: {
    type: 'person' | 'place' | 'event' | 'concept'
    name: string
    description?: string
    metadata?: Record<string, any>
  }): Promise<{ id: string }> {
    return memoryApiRequest(`/${memoryId}/anchors`, {
      method: 'POST',
      body: JSON.stringify(anchor),
    })
  },

  async deleteAnchor(memoryId: string, anchorId: string): Promise<{ message: string }> {
    return memoryApiRequest(`/${memoryId}/anchors/${anchorId}`, {
      method: 'DELETE',
    })
  },
}

// Hook-like utilities for common operations
export const useMemoryOperations = () => {
  const createMemory = async (title: string, options: Partial<MemoryCreateInput> = {}) => {
    const data: MemoryCreateInput = {
      title,
      memory_type: 'note',
      source: 'manual',
      importance_level: 'medium',
      is_highlight: false,
      tags: [],
      ...options,
    }

    return memoriesApi.create(data)
  }

  const enhanceMemory = async (id: string, content: string) => {
    // First analyze the content
    const analysis = await memoriesApi.analyze(content)
    
    // Then update the memory with the analysis
    return memoriesApi.update(id, analysis)
  }

  const toggleHighlight = async (memory: Memory) => {
    return memoriesApi.update(memory.id, {
      is_highlight: !memory.is_highlight
    })
  }

  const addTags = async (memory: Memory, newTags: string[]) => {
    const uniqueTags = Array.from(new Set([...memory.tags, ...newTags]))
    return memoriesApi.update(memory.id, { tags: uniqueTags })
  }

  const removeTags = async (memory: Memory, tagsToRemove: string[]) => {
    const filteredTags = memory.tags.filter(tag => !tagsToRemove.includes(tag))
    return memoriesApi.update(memory.id, { tags: filteredTags })
  }

  return {
    createMemory,
    enhanceMemory,
    toggleHighlight,
    addTags,
    removeTags,
  }
}

export { MemoryAPIError }
