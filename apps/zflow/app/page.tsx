'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Trash2,
  ChevronDown,
  Filter,
  BarChart3,
  Calendar,
  User,
  ListTodo,
  KanbanSquare,
  Tag,
  Pencil,
  Folder,
} from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useMemories'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories'
import CategorySidebar from './components/CategorySidebar'
import { categoriesApi, tasksApi } from '../lib/api'
import TaskEditor from './components/TaskEditor'
import { getPriorityIcon } from './components/TaskIcons'
import { 
  getStatusColor, 
  getPriorityColor, 
  isOverdue, 
  formatDate,
  formatTagsString,
  getTaskDisplayDate,
  shouldShowOverdue
} from './utils/taskUtils'
import { Task, FilterStatus, FilterPriority, ViewMode } from './types/task'
import AuthButton from './components/AuthButton'
import FloatingAddButton from './components/FloatingAddButton'
import AddTaskModal from './components/AddTaskModal'
import LoginPage from './components/LoginPage'
import { useAuth } from '../contexts/AuthContext'
import { usePrefs } from '../contexts/PrefsContext'
import { useTranslation } from '../contexts/LanguageContext'
import MobileCategorySheet from './components/MobileCategorySheet'

export default function ZFlowPage() {
  const { user, loading: authLoading } = useAuth()
  const { hideCompleted, setHideCompleted, filterPriority, setFilterPriority, sortMode } = (usePrefs() as any)
  const { t } = useTranslation()
  const [newTask, setNewTask] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('')
  const [newTaskTags, setNewTaskTags] = useState('')
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string | undefined>(undefined)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  // filterPriority unified in PrefsContext
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  // Categories managed by SWR hook
  const { selectedCategory, setSelectedCategory } = (usePrefs() as any)
  // hideCompleted unified in PrefsContext
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [showCategorySheet, setShowCategorySheet] = useState(false)

  // Persist user preferences (hideCompleted + filterPriority + selectedCategory) with unified keys
  React.useEffect(() => {
    try {
      const storedHide = localStorage.getItem('zflow:prefs:hideCompleted')
      const storedPriority = localStorage.getItem('zflow:prefs:filterPriority') as FilterPriority | null
      const storedCategory = localStorage.getItem('zflow:prefs:selectedCategory')
      // Backward compatibility with older keys
      const legacyHide = localStorage.getItem('zflow:hideCompleted')
      const legacyPriority = localStorage.getItem('zflow:filterPriority') as FilterPriority | null

      if (storedHide != null) setHideCompleted(storedHide === '1')
      else if (legacyHide != null) setHideCompleted(legacyHide === '1')

      if (storedPriority) setFilterPriority(storedPriority)
      else if (legacyPriority) setFilterPriority(legacyPriority)

      if (storedCategory) setSelectedCategory(storedCategory as any)
    } catch {}
  }, [])

  React.useEffect(() => {
    try {
      localStorage.setItem('zflow:prefs:hideCompleted', hideCompleted ? '1' : '0')
    } catch {}
  }, [hideCompleted])

  React.useEffect(() => {
    try {
      localStorage.setItem('zflow:prefs:filterPriority', filterPriority)
    } catch {}
  }, [filterPriority])

  React.useEffect(() => {
    try {
      localStorage.setItem('zflow:prefs:selectedCategory', String(selectedCategory))
    } catch {}
  }, [selectedCategory])

  // Use API hooks - only when authenticated
  const { tasks, isLoading, error, refetch } = useTasks(user ? {} : null)
  const { categories, isLoading: categoriesLoading } = useCategories()
  const { createCategory } = useCreateCategory()
  const { updateCategory } = useUpdateCategory()
  const { deleteCategory } = useDeleteCategory()

  // Count tasks by category (completed vs incomplete)
  const categoryCounts = React.useMemo(() => {
    const byId: Record<string, number> = {}
    const byIdCompleted: Record<string, number> = {}
    const byIdIncomplete: Record<string, number> = {}
    let uncategorized = 0
    let uncategorizedCompleted = 0
    let uncategorizedIncomplete = 0
    let totalCompleted = 0
    let totalIncomplete = 0

    tasks.forEach((t: any) => {
      const c = t.content as Task
      const isCompleted = c.status === 'completed'
      const catId = (t as any).category_id || (t as any).content?.category_id
      if (catId) {
        byId[catId] = (byId[catId] || 0) + 1
        if (isCompleted) byIdCompleted[catId] = (byIdCompleted[catId] || 0) + 1
        else byIdIncomplete[catId] = (byIdIncomplete[catId] || 0) + 1
      } else {
        uncategorized += 1
        if (isCompleted) uncategorizedCompleted += 1
        else uncategorizedIncomplete += 1
      }
      if (isCompleted) totalCompleted += 1
      else totalIncomplete += 1
    })
    return {
      byId,
      byIdCompleted,
      byIdIncomplete,
      uncategorized,
      uncategorizedCompleted,
      uncategorizedIncomplete,
      total: tasks.length,
      totalCompleted,
      totalIncomplete,
    }
  }, [tasks])
  const { createTask } = useCreateTask()
  const { updateTask } = useUpdateTask()
  const { deleteTask } = useDeleteTask()

  // Quick stats for header
  const quickStats = useMemo(() => {
    let total = tasks.length
    let completed = 0
    let inProgress = 0
    let pending = 0
    let onHold = 0
    let cancelled = 0
    let overdue = 0
    for (const t of tasks) {
      const c = t.content as Task
      if (c.status === 'completed') completed += 1
      if (c.status === 'in_progress') inProgress += 1
      if (c.status === 'pending') pending += 1
      if (c.status === 'on_hold') onHold += 1
      if (c.status === 'cancelled') cancelled += 1
      if (c.due_date && isOverdue(c.due_date)) overdue += 1
    }
    return { total, completed, inProgress, pending, onHold, cancelled, overdue }
  }, [tasks])

  const addTask = async () => {
    if (!newTask.trim()) return

    try {
      console.log('=== TASK CREATION DEBUG ===');
      console.log('selectedCategory:', selectedCategory);
      console.log('newTaskCategoryId:', newTaskCategoryId);
      
      const tagsArray = newTaskTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const finalCategoryId = newTaskCategoryId || (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined);
      console.log('finalCategoryId:', finalCategoryId);

      const joinAttention = (() => {
        try { return localStorage.getItem('zflow:quickCapture:joinAttention') === '1' || (window as any).__zflowJoinAttention === true } catch { return false }
      })()

      const newStatus: 'pending' | 'on_hold' = joinAttention ? 'pending' : 'on_hold'
      const taskData = {
        title: newTask,
        description: newTaskDescription,
        status: newStatus,
        priority: newTaskPriority,
        category_id: finalCategoryId,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      }

      console.log('taskData being sent:', JSON.stringify(taskData, null, 2));

      await createTask({
        type: 'task',
        content: taskData,
        tags: ['zflow', 'task', ...tagsArray]
      })

      // Reset form
      setNewTask('')
      setNewTaskDescription('')
      setNewTaskPriority('medium')
      setNewTaskDueDate('')
      setNewTaskTags('')
      setNewTaskCategoryId(undefined)
       setShowAddForm(false)
       setShowAddModal(false)
    } catch (error) {
      console.error('Failed to create task:', error)
      alert(t.messages.taskCreateFailed)
    }
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      const now = new Date().toISOString()
      
      await updateTask(taskId, {
        content: {
          ...tasks.find(t => t.id === taskId)?.content,
          status: newStatus,
          completion_date: newStatus === 'completed' ? now : undefined
        }
      })
    } catch (error) {
      console.error('Failed to update task:', error)
      alert(t.messages.taskUpdateFailed)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(t.messages.confirmDelete)) return

    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert(t.messages.taskDeleteFailed)
    }
  }

  const openEditor = (taskMemory: any) => {
    // Convert TaskMemory to Task format expected by TaskEditor
    const task = {
      id: taskMemory.id,
      ...taskMemory.content,
      tags: taskMemory.tags,
      created_at: taskMemory.created_at,
      updated_at: taskMemory.updated_at,
      // Add category_id from the top level if available
      category_id: (taskMemory as any).category_id || taskMemory.content.category_id,
    }
    setSelectedTask(task)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setSelectedTask(null)
  }

  const handleSaveTask = async (taskId: string, data: any) => {
    await updateTask(taskId, data)
  }

  let filteredTasks = useMemo(() => {
    const shouldHideCompleted = hideCompleted && filterStatus !== 'completed'
    return tasks.filter((t) => {
      const c = t.content as Task
      // Category filter: all shows everything; uncategorized shows tasks without category_id; otherwise match by category_id
      const catId = (t as any).category_id || (t as any).content?.category_id
      const matchCategory = selectedCategory === 'all'
        ? true
        : selectedCategory === 'uncategorized'
          ? !catId
          : catId === selectedCategory
      // Home page: show all tasks when filterStatus is 'all'
      // - If filterStatus === 'all', show all statuses including on_hold and cancelled
      // - Completed: show all completed tasks when filterStatus is 'completed'
      const now = Date.now()
      const windowMs = 24 * 60 * 60 * 1000
      const isCompletedWithinWindow = c.status === 'completed' && c.completion_date ? (now - new Date(c.completion_date).getTime()) <= windowMs : false
      const baseStatusInclude = filterStatus === 'all'
        ? (c.status === 'pending' || c.status === 'in_progress' || c.status === 'on_hold' || c.status === 'cancelled' || isCompletedWithinWindow)
        : (filterStatus === 'completed' ? c.status === 'completed' : c.status === filterStatus)

      const matchStatus = baseStatusInclude
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      const matchCompletedHide = !(shouldHideCompleted && c.status === 'completed')
      const overdueNow = !!c.due_date && isOverdue(c.due_date)
      const matchOverdue = !showOverdueOnly || (c.status !== 'completed' && overdueNow)
      return matchCategory && matchStatus && matchPriority && matchSearch && matchCompletedHide && matchOverdue
    })
  }, [tasks, selectedCategory, filterStatus, filterPriority, search, hideCompleted, showOverdueOnly])

  // Apply sort (shared with Kanban): priority or due_date
  filteredTasks = useMemo(() => {
    const priorityOrder: Record<Task['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    if (sortMode === 'priority') {
      return [...filteredTasks].sort((a, b) => {
        const ca = (a.content as Task).priority
        const cb = (b.content as Task).priority
        return priorityOrder[ca] - priorityOrder[cb]
      })
    }
    if (sortMode === 'due_date') {
      return [...filteredTasks].sort((a, b) => {
        const da = (a.content as Task).due_date
        const db = (b.content as Task).due_date
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return new Date(da).getTime() - new Date(db).getTime()
      })
    }
    return filteredTasks
  }, [filteredTasks, sortMode])

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />
  }

  // Show loading while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-600">Failed to load tasks</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8">
        {/* Auth button is provided in global NavBar */}
      <div className="flex gap-4">
        {/* Left category sidebar */}
        <CategorySidebar
          categories={categories}
          selected={selectedCategory}
          counts={categoryCounts}
          onSelect={(key) => setSelectedCategory(key as any)}
          onCreate={async (payload) => {
            await createCategory({ name: payload.name, color: payload.color })
          }}
          onUpdate={async (id, payload) => {
            await updateCategory(id, payload)
          }}
          onDelete={async (id) => {
            await deleteCategory(id)
            // If the deleted category was selected, switch to 'all'
            if (selectedCategory === id) {
              setSelectedCategory('all')
            }
          }}
          className="hidden md:block rounded-lg"
        />

        {/* Right main content */
        }
        <div className="flex-1">
          
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  <ListTodo className="w-7 h-7" /> ZFlow
                </h1>
                <p className="mt-1 text-white/90">{t.meta.taskManagementWorkbench}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/10 rounded-full p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 ${viewMode === 'list' ? 'bg-white text-primary-700' : 'text-white/90 hover:bg-white/10'}`}
                  >
                    <ListTodo className="w-4 h-4" /> {t.ui.listView}
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 ${viewMode === 'grid' ? 'bg-white text-primary-700' : 'text-white/90 hover:bg-white/10'}`}
                  >
                    <BarChart3 className="w-4 h-4" /> {t.ui.gridView}
                  </button>
                </div>
                <Link href="/focus?view=work" className="btn btn-secondary bg-white text-primary-700 hover:bg-white/90">
                  <span className="inline-flex items-center gap-2"><KanbanSquare className="w-4 h-4" /> Focus</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { key: 'all', label: t.ui.totalTasks, value: quickStats.total },
                { key: 'pending', label: t.ui.planned, value: quickStats.pending },
                { key: 'in_progress', label: t.ui.inProgress, value: quickStats.inProgress },
                { key: 'completed', label: t.ui.completed, value: quickStats.completed },
                { key: 'on_hold', label: t.ui.backlog, value: quickStats.onHold },
                { key: 'cancelled', label: t.ui.abandoned, value: quickStats.cancelled },
              ].map(({ key, label, value }) => (
                <button
                  key={key}
                  onClick={() => {
                    setFilterStatus(key as any)
                    setHideCompleted(key !== 'completed')
                    setShowOverdueOnly(false)
                    setSearch('')
                  }}
                  className="glass rounded-lg p-3 text-left text-gray-800 card-hover"
                >
                  <div className="text-[11px] text-gray-500 truncate">{label}</div>
                  <div className="mt-0.5 text-xl font-semibold">{value}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile category entry */}
      <div className="md:hidden mb-3">
        <button
          onClick={() => setShowCategorySheet(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm"
        >
          <span className="inline-flex items-center gap-2 text-gray-700">
            <Folder className="w-4 h-4 text-gray-500" />
            {(() => {
              if (selectedCategory === 'all') return t.common.all
              if (selectedCategory === 'uncategorized') return t.ui.uncategorized
              const cat = categories.find((c: any) => c.id === selectedCategory)
              return cat ? cat.name : t.ui.categories
            })()}
          </span>
          <span className="text-xs text-gray-500 inline-flex items-center gap-1">
            <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700">
              {selectedCategory === 'all' ? categoryCounts.total : selectedCategory === 'uncategorized' ? categoryCounts.uncategorized : (categoryCounts.byId as any)[selectedCategory] || 0}
            </span>
            <ChevronDown className="w-4 h-4" />
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="pill-select"
            >
              <option value="all">{t.ui.allStatus}</option>
              <option value="pending">{t.task.statusPending}</option>
              <option value="in_progress">{t.task.statusInProgress}</option>
              <option value="completed">{t.task.statusCompleted}</option>
              <option value="on_hold">{t.task.statusOnHold}</option>
              <option value="cancelled">{t.task.statusCancelled}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
              className="pill-select"
            >
              <option value="all">{t.ui.allPriority}</option>
              <option value="urgent">{t.task.priorityUrgent}</option>
              <option value="high">{t.task.priorityHigh}</option>
              <option value="medium">{t.task.priorityMedium}</option>
              <option value="low">{t.task.priorityLow}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.ui.searchPlaceholder}
              className="pill-input w-full"
            />
          </div>
          {/* 隐藏已完成控制已移动到导航设置中 */}
        </div>
      </div>

      {/* Add task: use modal like overview; trigger via floating button on desktop or bottom nav on mobile */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (payload) => {
          await createTask(payload)
          setShowAddModal(false)
        }}
        categories={categories}
        defaultCategoryId={selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? (selectedCategory as string) : undefined}
      />

      {/* Task list */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{t.messages.noTasksYet}</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredTasks.map((task) => {
              const taskContent = task.content as Task
              return (
                <div key={task.id} className={`card card-hover ${viewMode === 'grid' ? 'h-fit' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleTaskStatus(task.id, taskContent.status)}
                        className="flex-shrink-0"
                      >
                        {taskContent.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-lg ${taskContent.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {taskContent.title}
                        </h3>
                        {taskContent.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {taskContent.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(taskContent.priority)}
                      <button
                        onClick={() => openEditor(task)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {task.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          <Tag className="w-3 h-3" /> {tag}
                        </span>
                      ))}
                      {task.tags.length > 4 && (
                        <span className="text-xs text-gray-500">+{task.tags.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Status and priority tags */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${getStatusColor(taskContent.status)}`}>
                      {taskContent.status}
                    </span>
                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${getPriorityColor(taskContent.priority)}`}>
                      {taskContent.priority}
                    </span>
                  </div>

                  {/* Time information */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{t.ui.createdAt} {formatDate(task.created_at)}</span>
                    {getTaskDisplayDate(taskContent.status, taskContent.due_date, taskContent.completion_date) && (
                      <span className={`inline-flex items-center gap-1 ${shouldShowOverdue(taskContent.status, taskContent.due_date) ? 'text-red-600' : ''}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(getTaskDisplayDate(taskContent.status, taskContent.due_date, taskContent.completion_date)!)}
                        {shouldShowOverdue(taskContent.status, taskContent.due_date) && t.ui.overdue}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

          {/* Use shared TaskEditor component */}
          <TaskEditor
            isOpen={editorOpen}
            onClose={closeEditor}
            task={selectedTask}
            categories={categories}
            onSave={handleSaveTask}
            title={t.ui.editTaskTitle}
          />
          {/* Desktop floating add button (same pattern as overview) */}
          <div className="hidden sm:block">
            <FloatingAddButton
              onClick={() => setShowAddModal(true)}
            />
          </div>
        </div>
      </div>
      {/* Mobile category sheet */}
      <MobileCategorySheet
        open={showCategorySheet}
        onClose={() => setShowCategorySheet(false)}
        categories={categories}
        counts={categoryCounts as any}
        selected={selectedCategory as any}
        onSelect={(key) => setSelectedCategory(key as any)}
        onCreate={async (payload) => {
          await createCategory({ name: payload.name, color: payload.color })
        }}
        onUpdate={async (id, payload) => {
          await updateCategory(id, payload)
        }}
        onDelete={async (id) => {
          await deleteCategory(id)
          if (selectedCategory === id) setSelectedCategory('all')
        }}
      />
    </div>
    </div>
  )
} 