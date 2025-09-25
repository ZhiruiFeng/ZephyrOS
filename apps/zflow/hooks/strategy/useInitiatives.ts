import useSWR from 'swr'
import { strategyApi } from '../../lib/api/strategy-api'
import type { ApiInitiative } from '../../lib/api/strategy-api'
import type { UseInitiativesReturn, Initiative, CreateInitiativeForm } from '../../lib/types/strategy'

// =====================================================
// API to Frontend Type Adapter
// =====================================================

function adaptApiInitiativeToFrontend(apiInitiative: ApiInitiative): Initiative {
  return {
    id: apiInitiative.id,
    seasonId: apiInitiative.season_id || '',
    title: apiInitiative.title,
    description: apiInitiative.description || undefined,
    progress: apiInitiative.progress,
    category: apiInitiative.category?.name,
    priority: apiInitiative.priority === 'critical' ? 'urgent' : apiInitiative.priority,
    status: apiInitiative.status === 'paused' ? 'on_hold' :
            apiInitiative.status === 'active' ? 'in_progress' :
            apiInitiative.status === 'planning' ? 'pending' : apiInitiative.status,
    due_date: apiInitiative.due_date || undefined,
    tasks: [], // Will need to be fetched separately or enhanced
    tags: apiInitiative.tags || [],
    created_at: apiInitiative.created_at,
    updated_at: apiInitiative.updated_at
  }
}

export function useInitiatives(seasonId?: string): UseInitiativesReturn {
  // Fetch initiatives from API
  const { data: initiativesData, error, isLoading, mutate } = useSWR(
    ['/strategy/initiatives', seasonId],
    () => strategyApi.getInitiatives({
      season_id: seasonId,
      limit: 50,
      sort_by: 'created_at',
      sort_order: 'desc'
    }),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      errorRetryCount: 3
    }
  )

  // Transform API data to frontend format
  const initiatives = initiativesData && Array.isArray(initiativesData) ? initiativesData.map(adaptApiInitiativeToFrontend) : []

  const createInitiative = async (data: CreateInitiativeForm) => {
    try {
      const initiativeData = {
        season_id: data.seasonId,
        title: data.title,
        description: data.description,
        priority: (data.priority === 'urgent' ? 'critical' : data.priority) as 'low' | 'medium' | 'high' | 'critical',
        status: 'planning' as const,
        progress: 0,
        due_date: data.due_date,
        tags: data.tags
      }

      const newInitiative = await strategyApi.createInitiative(initiativeData)
      const adaptedInitiative = adaptApiInitiativeToFrontend(newInitiative as ApiInitiative)

      // Update cache
      await mutate()

      return adaptedInitiative
    } catch (error) {
      console.error('Error creating initiative:', error)
      throw error
    }
  }

  const updateInitiative = async (id: string, updateData: Partial<Initiative>) => {
    try {
      // Transform frontend types to API types
      const apiUpdateData = {
        ...updateData,
        status: updateData.status === 'pending' ? 'planning' as const :
                updateData.status === 'in_progress' ? 'active' as const :
                updateData.status === 'on_hold' ? 'paused' as const :
                updateData.status as 'completed' | 'cancelled' | 'paused' | 'active' | 'planning' | undefined,
        priority: updateData.priority === 'urgent' ? 'critical' as const :
                 updateData.priority as 'low' | 'medium' | 'high' | 'critical' | undefined
      }

      const updatedInitiative = await strategyApi.updateInitiative(id, apiUpdateData)
      const adaptedInitiative = adaptApiInitiativeToFrontend(updatedInitiative as ApiInitiative)

      // Update cache
      await mutate()

      return adaptedInitiative
    } catch (error) {
      console.error('Error updating initiative:', error)
      throw error
    }
  }

  const deleteInitiative = async (id: string) => {
    try {
      await strategyApi.deleteInitiative(id)

      // Update cache
      await mutate()
    } catch (error) {
      console.error('Error deleting initiative:', error)
      throw error
    }
  }

  return {
    initiatives: seasonId
      ? initiatives.filter(init => init.seasonId === seasonId)
      : initiatives,
    loading: isLoading,
    error: error?.message || null,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    refetch: () => mutate()
  }
}
