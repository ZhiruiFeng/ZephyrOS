import useSWR from 'swr'
import { timeTrackingApi, timelineItemsApi } from '../lib/api'
import { memoriesApi } from '../lib/memories-api'

export interface TimelineItem {
  id: string
  type: 'time_entry' | 'memory' | 'task' | 'activity'
  title: string
  description?: string | null
  startTime: string
  endTime?: string
  duration?: number // minutes
  category?: {
    id: string
    name: string
    color: string
    icon?: string
  }
  tags: string[]
  location?: string | null
  isHighlight?: boolean
  status?: string
  priority?: string
  metadata?: Record<string, any>
}

export interface TimelineData {
  items: TimelineItem[]
  totalDuration: number
  categories: Array<{ id: string; name: string; color: string; count: number }>
  tags: Array<{ name: string; count: number }>
}

export function useTimeline(selectedDate: Date) {
  const dateKey = selectedDate.toISOString().split('T')[0]
  
  const { data, error, isLoading, mutate } = useSWR(
    `timeline-${dateKey}`,
    () => fetchTimelineData(selectedDate),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    timelineData: data || { items: [], totalDuration: 0, categories: [], tags: [] },
    isLoading,
    error,
    refetch: mutate,
  }
}

async function fetchTimelineData(selectedDate: Date): Promise<TimelineData> {
  try {
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    const from = startOfDay.toISOString()
    const to = endOfDay.toISOString()

    // Fetch all data in parallel
    const [timeEntriesResult, memoriesResult, tasksResult] = await Promise.all([
      timeTrackingApi.listDay({ from, to }),
      memoriesApi.search({ 
        date_from: from, 
        date_to: to,
        limit: 100 
      }),
      // TODO: Add tasks API call when available
      Promise.resolve({ tasks: [] })
    ])

    // Transform time entries
    const timeEntryItems: TimelineItem[] = timeEntriesResult.entries.map(entry => ({
      id: entry.id,
      type: 'time_entry' as const,
      title: entry.task_title || 'Time Entry',
      description: entry.note,
      startTime: entry.start_at,
      endTime: entry.end_at || undefined,
      duration: entry.duration_minutes || undefined,
      category: entry.category ? {
        id: entry.category.id,
        name: entry.category.name,
        color: entry.category.color
      } : undefined,
      tags: [],
      location: undefined,
      isHighlight: false,
      metadata: {
        source: entry.source,
        taskId: entry.task_id
      }
    }))

    // Transform memories
    const memoryItems: TimelineItem[] = memoriesResult.memories.map(memory => ({
      id: memory.id,
      type: 'memory' as const,
      title: memory.title_override || memory.note.split('\n')[0],
      description: memory.note,
      startTime: memory.happened_range?.start || memory.captured_at,
      endTime: memory.happened_range?.end,
      duration: undefined,
      category: memory.category ? {
        id: memory.category.id,
        name: memory.category.name,
        color: memory.category.color,
        icon: memory.category.icon
      } : undefined,
      tags: memory.tags,
      location: memory.place_name,
      isHighlight: memory.is_highlight,
      metadata: {
        memoryType: memory.memory_type,
        emotionValence: memory.emotion_valence,
        emotionArousal: memory.emotion_arousal,
        mood: memory.mood,
        importance: memory.importance_level,
        salience: memory.salience_score
      }
    }))

    // Transform tasks (placeholder for now)
    const taskItems: TimelineItem[] = (tasksResult.tasks || []).map((task: any) => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      description: task.description,
      startTime: task.created_at,
      endTime: task.completion_date,
      duration: task.estimated_duration,
      category: task.category ? {
        id: task.category.id,
        name: task.category.name,
        color: task.category.color,
        icon: task.category.icon
      } : undefined,
      tags: task.tags || [],
      location: undefined,
      isHighlight: false,
      status: task.status,
      priority: task.priority,
      metadata: {
        progress: task.progress,
        assignee: task.assignee,
        dueDate: task.due_date
      }
    }))

    // Combine all items and sort by start time
    const allItems = [...timeEntryItems, ...memoryItems, ...taskItems].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    // Calculate total duration
    const totalDuration = allItems.reduce((total, item) => {
      if (item.duration) {
        return total + item.duration
      }
      return total
    }, 0)

    // Aggregate categories
    const categoryMap = new Map<string, { id: string; name: string; color: string; count: number }>()
    allItems.forEach(item => {
      if (item.category) {
        const existing = categoryMap.get(item.category.id)
        if (existing) {
          existing.count++
        } else {
          categoryMap.set(item.category.id, {
            id: item.category.id,
            name: item.category.name,
            color: item.category.color,
            count: 1
          })
        }
      }
    })

    // Aggregate tags
    const tagMap = new Map<string, number>()
    allItems.forEach(item => {
      item.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      })
    })

    return {
      items: allItems,
      totalDuration,
      categories: Array.from(categoryMap.values()).sort((a, b) => b.count - a.count),
      tags: Array.from(tagMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20) // Top 20 tags
    }
  } catch (error) {
    console.error('Failed to fetch timeline data:', error)
    throw error
  }
}

// Hook for getting timeline data for a specific date range
export function useTimelineRange(startDate: Date, endDate: Date) {
  const startKey = startDate.toISOString().split('T')[0]
  const endKey = endDate.toISOString().split('T')[0]
  
  const { data, error, isLoading, mutate } = useSWR(
    `timeline-range-${startKey}-${endKey}`,
    () => fetchTimelineRangeData(startDate, endDate),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    timelineData: data || { items: [], totalDuration: 0, categories: [], tags: [] },
    isLoading,
    error,
    refetch: mutate,
  }
}

async function fetchTimelineRangeData(startDate: Date, endDate: Date): Promise<TimelineData> {
  try {
    const start = startDate.toISOString()
    const end = endDate.toISOString()

    // Fetch data for the date range
    const [timeEntriesResult, memoriesResult] = await Promise.all([
      timeTrackingApi.listDay({ from: start, to: end }),
      memoriesApi.search({ 
        date_from: start, 
        date_to: end,
        limit: 500 
      })
    ])

    // Transform and combine data similar to single day
    const timeEntryItems: TimelineItem[] = timeEntriesResult.entries.map(entry => ({
      id: entry.id,
      type: 'time_entry' as const,
      title: entry.task_title || 'Time Entry',
      description: entry.note,
      startTime: entry.start_at,
      endTime: entry.end_at || undefined,
      duration: entry.duration_minutes || undefined,
      category: entry.category ? {
        id: entry.category.id,
        name: entry.category.name,
        color: entry.category.color
      } : undefined,
      tags: [],
      location: undefined,
      isHighlight: false,
      metadata: {
        source: entry.source,
        taskId: entry.task_id
      }
    }))

    const memoryItems: TimelineItem[] = memoriesResult.memories.map(memory => ({
      id: memory.id,
      type: 'memory' as const,
      title: memory.title_override || memory.note.split('\n')[0],
      description: memory.note,
      startTime: memory.happened_range?.start || memory.captured_at,
      endTime: memory.happened_range?.end,
      duration: undefined,
      category: memory.category ? {
        id: memory.category.id,
        name: memory.category.name,
        color: memory.category.color,
        icon: memory.category.icon
      } : undefined,
      tags: memory.tags,
      location: memory.place_name,
      isHighlight: memory.is_highlight,
      metadata: {
        memoryType: memory.memory_type,
        emotionValence: memory.emotion_valence,
        emotionArousal: memory.emotion_arousal,
        mood: memory.mood,
        importance: memory.importance_level,
        salience: memory.salience_score
      }
    }))

    const allItems = [...timeEntryItems, ...memoryItems].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    const totalDuration = allItems.reduce((total, item) => {
      if (item.duration) {
        return total + item.duration
      }
      return total
    }, 0)

    // Aggregate categories and tags
    const categoryMap = new Map<string, { id: string; name: string; color: string; count: number }>()
    const tagMap = new Map<string, number>()

    allItems.forEach(item => {
      if (item.category) {
        const existing = categoryMap.get(item.category.id)
        if (existing) {
          existing.count++
        } else {
          categoryMap.set(item.category.id, {
            id: item.category.id,
            name: item.category.name,
            color: item.category.color,
            count: 1
          })
        }
      }
      
      item.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      })
    })

    return {
      items: allItems,
      totalDuration,
      categories: Array.from(categoryMap.values()).sort((a, b) => b.count - a.count),
      tags: Array.from(tagMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
    }
  } catch (error) {
    console.error('Failed to fetch timeline range data:', error)
    throw error
  }
}
