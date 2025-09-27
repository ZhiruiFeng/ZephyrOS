'use client'

import React, { useState, useEffect } from 'react'
import { X as XIcon } from 'lucide-react'
import { Task, Category } from '@/types/domain/task'
import { TaskForm, TaskEditorProps } from '@/types/ui/forms'
import { CategorySelector } from '@/shared/components'
import { useTranslation } from '@/contexts/LanguageContext'
import { toLocal, toUTC } from '@/app/utils/timeUtils'

const X = XIcon

export default function TaskEditor({ 
  isOpen, 
  onClose, 
  task, 
  categories = [],
  onSave, 
  title 
}: TaskEditorProps) {
  const { t } = useTranslation()
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
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        category_id: task.category_id || '',
        due_date: task.due_date ? toLocal(task.due_date, { format: 'datetime-local' }) : '',
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
      alert(t.messages?.titleRequired ?? 'Title is required')
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
          due_date: form.due_date ? toUTC(form.due_date) : undefined,
          estimated_duration: form.estimated_duration || undefined,
          progress: form.progress || 0,
          assignee: form.assignee || undefined,
          notes: form.notes || undefined,
        },
        tags: ['zflow', 'task', ...tagsArray]
      };

      await onSave(task.id, saveData)
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
      alert(t.messages?.taskUpdateFailed ?? 'Save failed, please try again')
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{title || t.task.editTask}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t.task.title}</label>
            <input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder={t.task.taskTitle}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">{t.task.description}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[100px]"
              placeholder={t.task.taskDescription}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t.task.status}</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as Task['status'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="pending">{t.task.statusPending}</option>
                <option value="in_progress">{t.task.statusInProgress}</option>
                <option value="on_hold">{t.task.statusOnHold}</option>
                <option value="completed">{t.task.statusCompleted}</option>
                <option value="cancelled">{t.task.statusCancelled}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t.task.priority}</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="urgent">{t.task.priorityUrgent}</option>
                <option value="high">{t.task.priorityHigh}</option>
                <option value="medium">{t.task.priorityMedium}</option>
                <option value="low">{t.task.priorityLow}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t.task.category}</label>
              <CategorySelector
                value={form.category_id}
                onChange={(categoryId) => setForm(f => ({ ...f, category_id: categoryId }))}
                categories={categories}
                placeholder={t.task.selectCategory}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t.task.dueDate}</label>
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
              <label className="block text-sm text-gray-600 mb-1">{t.task.estimatedDuration}</label>
              <input
                type="number"
                value={form.estimated_duration || ''}
                onChange={(e) => setForm(f => ({ ...f, estimated_duration: e.target.value ? parseInt(e.target.value) : 0 }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder={t.task.estimatedDurationPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t.task.progress}</label>
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
              <label className="block text-sm text-gray-600 mb-1">{t.task.assignee}</label>
              <input
                value={form.assignee || ''}
                onChange={(e) => setForm(f => ({ ...f, assignee: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder={t.task.assigneePlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t.task.tagsField}</label>
              <input
                value={form.tags}
                onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder={t.ui.tagsPlaceholder}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">{t.task.notes}</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[80px]"
              placeholder={t.task.notesPlaceholder}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700"
            >
              {t.common.cancel}
            </button>
            <button 
              onClick={handleSave} 
              className="px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700"
            >
              {t.common.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
