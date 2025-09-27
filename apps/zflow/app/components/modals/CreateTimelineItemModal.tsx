'use client'

import React from 'react'
import { X, Clock, Save, Loader2 } from 'lucide-react'
import { activitiesApi, categoriesApi, timelineItemsApi } from '@/lib/api'

interface CreateTimelineItemModalProps {
  isOpen: boolean
  onClose: () => void
  initialStart: string
  initialEnd: string
  selectedDate: Date
  onActivityCreated: () => void
  t: any
}

export default function CreateTimelineItemModal({
  isOpen,
  onClose,
  initialStart,
  initialEnd,
  selectedDate,
  onActivityCreated,
  t
}: CreateTimelineItemModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [categories, setCategories] = React.useState<any[]>([])
  
  // Form state - simplified to only essential fields
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  
  // Time form state
  const [startTime, setStartTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')

  React.useEffect(() => {
    if (!isOpen) return

    // Only reset text fields if user has not typed yet (avoid overwriting voice-inserted text)
    setTitle(prev => prev === '' ? '' : prev)
    setDescription(prev => prev === '' ? '' : prev)
    setCategoryId(prev => prev)

    // Initialize time inputs from props (always safe to sync time)
    setStartTime(formatDateTimeLocal(initialStart))
    setEndTime(formatDateTimeLocal(initialEnd))

    // Load categories
    loadCategories()
  }, [isOpen, initialStart, initialEnd])

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString)
    // Format to local timezone for datetime-local input
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const loadCategories = async () => {
    try {
      const categoriesData = await categoriesApi.getAll()
      setCategories(categoriesData)
    } catch (error) {
      console.warn('Categories API not available, continuing without categories:', error)
      setCategories([]) // Continue with empty categories list
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !title.trim()) return

    setLoading(true)
    try {
      // Create activity with minimal required data
      const activityData = {
        title: title.trim(),
        description: description.trim() || undefined,
        activity_type: 'other', // Default type
        category_id: categoryId || undefined,
        status: 'completed'
      }

      const newActivity = await activitiesApi.create(activityData)
      
      // Create time entry for the activity
      if (startTime && endTime) {
        const timeEntryData = {
          start_at: new Date(startTime).toISOString(),
          end_at: new Date(endTime).toISOString(),
          source: 'manual'
        }
        
        await timelineItemsApi.createTimeEntry(newActivity.id, timeEntryData)
      }

      onActivityCreated()
    } catch (error) {
      console.error('Failed to create activity:', error)
      alert(t.messages?.activityCreateFailed || 'Failed to create activity, please try again')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="absolute inset-x-4 top-16 mx-auto max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t.activity?.createActivity || 'Create Activity'}</h3>
              <p className="text-sm text-gray-500">{t.activity?.activityTime || 'Activity Time'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                {t.activity?.title || 'Title'} *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t.activity?.activityTitle || 'Activity title...'}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t.activity?.description || 'Description'}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t.activity?.activityDescription || 'Describe your activity...'}
              />
            </div>

            {/* Category - only show if categories are available */}
            {categories.length > 0 && (
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.task?.category || 'Category'}
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">{t.ui?.noCategory || 'No Category'}</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.ui?.timeRange || 'Time Range'} *
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="startTime" className="block text-xs font-medium text-gray-600 mb-1">
                    {t.ui?.startTime || 'Start time'}
                  </label>
                  <input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-xs font-medium text-gray-600 mb-1">
                    {t.ui?.endTime || 'End time'}
                  </label>
                  <input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              {t.common?.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.ui?.creating || 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t.common?.create || 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
