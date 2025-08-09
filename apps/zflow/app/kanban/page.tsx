'use client'

import React, { useMemo, useState, useMemo as useReactMemo, Suspense } from 'react'
import Link from 'next/link'
import { useTasks, useUpdateTask } from '../../hooks/useMemories'
import { TaskContent, TaskMemory, categoriesApi } from '../../lib/api'
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
import TaskEditor from '../components/TaskEditor'
import { getPriorityIcon } from '../components/TaskIcons'
import { 
  isOverdue, 
  formatDate,
  formatTagsString
} from '../utils/taskUtils'

type StatusKey = TaskContent['status']

const COLUMNS: Array<{ key: StatusKey; title: string; hint?: string }> = [
  { key: 'pending', title: 'Todo' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'on_hold', title: 'On Hold' },
  { key: 'completed', title: 'Done' },
  { key: 'cancelled', title: 'Cancelled' },
]

export default function KanbanPage() {
  const { tasks, isLoading, error } = useTasks({})
  const { updateTask } = useUpdateTask()
  const [categories, setCategories] = useState<any[]>([])

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | TaskContent['priority']>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<TaskMemory | null>(null)

  // 加载分类
  React.useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
  }, [])

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const c = t.content as TaskContent
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      return matchSearch && matchPriority
    })
  }, [tasks, search, filterPriority])

  const byStatus = useMemo<Record<StatusKey, TaskMemory[]>>(() => {
    const map = {
      pending: [] as TaskMemory[],
      in_progress: [] as TaskMemory[],
      completed: [] as TaskMemory[],
      cancelled: [] as TaskMemory[],
      on_hold: [] as TaskMemory[],
    }
    for (const t of filtered) {
      const s = (t.content as TaskContent).status
      map[s]?.push(t)
    }
    return map
  }, [filtered])

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
      alert('移动任务失败，请重试')
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">加载失败</div>
    )
  }

  return (
    <div className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <KanbanSquare className="w-7 h-7" /> 看板
          </h1>
          <p className="text-gray-600">拖拽卡片在不同列间以更新状态</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索任务..."
              className="text-sm outline-none"
            />
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="text-sm outline-none"
            >
              <option value="all">全部优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <Link href="/" className="btn btn-secondary flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> 返回列表
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="bg-gray-100 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary-600" /> {col.title}
              </h2>
              <span className="text-xs text-gray-500">{byStatus[col.key]?.length || 0}</span>
            </div>

            <div
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(col.key, e)}
              className={`min-h-[300px] rounded-md p-2 transition-colors ${
                draggingId ? 'bg-gray-50' : 'bg-gray-100'
              }`}
            >
              {(byStatus[col.key] || []).map((task) => {
                const c = task.content as TaskContent
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(task.id, e)}
                    onDragEnd={onDragEnd}
                    className="card mb-2 cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-2">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {c.title}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{c.status}</span>
                        </div>
                        {c.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {task.tags?.slice(0, 4).map((tg) => (
                            <span key={tg} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                              <Tag className="w-3 h-3" /> {tg}
                            </span>
                          ))}
                          {task.tags && task.tags.length > 4 && (
                            <span className="text-[10px] text-gray-500">+{task.tags.length - 4}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          创建于 {formatDate(task.created_at)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditor(task)
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" /> 编辑
                        </button>
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(c.priority)}
                          {c.due_date && (
                            <span className={`text-xs inline-flex items-center gap-1 ${isOverdue(c.due_date) ? 'text-red-600' : 'text-gray-500'}`}>
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

      {/* 使用共享的TaskEditor组件 */}
      <TaskEditor
        isOpen={editorOpen}
        onClose={closeEditor}
        task={selected}
        categories={categories}
        onSave={handleSaveTask}
        title="编辑任务"
      />
    </div>
  )
}


