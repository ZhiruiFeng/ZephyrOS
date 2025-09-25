import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  dailyStrategyApi, 
  DailyStrategyItemWithDetails,
} from '../../lib/api/daily-strategy-api'
import { memoriesApi } from '../../lib/api/memories-api'
import { tasksApi } from '../../lib/api'
import { ReflectionType } from '../../app/strategy/components/modals/ReflectionTypeSelector'

export interface DayReflectionData {
  reflections: DailyStrategyItemWithDetails[]
  priorities: DailyStrategyItemWithDetails[]
  completionRate: number
  completedCount: number
  totalCount: number
}

export function useDayReflection(date: string, seasonId?: string) {
  const [data, setData] = useState<DayReflectionData>({
    reflections: [],
    priorities: [],
    completionRate: 0,
    completedCount: 0,
    totalCount: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load daily strategy data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await dailyStrategyApi.getDailyStrategyItemsByDate(date)
      
      // Separate reflections and priorities
      const reflections = items.filter(item => 
        ['learning', 'milestone', 'insight', 'reflection'].includes(item.strategy_type)
      )
      const priorities = items.filter(item => item.strategy_type === 'priority')
      
      // Calculate completion rate based on priorities
      const completedPriorities = priorities.filter(p => p.status === 'completed')
      const completionRate = priorities.length > 0 
        ? Math.round((completedPriorities.length / priorities.length) * 100)
        : 0
      
      setData({
        reflections,
        priorities,
        completionRate,
        completedCount: completedPriorities.length,
        totalCount: priorities.length
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reflection data')
    } finally {
      setLoading(false)
    }
  }, [date])

  // Add a new reflection
  const addReflection = useCallback(async (
    type: ReflectionType,
    title: string,
    content: string
  ): Promise<void> => {
    try {
      // Create memory first
      const memory = await memoriesApi.create({
        title,
        note: content,
        memory_type: 'note',
        tags: ['daily-reflection', type, date],
        importance_level: 'medium',
      })

      // Create daily strategy item
      const reflection = await dailyStrategyApi.createDailyReflection(
        memory.id,
        title,
        content,
        date,
        type,
        seasonId
      )

      // Update local state
      setData(prev => ({
        ...prev,
        reflections: [...prev.reflections, reflection]
      }))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add reflection')
    }
  }, [date, seasonId])

  // Update reflection
  const updateReflection = useCallback(async (
    id: string,
    title: string,
    content: string
  ): Promise<void> => {
    try {
      const reflection = data.reflections.find(r => r.id === id)
      const timelineItemId = reflection?.timeline_item?.id || reflection?.timeline_item_id
      const timelineItemType = reflection?.timeline_item?.type

      if (timelineItemId) {
        try {
          if (timelineItemType === 'task') {
            await tasksApi.update(timelineItemId, {
              title,
              description: content,
            })
          } else {
            await memoriesApi.update(timelineItemId, {
              title,
              note: content,
            })
          }
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : 'Failed to update timeline item for reflection')
        }
      }

      const updated = await dailyStrategyApi.updateDailyStrategyItem(id, {
        title,
        description: content
      })

      setData(prev => ({
        ...prev,
        reflections: prev.reflections.map(r => r.id === id ? updated : r)
      }))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update reflection')
    }
  }, [data.reflections])

  // Delete reflection
  const deleteReflection = useCallback(async (id: string): Promise<void> => {
    try {
      await dailyStrategyApi.deleteDailyStrategyItem(id)
      
      setData(prev => ({
        ...prev,
        reflections: prev.reflections.filter(r => r.id !== id)
      }))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete reflection')
    }
  }, [])

  // Get reflection type from strategy type
  const getReflectionType = (strategyType: string): ReflectionType => {
    switch (strategyType) {
      case 'learning': return 'learning'
      case 'milestone': return 'milestone'
      case 'insight': return 'insight'
      case 'reflection': return 'reflection'
      default: return 'reflection'
    }
  }

  // Group reflections by type
  const reflectionsByType = useMemo(() => {
    const grouped: Record<ReflectionType, DailyStrategyItemWithDetails[]> = {
      learning: [],
      milestone: [],
      insight: [],
      reflection: [],
      gratitude: []
    }

    data.reflections.forEach(reflection => {
      const type = getReflectionType(reflection.strategy_type)
      // Check if it's gratitude based on tags or title
      const isGratitude = reflection.title.toLowerCase().includes('gratitude') ||
                         reflection.description?.toLowerCase().includes('grateful')
      
      if (isGratitude) {
        grouped.gratitude.push(reflection)
      } else {
        grouped[type].push(reflection)
      }
    })

    return grouped
  }, [data.reflections])

  // Memoize key to prevent unnecessary re-renders
  const stableKey = useMemo(() =>
    `${date}-${seasonId || 'no-season'}`,
    [date, seasonId]
  )

  // Load data when date changes, with debouncing to prevent rapid calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData()
    }, 100) // 100ms debounce

    return () => clearTimeout(timeoutId)
  }, [stableKey, loadData])

  return {
    data,
    loading,
    error,
    reflectionsByType,
    loadData,
    addReflection,
    updateReflection,
    deleteReflection,
  }
}
