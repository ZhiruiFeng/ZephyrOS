'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTasks, useUpdateTask } from '@/hooks/memory/useMemories'
import { useCategories } from '@/shared/hooks/useCategories'
import { useTimerShared } from '@/shared/hooks/useTimerShared'
import { usePrefs } from '@/contexts/PrefsContext'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/app/components/auth/LoginPage'
import { TaskMemory, categoriesApi, TaskContent } from '@/lib/api'
import { KanbanSquare, Search, Filter, ListTodo, Calendar, Pencil, FileText, Tag, Hourglass } from 'lucide-react'
import TaskEditor from '@/app/components/editors/TaskEditor'
import { getPriorityIcon, getTimerIcon } from '@/app/components/ui/TaskIcons'
import {
  isOverdue,
  formatDate,
  formatTagsString,
  getTaskDisplayDate,
  shouldShowOverdue
} from '@/shared/utils/task-utils'
import { useTranslation } from '@/contexts/LanguageContext'
import EnergyReviewModal from '@/app/components/modals/EnergyReviewModal'
import { CelebrationAnimation } from '@/app/components/ui/CelebrationAnimation'
import { useCelebration } from '@/shared/hooks/useCelebration'

type StatusKey = TaskContent['status']

const getColumns = (t: any): Array<{ key: StatusKey; title: string; hint?: string }> => [
  { key: 'pending', title: t.ui.todo },
  { key: 'in_progress', title: t.ui.inProgress },
  { key: 'completed', title: t.ui.done24h },
]

export default function KanbanPage() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? { root_tasks_only: true } : null)
  const { categories } = useCategories()
  const { updateTask } = useUpdateTask()
  const timer = useTimerShared()
  const [energyReviewOpen, setEnergyReviewOpen] = useState(false)
  const [energyReviewEntry, setEnergyReviewEntry] = useState<any>(null)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const { filterPriority, setFilterPriority, hideCompleted, setHideCompleted, selectedCategory, setSelectedCategory, sortMode } = (usePrefs() as any)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const router = useRouter()

  const { isVisible: celebrationVisible, triggerCelebration, hideCelebration } = useCelebration()

  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null)
  const [touchDragTitle, setTouchDragTitle] = useState<string>('')
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null)
  const [hoveredStatus, setHoveredStatus] = useState<StatusKey | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const isLongPressActiveRef = useRef(false)
  const sectionRefs = useRef<Partial<Record<StatusKey, HTMLDivElement | null>>>({})

  const goToWork = (taskId: string) => {
    if (draggingId) return
    router.push(`/focus?view=work&taskId=${encodeURIComponent(taskId)}`)
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const c = t.content as TaskContent
      const catId = (t as any).category_id || (t as any).content?.category_id
      const matchCategory = selectedCategory === 'all' ? true : selectedCategory === 'uncategorized' ? !catId : catId === selectedCategory
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      return matchCategory && matchSearch && matchPriority
    })
  }, [tasks, search, filterPriority, selectedCategory])

  const byStatus = useMemo(() => {
    const map = {
      pending: [] as TaskMemory[],
      in_progress: [] as TaskMemory[],
      completed: [] as TaskMemory[],
    }

    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    filtered.forEach((task) => {
      const content = task.content as TaskContent
      let status: StatusKey = content.status

      if (hideCompleted && (status === 'completed' || status === 'cancelled')) {
        const completionDate = content.completion_date ? new Date(content.completion_date) : null
        if (status === 'completed' && completionDate && completionDate > twentyFourHoursAgo) {
          // Keep completed tasks from last 24h in 'completed' column
        } else {
          return // Hide older completed/cancelled tasks
        }
      }

      // Special handling for 'completed' column to show only recent ones
      if (status === 'completed') {
        const completionDate = content.completion_date ? new Date(content.completion_date) : null
        if (!completionDate || completionDate < twentyFourHoursAgo) {
          return // Filter out completed tasks older than 24h from the 'completed' column
        }
      }

      if (status === 'pending' || status === 'in_progress' || status === 'completed') {
        map[status].push(task)
      }
    })

    // Sort tasks within each column
    for (const statusKey in map) {
      const statusArray = map[statusKey as keyof typeof map]
      if (statusArray) {
        statusArray.sort((a, b) => {
        switch (sortMode) {
          case 'due':
            const aDue = a.content.due_date ? new Date(a.content.due_date).getTime() : Infinity
            const bDue = b.content.due_date ? new Date(b.content.due_date).getTime() : Infinity
            return aDue - bDue
          case 'priority':
            const priorityOrder: Record<TaskContent['priority'], number> = { urgent: 4, high: 3, medium: 2, low: 1 }
            return (priorityOrder[b.content.priority] || 0) - (priorityOrder[a.content.priority] || 0)
          case 'title':
            return a.content.title.localeCompare(b.content.title)
          case 'created':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        })
      }
    }

    return map
  }, [filtered, sortMode, hideCompleted])

  const columns = useMemo(() => getColumns(t), [t])

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: StatusKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setHoveredStatus(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setHoveredStatus(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, status: StatusKey) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    setHoveredStatus(null)
    if (id) {
      try {
        await updateTask(id, { content: { status } })
        if (status === 'completed') {
          triggerCelebration()
        }
      } catch (error) {
        console.error('Failed to update task status:', error)
      }
    }
  }, [updateTask, triggerCelebration])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setHoveredStatus(null)
  }, [])

  const handleEditTask = useCallback((task: TaskMemory) => {
    setSelected(task)
    setEditorOpen(true)
  }, [])

  const handleSaveTask = useCallback(async (taskId: string | null, data: any) => {
    try {
      if (taskId) {
        await updateTask(taskId, data)
      }
      setEditorOpen(false)
      setSelected(null)
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }, [updateTask])

  const handleOpenEnergyReview = useCallback((entry: any) => {
    setEnergyReviewEntry(entry)
    setEnergyReviewOpen(true)
  }, [])

  // Mobile touch drag handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, task: TaskMemory) => {
    startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressActiveRef.current = true
      setTouchDraggingId(task.id)
      setTouchDragTitle(task.content.title)
    }, 500) // 500ms for long press
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const startX = startPosRef.current?.x || 0
      const startY = startPosRef.current?.y || 0

      if (Math.abs(currentX - startX) > 10 || Math.abs(currentY - startY) > 10) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
        isLongPressActiveRef.current = false
      }
    }

    if (touchDraggingId && isLongPressActiveRef.current) {
      setTouchPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })

      let newHoveredStatus: StatusKey | null = null
      for (const key in sectionRefs.current) {
        const section = sectionRefs.current[key as StatusKey]
        if (section) {
          const rect = section.getBoundingClientRect()
          if (
            e.touches[0].clientX > rect.left &&
            e.touches[0].clientX < rect.right &&
            e.touches[0].clientY > rect.top &&
            e.touches[0].clientY < rect.bottom
          ) {
            newHoveredStatus = key as StatusKey
            break
          }
        }
      }
      setHoveredStatus(newHoveredStatus)
    }
  }, [touchDraggingId])

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (touchDraggingId && isLongPressActiveRef.current && hoveredStatus) {
      const taskId = touchDraggingId
      const newStatus = hoveredStatus
      try {
        await updateTask(taskId, { content: { status: newStatus } })
        if (newStatus === 'completed') {
          triggerCelebration()
        }
      } catch (error) {
        console.error('Failed to update task status via touch:', error)
      }
    }

    setTouchDraggingId(null)
    setTouchDragTitle('')
    setTouchPos(null)
    setHoveredStatus(null)
    isLongPressActiveRef.current = false
  }, [touchDraggingId, hoveredStatus, updateTask, triggerCelebration])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error loading tasks: {error.message}</p>
      </div>
    )
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Kanban Board
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Visualize and manage your tasks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelected(null)
                  setEditorOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={filterPriority || 'all'}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={selectedCategory || 'all'}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Categories</option>
                <option value="uncategorized">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(column => {
            const columnTasks = (column.key === 'pending' || column.key === 'in_progress' || column.key === 'completed') 
              ? byStatus[column.key] || [] 
              : []

            return (
              <div
                key={column.key}
                ref={el => { sectionRefs.current[column.key] = el }}
                className={`bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed transition-colors ${
                  hoveredStatus === column.key ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
                }`}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-4 pt-4">
                  {column.title} ({columnTasks.length})
                </h2>
                <div className="p-4 space-y-3 min-h-[400px]">
                  {columnTasks.map((task: TaskMemory) => {
                    const content = task.content as TaskContent
                    const isTaskDragging = draggingId === task.id
                    const isTaskOverdue = isOverdue(content.due_date)

                    return (
                      <div
                        key={task.id}
                        className={`p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-all ${
                          isTaskDragging ? 'opacity-50 border-primary-500' : ''
                        } ${
                          isTaskOverdue && shouldShowOverdue(content.status, content.due_date) ? 'border-l-4 border-red-500' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, task)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={() => goToWork(task.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                            {content.title}
                          </h4>
                          <div className="flex items-center gap-1 ml-2">
                            {getPriorityIcon(content.priority)}
                            {isTaskOverdue && (
                              <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>

                        {content.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                            {content.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span className="capitalize">{content.priority}</span>
                          {content.due_date && (
                            <span>{getTaskDisplayDate(content.status, content.due_date, content.completion_date)}</span>
                          )}
                        </div>

                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.tags.map((tag: string, idx: number) => (
                              <span key={idx} className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-xs">
                                <Tag className="inline-block w-3 h-3 mr-1" />{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditTask(task)
                            }}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>

                          {timer.runningTaskId === task.id && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              {getTimerIcon(
                                timer.isRunning,
                                timer.runningTaskId === task.id,
                                (e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  // Timer logic here
                                }
                              )}
                              Active
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {columnTasks.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                      No tasks in this column
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile Drag Overlay */}
      {touchDraggingId && touchPos && (
        <div
          className="fixed z-50 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: touchPos.x,
            top: touchPos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {touchDragTitle}
        </div>
      )}

      {/* Task Editor Modal */}
      <TaskEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        task={selected}
        categories={categories}
        onSave={handleSaveTask}
      />

      {/* Energy Review Modal */}
      <EnergyReviewModal
        open={energyReviewOpen}
        onClose={() => setEnergyReviewOpen(false)}
        entry={energyReviewEntry}
      />

      {/* Celebration Animation */}
      {celebrationVisible && (
        <CelebrationAnimation
          isVisible={celebrationVisible}
          onComplete={hideCelebration}
        />
      )}
    </div>
  )
}