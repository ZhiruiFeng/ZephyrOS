'use client'

import { useState, useEffect, useMemo } from 'react'
import { tasksApi } from '@/lib/api'
import { TaskMemory } from '@/lib/api/api-base'

export interface TaskSelectorConfig {
  /** Which task statuses to include */
  statuses?: ('pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold')[]
  /** Maximum number of tasks to load */
  limit?: number
  /** Sort order */
  sortBy?: 'updated_at' | 'created_at' | 'title'
  sortOrder?: 'asc' | 'desc'
  /** Whether to include subtasks */
  includeSubtasks?: boolean
}

export interface TaskSelectorState {
  tasks: TaskMemory[]
  loading: boolean
  error: string | null
  searchQuery: string
  filteredTasks: TaskMemory[]
  orderedTasks: TaskMemory[]
}

export interface TaskSelectorActions {
  setSearchQuery: (query: string) => void
  refreshTasks: () => Promise<void>
  getTaskDisplayInfo: (task: TaskMemory) => {
    title: string
    subtitle: string
    isSubtask: boolean
    isContextTask: boolean
    statusColor: string
    priorityColor: string
  }
  formatDate: (dateStr: string) => string
}

const DEFAULT_CONFIG: Required<TaskSelectorConfig> = {
  statuses: ['pending', 'in_progress'],
  limit: 50,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeSubtasks: true,
}

export function useTaskSelector(config: TaskSelectorConfig = {}): TaskSelectorState & TaskSelectorActions {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const [tasks, setTasks] = useState<TaskMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load tasks from API
  const loadTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const allTasks = await tasksApi.getAll({
        limit: finalConfig.limit,
        sort_by: finalConfig.sortBy,
        sort_order: finalConfig.sortOrder
      })

      // Filter by configured statuses, but also include parent tasks for context
      const filteredTasks = allTasks.filter(task =>
        finalConfig.statuses.includes(task.content.status)
      )

      // Create a map of all tasks for quick lookup
      const allTasksById = new Map(allTasks.map(task => [task.id, task]))

      // Find parent tasks that should be included for hierarchical context
      const parentTasksToInclude = new Set<string>()

      filteredTasks.forEach(task => {
        const parentId = (task.content as any)?.parent_task_id || (task as any).parent_id
        if (parentId && allTasksById.has(parentId)) {
          // Add the parent task to our inclusion set
          parentTasksToInclude.add(parentId)

          // Also add grandparents and higher ancestors if they exist
          let currentParentId = parentId
          while (currentParentId) {
            const parentTask = allTasksById.get(currentParentId)
            if (parentTask) {
              parentTasksToInclude.add(currentParentId)
              currentParentId = (parentTask.content as any)?.parent_task_id || (parentTask as any).parent_id
            } else {
              break
            }
          }
        }
      })

      // Combine filtered tasks with their parent tasks for context
      const tasksWithParents = [
        ...filteredTasks,
        ...Array.from(parentTasksToInclude)
          .map(id => allTasksById.get(id))
          .filter((task): task is TaskMemory => task !== undefined)
          .filter(task => !filteredTasks.some(ft => ft.id === task.id)) // Avoid duplicates
      ]

      setTasks(tasksWithParents)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // Order tasks hierarchically (root tasks first, then their children)
  const orderedTasks = useMemo(() => {
    if (!tasks.length) return []

    const byId = new Map(tasks.map(task => [task.id, task]))
    const childrenMap = new Map<string, TaskMemory[]>()
    const rootTasks: TaskMemory[] = []

    // Group tasks by parent-child relationships
    for (const task of tasks) {
      const parentId = (task.content as any)?.parent_task_id || (task as any).parent_id
      if (parentId && byId.has(parentId)) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, [])
        }
        childrenMap.get(parentId)!.push(task)
      } else {
        rootTasks.push(task)
      }
    }

    // Build ordered list with hierarchy
    const ordered: TaskMemory[] = []
    const visited = new Set<string>()

    const addTaskWithChildren = (task: TaskMemory) => {
      if (!task || visited.has(task.id)) return
      visited.add(task.id)
      ordered.push(task)

      if (finalConfig.includeSubtasks) {
        const children = childrenMap.get(task.id)
        if (children) {
          for (const child of children) {
            addTaskWithChildren(child)
          }
        }
      }
    }

    // Add root tasks first
    for (const root of rootTasks) {
      addTaskWithChildren(root)
    }

    // Add any orphaned tasks
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        addTaskWithChildren(task)
      }
    }

    return ordered
  }, [tasks, finalConfig.includeSubtasks])

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return orderedTasks
    }

    const query = searchQuery.toLowerCase()
    return orderedTasks.filter(task => {
      const title = task.content.title.toLowerCase()
      const description = (task.content.description || '').toLowerCase()
      const category = (task.content.category_id || '').toLowerCase()
      const status = task.content.status.toLowerCase()

      return title.includes(query) ||
             description.includes(query) ||
             category.includes(query) ||
             status.includes(query) ||
             task.id.toLowerCase().includes(query)
    })
  }, [orderedTasks, searchQuery])

  // Utility functions
  const getTaskDisplayInfo = (task: TaskMemory) => {
    const title = task.content.title || 'Untitled Task'
    const isSubtask = Boolean((task.content as any)?.parent_task_id || (task as any).parent_id)

    // Check if this task is included for context (parent of a selected child)
    const isContextTask = !finalConfig.statuses.includes(task.content.status)

    // Build subtitle with category and status
    const parts = []
    if (task.content.category_id) {
      parts.push(task.content.category_id)
    }
    parts.push(task.content.status.replace(/_/g, ' '))
    if (isContextTask) {
      parts.push('(parent context)')
    }
    const subtitle = parts.join(' • ')

    return {
      title,
      subtitle,
      isSubtask,
      isContextTask,
      statusColor: getTaskStatusColor(task.content.status),
      priorityColor: getTaskPriorityColor(task.content.priority)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return 'No date'
    }
  }

  return {
    // State
    tasks,
    loading,
    error,
    searchQuery,
    filteredTasks,
    orderedTasks,

    // Actions
    setSearchQuery,
    refreshTasks: loadTasks,
    getTaskDisplayInfo,
    formatDate,
  }
}

// Utility functions for styling (for task selector components)
export function getTaskStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'text-blue-600 bg-blue-50'
    case 'in_progress': return 'text-purple-600 bg-purple-50'
    case 'completed': return 'text-green-600 bg-green-50'
    case 'cancelled': return 'text-gray-600 bg-gray-50'
    case 'on_hold': return 'text-yellow-600 bg-yellow-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getTaskPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50'
    case 'high': return 'text-orange-600 bg-orange-50'
    case 'medium': return 'text-yellow-600 bg-yellow-50'
    case 'low': return 'text-green-600 bg-green-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}