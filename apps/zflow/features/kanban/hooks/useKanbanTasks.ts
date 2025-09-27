'use client'

// =====================================================
// Kanban Feature - Task Management Hooks
// =====================================================

import useSWR from 'swr'
import { useState, useCallback, useMemo } from 'react'
import { kanbanApi } from '../api/kanban-api'
import { useTasks as useTasksFromMemory, useUpdateTask as useUpdateTaskFromMemory } from '@/hooks'
import type { 
  KanbanTask, 
  StatusKey, 
  KanbanColumn,
  KanbanFilters,
  KanbanDragState,
  UseKanbanTasksReturn,
  UseKanbanColumnsReturn,
  UseKanbanDragReturn,
  UseKanbanFiltersReturn
} from '../types/kanban'

// =====================================================
// Kanban Tasks Hook
// =====================================================

export function useKanbanTasks(params?: {
  root_tasks_only?: boolean
  status?: string
  category_id?: string
  priority?: string
}): UseKanbanTasksReturn {
  const { tasks, isLoading, error, refetch } = useTasksFromMemory(params || { root_tasks_only: true })

  // Transform tasks to kanban format
  const kanbanTasks = useMemo((): KanbanTask[] => {
    return tasks.map(task => ({
      ...task,
      isOverdue: isTaskOverdue(task),
      displayDate: getTaskDisplayDate(task),
      formattedTags: formatTaskTags(task.tags || [])
    }))
  }, [tasks])

  return {
    tasks: kanbanTasks,
    isLoading,
    error,
    refetch
  }
}

// =====================================================
// Kanban Columns Hook
// =====================================================

export function useKanbanColumns(t: any): UseKanbanColumnsReturn {
  const columns: KanbanColumn[] = [
    { key: 'pending', title: t.ui.todo },
    { key: 'in_progress', title: t.ui.inProgress },
    { key: 'completed', title: t.ui.done24h }
  ]

  const { tasks } = useKanbanTasks()

  const getTasksByStatus = useCallback((status: StatusKey): KanbanTask[] => {
    return tasks.filter(task => task.content.status === status)
  }, [tasks])

  // Filter tasks for kanban view (only show completed tasks from last 24h)
  const filteredTasks = useMemo(() => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return tasks.filter(task => {
      const content = task.content
      
      // Show pending and in_progress tasks
      if (content.status === 'pending' || content.status === 'in_progress') {
        return true
      }
      
      // Only show completed tasks from last 24h
      if (content.status === 'completed') {
        const completionDate = content.completion_date ? new Date(content.completion_date) : new Date(task.updated_at)
        return completionDate >= yesterday
      }
      
      return false
    })
  }, [tasks])

  return {
    columns,
    getTasksByStatus,
    filteredTasks
  }
}

// =====================================================
// Kanban Drag and Drop Hook
// =====================================================

export function useKanbanDrag(onTaskDrop: (taskId: string, newStatus: StatusKey) => Promise<void>): UseKanbanDragReturn {
  const [dragState, setDragState] = useState<KanbanDragState>({
    draggingId: null,
    touchDraggingId: null,
    touchDragTitle: '',
    touchPos: null,
    hoveredStatus: null,
    isLongPressActive: false
  })

  const startDrag = useCallback((taskId: string) => {
    setDragState(prev => ({
      ...prev,
      draggingId: taskId,
      isLongPressActive: true
    }))
  }, [])

  const endDrag = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      draggingId: null,
      touchDraggingId: null,
      touchPos: null,
      hoveredStatus: null,
      isLongPressActive: false
    }))
  }, [])

  const updateDragPosition = useCallback((position: { x: number; y: number }) => {
    setDragState(prev => ({
      ...prev,
      touchPos: position
    }))
  }, [])

  const setHoveredStatus = useCallback((status: StatusKey | null) => {
    setDragState(prev => ({
      ...prev,
      hoveredStatus: status
    }))
  }, [])

  const handleTaskDrop = useCallback(async (taskId: string, newStatus: StatusKey) => {
    try {
      await onTaskDrop(taskId, newStatus)
      endDrag()
    } catch (error) {
      console.error('Failed to drop task:', error)
      endDrag()
    }
  }, [onTaskDrop, endDrag])

  return {
    dragState,
    startDrag,
    endDrag,
    updateDragPosition,
    setHoveredStatus,
    handleTaskDrop
  }
}

// =====================================================
// Kanban Filters Hook
// =====================================================

export function useKanbanFilters(): UseKanbanFiltersReturn {
  const [filters, setFilters] = useState<KanbanFilters>({
    search: '',
    filterPriority: null,
    hideCompleted: false,
    selectedCategory: null,
    sortMode: 'created'
  })

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }))
  }, [])

  const setFilterPriority = useCallback((priority: string | null) => {
    setFilters(prev => ({ ...prev, filterPriority: priority }))
  }, [])

  const setHideCompleted = useCallback((hide: boolean) => {
    setFilters(prev => ({ ...prev, hideCompleted: hide }))
  }, [])

  const setSelectedCategory = useCallback((category: string | null) => {
    setFilters(prev => ({ ...prev, selectedCategory: category }))
  }, [])

  const setSortMode = useCallback((mode: string) => {
    setFilters(prev => ({ ...prev, sortMode: mode }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      filterPriority: null,
      hideCompleted: false,
      selectedCategory: null,
      sortMode: 'created'
    })
  }, [])

  return {
    filters,
    setSearch,
    setFilterPriority,
    setHideCompleted,
    setSelectedCategory,
    setSortMode,
    clearFilters
  }
}

// =====================================================
// Utility Functions
// =====================================================

function isTaskOverdue(task: any): boolean {
  const content = task.content
  if (!content.due_date || content.status === 'completed') {
    return false
  }
  
  const dueDate = new Date(content.due_date)
  const now = new Date()
  return dueDate < now
}

function getTaskDisplayDate(task: any): string {
  const content = task.content
  
  if (content.due_date) {
    const dueDate = new Date(content.due_date)
    return dueDate.toLocaleDateString()
  }
  
  if (content.status === 'completed' && content.completion_date) {
    const completionDate = new Date(content.completion_date)
    return completionDate.toLocaleDateString()
  }
  
  return new Date(task.created_at).toLocaleDateString()
}

function formatTaskTags(tags: string[]): string {
  return tags.join(', ')
}
