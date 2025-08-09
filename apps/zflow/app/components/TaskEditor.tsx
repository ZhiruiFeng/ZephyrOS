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
  title = "Edit Task" 
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

  // Update form when task data changes
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
      alert('Task title cannot be empty')
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
      alert('Save failed, please try again')
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
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[100px]"
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as Task['status'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="pending">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Category</label>
              <CategorySelector
                value={form.category_id}
                onChange={(categoryId) => setForm(f => ({ ...f, category_id: categoryId }))}
                categories={categories}
                placeholder="Select category..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Due Date</label>
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
              <label className="block text-sm text-gray-600 mb-1">Estimated Duration (minutes)</label>
              <input
                type="number"
                value={form.estimated_duration || ''}
                onChange={(e) => setForm(f => ({ ...f, estimated_duration: e.target.value ? parseInt(e.target.value) : 0 }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="e.g. 480"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Progress (%)</label>
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
              <label className="block text-sm text-gray-600 mb-1">Assignee</label>
              <input
                value={form.assignee || ''}
                onChange={(e) => setForm(f => ({ ...f, assignee: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Assignee name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tags (comma separated)</label>
              <input
                value={form.tags}
                onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="e.g. frontend, bug, urgent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[80px]"
              placeholder="Task notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
