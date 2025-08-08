'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTasks, useUpdateTask } from '../../hooks/useMemories'
import { TaskContent, TaskMemory } from '../../lib/api'
import { ListTodo, KanbanSquare, ChevronLeft, Clock, AlertCircle, Circle } from 'lucide-react'

type StatusKey = TaskContent['status']

const COLUMNS: Array<{ key: StatusKey; title: string; hint?: string }> = [
  { key: 'pending', title: 'Todo' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'on_hold', title: 'On Hold' },
  { key: 'completed', title: 'Done' },
]

export default function KanbanPage() {
  const { tasks, isLoading, error } = useTasks({})
  const { updateTask } = useUpdateTask()

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | TaskContent['priority']>('all')

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

  const priorityIcon = (p: TaskContent['priority']) => {
    switch (p) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
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
                      <div>
                        <div className="font-medium text-gray-900">{c.title}</div>
                        {c.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          创建于 {new Date(task.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {priorityIcon(c.priority)}
                        {c.due_date && (
                          <span className="text-xs text-gray-500">{new Date(c.due_date).toLocaleDateString('zh-CN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


