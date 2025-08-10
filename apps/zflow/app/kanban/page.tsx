'use client'

import React, { useMemo, useState, useMemo as useReactMemo, Suspense } from 'react'
import Link from 'next/link'
import { useTasks, useUpdateTask } from '../../hooks/useMemories'
import { usePrefs } from '../../contexts/PrefsContext'
import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/LoginPage'
import { TaskMemory, categoriesApi, TaskContent } from '../../lib/api'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
const Lazy = (Comp: React.LazyExoticComponent<React.ComponentType<any>>) => (props: any) => (
  <Suspense fallback={null}>
    <Comp {...props} />
  </Suspense>
)
const ListTodo = Lazy(React.lazy(dynamicIconImports['list-todo'] as any))
const KanbanSquare = Lazy(React.lazy(dynamicIconImports['kanban-square'] as any))
const ChevronLeft = Lazy(React.lazy(dynamicIconImports['chevron-left'] as any))
const Clock = Lazy(React.lazy(dynamicIconImports['clock'] as any))
const AlertCircle = Lazy(React.lazy(dynamicIconImports['alert-circle'] as any))
const Circle = Lazy(React.lazy(dynamicIconImports['circle'] as any))
const Tag = Lazy(React.lazy(dynamicIconImports['tag'] as any))
const Calendar = Lazy(React.lazy(dynamicIconImports['calendar'] as any))
const Pencil = Lazy(React.lazy(dynamicIconImports['pencil'] as any))
const FileText = Lazy(React.lazy(dynamicIconImports['file-text'] as any))
const Search = Lazy(React.lazy(dynamicIconImports['search'] as any))
const Filter = Lazy(React.lazy(dynamicIconImports['filter'] as any))
const Menu = Lazy(React.lazy(dynamicIconImports['menu'] as any))
import TaskEditor from '../components/TaskEditor'
import { getPriorityIcon } from '../components/TaskIcons'
import { 
  isOverdue, 
  formatDate,
  formatTagsString
} from '../utils/taskUtils'

type StatusKey = TaskContent['status']

// Focused attention pool: only show pending, in_progress, completed (within 24h)
const COLUMNS: Array<{ key: StatusKey; title: string; hint?: string }> = [
  { key: 'pending', title: 'Todo' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'completed', title: 'Done (24h)' },
]

export default function KanbanPage() {
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? {} : null)
  const { updateTask } = useUpdateTask()
  const [categories, setCategories] = useState<any[]>([])

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const { filterPriority, setFilterPriority, hideCompleted, setHideCompleted, selectedCategory, setSelectedCategory, sortMode } = (usePrefs() as any)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)

  // Load categories
  React.useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
  }, [])

  // using shared prefs; local persistence handled by PrefsProvider

  const filtered = useMemo(() => {
    const shouldHideCompleted = hideCompleted
    return tasks.filter((t) => {
      const c = t.content as TaskContent
      const catId = (t as any).category_id || (t as any).content?.category_id
      const matchCategory = selectedCategory === 'all' ? true : selectedCategory === 'uncategorized' ? !catId : catId === selectedCategory
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      const matchCompletedHide = !(shouldHideCompleted && c.status === 'completed')
      return matchCategory && matchSearch && matchPriority && matchCompletedHide
    })
  }, [tasks, search, filterPriority, hideCompleted, selectedCategory])

  // sort mode from shared prefs

  const byStatus = useMemo<Record<StatusKey, TaskMemory[]>>(() => {
    const map = {
      pending: [] as TaskMemory[],
      in_progress: [] as TaskMemory[],
      completed: [] as TaskMemory[],
      cancelled: [] as TaskMemory[],
      on_hold: [] as TaskMemory[],
    }
    const now = Date.now()
    const windowMs = 24 * 60 * 60 * 1000
    for (const t of filtered) {
      const s = (t.content as TaskContent).status
      if (s === 'completed') {
        const completion = (t.content as TaskContent).completion_date
        const completedAt = completion ? new Date(completion).getTime() : 0
        if (completedAt && now - completedAt <= windowMs) {
          map.completed.push(t)
        }
        // else: older completed tasks are hidden from Kanban; visible in Archive page
      } else if (s === 'pending' || s === 'in_progress') {
        map[s].push(t)
      }
    }
    // sort inside each column
    const priorityOrder: Record<TaskContent['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    const sorters: Record<typeof sortMode, (a: TaskMemory, b: TaskMemory) => number> = {
      none: () => 0,
      priority: (a, b) => priorityOrder[(a.content as TaskContent).priority] - priorityOrder[(b.content as TaskContent).priority],
      due_date: (a, b) => {
        const da = (a.content as TaskContent).due_date
        const db = (b.content as TaskContent).due_date
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return new Date(da).getTime() - new Date(db).getTime()
      },
    }
    const sorter = sorters[sortMode]
    ;(Object.keys(map) as StatusKey[]).forEach((k) => map[k].sort(sorter))
    return map
  }, [filtered, sortMode])

  const onDragStart = (taskId: string, e: React.DragEvent) => {
    setDraggingId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragEnd = () => setDraggingId(null)

  const onDropTo = async (status: StatusKey, e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggingId
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const current = (task.content as TaskContent).status
    if (current === status) return
    try {
      await updateTask(id, { content: { status } })
    } catch (err) {
      console.error('Failed to move task:', err)
      alert('Failed to move task, please try again')
    } finally {
      setDraggingId(null)
    }
  }

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const openEditor = (taskMemory: TaskMemory) => {
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
    setSelected(task as any)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setSelected(null)
  }

  const handleSaveTask = async (taskId: string, data: any) => {
    await updateTask(taskId, data)
  }

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
      <div className="flex items-center justify-center min-h-screen text-red-600">Failed to load</div>
    )
  }

  return (
    <div className="py-4 sm:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-4 sm:mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                <KanbanSquare className="w-6 h-6 sm:w-7 sm:h-7" /> 看板
              </h1>
              <p className="mt-1 text-white/90 text-sm sm:text-base">拖拽卡片在列之间即可更新任务状态</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Search */}
              <div className="sm:hidden flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 flex-1 max-w-xs">
                <Search className="w-4 h-4 text-white/70" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索任务..."
                  className="text-sm outline-none bg-transparent placeholder:text-white/70 text-white flex-1"
                />
              </div>
              
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="sm:hidden flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {/* Desktop Search and Filters */}
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索任务..."
                  className="text-sm outline-none bg-transparent placeholder:text-white/70 text-white"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="text-sm outline-none bg-transparent text-white"
                >
                  <option value="all" className="text-gray-800">全部优先级</option>
                  <option value="urgent" className="text-gray-800">紧急</option>
                  <option value="high" className="text-gray-800">高</option>
                  <option value="medium" className="text-gray-800">中</option>
                  <option value="low" className="text-gray-800">低</option>
                </select>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value || 'all')}
                  className="text-sm outline-none bg-transparent text-white"
                >
                  <option value="all" className="text-gray-800">全部分类</option>
                  <option value="uncategorized" className="text-gray-800">未分类</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="text-gray-800">{c.name}</option>
                  ))}
                </select>
              </div>
              <Link href="/focus?view=work" className="btn btn-secondary bg-white text-primary-700 hover:bg-white/90 inline-flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" /> 
                <span className="hidden lg:inline">Work Mode</span>
                <span className="lg:hidden">工作</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters Panel */}
      {showMobileFilters && (
        <div className="sm:hidden mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部优先级</option>
                <option value="urgent">紧急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value || 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部分类</option>
                <option value="uncategorized">未分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Soft WIP limit hints */}
      {byStatus.in_progress.length > 3 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2 text-sm">
          当前进行中的任务已超过 3 个，建议收敛以保持专注。
        </div>
      )}
      {byStatus.pending.length > 10 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 px-4 py-2 text-sm">
          待办池已超过 10 个，考虑精简以提升清晰度。
        </div>
      )}

      {/* Mobile: Single Column Layout */}
      <div className="sm:hidden space-y-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary-600" /> {col.title}
              </h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {byStatus[col.key]?.length || 0}
              </span>
            </div>

            <div
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(col.key, e)}
              className={`min-h-[200px] rounded-xl p-2 transition-colors ${draggingId ? 'bg-white/60' : 'bg-white/40'}`}
            >
              {(byStatus[col.key] || []).map((task) => {
                const c = task.content as TaskContent
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(task.id, e)}
                    onDragEnd={onDragEnd}
                    className="card card-hover mb-3 cursor-grab active:cursor-grabbing select-none rounded-xl p-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2">
                          {c.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditor(task)
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 flex-shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" /> 编辑
                        </button>
                      </div>
                      {c.description && (
                        <div className="text-xs text-gray-600 line-clamp-2">{c.description}</div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(c.priority)}
                          {c.due_date && (
                            <span className={`${isOverdue(c.due_date) ? 'text-red-600' : ''} inline-flex items-center gap-1`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(c.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Multi Column Layout */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary-600" /> {col.title}
              </h2>
              <span className="text-xs text-gray-500">{byStatus[col.key]?.length || 0}</span>
            </div>

            <div
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(col.key, e)}
              className={`min-h-[320px] rounded-xl p-2 transition-colors ${draggingId ? 'bg-white/60' : 'bg-white/40'}`}
            >
              {(byStatus[col.key] || []).map((task) => {
                const c = task.content as TaskContent
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(task.id, e)}
                    onDragEnd={onDragEnd}
                    className="card card-hover mb-2 cursor-grab active:cursor-grabbing select-none rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-2 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {c.title}
                        </div>
                        {c.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</div>
                        )}
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(c.priority)}
                            {c.due_date && (
                              <span className={`${isOverdue(c.due_date) ? 'text-red-600' : ''} inline-flex items-center gap-1`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(c.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditor(task)
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" /> 编辑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <TaskEditor
        isOpen={editorOpen}
        onClose={closeEditor}
        task={selected}
        categories={categories}
        onSave={handleSaveTask}
        title="Edit Task"
      />
    </div>
  )
}


