import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptMemoryToStrategy } from '../../adapters/strategy'
import type { UseStrategyMemoriesReturn, StrategyReflectionForm } from '../../types/strategy'
import type { Memory } from '../../../app/types/memory'

const ZMEMORY_API_BASE = 'http://localhost:3001/api'

export function useStrategyMemories(seasonId?: string, initiativeId?: string): UseStrategyMemoriesReturn {
  // Build query parameters for strategic memories
  const queryParams = new URLSearchParams({
    tags: 'strategy,strategic,reflection,goal,insight',
    limit: '50',
    sort_by: 'created_at',
    sort_order: 'desc'
  })

  if (seasonId) {
    queryParams.append('tags', `season:${seasonId}`)
  }

  if (initiativeId) {
    queryParams.append('tags', `initiative:${initiativeId}`)
  }

  const { data: memories, error, mutate } = useSWR<Memory[]>(
    `${ZMEMORY_API_BASE}/memories?${queryParams.toString()}`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 15000, // 15 seconds
      onError: (error) => {
        console.error('Error fetching strategic memories:', error)
      }
    }
  )

  // Filter and adapt memories
  const strategyMemories = memories
    ?.filter(memory =>
      memory.tags?.some(tag =>
        ['strategy', 'strategic', 'reflection', 'goal', 'insight', 'learning'].includes(tag)
      ) || memory.memory_type === 'insight'
    )
    ?.map(adaptMemoryToStrategy) || []

  const createReflection = async (data: StrategyReflectionForm) => {
    try {
      const tags = [...data.tags, 'strategy', data.strategyType]

      // Add season and initiative tags if provided
      if (data.seasonId) {
        tags.push(`season:${data.seasonId}`)
      }
      if (data.initiativeId) {
        tags.push(`initiative:${data.initiativeId}`)
      }

      const memoryData = {
        title: `Strategic ${data.strategyType}`,
        note: data.content,
        memory_type: data.strategyType === 'insight' ? 'insight' : 'thought',
        tags,
        importance_level: data.impact,
        is_highlight: data.impact === 'high',
        context: data.actionable ? 'actionable' : undefined,
        source: 'manual'
      }

      const response = await fetch(`${ZMEMORY_API_BASE}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(memoryData)
      })

      if (!response.ok) {
        throw new Error('Failed to create strategic reflection')
      }

      const newMemory = await response.json()
      const strategyMemory = adaptMemoryToStrategy(newMemory)

      // Optimistically update the cache
      await mutate()

      return strategyMemory
    } catch (error) {
      console.error('Error creating strategic reflection:', error)
      throw error
    }
  }

  return {
    memories: strategyMemories,
    loading: !memories && !error,
    error: error?.message || null,
    createReflection,
    refetch: () => mutate()
  }
}

// Hook for weekly strategic review
export function useWeeklyReview() {
  const { data, error, mutate } = useSWR<any>(
    `${ZMEMORY_API_BASE}/memories/reviews/weekly`,
    authJsonFetcher,
    {
      revalidateOnFocus: false
    }
  )

  const saveWeeklyReflection = async (content: string) => {
    try {
      const reflection = {
        title: `Weekly Strategic Review - ${new Date().toLocaleDateString()}`,
        note: content,
        memory_type: 'thought',
        tags: ['strategy', 'weekly-review', 'reflection'],
        importance_level: 'high',
        is_highlight: true,
        source: 'manual'
      }

      const response = await fetch(`${ZMEMORY_API_BASE}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reflection)
      })

      if (!response.ok) {
        throw new Error('Failed to save weekly reflection')
      }

      const saved = await response.json()
      await mutate()
      return saved
    } catch (error) {
      console.error('Error saving weekly reflection:', error)
      throw error
    }
  }

  return {
    weeklyReview: data,
    loading: !data && !error,
    error: error?.message || null,
    saveWeeklyReflection,
    refetch: () => mutate()
  }
}