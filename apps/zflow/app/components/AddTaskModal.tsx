'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, Tag, Save, X as XIcon } from 'lucide-react'
import { useTranslation } from '../../contexts/LanguageContext'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (taskData: any) => Promise<void>
  categories: any[]
  defaultCategoryId?: string
}

export default function AddTaskModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories, 
  defaultCategoryId 
}: AddTaskModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    categoryId: defaultCategoryId || '',
    dueDate: '',
    tags: '',
    joinAttention: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        categoryId: defaultCategoryId || ''
      }))
    }
  }, [isOpen, defaultCategoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      const finalCategoryId = formData.categoryId || (defaultCategoryId !== 'all' && defaultCategoryId !== 'uncategorized' ? defaultCategoryId : undefined)
      
      await onSubmit({
        type: 'task',
        content: {
          title: formData.title.trim(),
          description: formData.description.trim(),
          status: (formData.joinAttention ? 'pending' : 'on_hold'),
          priority: formData.priority,
          category_id: finalCategoryId,
          due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        },
        tags: ['zflow', 'task', ...tagsArray]
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        categoryId: defaultCategoryId || '',
        dueDate: '',
        tags: '',
        joinAttention: false
      })
      onClose()
    } catch (error) {
      console.error('Failed to create task:', error)
      // Add error handling here
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t.task.createTask}</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.task.title} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t.task.taskTitle}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.task.description}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t.task.taskDescription}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.priority}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">{t.task.priorityLow} Priority</option>
                <option value="medium">{t.task.priorityMedium} Priority</option>
                <option value="high">{t.task.priorityHigh} Priority</option>
                <option value="urgent">{t.task.priorityUrgent}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.category}
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t.ui.noCategory}</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.dueDate}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.tags}
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder={t.ui.tagsPlaceholder}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Join Attention Checkbox */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <input
              type="checkbox"
              id="joinAttention"
              checked={formData.joinAttention}
              onChange={(e) => setFormData(prev => ({ ...prev, joinAttention: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="joinAttention" className="text-sm text-gray-700">
              {t.task.joinAttentionPool}
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Shortcuts: Ctrl+Enter to Save, Esc to Cancel
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={!formData.title.trim() || isSubmitting}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? `${t.common.create}...` : t.task.createTask}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
