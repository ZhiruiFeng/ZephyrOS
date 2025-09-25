// =====================================================
// Kanban Feature - Main Page Component
// =====================================================

'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePrefs } from '@/contexts/PrefsContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { useCategories } from '@/hooks/ui/useCategories'
import { useTimer } from '@/hooks/activities/useTimer'
import { useCelebration } from '@/hooks/ui/useCelebration'
import { useUpdateTask } from '@/hooks/memory/useMemories'
import LoginPage from '@/app/components/auth/LoginPage'
import TaskEditor from '@/app/components/editors/TaskEditor'
import EnergyReviewModal from '@/app/components/modals/EnergyReviewModal'
import { CelebrationAnimation } from '@/app/components/ui/CelebrationAnimation'
import { 
  KanbanSquare, 
  Search, 
  Filter, 
  ListTodo, 
  Calendar, 
  Pencil, 
  FileText, 
  Tag, 
  Hourglass 
} from 'lucide-react'

import { useKanbanTasks, useKanbanColumns, useKanbanDrag, useKanbanFilters } from './hooks/useKanbanTasks'
import { kanbanApi } from './api/kanban-api'
import type { KanbanTask, StatusKey, KanbanUIState } from './types/kanban'

export function KanbanPage() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { categories } = useCategories()
  const { updateTask } = useUpdateTask()
  const timer = useTimer()
  const router = useRouter()

  // Celebration state
  const { isVisible: celebrationVisible, triggerCelebration, hideCelebration } = useCelebration()

  // Kanban hooks
  const { tasks, isLoading, error, refetch } = useKanbanTasks(
    user ? { root_tasks_only: true } : undefined
  )
  const { columns, filteredTasks } = useKanbanColumns(t)
  const { filters, setSearch, setFilterPriority, setHideCompleted, setSelectedCategory, setSortMode } = useKanbanFilters()

  // UI state
  const [uiState, setUIState] = useState<KanbanUIState>({
    editorOpen: false,
    selectedTask: null,
    showMobileFilters: false,
    energyReviewOpen: false,
    energyReviewEntry: null
  })

  // Drag and drop handlers
  const handleTaskDrop = useCallback(async (taskId: string, newStatus: StatusKey) => {
    try {
      await kanbanApi.updateTaskStatus(taskId, newStatus)
      await refetch()
      triggerCelebration()
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }, [refetch, triggerCelebration])

  const { dragState, startDrag, endDrag, setHoveredStatus, handleTaskDrop: handleDrop } = useKanbanDrag(handleTaskDrop)

  // Task operations
  const handleTaskSelect = useCallback((task: KanbanTask) => {
    setUIState(prev => ({ ...prev, selectedTask: task, editorOpen: true }))
  }, [])

  const handleTaskEdit = useCallback((task: KanbanTask) => {
    setUIState(prev => ({ ...prev, selectedTask: task, editorOpen: true }))
  }, [])

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await kanbanApi.deleteTask(taskId)
      await refetch()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }, [refetch])

  const handleSaveTask = useCallback(async (taskId: string, data: any) => {
    try {
      await kanbanApi.updateTask(taskId, data)
      await refetch()
      setUIState(prev => ({ ...prev, editorOpen: false, selectedTask: null }))
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }, [refetch])

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = filteredTasks

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(task => 
        task.content.title.toLowerCase().includes(searchLower) ||
        task.content.description?.toLowerCase().includes(searchLower) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Apply priority filter
    if (filters.filterPriority) {
      filtered = filtered.filter(task => task.content.priority === filters.filterPriority)
    }

    // Apply category filter
    if (filters.selectedCategory) {
      filtered = filtered.filter(task => task.content.category_id === filters.selectedCategory)
    }

    // Apply hide completed filter
    if (filters.hideCompleted) {
      filtered = filtered.filter(task => task.content.status !== 'completed')
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortMode) {
        case 'due':
          const aDue = a.content.due_date ? new Date(a.content.due_date).getTime() : Infinity
          const bDue = b.content.due_date ? new Date(b.content.due_date).getTime() : Infinity
          return aDue - bDue
        case 'priority':
          const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1, urgent: 4 }
          return (priorityOrder[b.content.priority] || 0) - (priorityOrder[a.content.priority] || 0)
        case 'title':
          return a.content.title.localeCompare(b.content.title)
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return filtered
  }, [filteredTasks, filters])

  // Navigation
  const goToWork = useCallback((taskId: string) => {
    if (dragState.draggingId) return
    router.push(`/focus?view=work&taskId=${encodeURIComponent(taskId)}`)
  }, [router, dragState.draggingId])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KanbanSquare className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban Board</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Visualize and manage your tasks
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUIState(prev => ({ ...prev, editorOpen: true, selectedTask: null }))}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <select
              value={filters.filterPriority || ''}
              onChange={(e) => setFilterPriority(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <select
              value={filters.selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={filters.sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="created">Created Date</option>
              <option value="due">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">Error loading tasks: {error.message}</p>
            <button
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map(column => {
              const columnTasks = filteredAndSortedTasks.filter(task => task.content.status === column.key)
              
              return (
                <div
                  key={column.key}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {column.title}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {columnTasks.length}
                    </span>
                  </div>
                  
                  <div className="space-y-3 min-h-[400px]">
                    {columnTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleTaskSelect(task)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {task.content.title}
                          </h4>
                          {task.isOverdue && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                        
                        {task.content.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {task.content.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span className="capitalize">{task.content.priority}</span>
                          {task.content.due_date && (
                            <span>{new Date(task.content.due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                        
                        {task.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {task.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {task.tags.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{task.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Task Editor Modal */}
      {uiState.editorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <TaskEditor
              isOpen={uiState.editorOpen}
              task={uiState.selectedTask}
              categories={categories}
              onSave={handleSaveTask}
              onClose={() => setUIState(prev => ({ ...prev, editorOpen: false, selectedTask: null }))}
            />
          </div>
        </div>
      )}

      {/* Celebration Animation */}
      {celebrationVisible && (
        <CelebrationAnimation
          isVisible={celebrationVisible}
          onComplete={hideCelebration}
        />
      )}

      {/* Energy Review Modal */}
      <EnergyReviewModal
        open={uiState.energyReviewOpen}
        onClose={() => setUIState(prev => ({ ...prev, energyReviewOpen: false }))}
        entry={uiState.energyReviewEntry}
      />
    </div>
  )
}
