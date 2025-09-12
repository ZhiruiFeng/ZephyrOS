'use client'

import React, { useState, useEffect } from 'react'
import { Save, X as XIcon, Star, Activity } from 'lucide-react'
import { useTranslation } from '../../../contexts/LanguageContext'
import { useCreateActivity } from '../../../hooks/useActivities'
import CategoryPickerSheet from './CategoryPickerSheet'
import TaskForm from '../../modules/tasks/forms/TaskForm'
import ActivityForm from '../../modules/activities/forms/ActivityForm'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (taskData: any) => Promise<any>
  categories: any[]
  defaultCategoryId?: string
  onSubmitAndStart?: (taskData: any) => Promise<void>
}

type TabType = 'task' | 'activity'

export default function AddTaskModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories, 
  defaultCategoryId,
  onSubmitAndStart 
}: AddTaskModalProps) {
  const { t } = useTranslation()
  const { createActivity } = useCreateActivity()
  
  const [activeTab, setActiveTab] = useState<TabType>('task')
  const [createMode, setCreateMode] = useState<'normal' | 'current'>('normal')
  
  // Task form data
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    categoryId: defaultCategoryId || '',
    dueDate: '',
    tags: '',
    joinAttention: false
  })
  
  // Activity form data
  const [activityFormData, setActivityFormData] = useState({
    title: '',
    description: '',
    activity_type: 'other',
    categoryId: defaultCategoryId || '',
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [categoryQuery, setCategoryQuery] = useState('')
  // Desktop category dropdown behavior moved inside dedicated form components

  useEffect(() => {
    if (isOpen) {
      setTaskFormData(prev => ({
        ...prev,
        categoryId: defaultCategoryId || ''
      }))
      setActivityFormData(prev => ({
        ...prev,
        categoryId: defaultCategoryId || ''
      }))
    }
  }, [isOpen, defaultCategoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (activeTab === 'task' && !taskFormData.title.trim()) return
    if (activeTab === 'activity' && !activityFormData.title.trim()) return

    setIsSubmitting(true)
    try {
      if (activeTab === 'task') {
        // Handle task creation
        const tagsArray = taskFormData.tags.split(',').map(t => t.trim()).filter(Boolean)
        const finalCategoryId = taskFormData.categoryId || (defaultCategoryId !== 'all' && defaultCategoryId !== 'uncategorized' ? defaultCategoryId : undefined)
        
        const taskData = {
          type: 'task',
          content: {
            title: taskFormData.title.trim(),
            description: taskFormData.description.trim(),
            status: createMode === 'current' ? 'in_progress' : (taskFormData.joinAttention ? 'pending' : 'on_hold'),
            priority: taskFormData.priority,
            category_id: finalCategoryId,
            due_date: createMode === 'normal' && taskFormData.dueDate ? new Date(taskFormData.dueDate).toISOString() : undefined,
          },
          tags: ['zflow', 'task', ...tagsArray]
        }

        if (createMode === 'current' && onSubmitAndStart) {
          await onSubmitAndStart(taskData)
        } else {
          await onSubmit(taskData)
        }
      } else {
        // Handle activity creation
        const finalCategoryId = activityFormData.categoryId || (defaultCategoryId !== 'all' && defaultCategoryId !== 'uncategorized' ? defaultCategoryId : undefined)
        
        const activityData = {
          title: activityFormData.title.trim(),
          description: activityFormData.description.trim() || undefined,
          activity_type: activityFormData.activity_type,
          category_id: finalCategoryId,
          status: 'active',
          tags: ['zflow', 'activity']
        }

        await createActivity(activityData)
      }

      // Reset forms
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        categoryId: defaultCategoryId || '',
        dueDate: '',
        tags: '',
        joinAttention: false
      })
      setActivityFormData({
        title: '',
        description: '',
        activity_type: 'other',
        categoryId: defaultCategoryId || '',
      })
      setCreateMode('normal')
      onClose()
    } catch (error) {
      console.error(`Failed to create ${activeTab}:`, error)
      // 在错误情况下，不自动关闭模态窗口，让用户决定是否重试
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
    // 允许在任何时候关闭模态窗口，包括提交过程中
    onClose()
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Tabs */}
        <div className="shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === 'task' ? t.task.createTask : (t.activity?.createActivity || 'Create Activity')}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex px-6 pt-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('task')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'task'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Star className="w-4 h-4" />
                {t.ui?.task || 'Task'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                {t.ui?.activity || 'Activity'}
              </button>
            </div>
          </div>
          <div className="h-4"></div>
        </div>

        {/* Form (scrollable content) */}
        <form id="addTaskForm" onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Task Form */}
          {activeTab === 'task' && (
            <TaskForm
              value={taskFormData}
              onChange={(v) => setTaskFormData(v)}
              createMode={createMode}
              onCreateModeChange={setCreateMode}
              categories={categories}
              t={t}
              onOpenMobileCategoryPicker={() => setShowCategoryPicker(true)}
            />
          )}

          {/* Activity Form */}
          {activeTab === 'activity' && (
            <ActivityForm
              value={activityFormData}
              onChange={(v) => setActivityFormData(v)}
              categories={categories}
              t={t}
              onOpenMobileCategoryPicker={() => setShowCategoryPicker(true)}
            />
          )}

        </form>

        {/* Sticky footer actions */}
        <div className="shrink-0 sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              Shortcuts: Ctrl+Enter to Save, Esc to Cancel
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                form="addTaskForm"
                disabled={
                  (activeTab === 'task' && !taskFormData.title.trim()) || 
                  (activeTab === 'activity' && !activityFormData.title.trim()) || 
                  isSubmitting
                }
                className={`px-5 py-2.5 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  createMode === 'current' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 
                  `${t.common.create}...` : 
                  activeTab === 'task' 
                    ? (createMode === 'current' ? t.task.createAndStart : t.task.createTask)
                    : (t.activity?.createActivity || 'Create Activity')
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Category Picker Sheet */}
      <CategoryPickerSheet
        open={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        categories={categories}
        query={categoryQuery}
        setQuery={setCategoryQuery}
        onSelect={(val: string) => {
          if (activeTab === 'task') {
            setTaskFormData(prev => ({ ...prev, categoryId: val }))
          } else {
            setActivityFormData(prev => ({ ...prev, categoryId: val }))
          }
        }}
        t={t}
      />
    </div>
  )
}

// Category bottom sheet modal
// Rendered at end of component tree for containment within AddTaskModal backdrop
// CategoryPickerSheet moved to its own file for reuse
