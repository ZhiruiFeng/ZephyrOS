'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ListTodo, BarChart3, Tag, Calendar, Plus, Grid, List, Focus, Archive, Clock, CheckCircle, Settings, ChevronDown, ChevronRight, X, Timer, Pencil, Trash2, Info, Hourglass, Play, Square } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/LanguageContext'
import LoginPage from './components/LoginPage'
import CategorySidebar from './components/CategorySidebar'
import FloatingAddButton from './components/FloatingAddButton'
import AddTaskModal from './components/AddTaskModal'
import TaskEditor from './components/TaskEditor'
import ActivityEditor from './components/ActivityEditor'
import ActivityTimeModal from './components/ActivityTimeModal'
import TaskTimeModal from './components/TaskTimeModal'
import DailyTimeModal from './components/DailyTimeModal'
import EnergyReviewModal from './components/EnergyReviewModal'
import MobileCategorySheet from './components/MobileCategorySheet'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useMemories'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories'
import { useActivities, useCreateActivity, useUpdateActivity, useDeleteActivity } from '../hooks/useActivities'
import { useTimer } from '../hooks/useTimer'
import { categoriesApi, TaskMemory, TaskContent } from '../lib/api'
import { getPriorityIcon, getTimerIcon } from './components/TaskIcons'
import { isOverdue, formatDate, getTaskDisplayDate, shouldShowOverdue } from './utils/taskUtils'

type ViewKey = 'current' | 'future' | 'archive' | 'activities'
type DisplayMode = 'list' | 'grid'

function ZFlowPageContent() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const view = (params.get('view') as ViewKey) || 'current'
  const setView = (v: ViewKey) => router.push(`/?view=${v}`)
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('list')

  const { tasks, isLoading, error } = useTasks(user ? { root_tasks_only: true } : null)
  const { activities, isLoading: activitiesLoading } = useActivities(user ? undefined : undefined)
  const { categories } = useCategories()
  const { createTask } = useCreateTask()
  const { updateTask } = useUpdateTask()
  const { deleteTask } = useDeleteTask()
  const { createActivity } = useCreateActivity()
  const { updateActivity } = useUpdateActivity()
  const { deleteActivity } = useDeleteActivity()
  const { createCategory } = useCreateCategory()
  const { updateCategory } = useUpdateCategory()
  const { deleteCategory } = useDeleteCategory()
  const timer = useTimer()

  // Shared filters
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | 'uncategorized' | string>('all')
  const [filterPriority, setFilterPriority] = React.useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')
  const [search, setSearch] = React.useState('')
  const [sortMode, setSortMode] = React.useState<'none' | 'priority' | 'due_date'>('none')

  // Add task modal
  const [showAddModal, setShowAddModal] = React.useState(false)
  
  // Task editor
  const [editingTask, setEditingTask] = React.useState<any>(null)
  const [showTaskEditor, setShowTaskEditor] = React.useState(false)
  
  // Activity editor
  const [editingActivity, setEditingActivity] = React.useState<any>(null)
  const [showActivityEditor, setShowActivityEditor] = React.useState(false)

  // Mobile category selector
  const [showMobileCategorySelector, setShowMobileCategorySelector] = React.useState(false)
  const [timeModalTask, setTimeModalTask] = React.useState<{ id: string; title: string } | null>(null)
  const [timeModalActivity, setTimeModalActivity] = React.useState<{ id: string; title: string } | null>(null)
  const [showDailyModal, setShowDailyModal] = React.useState(false)
  const [energyReviewOpen, setEnergyReviewOpen] = React.useState(false)
  const [energyReviewEntry, setEnergyReviewEntry] = React.useState<any>(null)

  // Task description expansion
  const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set())

  // 监听移动端创建任务事件，传递当前选中的分类
  React.useEffect(() => {
    const handler = () => {
      // 如果当前选中的分类不是'all'或'uncategorized'，则传递分类信息
      if (selectedCategory !== 'all' && selectedCategory !== 'uncategorized') {
        window.dispatchEvent(new CustomEvent('zflow:addTask', {
          detail: { categoryId: selectedCategory }
        }))
      } else {
        // 否则触发普通事件
        window.dispatchEvent(new CustomEvent('zflow:addTask'))
      }
    }
    
    // 监听移动端创建任务事件
    window.addEventListener('zflow:addTaskFromPage', handler)
    return () => window.removeEventListener('zflow:addTaskFromPage', handler)
  }, [selectedCategory])

  // 监听计时停止事件，打开能量评估弹窗
  React.useEffect(() => {
    const handler = (e: any) => {
      const entry = e?.detail?.entry
      if (entry) {
        setEnergyReviewEntry(entry)
        setEnergyReviewOpen(true)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('zflow:timerStopped', handler)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('zflow:timerStopped', handler)
      }
    }
  }, [])

  // Navigate to work view with specific task
  const goToWork = (taskId: string) => {
    router.push(`/focus?view=work&taskId=${encodeURIComponent(taskId)}`)
  }

  // Activity functions
  const toggleActivityComplete = async (activityId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'active' : 'completed'
      await updateActivity(activityId, { status: newStatus })
    } catch (error) {
      console.error('Failed to toggle activity status:', error)
    }
  }

  const openActivityEditor = (activity: any) => {
    setEditingActivity(activity)
    setShowActivityEditor(true)
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (confirm('确定要删除这个活动吗？')) {
      try {
        await deleteActivity(activityId)
      } catch (error) {
        console.error('Failed to delete activity:', error)
      }
    }
  }

  // Toggle task description expansion
  const toggleDescriptionExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedDescriptions)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedDescriptions(newExpanded)
  }

  // Delete task function
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(t.messages.confirmDelete)) return

    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert(t.messages.taskDeleteFailed)
    }
  }

  // Open task editor
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
    setEditingTask(task)
    setShowTaskEditor(true)
  }

  // Format elapsed time from milliseconds
  const formatElapsedTime = (elapsedMs: number): string => {
    const totalSeconds = Math.floor(elapsedMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Categories are now loaded via useCategories hook

  const filteredByCommon = React.useMemo(() => {
    return tasks.filter((t) => {
      const c = t.content as TaskContent
      const catId = (t as any).category_id || c.category_id
      const matchCategory = selectedCategory === 'all' ? true : selectedCategory === 'uncategorized' ? !catId : catId === selectedCategory
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      return matchCategory && matchSearch && matchPriority
    })
  }, [tasks, selectedCategory, search, filterPriority])

  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000

  // Current: pending/in_progress/completed within 24h
  const currentList = React.useMemo(() => {
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
      const aIsTiming = timer.runningTaskId === a.id
      const bIsTiming = timer.runningTaskId === b.id
      
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
  }, [filteredByCommon, sortMode, timer.runningTaskId, now, windowMs])

  // Future: on_hold
  const futureList = React.useMemo(() => {
    const list = filteredByCommon.filter(t => (t.content as TaskContent).status === 'on_hold')
    return sortTasks(list, sortMode)
  }, [filteredByCommon, sortMode])

  // Archive: completed beyond 24h + cancelled
  const archiveList = React.useMemo(() => {
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
  const groupedArchiveList = React.useMemo(() => {
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
  const stats = React.useMemo(() => {
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

    const activitiesCount = activities?.filter(a => a.status === 'active' || a.status === 'completed').length || 0

    return { current, future, archive, activities: activitiesCount }
  }, [tasks, activities])

  // Calculate category counts based on current view
  const viewBasedCounts = React.useMemo(() => {
    const isRootTask = (t: TaskMemory) => {
      const level = (t as any).hierarchy_level
      const parentId = (t as any).content?.parent_task_id
      // Prefer explicit hierarchy_level; fallback to absence of parent_task_id
      return (level === 0) || (level === undefined && !parentId)
    }

    const getTasksForView = (viewType: ViewKey) => {
      switch (viewType) {
        case 'current':
          return tasks.filter(t => {
            const c = t.content as TaskContent
            if (c.status === 'pending' || c.status === 'in_progress') return true
            if (c.status === 'completed') {
              const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
              return completedAt && now - completedAt <= windowMs
            }
            return false
          }).filter(isRootTask)
        case 'future':
          return tasks.filter(t => {
            const c = t.content as TaskContent
            return c.status === 'on_hold'
          }).filter(isRootTask)
        case 'archive':
          return tasks.filter(t => {
            const c = t.content as TaskContent
            if (c.status === 'cancelled') return true
            if (c.status === 'completed') {
              const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
              return completedAt && now - completedAt > windowMs
            }
            return false
          }).filter(isRootTask)
        default:
          return []
      }
    }

    const viewTasks = getTasksForView(view)
    const counts = {
      byId: {} as Record<string, number>,
      byIdCompleted: {} as Record<string, number>,
      byIdIncomplete: {} as Record<string, number>,
      uncategorized: 0,
      uncategorizedCompleted: 0,
      uncategorizedIncomplete: 0,
      total: viewTasks.length,
      totalCompleted: 0,
      totalIncomplete: 0,
    }

    for (const t of viewTasks) {
      const c = t.content as TaskContent
      const completed = c.status === 'completed'
      const catId = (t as any).category_id || c.category_id
      if (catId) {
        counts.byId[catId] = (counts.byId[catId] || 0) + 1
        if (completed) counts.byIdCompleted[catId] = (counts.byIdCompleted[catId] || 0) + 1
        else counts.byIdIncomplete[catId] = (counts.byIdIncomplete[catId] || 0) + 1
      } else {
        counts.uncategorized += 1
        if (completed) counts.uncategorizedCompleted += 1
        else counts.uncategorizedIncomplete += 1
      }
      if (completed) counts.totalCompleted += 1
      else counts.totalIncomplete += 1
    }

    return counts
  }, [tasks, view, now])

  const handleAddTask = async (taskData: any) => {
    try {
      await createTask(taskData)
    } catch (error) {
      console.error('Failed to create task:', error)
      // 错误会向上传播到AddTaskModal的handleSubmit中处理
      throw error
    }
  }

  const handleEditTask = (task: TaskMemory) => {
    // Convert TaskMemory to Task format for TaskEditor
    const taskContent = task.content as TaskContent
    const convertedTask = {
      id: task.id,
      title: taskContent.title,
      description: taskContent.description,
      status: taskContent.status,
      priority: taskContent.priority,
      category_id: (task as any).category_id || taskContent.category_id,
      created_at: task.created_at,
      updated_at: task.updated_at,
      due_date: taskContent.due_date,
      estimated_duration: taskContent.estimated_duration,
      progress: taskContent.progress || 0,
      assignee: taskContent.assignee,
      completion_date: taskContent.completion_date,
      notes: taskContent.notes,
      tags: task.tags
    }
    setEditingTask(convertedTask as any)
    setShowTaskEditor(true)
  }

  const handleSaveTask = async (taskId: string, data: any) => {
    await updateTask(taskId, data)
    setShowTaskEditor(false)
    setEditingTask(null)
  }

  const handleUpdateCategory = async (taskId: string, categoryId: string | undefined) => {
    await updateTask(taskId, { content: { category_id: categoryId } })
  }

  const toggleComplete = async (id: string, current: string) => {
    const newStatus = current === 'completed' ? 'pending' : 'completed'
    const now = new Date().toISOString()
    await updateTask(id, { 
      content: { 
        status: newStatus,
        completion_date: newStatus === 'completed' ? now : undefined
      } 
    })
  }

  const holdTask = async (id: string) => {
    await updateTask(id, { 
      content: { 
        status: 'on_hold'
      } 
    })
  }

  const activate = async (id: string) => { await updateTask(id, { content: { status: 'pending' } }) }
  const reopen = async (id: string) => { await updateTask(id, { content: { status: 'pending', progress: 0 } }) }

  // Authentication/loading guards
  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return <LoginPage />
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">Failed to load</div>

  const getCurrentList = () => currentList
  const getFutureList = () => futureList
  const getArchiveList = () => archiveList

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        <div className="flex gap-4 md:gap-6">
          {/* Left: Category sidebar */}
          <CategorySidebar
            categories={categories}
            selected={selectedCategory}
            counts={viewBasedCounts}
            view={view}
            onSelect={(key) => setSelectedCategory(key as any)}
            onCreate={async (payload) => { await createCategory({ name: payload.name, color: payload.color }) }}
            onUpdate={async (id, payload) => { await updateCategory(id, payload) }}
            onDelete={async (id) => { await deleteCategory(id); if (selectedCategory === id) setSelectedCategory('all') }}
            className="hidden md:block rounded-lg"
          />

          {/* Right: Main Content */}
          <div className="flex-1">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
              <button
                onClick={() => setView('current')}
                className={`glass rounded-lg md:rounded-xl p-3 md:p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  view === 'current' 
                    ? 'border-primary-300 shadow-md -translate-y-0.5' 
                    : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-100 rounded-lg flex items-center justify-center mx-auto md:mx-0">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xs md:text-sm font-medium text-gray-600">Current</h3>
                    <p className="text-xs text-gray-500 hidden md:block">{t.ui.inProgress} + Completed within 24h</p>
                  </div>
                </div>
                <p className="text-xl md:text-3xl font-bold text-primary-600 text-center md:text-left">{stats.current}</p>
              </button>

              <button
                onClick={() => setView('future')}
                className={`glass rounded-lg md:rounded-xl p-3 md:p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  view === 'future' 
                    ? 'border-primary-300 shadow-md -translate-y-0.5' 
                    : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-200 rounded-lg flex items-center justify-center mx-auto md:mx-0">
                    <ListTodo className="w-4 h-4 md:w-5 md:h-5 text-primary-700" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xs md:text-sm font-medium text-gray-600">Future</h3>
                    <p className="text-xs text-gray-500 hidden md:block">{t.ui.backlogItems}</p>
                  </div>
                </div>
                <p className="text-xl md:text-3xl font-bold text-primary-700 text-center md:text-left">{stats.future}</p>
              </button>

              <button
                onClick={() => setView('archive')}
                className={`glass rounded-lg md:rounded-xl p-3 md:p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  view === 'archive' 
                    ? 'border-primary-300 shadow-md -translate-y-0.5' 
                    : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-300 rounded-lg flex items-center justify-center mx-auto md:mx-0">
                    <Archive className="w-4 h-4 md:w-5 md:h-5 text-primary-800" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xs md:text-sm font-medium text-gray-600">Archive</h3>
                    <p className="text-xs text-gray-500 hidden md:block">Archived + Cancelled</p>
                  </div>
                </div>
                <p className="text-xl md:text-3xl font-bold text-primary-800 text-center md:text-left">{stats.archive}</p>
              </button>

              <button
                onClick={() => setView('activities')}
                className={`glass rounded-lg md:rounded-xl p-3 md:p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  view === 'activities' 
                    ? 'border-emerald-300 shadow-md -translate-y-0.5' 
                    : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto md:mx-0">
                    <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xs md:text-sm font-medium text-gray-600">Activities</h3>
                    <p className="text-xs text-gray-500 hidden md:block">Life experiences</p>
                  </div>
                </div>
                <p className="text-xl md:text-3xl font-bold text-emerald-600 text-center md:text-left">{stats.activities}</p>
              </button>
            </div>

            {/* Current Category Display (Mobile) */}
            <div className="md:hidden mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag className="w-4 h-4" />
                <span>
                  {t.ui.currentCategory}: {
                    selectedCategory === 'all' ? t.common.all : 
                    selectedCategory === 'uncategorized' ? t.ui.uncategorized : 
                    categories.find(c => c.id === selectedCategory)?.name || 'Unknown'
                  }
                </span>
              </div>
            </div>

            {/* Search, Filters and View Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
              {/* Left: Search and Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center glass rounded-full px-3 md:px-4 py-2">
                  <input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder={t.ui.searchTasks} 
                    className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-500 w-full sm:w-48"
                  />
                </div>
                <select 
                  value={filterPriority} 
                  onChange={(e) => setFilterPriority(e.target.value as any)} 
                  className="glass rounded-full px-3 md:px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{t.ui.allPriority}</option>
                  <option value="urgent">{t.task.priorityUrgent}</option>
                  <option value="high">{t.task.priorityHigh}</option>
                  <option value="medium">{t.task.priorityMedium}</option>
                  <option value="low">{t.task.priorityLow}</option>
                </select>
                
                {/* Mobile Category Selector Button */}
                <button
                  onClick={() => setShowMobileCategorySelector(true)}
                  className="md:hidden flex items-center justify-between glass rounded-full px-3 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors duration-200"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span>
                      {selectedCategory === 'all' ? t.ui.allCategories : 
                       selectedCategory === 'uncategorized' ? t.ui.uncategorized : 
                       categories.find(c => c.id === selectedCategory)?.name || t.ui.selectCategory}
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Right: View Controls and Current View Indicator */}
              <div className="flex items-center justify-center sm:justify-end gap-2 md:gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center glass rounded-full p-1">
                  <button
                    onClick={() => setDisplayMode('list')}
                    className={`px-2 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                      displayMode === 'list' 
                        ? 'bg-primary-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    {t.ui.listView}
                  </button>
                  <button
                    onClick={() => setDisplayMode('grid')}
                    className={`px-2 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      displayMode === 'grid' 
                        ? 'bg-primary-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    <Grid className="w-3 h-3" />
                    {t.ui.gridView}
                  </button>
                </div>

                {/* Focus Button */}
                <Link href="/focus?view=work" className="bg-primary-600 text-white px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Focus className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Focus</span>
                </Link>

                {/* Daily time overview */}
                <button
                  onClick={() => setShowDailyModal(true)}
                  className="glass px-3 md:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-1 md:gap-2 text-xs md:text-sm hover:shadow-sm hover:-translate-y-0.5"
                >
                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Time</span>
                </button>
              </div>
            </div>



            {/* View content */}
            {view === 'current' && (
              <div className="space-y-3 md:space-y-4">
                {getCurrentList().length === 0 ? (
                  <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
                    {t.ui.noCurrentTasks}
                  </div>
                ) : (
                  <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
                    {getCurrentList().map((task) => {
                      const c = task.content as TaskContent
                      const isInProgress = c.status === 'in_progress'
                      const isTiming = timer.runningTaskId === task.id
                      return (
                        <div 
                          key={task.id} 
                          className={`${isTiming 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-400 shadow-lg shadow-green-200/60 ring-2 ring-green-300/50' 
                            : isInProgress 
                              ? 'bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-300 shadow-lg shadow-primary-200/50' 
                              : 'glass'
                          } rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${isTiming ? 'hover:shadow-xl hover:shadow-green-200/70' : isInProgress ? 'hover:shadow-xl hover:shadow-primary-200/60' : ''}`}
                          onClick={(e) => {
                            // Prevent click when clicking on buttons
                            if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
                              return
                            }
                            goToWork(task.id)
                          }}
                        >
                          {/* Header with action buttons */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleComplete(task.id, c.status)} 
                                className="flex-shrink-0"
                              >
                                {c.status === 'completed' ? (
                                  <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/>
                                  </svg>
                                ) : isTiming ? (
                                  <div className="relative">
                                    <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="12" cy="12" r="10"/>
                                    </svg>
                                    <div className="absolute inset-0 w-4 h-4 md:w-5 md:h-5 border-2 border-green-600 rounded-full animate-ping"></div>
                                    <div className="absolute inset-1 w-2 h-2 md:w-3 md:h-3 bg-green-600 rounded-full animate-pulse"></div>
                                  </div>
                                ) : c.status === 'in_progress' ? (
                                  <div className="relative">
                                    <svg className="w-4 h-4 md:w-5 md:h-5 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="12" cy="12" r="10"/>
                                    </svg>
                                    <div className="absolute inset-0 w-4 h-4 md:w-5 md:h-5 border-2 border-primary-600 rounded-full animate-pulse"></div>
                                  </div>
                                ) : (
                                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10"/>
                                  </svg>
                                )}
                              </button>
                              {getPriorityIcon(c.priority)}
                              {getTimerIcon(
                                timer.isRunning,
                                timer.runningTaskId === task.id,
                                (e) => {
                                  e.stopPropagation()
                                  if (timer.isRunning && timer.runningTaskId === task.id) {
                                    timer.stop(task.id)
                                  } else {
                                    timer.start(task.id, { autoSwitch: true })
                                  }
                                }
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {c.status !== 'on_hold' && c.status !== 'completed' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    holdTask(task.id)
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md"
                                  title={t.task.holdTask}
                                >
                                  <Hourglass className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditor(task)
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
                                title="编辑任务"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTask(task.id)
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                title="删除任务"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setTimeModalTask({ id: task.id, title: c.title })}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                                title="查看专注时间"
                              >
                                <Timer className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Title and description */}
                          <div className="mb-3">
                            <div className="flex items-start gap-2 mb-2">
                              <h3 className={`font-medium text-sm md:text-base flex-1 ${c.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {c.title}
                              </h3>
                              {c.description && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleDescriptionExpansion(task.id)
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                                  title={expandedDescriptions.has(task.id) ? "Hide description" : "Show description"}
                                >
                                  {expandedDescriptions.has(task.id) ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <Info className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            
                            {/* Status badges */}
                            {(isTiming || isInProgress) && (
                              <div className="mb-2">
                                {isTiming ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-full">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                                    {t.ui.timing} {formatElapsedTime(timer.elapsedMs)}
                                  </span>
                                ) : isInProgress && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded-full">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                    {t.ui.inProgress}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {c.description && expandedDescriptions.has(task.id) && (
                              <p className="text-xs text-gray-600">{c.description}</p>
                            )}
                          </div>
                          {/* Metadata section */}
                          <div className={`text-xs text-gray-500 space-y-1 ${displayMode === 'grid' ? '' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1'}`}>
                            <div className="flex items-center gap-1">
                              <span>{t.ui.createdAt} {formatDate(task.created_at)}</span>
                            </div>
                            <div className={`flex items-center gap-2 ${displayMode === 'grid' ? 'flex-wrap' : ''}`}>
                              {(() => {
                                const categoryId = (task as any).category_id || c.category_id
                                const category = categoryId ? categories.find(cat => cat.id === categoryId) : null
                                return category ? (
                                  <div className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    <span style={{ color: category.color || '#6B7280' }}>
                                      {category.name}
                                    </span>
                                  </div>
                                ) : null
                              })()}
                              {getTaskDisplayDate(c.status, c.due_date, c.completion_date) && (
                                <div className={`flex items-center gap-1 ${shouldShowOverdue(c.status, c.due_date) ? 'text-red-600' : ''}`}>
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    {formatDate(getTaskDisplayDate(c.status, c.due_date, c.completion_date)!)}
                                    {shouldShowOverdue(c.status, c.due_date) && ` • ${t.ui.overdue}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {view === 'future' && (
              <div className="space-y-3 md:space-y-4">
                {getFutureList().length === 0 ? (
                  <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
                    {t.ui.noBacklogItems}
                  </div>
                ) : (
                  <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
                    {getFutureList().map((task) => {
                      const c = task.content as TaskContent
                      return (
                        <div 
                          key={task.id} 
                          className="glass rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={(e) => {
                            // Prevent click when clicking on buttons or select elements
                            if ((e.target as HTMLElement).tagName === 'BUTTON' || 
                                (e.target as HTMLElement).tagName === 'SELECT' ||
                                (e.target as HTMLElement).closest('button') ||
                                (e.target as HTMLElement).closest('select')) {
                              return
                            }
                            goToWork(task.id)
                          }}
                        >
                          {/* Header with action buttons */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0">
                                <ListTodo className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                              </div>
                              {getPriorityIcon(c.priority)}
                              {getTimerIcon(
                                timer.isRunning,
                                timer.runningTaskId === task.id,
                                (e) => {
                                  e.stopPropagation()
                                  if (timer.isRunning && timer.runningTaskId === task.id) {
                                    timer.stop(task.id)
                                  } else {
                                    timer.start(task.id, { autoSwitch: true })
                                  }
                                }
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditor(task)
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
                                title="编辑任务"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTask(task.id)
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                title="删除任务"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setTimeModalTask({ id: task.id, title: c.title })}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                                title="查看专注时间"
                              >
                                <Timer className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Title and description */}
                          <div className="mb-3">
                            <div className="flex items-start gap-2 mb-2">
                              <h3 className="font-medium text-sm md:text-base flex-1 text-gray-900">{c.title}</h3>
                              {c.description && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleDescriptionExpansion(task.id)
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                                  title={expandedDescriptions.has(task.id) ? "Hide description" : "Show description"}
                                >
                                  {expandedDescriptions.has(task.id) ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <Info className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            {c.description && expandedDescriptions.has(task.id) && (
                              <p className="text-xs text-gray-600">{c.description}</p>
                            )}
                          </div>
                          {/* Category and Actions */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{t.ui.createdAt} {formatDate(task.created_at)}</span>
                              {(() => {
                                const categoryId = (task as any).category_id || c.category_id
                                const category = categoryId ? categories.find(cat => cat.id === categoryId) : null
                                return category ? (
                                  <div className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    <span style={{ color: category.color || '#6B7280' }}>
                                      {category.name}
                                    </span>
                                  </div>
                                ) : null
                              })()}
                            </div>
                            <div className={`${displayMode === 'grid' ? 'space-y-2' : 'flex flex-col sm:flex-row sm:items-center gap-2'}`}>
                              {/* Quick Category Change */}
                              <select
                                value={(task as any).category_id || (c as any).category_id || ''}
                                onChange={(e) => handleUpdateCategory(task.id, e.target.value || undefined)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">{t.ui.noCategory}</option>
                                {categories.map((cat: any) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                              
                              <div className="flex items-center justify-between gap-1">
                                {/* Edit Button */}
                                <button
                                  onClick={() => handleEditTask(task)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                  title={t.task.editTask}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                
                                {/* Activate Button */}
                                <button 
                                  onClick={() => activate(task.id)} 
                                  className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors duration-200"
                                >
                                  {t.task.activateTask}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {view === 'archive' && (
              <div className="space-y-3 md:space-y-4">
                {groupedArchiveList.length === 0 ? (
                  <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
                    {t.ui.noArchivedTasks}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedArchiveList.map((group, groupIndex) => (
                      <div key={group.date}>
                        {/* Date separator */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
                          <div className="glass px-4 py-2 rounded-full">
                            <span className="text-sm font-medium text-gray-600">
                              {formatDate(group.date)}
                            </span>
                          </div>
                          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
                        </div>

                        {/* Tasks for this date */}
                        <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
                          {group.tasks.map((task) => {
                            const c = task.content as TaskContent
                            return (
                              <div 
                                key={task.id} 
                                className="glass rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
                                onClick={(e) => {
                                  // Prevent click when clicking on buttons
                                  if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
                                    return
                                  }
                                  goToWork(task.id)
                                }}
                              >
                                {/* Header with action buttons */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0">
                                      {c.status === 'completed' ? (
                                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                                      ) : (
                                        <Archive className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                                      )}
                                    </div>
                                    {getPriorityIcon(c.priority)}
                                    {getTimerIcon(
                                      timer.isRunning,
                                      timer.runningTaskId === task.id,
                                      (e) => {
                                        e.stopPropagation()
                                        if (timer.isRunning && timer.runningTaskId === task.id) {
                                          timer.stop(task.id)
                                        } else {
                                          timer.start(task.id, { autoSwitch: true })
                                        }
                                      }
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEditor(task)
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
                                      title="编辑任务"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteTask(task.id)
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                      title="删除任务"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setTimeModalTask({ id: task.id, title: c.title })}
                                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                                      title="查看专注时间"
                                    >
                                      <Timer className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Title and description */}
                                <div className="mb-3">
                                  <div className="flex items-start gap-2 mb-2">
                                    <h3 className="font-medium text-sm md:text-base flex-1 text-gray-900">{c.title}</h3>
                                    {c.description && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleDescriptionExpansion(task.id)
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                                        title={expandedDescriptions.has(task.id) ? "Hide description" : "Show description"}
                                      >
                                        {expandedDescriptions.has(task.id) ? (
                                          <ChevronDown className="w-3 h-3" />
                                        ) : (
                                          <Info className="w-3 h-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  {c.description && expandedDescriptions.has(task.id) && (
                                    <p className="text-xs text-gray-600">{c.description}</p>
                                  )}
                                </div>
                                {/* Metadata section */}
                                <div className={`text-xs text-gray-500 ${displayMode === 'grid' ? 'space-y-1' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'}`}>
                                  <div className="flex items-center justify-between">
                                    <span>
                                      {c.status === 'completed' ? t.ui.completedAt : t.ui.cancelledAt} {formatDate(c.status === 'completed' && c.completion_date ? c.completion_date : task.created_at)}
                                    </span>
                                    {(() => {
                                      const categoryId = (task as any).category_id || c.category_id
                                      const category = categoryId ? categories.find(cat => cat.id === categoryId) : null
                                      return category ? (
                                        <div className="flex items-center gap-1">
                                          <Tag className="w-3 h-3" />
                                          <span style={{ color: category.color || '#6B7280' }}>
                                            {category.name}
                                          </span>
                                        </div>
                                      ) : null
                                    })()}
                                  </div>
                                  {c.status === 'completed' && (
                                    <button 
                                      onClick={() => reopen(task.id)} 
                                      className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-lg border border-gray-300 hover:bg-white/50 transition-colors duration-200"
                                    >
                                      {t.task.reopenTask}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'activities' && (
              <div className="space-y-3 md:space-y-4">
                {activitiesLoading ? (
                  <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
                    加载中...
                  </div>
                ) : activities?.length === 0 ? (
                  <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
                    暂无活动记录
                  </div>
                ) : (
                  <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
                    {activities?.map((activity) => {
                      const isActive = activity.status === 'active'
                      const isCompleted = activity.status === 'completed'
                      const isTiming = timer.runningTimelineItemId === activity.id && timer.runningTimelineItemType === 'activity'
                      return (
                        <div 
                          key={activity.id} 
                          className={`${isTiming 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-400 shadow-lg shadow-green-200/60 ring-2 ring-green-300/50' 
                            : isActive 
                              ? 'bg-gradient-to-r from-emerald-50 to-green-100 border-2 border-emerald-300 shadow-lg shadow-emerald-200/50' 
                              : isCompleted 
                                ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300' 
                                : 'glass'
                          } rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${isTiming ? 'hover:shadow-xl hover:shadow-green-200/70' : ''}`}
                          onClick={(e) => {
                            // Prevent click when clicking on buttons
                            if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
                              return
                            }
                            // Navigate to activity focus mode
                            router.push(`/focus/activity?activityId=${encodeURIComponent(activity.id)}`)
                          }}
                        >
                          {/* Header with action buttons */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleActivityComplete(activity.id, activity.status)} 
                                className="flex-shrink-0"
                              >
                                {isCompleted ? (
                                  <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/>
                                  </svg>
                                ) : isTiming ? (
                                  <div className="relative">
                                    <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="12" cy="12" r="10"/>
                                    </svg>
                                    <div className="absolute inset-0 w-4 h-4 md:w-5 md:h-5 border-2 border-green-600 rounded-full animate-ping"></div>
                                    <div className="absolute inset-1 w-2 h-2 md:w-3 md:h-3 bg-green-600 rounded-full animate-pulse"></div>
                                  </div>
                                ) : (
                                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10"/>
                                  </svg>
                                )}
                              </button>
                              {/* Activity type icon */}
                              <div className="text-lg">
                                {activity.activity_type === 'exercise' && '🏃‍♂️'}
                                {activity.activity_type === 'meditation' && '🧘‍♀️'}
                                {activity.activity_type === 'reading' && '📚'}
                                {activity.activity_type === 'music' && '🎵'}
                                {activity.activity_type === 'socializing' && '👥'}
                                {activity.activity_type === 'gaming' && '🎮'}
                                {activity.activity_type === 'walking' && '🚶‍♀️'}
                                {activity.activity_type === 'cooking' && '👨‍🍳'}
                                {activity.activity_type === 'rest' && '😴'}
                                {activity.activity_type === 'creative' && '🎨'}
                                {activity.activity_type === 'learning' && '📖'}
                                {(!activity.activity_type || activity.activity_type === 'other') && '✨'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openActivityEditor(activity)
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
                                title={t.activity.editActivity}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteActivity(activity.id)
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                title={t.activity.deleteActivity}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTimeModalActivity({ id: activity.id, title: activity.title })
                                }}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                                title={t.activity.viewActivityTime}
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isTiming) {
                                    timer.stopActivity(activity.id)
                                  } else {
                                    timer.startActivity(activity.id)
                                  }
                                }}
                                className={`p-1.5 rounded-md ${
                                  isTiming 
                                    ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                                    : 'text-green-600 hover:bg-green-50'
                                }`}
                                title={isTiming ? t.activity.stopTimer : t.activity.startTimer}
                              >
                                {isTiming ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Title and description */}
                          <div className="mb-3">
                            <h3 className={`font-medium text-sm md:text-base ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {activity.title}
                            </h3>
                            {activity.description && (
                              <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                          </div>

                          {/* Activity details */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              {activity.category_id && (
                                <span className="flex items-center gap-1">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: categories.find(c => c.id === activity.category_id)?.color || '#gray' }}
                                  />
                                  {categories.find(c => c.id === activity.category_id)?.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {activity.started_at && (
                                <span>{new Date(activity.started_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Add Button (desktop only) */}
      <div className="hidden sm:block">
        <FloatingAddButton 
          onClick={() => setShowAddModal(true)} 
        />
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTask}
        onSubmitAndStart={async (taskData) => {
          try {
            const task = await createTask(taskData)
            // Start timer for the created task
            if (task && task.id) {
              await timer.start(task.id, { autoSwitch: true })
            }
            setShowAddModal(false)
          } catch (error) {
            console.error('Failed to create task:', error)
            // 错误情况下不关闭模态窗口，让用户决定是否重试
          }
        }}
        categories={categories}
        defaultCategoryId={selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined}
      />

      {/* Task Editor */}
      <TaskEditor
        isOpen={showTaskEditor}
        onClose={() => { setShowTaskEditor(false); setEditingTask(null) }}
        task={editingTask}
        categories={categories}
        onSave={handleSaveTask}
        title={t.task.editTask}
      />

      {/* Activity Editor */}
      <ActivityEditor
        isOpen={showActivityEditor}
        onClose={() => { setShowActivityEditor(false); setEditingActivity(null) }}
        activity={editingActivity}
        categories={categories}
        onSave={async (activityId, updates) => {
          try {
            await updateActivity(activityId, updates)
            setShowActivityEditor(false)
            setEditingActivity(null)
          } catch (error) {
            console.error('Failed to save activity:', error)
          }
        }}
      />

      {/* Task Time Modal */}
      <TaskTimeModal
        isOpen={!!timeModalTask}
        onClose={() => setTimeModalTask(null)}
        taskId={timeModalTask?.id || ''}
        taskTitle={timeModalTask?.title}
      />

      {/* Activity Time Modal */}
      <ActivityTimeModal
        isOpen={!!timeModalActivity}
        onClose={() => setTimeModalActivity(null)}
        activityId={timeModalActivity?.id || ''}
        activityTitle={timeModalActivity?.title}
      />

      {/* Daily Time Overview Modal */}
      <DailyTimeModal isOpen={showDailyModal} onClose={() => setShowDailyModal(false)} />

      {/* Energy Review Modal */}
      <EnergyReviewModal
        open={energyReviewOpen}
        entry={energyReviewEntry}
        onClose={() => setEnergyReviewOpen(false)}
      />

      {/* Mobile Category Selector Sheet */}
      <MobileCategorySheet
        open={showMobileCategorySelector}
        onClose={() => setShowMobileCategorySelector(false)}
        categories={categories}
        counts={viewBasedCounts}
        selected={selectedCategory}
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
  )
}

function labelOf(k: ViewKey) {
  if (k === 'current') return 'Current'
  if (k === 'future') return 'Future'
  return 'Past'
}

function computeCounts(tasks: TaskMemory[]) {
  const counts = {
    byId: {} as Record<string, number>,
    byIdCompleted: {} as Record<string, number>,
    byIdIncomplete: {} as Record<string, number>,
    uncategorized: 0,
    uncategorizedCompleted: 0,
    uncategorizedIncomplete: 0,
    total: tasks.length,
    totalCompleted: 0,
    totalIncomplete: 0,
  }
  for (const t of tasks) {
    const c = t.content as TaskContent
    const completed = c.status === 'completed'
    const catId = (t as any).category_id || c.category_id
    if (catId) {
      counts.byId[catId] = (counts.byId[catId] || 0) + 1
      if (completed) counts.byIdCompleted[catId] = (counts.byIdCompleted[catId] || 0) + 1
      else counts.byIdIncomplete[catId] = (counts.byIdIncomplete[catId] || 0) + 1
    } else {
      counts.uncategorized += 1
      if (completed) counts.uncategorizedCompleted += 1
      else counts.uncategorizedIncomplete += 1
    }
    if (completed) counts.totalCompleted += 1
    else counts.totalIncomplete += 1
  }
  return counts
}

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

export default function ZFlowPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ZFlowPageContent />
    </Suspense>
  )
}