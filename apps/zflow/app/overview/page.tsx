'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ListTodo, BarChart3, Tag, Calendar, Plus, Grid, List, Focus, Archive, Clock, CheckCircle, Settings, ChevronDown, X, Timer } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import LoginPage from '../components/LoginPage'
import CategorySidebar from '../components/CategorySidebar'
import FloatingAddButton from '../components/FloatingAddButton'
import AddTaskModal from '../components/AddTaskModal'
import TaskEditor from '../components/TaskEditor'
import TaskTimeModal from '../components/TaskTimeModal'
import DailyTimeModal from '../components/DailyTimeModal'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useMemories'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useCategories'
import { categoriesApi, TaskMemory, TaskContent } from '../../lib/api'
import { getPriorityIcon } from '../components/TaskIcons'
import { isOverdue, formatDate, getTaskDisplayDate, shouldShowOverdue } from '../utils/taskUtils'

type ViewKey = 'current' | 'future' | 'archive'
type DisplayMode = 'list' | 'grid'

function OverviewPageContent() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const view = (params.get('view') as ViewKey) || 'current'
  const setView = (v: ViewKey) => router.push(`/overview?view=${v}`)
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('list')

  const { tasks, isLoading, error } = useTasks(user ? {} : null)
  const { categories } = useCategories()
  const { createTask } = useCreateTask()
  const { updateTask } = useUpdateTask()
  const { deleteTask } = useDeleteTask()
  const { createCategory } = useCreateCategory()
  const { updateCategory } = useUpdateCategory()
  const { deleteCategory } = useDeleteCategory()

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

  // Mobile category selector
  const [showMobileCategorySelector, setShowMobileCategorySelector] = React.useState(false)
  const [timeModalTask, setTimeModalTask] = React.useState<{ id: string; title: string } | null>(null)
  const [showDailyModal, setShowDailyModal] = React.useState(false)

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
    return sortTasks(list, sortMode)
  }, [filteredByCommon, sortMode])

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
    return sortTasks(list, sortMode)
  }, [filteredByCommon, sortMode])

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

    return { current, future, archive }
  }, [tasks])

  // Calculate category counts based on current view
  const viewBasedCounts = React.useMemo(() => {
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
          })
        case 'future':
          return tasks.filter(t => {
            const c = t.content as TaskContent
            return c.status === 'on_hold'
          })
        case 'archive':
          return tasks.filter(t => {
            const c = t.content as TaskContent
            if (c.status === 'cancelled') return true
            if (c.status === 'completed') {
              const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
              return completedAt && now - completedAt > windowMs
            }
            return false
          })
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
    await createTask(taskData)
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
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
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
                      return (
                        <div key={task.id} className="glass rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-3 md:mb-4">
                            <div className="flex items-center gap-2 md:gap-3 flex-1">
                              <button 
                                onClick={() => toggleComplete(task.id, c.status)} 
                                className="flex-shrink-0"
                              >
                                {c.status === 'completed' ? (
                                  <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10"/>
                                  </svg>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-medium text-base md:text-lg ${c.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {c.title}
                                </h3>
                                {c.description && (
                                  <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                            </div>
                          <div className="flex items-center gap-1 md:gap-2">
                              {getPriorityIcon(c.priority)}
                              <button
                                onClick={() => setTimeModalTask({ id: task.id, title: c.title })}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                                title="查看专注时间"
                              >
                                <Timer className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-1">
                            <span>{t.ui.createdAt} {formatDate(task.created_at)}</span>
                            {getTaskDisplayDate(c.status, c.due_date, c.completion_date) && (
                              <span className={`inline-flex items-center gap-1 ${shouldShowOverdue(c.status, c.due_date) ? 'text-red-600' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                {formatDate(getTaskDisplayDate(c.status, c.due_date, c.completion_date)!)}
                                {shouldShowOverdue(c.status, c.due_date) && t.ui.overdue}
                              </span>
                            )}
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
                        <div key={task.id} className="glass rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-3 md:mb-4">
                            <div className="flex items-center gap-2 md:gap-3 flex-1">
                              <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0">
                                <ListTodo className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-base md:text-lg text-gray-900">{c.title}</h3>
                                {c.description && (
                                  <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                            </div>
                          <div className="flex items-center gap-1 md:gap-2">
                              {getPriorityIcon(c.priority)}
                              <button
                                onClick={() => setTimeModalTask({ id: task.id, title: c.title })}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                                title="查看专注时间"
                              >
                                <Timer className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500">{t.ui.createdAt} {formatDate(task.created_at)}</span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              {/* Quick Category Change */}
                              <select
                                value={(task as any).category_id || (c as any).category_id || ''}
                                onChange={(e) => handleUpdateCategory(task.id, e.target.value || undefined)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">{t.ui.noCategory}</option>
                                {categories.map((cat: any) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                              
                              <div className="flex items-center gap-1">
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
                {getArchiveList().length === 0 ? (
                  <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
                    {t.ui.noArchivedTasks}
                  </div>
                ) : (
                  <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
                    {getArchiveList().map((task) => {
                      const c = task.content as TaskContent
                      return (
                        <div key={task.id} className="glass rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-3 md:mb-4">
                            <div className="flex items-center gap-2 md:gap-3 flex-1">
                              <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0">
                                {c.status === 'completed' ? (
                                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                                ) : (
                                  <Archive className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-base md:text-lg text-gray-900">{c.title}</h3>
                                {c.description && (
                                  <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                              {getPriorityIcon(c.priority)}
                              <button
                                onClick={() => setTimeModalTask({ id: task.id, title: c.title })}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                                title="查看专注时间"
                              >
                                <Timer className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-xs text-gray-500">
                              {c.status === 'completed' ? t.ui.completedAt : t.ui.cancelledAt} {formatDate(c.status === 'completed' && c.completion_date ? c.completion_date : task.created_at)}
                            </span>
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

      {/* Task Time Modal */}
      <TaskTimeModal
        isOpen={!!timeModalTask}
        onClose={() => setTimeModalTask(null)}
        taskId={timeModalTask?.id || ''}
        taskTitle={timeModalTask?.title}
      />

      {/* Daily Time Overview Modal */}
      <DailyTimeModal isOpen={showDailyModal} onClose={() => setShowDailyModal(false)} />

      {/* Mobile Category Selector Modal */}
      {showMobileCategorySelector && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileCategorySelector(false)}
          />
          
          {/* Modal */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t.ui.selectCategory}</h3>
              <button
                onClick={() => setShowMobileCategorySelector(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {/* All Categories */}
              <button
                onClick={() => { setSelectedCategory('all'); setShowMobileCategorySelector(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedCategory === 'all' 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{t.common.all}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedCategory === 'all' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-primary-50 text-primary-700'
                }`}>
                  {viewBasedCounts.total}
                </span>
              </button>
              
              {/* Uncategorized */}
              <button
                onClick={() => { setSelectedCategory('uncategorized'); setShowMobileCategorySelector(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedCategory === 'uncategorized' 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{t.ui.uncategorized}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedCategory === 'uncategorized' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-primary-50 text-primary-700'
                }`}>
                  {viewBasedCounts.uncategorized}
                </span>
              </button>
              
              {/* Divider */}
              <div className="h-px bg-gray-200 my-3" />
              
              {/* Categories */}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setShowMobileCategorySelector(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat.id 
                      ? 'bg-primary-600 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedCategory === cat.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-primary-50 text-primary-700'
                  }`}>
                    {viewBasedCounts.byId[cat.id] || 0}
                  </span>
                </button>
              ))}
              
              {/* Empty state */}
              {categories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No categories</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

export default function OverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <OverviewPageContent />
    </Suspense>
  )
}


