'use client'

import React, { useState, useEffect } from 'react'
import { X as XIcon } from 'lucide-react'
import { Task, TaskForm, TaskEditorProps, Category } from '../types/task'
import CategorySelector from './CategorySelector'

const X = XIcon

export default function TaskEditor({ 
  isOpen, 
  onClose, 
  task, 
  categories = [],
  onSave, 
  title = "编辑任务" 
}: TaskEditorProps) {
  const [form, setForm] = useState<TaskForm>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    category_id: '',
    due_date: '',
    estimated_duration: 0,
    progress: 0,
    assignee: '',
    notes: '',
    tags: ''
  })

  // 当任务数据变化时，更新表单
  useEffect(() => {
    console.log('TaskEditor received task:', task);
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        category_id: task.category_id || '',
        due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
        estimated_duration: task.estimated_duration || 0,
        progress: task.progress || 0,
        assignee: task.assignee || '',
        notes: task.notes || '',
        tags: (task.tags || []).filter((tag: string) => !['zflow', 'task'].includes(tag)).join(', ')
      })
    }
  }, [task])

  const handleSave = async () => {
    if (!task) return

    if (!form.title.trim()) {
      alert('任务标题不能为空')
      return
    }

    try {
      const tagsArray = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const saveData = {
        content: {
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          category_id: form.category_id || undefined,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
          estimated_duration: form.estimated_duration || undefined,
          progress: form.progress || 0,
          assignee: form.assignee || undefined,
          notes: form.notes || undefined,
        },
        tags: ['zflow', 'task', ...tagsArray]
      };

      console.log('TaskEditor saving with data:', JSON.stringify(saveData, null, 2));

      await onSave(task.id, saveData)
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
              <label className="block text-sm text-gray-600 mb-1">分类</label>
              <CategorySelector
                value={form.category_id}
                onChange={(categoryId) => setForm(f => ({ ...f, category_id: categoryId }))}
                categories={categories}
                placeholder="选择分类..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">截止时间</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">预计时长（分钟）</label>
              <input
                type="number"
                value={form.estimated_duration || ''}
                onChange={(e) => setForm(f => ({ ...f, estimated_duration: e.target.value ? parseInt(e.target.value) : 0 }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="如：480"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">进度（%）</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progress || 0}
                onChange={(e) => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">负责人</label>
              <input
                value={form.assignee || ''}
                onChange={(e) => setForm(f => ({ ...f, assignee: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="负责人姓名"
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

          <div>
            <label className="block text-sm text-gray-600 mb-1">备注</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[80px]"
              placeholder="任务备注..."
            />
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
