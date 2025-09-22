import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptMemoryToStrategy } from '../../adapters/strategy'
import { ZMEMORY_API_BASE } from '../../api/zmemory-api-base'
import { authManager } from '../../auth-manager'
import type { UseStrategyMemoriesReturn, StrategyReflectionForm } from '../../types/strategy'
import type { Memory } from '../../../app/types/memory'

export function useStrategyMemories(seasonId?: string, initiativeId?: string): UseStrategyMemoriesReturn {
  // TODO: Temporarily use mock data until API endpoints are set up
  const mockMemories: Memory[] = [
    {
      id: 'memory-1',
      user_id: 'mock-user',
      title: 'Strategic Planning Insight',
      note: 'Realized that breaking down initiatives into smaller tasks improves completion rate by 40%',
      memory_type: 'insight',
      captured_at: '2024-09-19T00:00:00Z',
      source: 'manual',
      related_to: [],
      is_highlight: true,
      importance_level: 'high',
      tags: ['strategy', 'insight', 'planning'],
      status: 'active',
      created_at: '2024-09-19T00:00:00Z',
      updated_at: '2024-09-19T00:00:00Z'
    },
    {
      id: 'memory-2',
      user_id: 'mock-user',
      title: 'Workflow Reflection',
      note: 'Need to improve task delegation process - agents perform better with detailed context',
      memory_type: 'thought',
      captured_at: '2024-09-18T00:00:00Z',
      source: 'manual',
      related_to: [],
      is_highlight: false,
      importance_level: 'medium',
      tags: ['workflow', 'reflection', 'agents'],
      status: 'active',
      created_at: '2024-09-18T00:00:00Z',
      updated_at: '2024-09-18T00:00:00Z'
    },
    {
      id: 'memory-3',
      user_id: 'mock-user',
      title: 'Goal Achievement',
      note: 'Successfully completed the strategic planning system implementation milestone',
      memory_type: 'insight',
      captured_at: '2024-09-20T00:00:00Z',
      source: 'manual',
      related_to: [],
      is_highlight: true,
      importance_level: 'high',
      tags: ['goal', 'achievement', 'milestone'],
      status: 'active',
      created_at: '2024-09-20T00:00:00Z',
      updated_at: '2024-09-20T00:00:00Z'
    }
  ]

  const strategyMemories = mockMemories.map(adaptMemoryToStrategy)

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

      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_API_BASE}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(memoryData)
      })

      if (!response.ok) {
        throw new Error('Failed to create strategic reflection')
      }

      const newMemory = await response.json()
      const strategyMemory = adaptMemoryToStrategy(newMemory)

      // TODO: Update cache when real API is implemented
      // await mutate()

      return strategyMemory
    } catch (error) {
      console.error('Error creating strategic reflection:', error)
      throw error
    }
  }

  return {
    memories: strategyMemories,
    loading: false, // Mock data is immediately available
    error: null,
    createReflection,
    refetch: () => Promise.resolve()
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

      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_API_BASE}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
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
