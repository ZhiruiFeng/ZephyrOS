import { useState } from 'react'
import { strategyApi } from '../../../lib/api/strategy'
import type { ApiInitiative } from '../../../lib/api/strategy'

export interface CreateInitiativeData {
  title: string
  description?: string
  anchor_goal?: string
  success_metric?: string
  status?: 'planning' | 'active' | 'completed' | 'paused' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  progress?: number
  progress_calculation?: 'manual' | 'task_based' | 'weighted_tasks'
  start_date?: string
  due_date?: string
  season_id?: string
  category_id?: string
  tags?: string[]
  metadata?: Record<string, any>
}

export interface UseCreateInitiativeReturn {
  createInitiative: (data: CreateInitiativeData) => Promise<ApiInitiative>
  isCreating: boolean
  error: string | null
}

export function useCreateInitiative(): UseCreateInitiativeReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInitiative = async (data: CreateInitiativeData): Promise<ApiInitiative> => {
    setIsCreating(true)
    setError(null)

    try {
      const result = await strategyApi.createInitiative(data) as ApiInitiative
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create initiative'
      setError(errorMessage)
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  return {
    createInitiative,
    isCreating,
    error
  }
}
