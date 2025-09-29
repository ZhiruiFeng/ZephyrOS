// API functions for fetching memories with anchor data
import { API_BASE } from '@/lib/api'
import { authManager } from '@/lib/auth-manager'
import { EnhancedMemory, MemoryAnchor, MemoryEpisodeAnchor, MemoryStrategyAnchor } from './types'
import { Memory } from '@/types/domain/memory'

export const memoryModuleApi = {
  // Fetch all memories for a user
  async getAllMemories(params?: {
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
        headers: { ...authHeaders }
      })

      if (!response.ok) {
        console.warn(`Failed to fetch memories: ${response.statusText}`)
        return []
      }

      return await response.json()
    } catch (error) {
      console.error('getAllMemories error:', error)
      return []
    }
  },

  // Fetch memory anchors (task-related)
  async getMemoryAnchors(memoryId: string): Promise<MemoryAnchor[]> {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${API_BASE}/memories/${memoryId}/anchors`, {
        headers: { ...authHeaders }
      })

      if (!response.ok) {
        if (response.status === 404) return []
        console.warn(`Failed to fetch memory anchors: ${response.statusText}`)
        return []
      }

      return await response.json()
    } catch (error) {
      console.error('getMemoryAnchors error:', error)
      return []
    }
  },

  // Fetch episode anchors for a memory
  async getEpisodeAnchors(memoryId: string): Promise<MemoryEpisodeAnchor[]> {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${API_BASE}/memories/${memoryId}/episode-anchors`, {
        headers: { ...authHeaders }
      })

      if (!response.ok) {
        if (response.status === 404) return []
        console.warn(`Failed to fetch episode anchors: ${response.statusText}`)
        return []
      }

      return await response.json()
    } catch (error) {
      console.error('getEpisodeAnchors error:', error)
      return []
    }
  },

  // Fetch strategy anchors for a memory (placeholder - endpoint doesn't exist yet)
  async getStrategyAnchors(memoryId: string): Promise<MemoryStrategyAnchor[]> {
    // Strategy anchors API endpoint doesn't exist yet
    // Return empty array for now until the endpoint is implemented
    console.log(`Strategy anchors endpoint not implemented yet for memory ${memoryId}`)
    return []
  },

  // Fetch all memories with their anchor data
  async getMemoriesWithAnchors(params?: {
    limit?: number
    offset?: number
    search?: string
    tags?: string[]
  }): Promise<EnhancedMemory[]> {
    try {
      // First, fetch all memories
      const memories = await this.getAllMemories(params)

      // Then, fetch anchor data for each memory in parallel
      const enhancedMemories = await Promise.all(
        memories.map(async (memory, index): Promise<EnhancedMemory> => {
          try {
            const [anchors, episodeAnchors, strategyAnchors] = await Promise.all([
              this.getMemoryAnchors(memory.id),
              this.getEpisodeAnchors(memory.id),
              this.getStrategyAnchors(memory.id)
            ])

            // Add some sample anchor data for demonstration (remove in production)
            const sampleAnchors = this.generateSampleAnchors(memory, index)

            return {
              ...memory,
              anchors: anchors.length > 0 ? anchors : sampleAnchors.anchors,
              episode_anchors: episodeAnchors.length > 0 ? episodeAnchors : sampleAnchors.episode_anchors,
              strategy_anchors: strategyAnchors.length > 0 ? strategyAnchors : sampleAnchors.strategy_anchors
            }
          } catch (error) {
            console.warn(`Failed to fetch anchors for memory ${memory.id}:`, error)
            // Return memory with sample data if fetching fails
            const sampleAnchors = this.generateSampleAnchors(memory, index)
            return {
              ...memory,
              anchors: sampleAnchors.anchors,
              episode_anchors: sampleAnchors.episode_anchors,
              strategy_anchors: sampleAnchors.strategy_anchors
            }
          }
        })
      )

      return enhancedMemories
    } catch (error) {
      console.error('getMemoriesWithAnchors error:', error)
      return []
    }
  },

  // Generate sample anchor data for demonstration (remove in production)
  generateSampleAnchors(memory: Memory, index: number): {
    anchors: MemoryAnchor[]
    episode_anchors: MemoryEpisodeAnchor[]
    strategy_anchors: MemoryStrategyAnchor[]
  } {
    const shouldHaveAnchors = index % 3 === 0 // Only some memories have anchors

    if (!shouldHaveAnchors) {
      return { anchors: [], episode_anchors: [], strategy_anchors: [] }
    }

    const anchors: MemoryAnchor[] = index % 4 === 0 ? [{
      memory_id: memory.id,
      anchor_item_id: `task-${index}`,
      relation_type: ['about', 'context_of', 'result_of'][index % 3],
      weight: 0.8,
      notes: 'Sample task anchor',
      created_at: memory.created_at,
      timeline_item: {
        id: `task-${index}`,
        type: 'task',
        title: `Sample Task ${index + 1}`,
        description: 'This is a sample task anchor',
        status: 'completed'
      }
    }] : []

    const episode_anchors: MemoryEpisodeAnchor[] = index % 5 === 0 ? [{
      memory_id: memory.id,
      episode_id: `episode-${index}`,
      relation_type: ['about', 'reflects_on', 'insight_from'][index % 3],
      weight: 0.7,
      created_at: memory.created_at,
      episode: {
        id: `episode-${index}`,
        title: `Life Episode ${index + 1}`,
        date_range_start: '2024-01-01',
        date_range_end: '2024-01-31',
        mood_emoji: ['😊', '🤔', '💪'][index % 3]
      }
    }] : []

    const strategy_anchors: MemoryStrategyAnchor[] = index % 6 === 0 ? [{
      memory_id: memory.id,
      strategy_item_id: `strategy-${index}`,
      relation_type: ['about', 'result_of', 'triggered_by'][index % 3],
      weight: 0.9,
      created_at: memory.created_at,
      strategy_item: {
        id: `strategy-${index}`,
        strategy_type: ['daily_plan', 'reflection', 'goal'][index % 3],
        timeline_item_title: `Daily Strategy ${index + 1}`,
        local_date: '2024-01-15',
        importance_level: ['high', 'medium', 'low'][index % 3]
      }
    }] : []

    return { anchors, episode_anchors, strategy_anchors }
  },

  // Get recent memories with anchors
  async getRecentWithAnchors(limit: number = 20): Promise<EnhancedMemory[]> {
    return this.getMemoriesWithAnchors({ limit })
  },

  // Get highlights with anchors
  async getHighlightsWithAnchors(limit: number = 10): Promise<EnhancedMemory[]> {
    try {
      // Fetch all memories and filter highlights on the client side
      // In a real implementation, this should be done on the server
      const memories = await this.getMemoriesWithAnchors({ limit: 100 })
      return memories.filter(memory => memory.is_highlight).slice(0, limit)
    } catch (error) {
      console.error('getHighlightsWithAnchors error:', error)
      return []
    }
  }
}