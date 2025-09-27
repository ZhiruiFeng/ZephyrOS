import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  dailyStrategyApi,
  type DailyStrategyItemWithDetails,
  type CreateDailyStrategyRequest,
  type UpdateDailyStrategyRequest
} from '../api/daily-strategy-api'
import { memoriesApi } from '@/lib/api/memories-api'
import { tasksApi, TaskMemory } from '@/lib/api'

export interface DailyStrategyData {
  intention: DailyStrategyItemWithDetails | null
  adventure: DailyStrategyItemWithDetails | null
  priorities: DailyStrategyItemWithDetails[]
}

export function useDailyStrategy(selectedDate: string, timezone?: string, seasonId?: string) {
  const [data, setData] = useState<DailyStrategyData>({
    intention: null,
    adventure: null,
    priorities: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data for the selected date with debouncing
  const loadData = useCallback(async () => {
    if (!selectedDate) return

    setLoading(true)
    setError(null)

    try {
      // Always try with seasonId first if available, but don't make double calls
      let strategyData = await dailyStrategyApi.getDailyStrategyByType(
        selectedDate,
        timezone,
        seasonId ? { seasonId } : undefined
      )

      // Only make fallback call if seasonId was provided but no results found
      const hasResults = Boolean(
        strategyData.intention ||
        strategyData.adventure ||
        (strategyData.priorities && strategyData.priorities.length > 0)
      )

      if (!hasResults && seasonId) {
        // Fallback to unfiltered results if nothing is linked to this season
        strategyData = await dailyStrategyApi.getDailyStrategyByType(selectedDate, timezone)
      }

      setData(strategyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily strategy data')
      console.error('Failed to load daily strategy data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, timezone, seasonId])

  // Create or update intention
  const saveIntention = useCallback(async (title: string, description: string): Promise<void> => {
    if (!selectedDate) throw new Error('No date selected')
    
    try {
      if (data.intention) {
        // Update existing intention
        const updated = await dailyStrategyApi.updateDailyStrategyItem(data.intention.id, {
          title,
          description,
        })
        setData(prev => ({ ...prev, intention: updated }))
      } else {
        // Create new memory and intention
        const memory = await memoriesApi.create({
          title,
          note: description,
          memory_type: 'note',
          tags: ['daily-planning', 'intention'],
          importance_level: 'medium',
        })

        const intention = await dailyStrategyApi.createDailyIntention(
          memory.id,
          title,
          description,
          selectedDate,
          seasonId
        )
        
        setData(prev => ({ ...prev, intention }))
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to save intention')
    }
  }, [selectedDate, seasonId, data.intention])

  // Create or update adventure
  const saveAdventure = useCallback(async (title: string, description: string): Promise<void> => {
    if (!selectedDate) throw new Error('No date selected')
    
    try {
      if (data.adventure) {
        // Update existing adventure
        const updated = await dailyStrategyApi.updateDailyStrategyItem(data.adventure.id, {
          title,
          description,
        })
        setData(prev => ({ ...prev, adventure: updated }))
      } else {
        // Create new memory and adventure
        const memory = await memoriesApi.create({
          title,
          note: description,
          memory_type: 'note',
          tags: ['daily-planning', 'adventure'],
          importance_level: 'medium',
        })

        const adventure = await dailyStrategyApi.createDailyAdventure(
          memory.id,
          title,
          description,
          selectedDate,
          seasonId
        )
        
        setData(prev => ({ ...prev, adventure }))
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to save adventure')
    }
  }, [selectedDate, seasonId, data.adventure])

  // Add or update priority task
  const savePriority = useCallback(async (
    index: number, 
    title: string, 
    description: string
  ): Promise<void> => {
    if (!selectedDate) throw new Error('No date selected')
    if (index < 0 || index > 2) throw new Error('Priority index must be 0-2')
    
    try {
      const existingPriority = data.priorities[index]
      
      if (existingPriority) {
        // Update existing priority
        try {
          if (existingPriority.timeline_item_id) {
            await tasksApi.update(existingPriority.timeline_item_id, {
              title,
              description,
            })
          }
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : 'Failed to update priority task details')
        }

        const updated = await dailyStrategyApi.updateDailyStrategyItem(existingPriority.id, {
          title,
          description,
        })

        setData(prev => {
          const newPriorities = [...prev.priorities]
          newPriorities[index] = updated
          return { ...prev, priorities: newPriorities }
        })
      } else {
        // Create new task and priority
        const task = await tasksApi.create({
          title,
          description,
          status: 'pending',
          priority: 'high',
          tags: ['daily-priority'],
        })

        const priority = await dailyStrategyApi.createPriorityTask(
          task.id,
          title,
          description,
          selectedDate,
          index + 1,
          'high',
          seasonId
        )
        
        setData(prev => {
          const newPriorities = [...prev.priorities]
          newPriorities[index] = priority
          return { ...prev, priorities: newPriorities }
        })
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to save priority')
    }
  }, [selectedDate, seasonId, data.priorities])

  // Link existing task to priority
  const linkExistingTaskToPriority = useCallback(async (
    index: number,
    existingTask: TaskMemory
  ): Promise<void> => {
    if (!selectedDate) throw new Error('No date selected')
    if (index < 0 || index > 2) throw new Error('Priority index must be 0-2')

    try {
      const priority = await dailyStrategyApi.linkExistingTaskToPriority(
        existingTask,
        selectedDate,
        index + 1,
        'high',
        seasonId
      )

      setData(prev => {
        const newPriorities = [...prev.priorities]
        newPriorities[index] = priority
        return { ...prev, priorities: newPriorities }
      })
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to link existing task')
    }
  }, [selectedDate, seasonId])

  // Remove priority task
  const removePriority = useCallback(async (index: number): Promise<void> => {
    if (index < 0 || index >= data.priorities.length) return
    
    const priority = data.priorities[index]
    if (!priority) return
    
    try {
      await dailyStrategyApi.deleteDailyStrategyItem(priority.id)
      
      setData(prev => {
        const newPriorities = [...prev.priorities]
        newPriorities.splice(index, 1)
        return { ...prev, priorities: newPriorities }
      })
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove priority')
    }
  }, [data.priorities])

  // Mark item as completed
  const markCompleted = useCallback(async (
    itemId: string, 
    completionNotes?: string
  ): Promise<void> => {
    try {
      const updated = await dailyStrategyApi.updateDailyStrategyStatus(itemId, {
        status: 'completed',
        completion_notes: completionNotes,
      })

      setData(prev => {
        if (prev.intention?.id === itemId) {
          return { ...prev, intention: updated }
        }
        if (prev.adventure?.id === itemId) {
          return { ...prev, adventure: updated }
        }
        
        const priorityIndex = prev.priorities.findIndex(p => p.id === itemId)
        if (priorityIndex >= 0) {
          const newPriorities = [...prev.priorities]
          newPriorities[priorityIndex] = updated
          return { ...prev, priorities: newPriorities }
        }
        
        return prev
      })
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to mark as completed')
    }
  }, [])

  // Memoize key dependencies to prevent unnecessary re-renders
  const stableKey = useMemo(() =>
    `${selectedDate}-${timezone}-${seasonId || 'no-season'}`,
    [selectedDate, timezone, seasonId]
  )

  // Load data when key dependencies change, with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData()
    }, 100) // 100ms debounce to prevent rapid consecutive calls

    return () => clearTimeout(timeoutId)
  }, [stableKey, loadData])

  return {
    data,
    loading,
    error,
    loadData,
    saveIntention,
    saveAdventure,
    savePriority,
    linkExistingTaskToPriority,
    removePriority,
    markCompleted,
  }
}
