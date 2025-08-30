'use client'

import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

// Activity types with icons and labels
const ACTIVITY_TYPES = [
  { value: 'exercise', label: '运动', icon: '🏃‍♂️' },
  { value: 'meditation', label: '冥想', icon: '🧘‍♀️' },
  { value: 'reading', label: '阅读', icon: '📚' },
  { value: 'music', label: '音乐', icon: '🎵' },
  { value: 'socializing', label: '社交', icon: '👥' },
  { value: 'gaming', label: '游戏', icon: '🎮' },
  { value: 'walking', label: '散步', icon: '🚶‍♀️' },
  { value: 'cooking', label: '烹饪', icon: '👨‍🍳' },
  { value: 'rest', label: '休息', icon: '😴' },
  { value: 'creative', label: '创作', icon: '🎨' },
  { value: 'learning', label: '学习', icon: '📖' },
  { value: 'other', label: '其他', icon: '✨' },
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
          <h2 className="text-xl font-semibold text-gray-900">编辑活动</h2>
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
              标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="活动名称"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="描述一下这个活动..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              活动类型
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
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">无分类</option>
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
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              地点
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="活动地点"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="活动备注或心得..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              Ctrl+Enter 保存, Esc 取消
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                form="activityForm"
                onClick={handleSubmit}
                disabled={!formData.title.trim() || isSaving}
                className="px-5 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
