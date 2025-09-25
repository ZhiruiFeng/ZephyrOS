import useSWR from 'swr'
import { timeTrackingApi, timelineItemsApi, apiClient } from '../../lib/api'
import { memoriesApi } from '../../lib/api/memories-api'
import { processDayEntries, type TimeEntryWithCrossDay } from '../../app/utils/crossDayUtils'

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
    // Normalize the selected date to start of day
    const normalizedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0)
    
    // Query for EXACT local day converted to UTC
    // For Sept 2nd PDT: from Sept 2, 00:00 PDT to Sept 2, 23:59 PDT
    // Which becomes: Sept 2, 07:00 UTC to Sept 3, 06:59 UTC
    const startOfLocalDay = new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate(), 0, 0, 0, 0)
    const endOfLocalDay = new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate(), 23, 59, 59, 999)
    
    const from = startOfLocalDay.toISOString()
    const to = endOfLocalDay.toISOString()

    // Fetch all data in parallel
    const [timeEntriesResult, memoriesResult, tasksResult] = await Promise.all([
      timeTrackingApi.listDay({ from, to }),
      memoriesApi.search({
        date_from: from,
        date_to: to,
        limit: 100
      }),
      // Fetch all unfinished tasks (not filtered by date)
      apiClient.getTasks({
        limit: 500,
        root_tasks_only: true
      }).then(tasks => ({ tasks }))
    ])

    // Since we queried the exact local day range, we can use the entries directly
    // but still apply cross-day processing to handle any entries that span midnight
    const processedTimeEntries = processDayEntries(timeEntriesResult.entries, normalizedDate)
    
    // Transform processed time entries
    const timeEntryItems: TimelineItem[] = processedTimeEntries.map(entry => ({
      id: entry.id,
      type: 'time_entry' as const,
      title: entry.task_title || 'Time Entry',
      description: entry.note,
      startTime: entry.start_at,
      endTime: entry.end_at || undefined,
      duration: entry.duration_minutes || undefined,
      category: entry.category ? {
        id: entry.category.id,
        name: entry.category.name || 'Unknown Category',
        color: entry.category.color || '#C6D2DE',
        icon: entry.category.icon
      } : undefined,
      tags: [],
      location: undefined,
      isHighlight: false,
      metadata: {
        source: entry.source,
        taskId: entry.task_id,
        isCrossDaySegment: entry.isCrossDaySegment,
        originalId: entry.originalId,
        // Include timeline item type information from the API
        timelineItemType: (entry as any).timeline_item_type,
        timelineItemTitle: (entry as any).timeline_item_title,
        timelineItemId: (entry as any).timeline_item_id
      }
    }))

    // Filter and transform memories to only include those within the normalized selected day
    const dayStart = new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate(), 23, 59, 59, 999)
    
    const memoryItems: TimelineItem[] = memoriesResult.memories
      .filter(memory => {
        const startTime = new Date(memory.happened_range?.start || memory.captured_at)
        const endTime = memory.happened_range?.end ? new Date(memory.happened_range.end) : startTime
        // Only include memories that overlap with the selected day
        return startTime <= dayEnd && endTime >= dayStart
      })
      .map(memory => {
        const startTime = new Date(memory.happened_range?.start || memory.captured_at)
        const endTime = memory.happened_range?.end ? new Date(memory.happened_range.end) : undefined
        
        // Clip times to day boundaries if they extend beyond
        const clippedStart = startTime < dayStart ? dayStart : startTime
        const clippedEnd = endTime && endTime > dayEnd ? dayEnd : endTime
        
        return {
          id: memory.id,
          type: 'memory' as const,
          title: memory.title || memory.title_override || (memory.note?.split('\n')[0] || 'Untitled'),
          description: memory.note ?? '',
          startTime: clippedStart.toISOString(),
          endTime: clippedEnd?.toISOString(),
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
            salience: memory.salience_score,
            isCrossDaySegment: endTime && (startTime < dayStart || endTime > dayEnd),
            originalStart: memory.happened_range?.start || memory.captured_at,
            originalEnd: memory.happened_range?.end,
            capturedAt: memory.captured_at
          }
        }
      })

    // Transform tasks - include all unfinished tasks and add age-based styling
    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const taskItems: TimelineItem[] = (tasksResult.tasks || [])
      .filter((task: any) => {
        const status = task.content.status
        // Include both unfinished and finished tasks
        return status === 'pending' || status === 'in_progress' || status === 'on_hold' || status === 'completed'
      })
      .map((task: any) => {
        const createdAt = new Date(task.created_at)
        const isOldTask = createdAt < oneMonthAgo

        return {
          id: task.id,
          type: 'task' as const,
          title: task.content.title,
          description: task.content.description,
          startTime: task.created_at,
          endTime: task.content.completion_date,
          duration: task.content.estimated_duration,
          category: task.category ? {
            id: task.category.id,
            name: task.category.name,
            color: task.category.color,
            icon: task.category.icon
          } : undefined,
          tags: task.tags || [],
          location: undefined,
          isHighlight: false,
          status: task.content.status,
          priority: task.content.priority,
          metadata: {
            progress: task.content.progress,
            assignee: task.content.assignee,
            dueDate: task.content.due_date,
            isOldTask: isOldTask,
            createdAt: task.created_at,
            taskStatus: task.content.status
          }
        }
      })

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
    // Normalize dates to start of day
    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)
    const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
    
    // Query for EXACT local date range converted to UTC
    const start = normalizedStartDate.toISOString()
    const end = normalizedEndDate.toISOString()

    // Fetch data for the extended date range
    const [timeEntriesResult, memoriesResult] = await Promise.all([
      timeTrackingApi.listDay({ from: start, to: end }),
      memoriesApi.search({ 
        date_from: start, 
        date_to: end,
        limit: 500 
      })
    ])

    // Since we queried exact range, transform entries directly but apply cross-day logic per day
    const allDaysEntries: TimelineItem[] = []
    
    // Process each day in the range separately  
    for (let currentDay = new Date(normalizedStartDate); currentDay <= new Date(normalizedEndDate.getFullYear(), normalizedEndDate.getMonth(), normalizedEndDate.getDate()); currentDay.setDate(currentDay.getDate() + 1)) {
      const dayEntries = processDayEntries(timeEntriesResult.entries, currentDay)
      
      const dayTimelineItems: TimelineItem[] = dayEntries.map(entry => ({
        id: entry.id,
        type: 'time_entry' as const,
        title: entry.task_title || 'Time Entry',
        description: entry.note,
        startTime: entry.start_at,
        endTime: entry.end_at || undefined,
        duration: entry.duration_minutes || undefined,
        category: entry.category ? {
          id: entry.category.id,
          name: entry.category.name || 'Unknown Category',
          color: entry.category.color || '#C6D2DE',
          icon: entry.category.icon
        } : undefined,
        tags: [],
        location: undefined,
        isHighlight: false,
        metadata: {
          source: entry.source,
          taskId: entry.task_id,
          isCrossDaySegment: entry.isCrossDaySegment,
          originalId: entry.originalId
        }
      }))
      
      allDaysEntries.push(...dayTimelineItems)
    }
    
    const timeEntryItems = allDaysEntries

    // Filter and clip memories to the requested range
    const memoryItems: TimelineItem[] = memoriesResult.memories
      .filter(memory => {
        const startTime = new Date(memory.happened_range?.start || memory.captured_at)
        const endTime = memory.happened_range?.end ? new Date(memory.happened_range.end) : startTime
        return startTime <= normalizedEndDate && endTime >= normalizedStartDate
      })
      .map(memory => {
        const startTime = new Date(memory.happened_range?.start || memory.captured_at)
        const endTime = memory.happened_range?.end ? new Date(memory.happened_range.end) : undefined
        
        // Clip times to range boundaries
        const clippedStart = startTime < normalizedStartDate ? normalizedStartDate : startTime
        const clippedEnd = endTime && endTime > normalizedEndDate ? normalizedEndDate : endTime
        
        return {
          id: memory.id,
          type: 'memory' as const,
          title: memory.title || memory.title_override || (memory.note?.split('\n')[0] || 'Untitled'),
          description: memory.note ?? '',
          startTime: clippedStart.toISOString(),
          endTime: clippedEnd?.toISOString(),
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
            salience: memory.salience_score,
            isCrossDaySegment: endTime && (startTime < normalizedStartDate || endTime > normalizedEndDate),
            originalStart: memory.happened_range?.start || memory.captured_at,
            originalEnd: memory.happened_range?.end,
            capturedAt: memory.captured_at
          }
        }
      })

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
