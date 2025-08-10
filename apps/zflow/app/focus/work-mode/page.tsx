'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTasks, useUpdateTask } from '../../../hooks/useMemories'
import { useAuth } from '../../../contexts/AuthContext'
import { usePrefs } from '../../../contexts/PrefsContext'
import LoginPage from '../../components/LoginPage'
import { TaskMemory, categoriesApi, TaskContent } from '../../../lib/api'
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Save, Settings, Calendar, Clock, User, Tag, KanbanSquare, PanelLeftClose, PanelLeftOpen, X, Menu } from 'lucide-react'
import MarkdownEditor from './MarkdownEditor'
import { Category } from '../../types/task'

interface TaskWithCategory extends TaskMemory {
  category?: Category
  category_id?: string
}

export default function WorkModePage() {
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? {} : null)
  const { updateTask } = useUpdateTask()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskWithCategory | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'current' | 'backlog'>('current')
  const [showTaskInfo, setShowTaskInfo] = useState(false)
  const [editingTaskInfo, setEditingTaskInfo] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [taskInfo, setTaskInfo] = useState({
    title: '',
    description: '',
    status: 'pending' as TaskContent['status'],
    priority: 'medium' as TaskContent['priority'],
    progress: 0,
    due_date: '',
    estimated_duration: 0,
    assignee: '',
    tags: [] as string[]
  })

  // Load categories
  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
  }, [])

  // Auto-hide mobile sidebar when task is selected on mobile
  useEffect(() => {
    if (selectedTask && window.innerWidth < 1024) {
      setMobileSidebarOpen(false)
    }
  }, [selectedTask])

  // Filter tasks based on view mode
  const filteredTasks = React.useMemo(() => {
    // Skip filtering on server side to avoid hydration mismatch
    if (typeof window === 'undefined') return tasks
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    return tasks.filter((task) => {
      const content = task.content as TaskContent
      const dueDate = content.due_date ? new Date(content.due_date) : null
      
      if (viewMode === 'current') {
        // Current: tasks due today or overdue, or in progress
        return content.status === 'in_progress' || 
               (dueDate && dueDate <= today) ||
               content.status === 'pending'
      } else {
        // Backlog: tasks on hold
        return content.status === 'on_hold'
      }
    })
  }, [tasks, viewMode])

  // Group tasks by category
  const tasksByCategory = React.useMemo(() => {
    const grouped: Record<string, TaskWithCategory[]> = {}
    const uncategorized: TaskWithCategory[] = []

    filteredTasks.forEach((task) => {
      const taskWithCategory = task as TaskWithCategory
      const categoryId = task.category_id || task.content.category_id
      
      if (categoryId) {
        const category = categories.find(c => c.id === categoryId)
        taskWithCategory.category = category
        if (!grouped[categoryId]) {
          grouped[categoryId] = []
        }
        grouped[categoryId].push(taskWithCategory)
      } else {
        uncategorized.push(taskWithCategory)
      }
    })

    return { grouped, uncategorized }
  }, [filteredTasks, categories])

  // Auto-expand categories with tasks
  useEffect(() => {
    const newExpanded = new Set<string>()
    Object.keys(tasksByCategory.grouped).forEach(categoryId => {
      if (tasksByCategory.grouped[categoryId].length > 0) {
        newExpanded.add(categoryId)
      }
    })
    setExpandedCategories(newExpanded)
  }, [tasksByCategory])

  // Load notes and task info when task is selected
  useEffect(() => {
    if (selectedTask) {
      setNotes(selectedTask.content.notes || '')
      setTaskInfo({
        title: selectedTask.content.title || '',
        description: selectedTask.content.description || '',
        status: selectedTask.content.status || 'pending',
        priority: selectedTask.content.priority || 'medium',
        progress: selectedTask.content.progress || 0,
        due_date: selectedTask.content.due_date || '',
        estimated_duration: selectedTask.content.estimated_duration || 0,
        assignee: selectedTask.content.assignee || '',
        tags: selectedTask.tags || []
      })
    } else {
      setNotes('')
      setTaskInfo({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        progress: 0,
        due_date: '',
        estimated_duration: 0,
        assignee: '',
        tags: []
      })
    }
  }, [selectedTask])

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleSaveNotes = async () => {
    if (!selectedTask) return
    
    setIsSaving(true)
    try {
      // 只更新notes字段，避免传递错误的category字段
      await updateTask(selectedTask.id, { 
        content: { 
          notes 
        } 
      })
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveTaskInfo = async () => {
    if (!selectedTask) return
    
    setIsSaving(true)
    try {
      await updateTask(selectedTask.id, { 
        content: {
          title: taskInfo.title,
          description: taskInfo.description,
          status: taskInfo.status,
          priority: taskInfo.priority,
          progress: taskInfo.progress,
          due_date: taskInfo.due_date || undefined,
          estimated_duration: taskInfo.estimated_duration || undefined,
          assignee: taskInfo.assignee || undefined
        },
        tags: taskInfo.tags
      })
      setEditingTaskInfo(false)
    } catch (error) {
      console.error('Failed to save task info:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addTag = () => {
    const tag = prompt('请输入标签:')
    if (tag && tag.trim()) {
      setTaskInfo(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTaskInfo(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />
  }

  // Show loading while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">Failed to load</div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-200px)] lg:h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Task Explorer */}
      <div className={`
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 border-r border-gray-200 flex flex-col bg-white
        transition-transform duration-300 ease-in-out lg:transition-none
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-lg font-semibold text-gray-900">任务资源管理器</h2>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-gray-900">任务资源管理器</h2>
            <p className="text-sm text-gray-600 mt-1">选择任务开始专注工作</p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="mt-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setViewMode('current')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'current'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                当前
              </button>
              <button
                onClick={() => setViewMode('backlog')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'backlog'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Backlog
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {viewMode === 'current' ? '显示当前和过期的任务' : '显示暂停的任务'}
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Uncategorized Tasks */}
          {tasksByCategory.uncategorized.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => toggleCategory('uncategorized')}
                className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                {expandedCategories.has('uncategorized') ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <Folder className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">未分类</span>
                <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {tasksByCategory.uncategorized.length}
                </span>
              </button>
              
              {expandedCategories.has('uncategorized') && (
                <div className="ml-6 mt-2 space-y-1">
                  {tasksByCategory.uncategorized.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`flex items-center gap-2 w-full text-left p-2 rounded-md text-sm transition-colors ${
                        selectedTask?.id === task.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{task.content.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categorized Tasks */}
          {categories.map((category) => {
            const categoryTasks = tasksByCategory.grouped[category.id] || []
            if (categoryTasks.length === 0) return null

            return (
              <div key={category.id} className="mb-6">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Folder className="w-4 h-4" style={{ color: category.color }} />
                  <span className="font-medium text-gray-700">{category.name}</span>
                  <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {categoryTasks.length}
                  </span>
                </button>
                
                {expandedCategories.has(category.id) && (
                  <div className="ml-6 mt-2 space-y-1">
                    {categoryTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`flex items-center gap-2 w-full text-left p-2 rounded-md text-sm transition-colors ${
                          selectedTask?.id === task.id
                            ? 'bg-primary-100 text-primary-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span className="truncate">{task.content.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Content - Markdown Editor */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Menu className="w-4 h-4" />
              任务列表
            </button>
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              title={sidebarVisible ? "隐藏侧边栏" : "显示侧边栏"}
            >
              {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              {sidebarVisible ? "隐藏侧边栏" : "显示侧边栏"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/focus?view=kanban"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
            >
              <KanbanSquare className="w-4 h-4" />
              <span className="hidden sm:inline">切换到看板</span>
              <span className="sm:hidden">看板</span>
            </Link>
          </div>
        </div>

        {selectedTask ? (
          <>
            {/* Task Header */}
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 break-words">{selectedTask.content.title}</h1>
                  {selectedTask.content.description && (
                    <p className="text-gray-600 mt-2 break-words">{selectedTask.content.description}</p>
                  )}
                  {selectedTask.category && (
                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: selectedTask.category.color }}
                      />
                      <span className="text-sm text-gray-500">{selectedTask.category.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowTaskInfo(!showTaskInfo)}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">{showTaskInfo ? '隐藏' : '显示'}任务信息</span>
                    <span className="sm:hidden">{showTaskInfo ? '隐藏' : '信息'}</span>
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">{isSaving ? '保存中...' : '保存笔记'}</span>
                    <span className="sm:hidden">{isSaving ? '保存中' : '保存'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Task Info Section */}
            {showTaskInfo && (
              <div className="p-4 lg:p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    任务信息
                  </h3>
                  <div className="flex items-center gap-2">
                    {editingTaskInfo ? (
                      <>
                        <button
                          onClick={handleSaveTaskInfo}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingTaskInfo(false)
                            if (selectedTask) {
                              setTaskInfo({
                                title: selectedTask.content.title || '',
                                description: selectedTask.content.description || '',
                                status: selectedTask.content.status || 'pending',
                                priority: selectedTask.content.priority || 'medium',
                                progress: selectedTask.content.progress || 0,
                                due_date: selectedTask.content.due_date || '',
                                estimated_duration: selectedTask.content.estimated_duration || 0,
                                assignee: selectedTask.content.assignee || '',
                                tags: selectedTask.tags || []
                              })
                            }
                          }}
                          className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm transition-colors"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingTaskInfo(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        编辑
                      </button>
                    )}
                  </div>
                </div>

                {editingTaskInfo ? (
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                      <input
                        type="text"
                        value={taskInfo.title}
                        onChange={(e) => setTaskInfo(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea
                        value={taskInfo.description}
                        onChange={(e) => setTaskInfo(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Status and Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                        <select
                          value={taskInfo.status}
                          onChange={(e) => setTaskInfo(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="pending">待办</option>
                          <option value="in_progress">进行中</option>
                          <option value="completed">已完成</option>
                          <option value="cancelled">已取消</option>
                          <option value="on_hold">暂停</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                        <select
                          value={taskInfo.priority}
                          onChange={(e) => setTaskInfo(prev => ({ ...prev, priority: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="low">低</option>
                          <option value="medium">中</option>
                          <option value="high">高</option>
                          <option value="urgent">紧急</option>
                        </select>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">进度 ({taskInfo.progress}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={taskInfo.progress}
                        onChange={(e) => setTaskInfo(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>

                    {/* Due Date and Estimated Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                        <input
                          type="datetime-local"
                          value={taskInfo.due_date}
                          onChange={(e) => setTaskInfo(prev => ({ ...prev, due_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">预估时长 (分钟)</label>
                        <input
                          type="number"
                          value={taskInfo.estimated_duration}
                          onChange={(e) => setTaskInfo(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                      <input
                        type="text"
                        value={taskInfo.assignee}
                        onChange={(e) => setTaskInfo(prev => ({ ...prev, assignee: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {taskInfo.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded-md text-sm"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={addTag}
                        className="flex items-center gap-2 px-3 py-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        添加标签
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">状态:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.status}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">优先级:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.priority}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">进度:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.progress}%</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">负责人:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.assignee || '未分配'}</span>
                      </div>
                    </div>
                    {taskInfo.due_date && (
                      <div>
                        <span className="font-medium text-gray-700">截止日期:</span>
                        <span className="ml-2 text-gray-600">{new Date(taskInfo.due_date).toLocaleString()}</span>
                      </div>
                    )}
                    {taskInfo.estimated_duration > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">预估时长:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.estimated_duration} 分钟</span>
                      </div>
                    )}
                    {taskInfo.tags.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">标签:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {taskInfo.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-primary-100 text-primary-800 rounded-md text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Markdown Editor */}
            <div className="flex-1 p-4 lg:p-6">
              <MarkdownEditor
                value={notes}
                onChange={setNotes}
                placeholder="在这里记录你的想法、进度和笔记..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">选择任务开始工作</h3>
              <p className="text-gray-600">从左侧选择一个任务来查看和编辑其笔记</p>
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Menu className="w-4 h-4" />
                打开任务列表
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
