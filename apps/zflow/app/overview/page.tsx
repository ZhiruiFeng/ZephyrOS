'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ListTodo, BarChart3, Tag, Calendar, Plus, Grid, List, Focus, Archive, Clock, CheckCircle, Settings } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/LoginPage'
import CategorySidebar from '../components/CategorySidebar'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useMemories'
import { categoriesApi, TaskMemory, TaskContent } from '../../lib/api'
import { getPriorityIcon } from '../components/TaskIcons'
import { isOverdue, formatDate } from '../utils/taskUtils'

type ViewKey = 'current' | 'future' | 'archive'
type DisplayMode = 'list' | 'grid'

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const view = (params.get('view') as ViewKey) || 'current'
  const setView = (v: ViewKey) => router.push(`/overview?view=${v}`)
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('list')

  const { tasks, isLoading, error } = useTasks(user ? {} : null)
  const { createTask } = useCreateTask()
  const { updateTask } = useUpdateTask()
  const { deleteTask } = useDeleteTask()
  const [categories, setCategories] = React.useState<any[]>([])

  // Shared filters
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | 'uncategorized' | string>('all')
  const [filterPriority, setFilterPriority] = React.useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')
  const [search, setSearch] = React.useState('')
  const [sortMode, setSortMode] = React.useState<'none' | 'priority' | 'due_date'>('none')

  // Quick capture
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newTaskTitle, setNewTaskTitle] = React.useState('')
  const [newTaskDescription, setNewTaskDescription] = React.useState('')
  const [newTaskPriority, setNewTaskPriority] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = React.useState('')
  const [newTaskTags, setNewTaskTags] = React.useState('')
  const [newTaskCategoryId, setNewTaskCategoryId] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (user) categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
  }, [user])

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

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    const tagsArray = newTaskTags.split(',').map(t => t.trim()).filter(Boolean)
    const joinAttention = (() => { try { return localStorage.getItem('zflow:quickCapture:joinAttention') === '1' || (window as any).__zflowJoinAttention === true } catch { return false } })()
    const finalCategoryId = newTaskCategoryId || (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined)
    await createTask({
      type: 'task',
      content: {
        title: newTaskTitle,
        description: newTaskDescription,
        status: (joinAttention ? 'pending' : 'on_hold'),
        priority: newTaskPriority,
        category_id: finalCategoryId,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      },
      tags: ['zflow', 'task', ...tagsArray]
    })
    setNewTaskTitle(''); setNewTaskDescription(''); setNewTaskPriority('medium'); setNewTaskDueDate(''); setNewTaskTags(''); setNewTaskCategoryId(undefined); setShowAddForm(false)
  }

  const toggleComplete = async (id: string, current: string) => {
    const newStatus = current === 'completed' ? 'pending' : 'completed'
    await updateTask(id, { content: { status: newStatus } })
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Left: Category sidebar */}
          <CategorySidebar
            categories={categories}
            selected={selectedCategory}
            counts={computeCounts(tasks)}
            onSelect={(key) => setSelectedCategory(key as any)}
            onCreate={async (payload) => { await categoriesApi.create({ name: payload.name, color: payload.color }); setCategories(await categoriesApi.getAll()) }}
            onUpdate={async (id, payload) => { await categoriesApi.update(id, payload); setCategories(await categoriesApi.getAll()) }}
            onDelete={async (id) => { await categoriesApi.delete(id); setCategories(await categoriesApi.getAll()); if (selectedCategory === id) setSelectedCategory('all') }}
            className="hidden md:block rounded-lg"
          />

          {/* Right: Main Content */}
          <div className="flex-1">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setView('current')}
                className={`bg-white/70 backdrop-blur-md rounded-xl p-6 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  view === 'current' 
                    ? 'border-blue-300 shadow-md -translate-y-0.5' 
                    : 'border-white/60 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Current</h3>
                    <p className="text-xs text-gray-500">进行中 + 24小时内完成</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.current}</p>
              </button>

              <button
                onClick={() => setView('future')}
                className={`bg-white/70 backdrop-blur-md rounded-xl p-6 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  view === 'future' 
                    ? 'border-blue-300 shadow-md -translate-y-0.5' 
                    : 'border-white/60 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ListTodo className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Future</h3>
                    <p className="text-xs text-gray-500">待办事项</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-600">{stats.future}</p>
              </button>

              <button
                onClick={() => setView('archive')}
                className={`bg-white/70 backdrop-blur-md rounded-xl p-6 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  view === 'archive' 
                    ? 'border-blue-300 shadow-md -translate-y-0.5' 
                    : 'border-white/60 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Archive className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Archive</h3>
                    <p className="text-xs text-gray-500">已归档 + 已取消</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-600">{stats.archive}</p>
              </button>
            </div>

            {/* Search, Filters and View Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              {/* Left: Search and Filters */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/70 backdrop-blur-md rounded-full px-4 py-2 border border-white/60">
                  <input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="搜索任务..." 
                    className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-500 w-48"
                  />
                </div>
                <select 
                  value={filterPriority} 
                  onChange={(e) => setFilterPriority(e.target.value as any)} 
                  className="bg-white/70 backdrop-blur-md border border-white/60 rounded-full px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部优先级</option>
                  <option value="urgent">紧急</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              {/* Right: View Controls and Current View Indicator */}
              <div className="flex items-center gap-4">
                {/* Current View Indicator */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>当前视图:</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {view === 'current' ? 'Current' : view === 'future' ? 'Future' : 'Archive'}
                  </span>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/70 backdrop-blur-md rounded-full p-1 border border-white/60">
                  <button
                    onClick={() => setDisplayMode('list')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      displayMode === 'list' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    列表
                  </button>
                  <button
                    onClick={() => setDisplayMode('grid')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      displayMode === 'grid' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    <Grid className="w-3 h-3" />
                    网格
                  </button>
                </div>

                {/* Focus Button */}
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2">
                  <Focus className="w-4 h-4" />
                  Focus
                </button>
              </div>
            </div>

            {/* Quick capture */}
            <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-sm mb-6">
              {!showAddForm ? (
                <button 
                  onClick={() => { 
                    setNewTaskCategoryId(selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined); 
                    setShowAddForm(true) 
                  }} 
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> 新建任务
                </button>
              ) : (
                <div className="space-y-4 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                      type="text" 
                      value={newTaskTitle} 
                      onChange={(e) => setNewTaskTitle(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && addTask()} 
                      placeholder="任务标题..." 
                      className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm" 
                    />
                    <select 
                      value={newTaskPriority} 
                      onChange={(e) => setNewTaskPriority(e.target.value as any)} 
                      className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                    >
                      <option value="low">低优先级</option>
                      <option value="medium">中优先级</option>
                      <option value="high">高优先级</option>
                      <option value="urgent">紧急</option>
                    </select>
                    <select 
                      value={newTaskCategoryId || (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : '')} 
                      onChange={(e) => setNewTaskCategoryId(e.target.value || undefined)} 
                      className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                    >
                      <option value="">无分类</option>
                      {categories.map((cat: any) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    </select>
                  </div>
                  <textarea 
                    value={newTaskDescription} 
                    onChange={(e) => setNewTaskDescription(e.target.value)} 
                    placeholder="任务描述（可选）..." 
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm" 
                    rows={3} 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <input 
                        type="datetime-local" 
                        value={newTaskDueDate} 
                        onChange={(e) => setNewTaskDueDate(e.target.value)} 
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <input 
                        type="text" 
                        value={newTaskTags} 
                        onChange={(e) => setNewTaskTags(e.target.value)} 
                        placeholder="标签（用英文逗号分隔）..." 
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button 
                      onClick={addTask} 
                      disabled={!newTaskTitle.trim()} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      创建任务
                    </button>
                    <label className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <input 
                        type="checkbox" 
                        onChange={(e) => { 
                          try { localStorage.setItem('zflow:quickCapture:joinAttention', e.target.checked ? '1':'0') } catch {}; 
                          (window as any).__zflowJoinAttention = e.target.checked 
                        }} 
                      />
                      <span>创建后加入注意力池（Pending）</span>
                    </label>
                    <button 
                      onClick={() => { setShowAddForm(false); setNewTaskCategoryId(undefined) }} 
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors duration-200"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* View content */}
            {view === 'current' && (
              <div className="space-y-4">
                {getCurrentList().length === 0 ? (
                  <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 p-8 text-center text-gray-500">
                    暂无当前任务
                  </div>
                ) : (
                  <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                    {getCurrentList().map((task) => {
                      const c = task.content as TaskContent
                      return (
                        <div key={task.id} className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <button 
                                onClick={() => toggleComplete(task.id, c.status)} 
                                className="flex-shrink-0"
                              >
                                {c.status === 'completed' ? (
                                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10"/>
                                  </svg>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-medium text-lg ${c.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {c.title}
                                </h3>
                                {c.description && (
                                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPriorityIcon(c.priority)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>创建于 {formatDate(task.created_at)}</span>
                            {c.due_date && (
                              <span className={`inline-flex items-center gap-1 ${isOverdue(c.due_date) ? 'text-red-600' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                {formatDate(c.due_date)}
                                {isOverdue(c.due_date) && '（已逾期）'}
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
              <div className="space-y-4">
                {getFutureList().length === 0 ? (
                  <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 p-8 text-gray-500">
                    暂无待办事项
                  </div>
                ) : (
                  <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                    {getFutureList().map((task) => {
                      const c = task.content as TaskContent
                      return (
                        <div key={task.id} className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-5 h-5 flex-shrink-0">
                                <ListTodo className="w-5 h-5 text-purple-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-lg text-gray-900">{c.title}</h3>
                                {c.description && (
                                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPriorityIcon(c.priority)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">创建于 {formatDate(task.created_at)}</span>
                            <button 
                              onClick={() => activate(task.id)} 
                              className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                            >
                              激活 → Pending
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {view === 'archive' && (
              <div className="space-y-4">
                {getArchiveList().length === 0 ? (
                  <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 p-8 text-gray-500">
                    暂无归档任务
                  </div>
                ) : (
                  <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                    {getArchiveList().map((task) => {
                      const c = task.content as TaskContent
                      return (
                        <div key={task.id} className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-5 h-5 flex-shrink-0">
                                {c.status === 'completed' ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Archive className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-lg text-gray-900">{c.title}</h3>
                                {c.description && (
                                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPriorityIcon(c.priority)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {c.status === 'completed' ? '完成于' : '取消于'} {formatDate(task.created_at)}
                            </span>
                            {c.status === 'completed' && (
                              <button 
                                onClick={() => reopen(task.id)} 
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-white/50 transition-colors duration-200"
                              >
                                重新打开 → Pending
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


