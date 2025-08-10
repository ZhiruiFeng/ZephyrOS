'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ListTodo, BarChart3, Tag, Calendar, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/LoginPage'
import CategorySidebar from '../components/CategorySidebar'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useMemories'
import { categoriesApi, TaskMemory, TaskContent } from '../../lib/api'
import { getPriorityIcon } from '../components/TaskIcons'
import { isOverdue, formatDate } from '../utils/taskUtils'

type ViewKey = 'current' | 'future' | 'past'

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const view = (params.get('view') as ViewKey) || 'current'
  const setView = (v: ViewKey) => router.push(`/overview?view=${v}`)

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

  // Future: on_hold grouped by category
  const futureMap = React.useMemo(() => {
    const onHold = filteredByCommon.filter(t => (t.content as TaskContent).status === 'on_hold')
    const map: Record<string, TaskMemory[]> = {}
    for (const t of onHold) {
      const catId = (t as any).category_id || (t as any).content?.category_id || 'uncategorized'
      if (!map[catId]) map[catId] = []
      map[catId].push(t)
    }
    // sort each group
    Object.keys(map).forEach((k) => map[k] = sortTasks(map[k], sortMode))
    return map
  }, [filteredByCommon, sortMode])

  // Past: completed beyond 24h grouped by month
  const pastByMonth = React.useMemo(() => {
    const archived = filteredByCommon.filter((t) => {
      const c = t.content as TaskContent
      if (c.status !== 'completed') return false
      const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
      return completedAt && now - completedAt > windowMs
    })
    const groups: Record<string, TaskMemory[]> = {}
    for (const t of archived) {
      const c = t.content as TaskContent
      const d = c.completion_date ? new Date(c.completion_date) : new Date()
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    // optional sorting by date descending inside groups
    Object.keys(groups).forEach((k) => groups[k] = sortTasks(groups[k], sortMode))
    return groups
  }, [filteredByCommon, sortMode])

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

  const months = Object.keys(pastByMonth).sort().reverse()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-4">
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

        {/* Right: Main */}
        <div className="flex-1">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 text-white mb-6">
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                    <ListTodo className="w-7 h-7" /> Overview
                  </h1>
                  <p className="mt-1 text-white/90">Current / Future / Past 统一管理视图</p>
                </div>
                <div className="flex items-center bg-white/10 rounded-full p-1">
                  {(['current','future','past'] as ViewKey[]).map((k) => (
                    <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 rounded-full text-sm ${view===k ? 'bg-white text-primary-700' : 'text-white/90 hover:bg-white/10'}`}>{labelOf(k)}</button>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="搜索任务..." className="text-sm outline-none bg-transparent placeholder:text-white/70 text-white w-full" />
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <select value={filterPriority} onChange={(e)=>setFilterPriority(e.target.value as any)} className="text-sm outline-none bg-transparent text-white w-full">
                    <option value="all" className="text-gray-800">全部优先级</option>
                    <option value="urgent" className="text-gray-800">紧急</option>
                    <option value="high" className="text-gray-800">高</option>
                    <option value="medium" className="text-gray-800">中</option>
                    <option value="low" className="text-gray-800">低</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <select value={sortMode} onChange={(e)=>setSortMode(e.target.value as any)} className="text-sm outline-none bg-transparent text-white w-full">
                    <option value="none" className="text-gray-800">不排序</option>
                    <option value="priority" className="text-gray-800">按优先级</option>
                    <option value="due_date" className="text-gray-800">按截止时间</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quick capture */}
          <div className="card glass card-hover rounded-2xl mb-6">
            {!showAddForm ? (
              <button onClick={() => { setNewTaskCategoryId(selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined); setShowAddForm(true) }} className="w-full px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> 新建任务
              </button>
            ) : (
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={newTaskTitle} onChange={(e)=>setNewTaskTitle(e.target.value)} onKeyDown={(e)=> e.key==='Enter' && addTask()} placeholder="任务标题..." className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <select value={newTaskPriority} onChange={(e)=>setNewTaskPriority(e.target.value as any)} className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="low">低优先级</option>
                    <option value="medium">中优先级</option>
                    <option value="high">高优先级</option>
                    <option value="urgent">紧急</option>
                  </select>
                  <select value={newTaskCategoryId || (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : '')} onChange={(e)=>setNewTaskCategoryId(e.target.value || undefined)} className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">无分类</option>
                    {categories.map((cat: any) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                </div>
                <textarea value={newTaskDescription} onChange={(e)=>setNewTaskDescription(e.target.value)} placeholder="任务描述（可选）..." className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <input type="datetime-local" value={newTaskDueDate} onChange={(e)=>setNewTaskDueDate(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <input type="text" value={newTaskTags} onChange={(e)=>setNewTaskTags(e.target.value)} placeholder="标签（用英文逗号分隔）..." className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={addTask} disabled={!newTaskTitle.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors duration-200 disabled:opacity-50">创建任务</button>
                  <label className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <input type="checkbox" onChange={(e)=>{ try { localStorage.setItem('zflow:quickCapture:joinAttention', e.target.checked ? '1':'0') } catch {}; (window as any).__zflowJoinAttention = e.target.checked }} />
                    <span>创建后加入注意力池（Pending）</span>
                  </label>
                  <button onClick={()=>{ setShowAddForm(false); setNewTaskCategoryId(undefined) }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors duration-200">取消</button>
                </div>
              </div>
            )}
          </div>

          {/* View content */}
          {view === 'current' && (
            <div className="space-y-4">
              {currentList.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">暂无当前任务</div>
              ) : (
                <div className={'space-y-4'}>
                  {currentList.map((task) => {
                    const c = task.content as TaskContent
                    return (
                      <div key={task.id} className="card card-hover">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <button onClick={()=>toggleComplete(task.id, c.status)} className="flex-shrink-0">
                              {c.status === 'completed' ? (
                                <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/></svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium text-lg ${c.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>{c.title}</h3>
                              {c.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>}
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
            <div className="space-y-6">
              {Object.keys(futureMap).length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">暂无 Backlog</div>
              ) : (
                Object.entries(futureMap).map(([catId, list]) => {
                  const cat = catId === 'uncategorized' ? { name: '未分类', color: '#9ca3af' } : categories.find((c:any) => c.id === catId)
                  return (
                    <section key={catId} className="bg-white rounded-xl border border-gray-200">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="font-semibold" style={{ color: cat?.color || '#111827' }}>{cat?.name || '未分类'}</div>
                        <div className="text-sm text-gray-500">{list.length} 项</div>
                      </div>
                      <ul className="divide-y divide-gray-100">
                        {list.map((t) => {
                          const c = t.content as TaskContent
                          return (
                            <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{c.title}</div>
                                {c.description && <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>}
                              </div>
                              <div className="flex items-center gap-3">
                                <select defaultValue={(t as any).category_id || c.category_id || ''} onChange={async (e)=>{ await updateTask(t.id, { content: { category_id: e.target.value || undefined } }) }} className="text-sm border border-gray-300 rounded px-2 py-1" title="快速修改分类">
                                  <option value="">未分类</option>
                                  {categories.map((cat: any) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                                </select>
                                <button onClick={()=>activate(t.id)} className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">激活 → Pending</button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )
                })
              )}
            </div>
          )}

          {view === 'past' && (
            <div className="space-y-6">
              {months.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">暂无归档任务</div>
              ) : (
                months.map((m) => (
                  <section key={m} className="bg-white rounded-xl border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100 font-semibold">{m}</div>
                    <ul className="divide-y divide-gray-100">
                      {pastByMonth[m].map((t) => {
                        const c = t.content as TaskContent
                        return (
                          <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{c.title}</div>
                              {c.description && <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={()=>reopen(t.id)} className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50">重新打开 → Pending</button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>
          )}
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


