'use client'

import React, { useState, useEffect, Suspense } from 'react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { Task, TaskForm, TaskEditorProps } from '../types/task'

const Lazy = (Comp: React.LazyExoticComponent<React.ComponentType<any>>) => (props: any) => (
  <Suspense fallback={null}>
    <Comp {...props} />
  </Suspense>
)
const X = Lazy(React.lazy(dynamicIconImports['x'] as any))

export default function TaskEditor({ 
  isOpen, 
  onClose, 
  task, 
  onSave, 
  title = "编辑任务" 
}: TaskEditorProps) {
  const [form, setForm] = useState<TaskForm>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    tags: ''
  })

  // 当任务数据变化时，更新表单
  useEffect(() => {
    if (task) {
      const taskContent = task.content as Task
      setForm({
        title: taskContent.title,
        description: taskContent.description || '',
        status: taskContent.status,
        priority: taskContent.priority,
        due_date: taskContent.due_date ? new Date(taskContent.due_date).toISOString().slice(0, 16) : '',
        tags: (task.tags || []).filter((tag: string) => !['zflow', 'task'].includes(tag)).join(', ')
      })
    }
  }, [task])

  const handleSave = async () => {
    if (!task) return

    try {
      const tagsArray = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      await onSave(task.id, {
        content: {
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
        },
        tags: ['zflow', 'task', ...tagsArray]
      })
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
      alert('保存失败，请重试')
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">标题</label>
            <input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="输入任务标题"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[100px]"
              placeholder="输入任务描述"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">状态</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as Task['status'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="pending">待办</option>
                <option value="in_progress">进行中</option>
                <option value="on_hold">搁置</option>
                <option value="completed">已完成</option>
                <option value="cancelled">取消</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">优先级</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="urgent">紧急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">截止时间</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">标签（逗号分隔）</label>
              <input
                value={form.tags}
                onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="如：frontend, bug, urgent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700"
            >
              取消
            </button>
            <button 
              onClick={handleSave} 
              className="px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
