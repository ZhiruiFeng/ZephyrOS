'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, Tag, Save, X as XIcon, Search, Folder, ChevronDown, Star, Activity } from 'lucide-react'
import { useTranslation } from '../../contexts/LanguageContext'
import { useCreateActivity } from '../../hooks/useActivities'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (taskData: any) => Promise<void>
  categories: any[]
  defaultCategoryId?: string
  onSubmitAndStart?: (taskData: any) => Promise<void>
}

type TabType = 'task' | 'activity'

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
  const [showDesktopCategory, setShowDesktopCategory] = useState(false)
  const [desktopCategoryQuery, setDesktopCategoryQuery] = useState('')
  const desktopCatRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showDesktopCategory) return
      const target = e.target as Node
      if (desktopCatRef.current && !desktopCatRef.current.contains(target)) {
        setShowDesktopCategory(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDesktopCategory(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [showDesktopCategory])

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
              {activeTab === 'task' ? t.task.createTask : '创建活动'}
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
                任务
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
                活动
              </button>
            </div>
          </div>
          <div className="h-4"></div>
        </div>

        {/* Form (scrollable content) */}
        <form id="addTaskForm" onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Task Form */}
          {activeTab === 'task' && (
            <>
              {/* Create Mode Selector */}
              <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreateMode('normal')}
                className={`p-3 rounded-lg border transition-all ${
                  createMode === 'normal' 
                    ? 'bg-white border-blue-500 text-blue-600 shadow-sm' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="text-sm font-medium">{t.task.createTask}</div>
                <div className="text-xs text-gray-500 mt-1">{t.task.createNormalTaskDesc}</div>
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('current')}
                className={`p-3 rounded-lg border transition-all ${
                  createMode === 'current' 
                    ? 'bg-white border-green-500 text-green-600 shadow-sm' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="text-sm font-medium">{t.task.createCurrentTask}</div>
                <div className="text-xs text-gray-500 mt-1">{t.task.createCurrentTaskDesc}</div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.task.title} *
            </label>
                          <input
                type="text"
                value={taskFormData.title}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
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
              value={taskFormData.description}
              onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t.task.taskDescription}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Priority and Category - Improved, touch-friendly */}
          <div className={`grid grid-cols-1 ${createMode === 'normal' ? 'md:grid-cols-2' : ''} gap-4`}>
            {/* Priority: 4-step slider - hidden in current mode */}
            {createMode === 'normal' && <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.priority}
              </label>
              {(() => {
                const levels = [
                  { key: 'low', label: t.task.priorityLow, dot: 'bg-gray-400' },
                  { key: 'medium', label: t.task.priorityMedium, dot: 'bg-blue-500' },
                  { key: 'high', label: t.task.priorityHigh, dot: 'bg-orange-500' },
                  { key: 'urgent', label: t.task.priorityUrgent, dot: 'bg-red-600' },
                ] as const
                const idxOf = (k: any) => (k === 'low' ? 0 : k === 'medium' ? 1 : k === 'high' ? 2 : 3)
                const keyOf = (i: number) => (i <= 0 ? 'low' : i === 1 ? 'medium' : i === 2 ? 'high' : 'urgent') as typeof levels[number]['key']
                const value = idxOf(taskFormData.priority)
                return (
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={value}
                      onChange={(e) => setTaskFormData(prev => ({ ...prev, priority: keyOf(parseInt(e.target.value, 10)) as any }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="mt-2 grid grid-cols-4 items-center">
                      {levels.map((lvl, i) => {
                        const active = i === value
                        return (
                          <button
                            key={lvl.key}
                            type="button"
                            onClick={() => setTaskFormData(prev => ({ ...prev, priority: lvl.key as any }))}
                            className="flex flex-col items-center gap-1"
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${lvl.dot} ${active ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`} />
                            <span className={`text-[11px] ${active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{lvl.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>}
            {/* Category: searchable picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.category}
              </label>
              {/* Desktop: custom searchable dropdown */}
              <div className="relative hidden sm:block" ref={desktopCatRef}>
                <button
                  type="button"
                  onClick={() => setShowDesktopCategory((v) => !v)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    {(() => {
                      const current = categories.find((c: any) => c.id === taskFormData.categoryId)
                      if (current) {
                        return (
                          <>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: current.color }} />
                            <span className="text-sm">{current.name}</span>
                          </>
                        )
                      }
                      return <span className="text-gray-500 text-sm">{t.ui.noCategory}</span>
                    })()}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDesktopCategory ? 'rotate-180' : ''}`} />
                </button>
                {showDesktopCategory && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-3">
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={desktopCategoryQuery}
                        onChange={(e) => setDesktopCategoryQuery(e.target.value)}
                        placeholder={t.ui.searchTasks}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-64 overflow-auto space-y-1">
                      <button
                        onClick={() => { setTaskFormData(prev => ({ ...prev, categoryId: '' })); setShowDesktopCategory(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        <span className="w-3 h-3 rounded-full bg-gray-300" />
                        <span className="text-gray-700">{t.ui.noCategory}</span>
                      </button>
                      {categories
                        .filter((c: any) => !desktopCategoryQuery || c.name.toLowerCase().includes(desktopCategoryQuery.toLowerCase()))
                        .map((cat: any) => (
                        <button
                          key={cat.id}
                          onClick={() => { setTaskFormData(prev => ({ ...prev, categoryId: cat.id })); setShowDesktopCategory(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="truncate">{cat.name}</span>
                        </button>
                      ))}
                      {categories.filter((c: any) => !desktopCategoryQuery || c.name.toLowerCase().includes(desktopCategoryQuery.toLowerCase())).length === 0 && (
                        <div className="text-center py-4 text-xs text-gray-500">{t.common.none}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile: bottom sheet trigger */}
              <button
                type="button"
                onClick={() => setShowCategoryPicker(true)}
                className="sm:hidden w-full px-4 py-3 border border-gray-300 rounded-xl text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  {(() => {
                    const current = categories.find((c: any) => c.id === taskFormData.categoryId)
                    if (current) {
                      return (
                        <>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: current.color }} />
                          <span className="text-base sm:text-sm">{current.name}</span>
                        </>
                      )
                    }
                    return <span className="text-gray-500 text-base sm:text-sm">{t.ui.noCategory}</span>
                  })()}
                </span>
                <Folder className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Due Date and Tags - hidden in current mode */}
          {createMode === 'normal' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.task.dueDate}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, dueDate: e.target.value }))}
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
                  value={taskFormData.tags}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder={t.ui.tagsPlaceholder}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>}

          {/* Join Attention Checkbox - hidden in current mode */}
          {createMode === 'normal' && <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <input
              type="checkbox"
              id="joinAttention"
              checked={taskFormData.joinAttention}
              onChange={(e) => setTaskFormData(prev => ({ ...prev, joinAttention: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="joinAttention" className="text-sm text-gray-700">
              {t.task.joinAttentionPool}
            </label>
          </div>}
            </>
          )}

          {/* Activity Form */}
          {activeTab === 'activity' && (
            <>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题 *
                </label>
                <input
                  type="text"
                  value={activityFormData.title}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入活动名称"
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
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, description: e.target.value }))}
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
                      onClick={() => setActivityFormData(prev => ({ ...prev, activity_type: type.value }))}
                      className={`p-3 rounded-xl border transition-all text-center ${
                        activityFormData.activity_type === type.value
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

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                {/* Desktop: custom searchable dropdown */}
                <div className="relative hidden sm:block" ref={desktopCatRef}>
                  <button
                    type="button"
                    onClick={() => setShowDesktopCategory((v) => !v)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      {(() => {
                        const current = categories.find((c: any) => c.id === activityFormData.categoryId)
                        if (current) {
                          return (
                            <>
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: current.color }} />
                              <span className="text-sm">{current.name}</span>
                            </>
                          )
                        }
                        return <span className="text-gray-500 text-sm">无分类</span>
                      })()}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDesktopCategory ? 'rotate-180' : ''}`} />
                  </button>
                  {showDesktopCategory && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-3">
                      <div className="relative mb-2">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={desktopCategoryQuery}
                          onChange={(e) => setDesktopCategoryQuery(e.target.value)}
                          placeholder="搜索分类"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="max-h-64 overflow-auto space-y-1">
                        <button
                          onClick={() => { setActivityFormData(prev => ({ ...prev, categoryId: '' })); setShowDesktopCategory(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          <span className="w-3 h-3 rounded-full bg-gray-300" />
                          <span className="text-gray-700">无分类</span>
                        </button>
                        {categories
                          .filter((c: any) => !desktopCategoryQuery || c.name.toLowerCase().includes(desktopCategoryQuery.toLowerCase()))
                          .map((cat: any) => (
                          <button
                            key={cat.id}
                            onClick={() => { setActivityFormData(prev => ({ ...prev, categoryId: cat.id })); setShowDesktopCategory(false) }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="truncate">{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile: bottom sheet trigger */}
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(true)}
                  className="sm:hidden w-full px-4 py-3 border border-gray-300 rounded-xl text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    {(() => {
                      const current = categories.find((c: any) => c.id === activityFormData.categoryId)
                      if (current) {
                        return (
                          <>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: current.color }} />
                            <span className="text-base sm:text-sm">{current.name}</span>
                          </>
                        )
                      }
                      return <span className="text-gray-500 text-base sm:text-sm">无分类</span>
                    })()}
                  </span>
                  <Folder className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </>
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
                    : '创建活动'
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
export function CategoryPickerSheet({
  open,
  onClose,
  categories,
  query,
  setQuery,
  onSelect,
  t,
}: any) {
  if (!open) return null
  const filtered = (categories || []).filter((c: any) =>
    !query || c.name.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className="fixed inset-0 z-[60] sm:z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 max-h-[80vh]">
        <div className="mx-auto w-10 h-1.5 bg-gray-300 rounded-full mb-3" />
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.ui.searchTasks}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          <button
            onClick={() => { onSelect(''); onClose() }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border hover:bg-gray-50"
          >
            <span className="text-base sm:text-sm text-gray-700">{t.ui.noCategory}</span>
          </button>
          {filtered.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { onSelect(cat.id); onClose() }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                <span className="text-base sm:text-sm">{cat.name}</span>
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">{t.common.none}</div>
          )}
        </div>
      </div>
    </div>
  )
}
