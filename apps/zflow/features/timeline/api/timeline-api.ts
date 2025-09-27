// =====================================================
// Timeline Feature API
// =====================================================

import { API_BASE, authenticatedFetch } from '@/lib/api/api-base'
import type { TimelineData, TimelineItem } from '@/timeline'
import type { TimeEntryWithCrossDay } from '@/shared/utils'

/**
 * Fetch timeline data for a specific date
 */
export async function fetchTimelineData(selectedDate: Date): Promise<TimelineData> {
  try {
    // Import API modules dynamically to avoid circular dependencies
    const { timeTrackingApi, timelineItemsApi, apiClient } = await import('@/lib/api')
    const { memoriesApi } = await import('@/lib/api/memories-api')
    const { processDayEntries } = await import('@/shared/utils')

    // Normalize the selected date to start of day
    const normalizedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0)
    
    // Query for EXACT local day converted to UTC
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

    // Process time entries with cross-day handling
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

    // Transform memory items
    const memoryItems: TimelineItem[] = (memoriesResult.memories || []).map((memory: any) => ({
      id: memory.id,
      type: 'memory' as const,
      title: memory.title,
      description: memory.note,
      startTime: memory.created_at,
      endTime: undefined,
      duration: undefined,
      category: memory.category ? {
        id: memory.category.id,
        name: memory.category.name,
        color: memory.category.color,
        icon: memory.category.icon
      } : undefined,
      tags: memory.tags || [],
      location: memory.location,
      isHighlight: memory.importance_level === 'high',
      status: undefined,
      priority: memory.importance_level,
      metadata: {
        memoryType: memory.memory_type,
        importanceLevel: memory.importance_level
      }
    }))

    // Transform task items
    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const taskItems: TimelineItem[] = (tasksResult.tasks || [])
      .filter((task: any) => {
        const status = task.content.status
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
        const key = item.category.id
        const existing = categoryMap.get(key)
        if (existing) {
          existing.count++
        } else {
          categoryMap.set(key, {
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
      categories: Array.from(categoryMap.values()),
      tags: Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }))
    }
  } catch (error) {
    console.error('Failed to fetch timeline data:', error)
    throw error
  }
}

/**
 * Fetch timeline data for a date range
 */
export async function fetchTimelineRangeData(startDate: Date, endDate: Date): Promise<TimelineData> {
  try {
    // Import API modules dynamically
    const { timeTrackingApi, apiClient } = await import('@/lib/api')
    const { memoriesApi } = await import('@/lib/api/memories-api')
    const { processDayEntries } = await import('@/shared/utils')

    const from = startDate.toISOString()
    const to = endDate.toISOString()

    // Fetch data for the range
    const [timeEntriesResult, memoriesResult, tasksResult] = await Promise.all([
      timeTrackingApi.listDay({ from, to }), // Use listDay for now, listRange might not exist
      memoriesApi.search({
        date_from: from,
        date_to: to,
        limit: 1000
      }),
      apiClient.getTasks({
        limit: 1000,
        root_tasks_only: true
      }).then(tasks => ({ tasks }))
    ])

    // Process and combine data similar to fetchTimelineData
    // ... (similar logic but for date range)
    
    // For now, return simplified structure
    return {
      items: [],
      totalDuration: 0,
      categories: [],
      tags: []
    }
  } catch (error) {
    console.error('Failed to fetch timeline range data:', error)
    throw error
  }
}

// Export API object
export const timelineApi = {
  fetchTimelineData,
  fetchTimelineRangeData,
}
