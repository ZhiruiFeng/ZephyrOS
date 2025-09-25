import useSWR from 'swr'
import { strategyApi } from '../../lib/api/strategy-api'
import type { ApiStrategyMemory } from '../../lib/api/strategy-api'
import type { UseStrategyMemoriesReturn, StrategyReflectionForm, StrategyMemory } from '../../lib/types/strategy'

// =====================================================
// API to Frontend Type Adapter
// =====================================================

function adaptApiMemoryToStrategy(apiMemory: ApiStrategyMemory): StrategyMemory {
  return {
    id: apiMemory.id,
    user_id: apiMemory.user_id,
    title: apiMemory.title,
    note: apiMemory.content,
    memory_type: 'thought' as const,
    captured_at: apiMemory.created_at,
    is_highlight: apiMemory.is_highlight,
    source: 'manual' as const,
    importance_level: apiMemory.importance_level === 'critical' ? 'high' : apiMemory.importance_level,
    related_to: [],
    tags: apiMemory.tags || [],
    status: 'active' as const,
    created_at: apiMemory.created_at,
    updated_at: apiMemory.updated_at,
    // Strategy-specific fields
    strategyType: apiMemory.memory_type as any,
    seasonId: apiMemory.season_id || undefined,
    initiativeId: apiMemory.initiative_id || undefined,
    impact: apiMemory.importance_level as any,
    actionable: apiMemory.memory_type === 'planning_note' || apiMemory.memory_type === 'insight'
  }
}

export function useStrategyMemories(seasonId?: string, initiativeId?: string): UseStrategyMemoriesReturn {
  // Fetch strategic memories from API
  const { data: memoriesData, error, isLoading, mutate } = useSWR(
    ['/strategy/memories', seasonId, initiativeId],
    () => strategyApi.getStrategyMemories({
      season_id: seasonId,
      initiative_id: initiativeId,
      limit: 50,
      sort_by: 'created_at',
      sort_order: 'desc'
    }),
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      errorRetryCount: 3
    }
  )

  // Transform API data to frontend format
  const strategyMemories = memoriesData && Array.isArray(memoriesData) ? memoriesData.map(adaptApiMemoryToStrategy) : []

  const createReflection = async (data: StrategyReflectionForm) => {
    try {
      const tags = [...data.tags, 'strategy', data.strategyType]

      const memoryData = {
        title: data.content.slice(0, 50) + (data.content.length > 50 ? '...' : ''), // Auto-generate title
        content: data.content,
        memory_type: data.strategyType as any,
        importance_level: data.impact,
        is_highlight: data.impact === 'high',
        is_shareable: false, // Default to private
        tags,
        season_id: data.seasonId,
        initiative_id: data.initiativeId,
        context_data: {
          actionable: data.actionable,
          source: 'manual_reflection'
        }
      }

      const newMemory = await strategyApi.createStrategyMemory(memoryData)
      const strategyMemory = adaptApiMemoryToStrategy(newMemory as ApiStrategyMemory)

      // Update cache
      await mutate()

      return strategyMemory
    } catch (error) {
      console.error('Error creating strategic reflection:', error)
      throw error
    }
  }

  return {
    memories: strategyMemories,
    loading: isLoading,
    error: error?.message || null,
    createReflection,
    refetch: () => mutate()
  }
}

// Hook for weekly strategic review
export function useWeeklyReview() {
  const { data, error, isLoading, mutate } = useSWR(
    '/strategy/memories/weekly-review',
    () => strategyApi.getStrategyMemories({
      memory_type: 'retrospective',
      tags: 'weekly-review',
      limit: 5,
      sort_by: 'created_at',
      sort_order: 'desc'
    }),
    {
      revalidateOnFocus: false,
      refreshInterval: 300000 // 5 minutes
    }
  )

  const saveWeeklyReflection = async (content: string) => {
    try {
      const reflection = {
        title: `Weekly Strategic Review - ${new Date().toLocaleDateString()}`,
        content,
        memory_type: 'retrospective' as const,
        importance_level: 'high' as const,
        is_highlight: true,
        is_shareable: false,
        tags: ['strategy', 'weekly-review', 'reflection'],
        context_data: {
          review_type: 'weekly',
          generated_at: new Date().toISOString()
        }
      }

      const saved = await strategyApi.createStrategyMemory(reflection)
      await mutate()
      return adaptApiMemoryToStrategy(saved as ApiStrategyMemory)
    } catch (error) {
      console.error('Error saving weekly reflection:', error)
      throw error
    }
  }

  return {
    weeklyReview: data && Array.isArray(data) ? data.map(adaptApiMemoryToStrategy) : [],
    loading: isLoading,
    error: error?.message || null,
    saveWeeklyReflection,
    refetch: () => mutate()
  }
}
