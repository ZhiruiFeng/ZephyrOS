import { useMemo } from 'react'
import { TaskMemory, TaskContent } from '../../lib/api'

export type ViewKey = 'current' | 'future' | 'archive'

interface UseTaskFilteringProps {
  tasks: TaskMemory[]
  selectedCategory: 'all' | 'uncategorized' | string
  search: string
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent'
  sortMode: 'none' | 'priority' | 'due_date'
  timerRunningTaskId?: string
}

interface UseTaskFilteringReturn {
  filteredByCommon: TaskMemory[]
  currentList: TaskMemory[]
  futureList: TaskMemory[]
  archiveList: TaskMemory[]
  groupedArchiveList: Array<{ date: string; tasks: TaskMemory[] }>
  stats: {
    current: number
    future: number
    archive: number
  }
}

export function useTaskFiltering({
  tasks,
  selectedCategory,
  search,
  filterPriority,
  sortMode,
  timerRunningTaskId
}: UseTaskFilteringProps): UseTaskFilteringReturn {
  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000

  // Common filtering logic
  const filteredByCommon = useMemo(() => {
    return tasks.filter((t) => {
      const c = t.content as TaskContent
      const catId = (t as any).category_id || c.category_id
      const matchCategory = selectedCategory === 'all' ? true : selectedCategory === 'uncategorized' ? !catId : catId === selectedCategory
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      return matchCategory && matchSearch && matchPriority
    })
  }, [tasks, selectedCategory, search, filterPriority])

  // Current: pending/in_progress/completed within 24h
  const currentList = useMemo(() => {
    const list = filteredByCommon.filter((t) => {
      const c = t.content as TaskContent
      if (c.status === 'pending' || c.status === 'in_progress') return true
      if (c.status === 'completed') {
        const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
        return completedAt && now - completedAt <= windowMs
      }
      return false
    })
    
    // Sort with timing tasks first, then in_progress, then pending, then completed last
    const sorted = sortTasks(list, sortMode)
    return sorted.sort((a, b) => {
      const aStatus = (a.content as TaskContent).status
      const bStatus = (b.content as TaskContent).status
      const aIsTiming = timerRunningTaskId === a.id
      const bIsTiming = timerRunningTaskId === b.id
      
      // Timing tasks always come first
      if (aIsTiming && !bIsTiming) return -1
      if (bIsTiming && !aIsTiming) return 1
      
      // Then in_progress tasks come second
      if (aStatus === 'in_progress' && bStatus !== 'in_progress') return -1
      if (bStatus === 'in_progress' && aStatus !== 'in_progress') return 1
      
      // Then pending tasks come third
      if (aStatus === 'pending' && bStatus === 'completed') return -1
      if (bStatus === 'pending' && aStatus === 'completed') return 1
      
      // Completed tasks come last
      if (aStatus === 'completed' && bStatus !== 'completed') return 1
      if (bStatus === 'completed' && aStatus !== 'completed') return -1
      
      // Keep original order for same status
      return 0
    })
  }, [filteredByCommon, sortMode, timerRunningTaskId, now, windowMs])

  // Future: on_hold
  const futureList = useMemo(() => {
    const list = filteredByCommon.filter(t => (t.content as TaskContent).status === 'on_hold')
    return sortTasks(list, sortMode)
  }, [filteredByCommon, sortMode])

  // Archive: completed beyond 24h + cancelled
  const archiveList = useMemo(() => {
    const list = filteredByCommon.filter((t) => {
      const c = t.content as TaskContent
      if (c.status === 'cancelled') return true
      if (c.status === 'completed') {
        const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
        return completedAt && now - completedAt > windowMs
      }
      return false
    })
    
    // Sort by completion time descending (most recent first)
    return [...list].sort((a, b) => {
      const aContent = a.content as TaskContent
      const bContent = b.content as TaskContent
      
      // Get completion dates
      const aDate = aContent.status === 'completed' && aContent.completion_date 
        ? new Date(aContent.completion_date).getTime()
        : new Date(a.created_at).getTime() // fallback to created_at for cancelled tasks
      const bDate = bContent.status === 'completed' && bContent.completion_date
        ? new Date(bContent.completion_date).getTime()
        : new Date(b.created_at).getTime() // fallback to created_at for cancelled tasks
      
      return bDate - aDate // descending order (newest first)
    })
  }, [filteredByCommon, now, windowMs])

  // Group archive tasks by completion date
  const groupedArchiveList = useMemo(() => {
    const groups: Array<{ date: string; tasks: TaskMemory[] }> = []
    const dateGroups = new Map<string, TaskMemory[]>()
    
    for (const task of archiveList) {
      const c = task.content as TaskContent
      const completionDate = c.status === 'completed' && c.completion_date 
        ? c.completion_date
        : task.created_at // fallback for cancelled tasks
      
      // Get date part only (YYYY-MM-DD)
      const dateOnly = completionDate.split('T')[0]
      
      if (!dateGroups.has(dateOnly)) {
        dateGroups.set(dateOnly, [])
      }
      dateGroups.get(dateOnly)!.push(task)
    }
    
    // Convert to array and maintain chronological order (already sorted by archiveList)
    const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a)) // descending
    
    for (const date of sortedDates) {
      groups.push({
        date,
        tasks: dateGroups.get(date)!
      })
    }
    
    return groups
  }, [archiveList])

  // Calculate statistics
  const stats = useMemo(() => {
    const current = tasks.filter(t => {
      const c = t.content as TaskContent
      if (c.status === 'pending' || c.status === 'in_progress') return true
      if (c.status === 'completed') {
        const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
        return completedAt && now - completedAt <= windowMs
      }
      return false
    }).length

    const future = tasks.filter(t => {
      const c = t.content as TaskContent
      return c.status === 'on_hold'
    }).length

    const archive = tasks.filter(t => {
      const c = t.content as TaskContent
      if (c.status === 'cancelled') return true
      if (c.status === 'completed') {
        const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
        return completedAt && now - completedAt > windowMs
      }
      return false
    }).length

    return { current, future, archive }
  }, [tasks, now, windowMs])

  return {
    filteredByCommon,
    currentList,
    futureList,
    archiveList,
    groupedArchiveList,
    stats
  }
}

// Helper function to sort tasks
function sortTasks(list: TaskMemory[], mode: 'none' | 'priority' | 'due_date') {
  if (mode === 'none') return list
  if (mode === 'priority') {
    const order: Record<TaskContent['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    return [...list].sort((a, b) => order[(a.content as TaskContent).priority] - order[(b.content as TaskContent).priority])
  }
  if (mode === 'due_date') {
    return [...list].sort((a, b) => {
      const da = (a.content as TaskContent).due_date
      const db = (b.content as TaskContent).due_date
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return new Date(da).getTime() - new Date(db).getTime()
    })
  }
  return list
}