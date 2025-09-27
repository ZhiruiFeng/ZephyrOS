'use client'

import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

// Activity types with icons and labels
const ACTIVITY_TYPES = [
  { value: 'exercise', labelKey: 'typeExercise', icon: '🏃‍♂️' },
  { value: 'meditation', labelKey: 'typeMeditation', icon: '🧘‍♀️' },
  { value: 'reading', labelKey: 'typeReading', icon: '📚' },
  { value: 'music', labelKey: 'typeMusic', icon: '🎵' },
  { value: 'socializing', labelKey: 'typeSocial', icon: '👥' },
  { value: 'gaming', labelKey: 'typeGaming', icon: '🎮' },
  { value: 'walking', labelKey: 'typeWalking', icon: '🚶‍♀️' },
  { value: 'cooking', labelKey: 'typeCooking', icon: '👨‍🍳' },
  { value: 'rest', labelKey: 'typeRest', icon: '😴' },
  { value: 'creative', labelKey: 'typeCreative', icon: '🎨' },
  { value: 'learning', labelKey: 'typeLearning', icon: '📖' },
  { value: 'other', labelKey: 'typeOther', icon: '✨' },
]

interface ActivityEditorProps {
  isOpen: boolean
  onClose: () => void
  activity: any | null
  categories: any[]
  onSave: (activityId: string, updates: any) => Promise<void>
}

export default function ActivityEditor({ 
  isOpen, 
  onClose, 
  activity, 
  categories = [],
  onSave
}: ActivityEditorProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activity_type: 'other',
    category_id: '',
    status: 'active',
    notes: '',
    location: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (activity) {
      setFormData({
        title: activity.title || '',
        description: activity.description || '',
        activity_type: activity.activity_type || 'other',
        category_id: activity.category_id || '',
        status: activity.status || 'active',
        notes: activity.notes || '',
        location: activity.location || '',
      })
    }
  }, [activity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !activity) return

    setIsSaving(true)
    try {
      await onSave(activity.id, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        activity_type: formData.activity_type,
        category_id: formData.category_id || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        location: formData.location.trim() || undefined,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save activity:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">{t.activity.editActivity}</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.activity.title} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t.activity.activityTitle}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.activity.description}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t.activity.activityDescription}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.activity.activityType}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, activity_type: type.value }))}
                  className={`p-3 rounded-xl border transition-all text-center ${
                    formData.activity_type === type.value
                      ? 'bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{(t.activity as any)[type.labelKey] ?? type.labelKey}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.category}
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t.ui.noCategory}</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.activity.status}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">{t.task.statusInProgress}</option>
                <option value="completed">{t.task.statusCompleted}</option>
                <option value="cancelled">{t.task.statusCancelled}</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.activity.location}
              </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder={t.activity.locationPlaceholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.activity.notes}
              </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t.activity.notesPlaceholder}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              Ctrl+Enter {t.common.save}, Esc {t.common.cancel}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                form="activityForm"
                onClick={handleSubmit}
                disabled={!formData.title.trim() || isSaving}
                className="px-5 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? (t.ui?.saving ?? 'Saving...') : t.common.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
