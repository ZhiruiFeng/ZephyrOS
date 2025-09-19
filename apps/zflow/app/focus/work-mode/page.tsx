'use client'

import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTasks, useUpdateTask } from '../../../hooks/useMemories'
import { useAutoSave } from '../../../hooks/useAutoSave'
import { useCategories } from '../../../hooks/useCategories'
import { useAuth } from '../../../contexts/AuthContext'
import { usePrefs } from '../../../contexts/PrefsContext'
import LoginPage from '../../components/auth/LoginPage'
import { TaskMemory, categoriesApi, TaskContent } from '../../../lib/api'
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Save, Settings, Calendar, Clock, User, Tag, KanbanSquare, PanelLeftClose, PanelLeftOpen, X, Menu, Play, Square, Info, CheckCircle, ListTodo, ArrowLeft } from 'lucide-react'
import NotionEditor from '../../components/editors/NotionEditor'
import { Category } from '../../types/task'
import { useTranslation } from '../../../contexts/LanguageContext'
import { useTimer } from '../../../hooks/useTimer'
import SubtaskSection from '../../components/editors/SubtaskSection'
import EnergyReviewModal from '../../components/modals/EnergyReviewModal'
import MemoryAnchorButton from '../../components/memory/MemoryAnchorButton'
import TaskMemoryDisplay from '../../components/memory/TaskMemoryDisplay'
import MemoryManagementModal from '../../components/memory/MemoryManagementModal'
import { useTaskMemoryAnchors, useMemoryActions, useMemories } from '../../../hooks/useMemoryAnchors'
import { useSubtaskActions } from '../../../hooks/useSubtasks'
import eventBus from '../../core/events/event-bus'

interface TaskWithCategory extends TaskMemory {
  category?: Category
  category_id?: string
}

function WorkModeViewInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? {
    // 提高上限，避免老任务被默认分页丢失
    limit: 500,
    // 仅取根任务，减少无关数据量
    root_tasks_only: true,
    // 使用最近更新排序，更贴近“正在处理/今日相关”的工作流
    sort_by: 'updated_at',
    sort_order: 'desc'
  } : null)
  const { categories } = useCategories()
  const { updateTask, updateTaskSilent } = useUpdateTask()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const from = searchParams.get('from')
  const [selectedTask, setSelectedTask] = useState<TaskWithCategory | null>(null)
  const [selectedSubtask, setSelectedSubtask] = useState<TaskMemory | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [originalNotes, setOriginalNotes] = useState('')
  const [viewMode, setViewMode] = useState<'current' | 'backlog'>('current')
  const [showTaskInfo, setShowTaskInfo] = useState(false)
  const [showSubtasks, setShowSubtasks] = useState(false)
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

  // Task description expansion
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

  // Time tracking
  const timer = useTimer(5000)
  const [energyReviewOpen, setEnergyReviewOpen] = useState(false)
  const [energyReviewEntry, setEnergyReviewEntry] = useState<any>(null)

  // Memory anchoring
  const [showMemories, setShowMemories] = useState(false)
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)
  const { anchors: taskAnchors, isLoading: anchorsLoading, refetch: refetchAnchors } = useTaskMemoryAnchors(selectedTask?.id || '')
  const { memories: allMemories, isLoading: memoriesLoading } = useMemories({ limit: 100 })
  const { createMemoryWithAnchor, linkMemoryToTask, removeMemoryFromTask, isLoading: memoryActionLoading } = useMemoryActions()
  const { updateSubtask: updateSubtaskAction } = useSubtaskActions()

  const subtaskStatusOptions = useMemo(() => ([
    { value: 'pending' as TaskContent['status'], label: t.task.statusPending },
    { value: 'in_progress' as TaskContent['status'], label: t.task.statusInProgress },
    { value: 'completed' as TaskContent['status'], label: t.task.statusCompleted },
    { value: 'on_hold' as TaskContent['status'], label: t.task.statusOnHold },
    { value: 'cancelled' as TaskContent['status'], label: t.task.statusCancelled },
  ]), [t])

  // Context-aware back navigation
  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo)
      return
    }
    if (from) {
      try { router.back(); return } catch {}
    }
    router.push('/')
  }

  // Auto-save functionality for notes
  const autoSaveNotes = useCallback(async () => {
    if (!selectedTask && !selectedSubtask) return
    
    try {
      const targetId = selectedSubtask ? selectedSubtask.id : (selectedTask as TaskWithCategory).id
      const updated = await updateTaskSilent(targetId, { 
        content: { 
          notes 
        } 
      })
      if (selectedSubtask) {
        setSelectedSubtask(updated as TaskMemory)
      } else if (selectedTask) {
        // Preserve the category information from the original selectedTask
        const taskWithCategory = {
          ...updated,
          category: selectedTask.category,
          category_id: selectedTask.category_id || selectedTask.content.category_id
        } as TaskWithCategory
        setSelectedTask(taskWithCategory)
      }
      setOriginalNotes(notes)
    } catch (error) {
      throw error
    }
  }, [selectedTask, selectedSubtask, notes, updateTaskSilent])

  const autoSave = useAutoSave({
    delay: 5000, // 5 seconds after user stops typing - less sensitive
    enabled: !!(selectedTask || selectedSubtask),
    onSave: autoSaveNotes,
    hasChanges: () => {
      // Only save if there's meaningful change
      const trimmedNotes = notes.trim()
      const trimmedOriginal = originalNotes.trim()
      
      if (trimmedNotes === trimmedOriginal) return false
      
      // Only trigger if substantial change (at least 20 characters difference or significant content change)
      const lengthDiff = Math.abs(trimmedNotes.length - trimmedOriginal.length)
      const minLength = Math.min(trimmedNotes.length, trimmedOriginal.length)
      const changeRatio = minLength > 0 ? lengthDiff / minLength : 1
      
      // More conservative: require at least 20 chars change OR 30% content change
      return lengthDiff >= 20 || changeRatio >= 0.3
    }
  })

  // Trigger auto-save when notes change
  useEffect(() => {
    if ((selectedTask || selectedSubtask) && notes !== originalNotes) {
      autoSave.triggerAutoSave()
    }
  }, [notes, selectedTask, selectedSubtask, originalNotes])

  // Load categories
  // Categories are now loaded via useCategories hook

  // Auto-hide mobile sidebar when task is selected on mobile
  useEffect(() => {
    if (selectedTask && window.innerWidth < 1024) {
      setMobileSidebarOpen(false)
    }
  }, [selectedTask])

  // Listen for timer stopped to open energy review modal
  useEffect(() => {
    const off = eventBus.onTimerStopped((detail: any) => {
      const entry = detail?.entry
      if (entry) {
        setEnergyReviewEntry(entry)
        setEnergyReviewOpen(true)
      }
    })
    return off
  }, [])

  // Filter tasks based on view mode
  const filteredTasks = React.useMemo(() => {
    // Skip filtering on server side to avoid hydration mismatch
    if (typeof window === 'undefined') return tasks

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(startOfToday)
    endOfToday.setHours(23, 59, 59, 999)

    return tasks.filter((task) => {
      const content = task.content as TaskContent
      const dueDate = content.due_date ? new Date(content.due_date) : null

      if (viewMode === 'current') {
        // Current: in progress, pending without due date, pending due today (until 23:59:59), or overdue
        if (content.status === 'in_progress') return true
        if (content.status === 'pending' && !dueDate) return true
        if (content.status === 'pending' && dueDate && dueDate <= endOfToday) return true
        return false
      } else {
        // Backlog: on_hold or pending with future due date (after today)
        if (content.status === 'on_hold') return true
        if (content.status === 'pending' && dueDate && dueDate > endOfToday) return true
        return false
      }
    })
  }, [tasks, viewMode])

  // Group tasks by category
  const tasksByCategory = React.useMemo(() => {
    const grouped: Record<string, TaskWithCategory[]> = {}
    const uncategorized: TaskWithCategory[] = []

    filteredTasks.forEach((task) => {
      // 仅展示根任务（hierarchy_level = 0 或没有 parent_task_id）
      const level = (task as any).hierarchy_level
      const parentId = (task as any).content?.parent_task_id
      const isRoot = (level === 0) || (level === undefined && !parentId)
      if (!isRoot) return

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
  const prevCategoryKeysRef = useRef<string>('')
  
  useEffect(() => {
    const categoryKeys = Object.keys(tasksByCategory.grouped)
      .filter(categoryId => tasksByCategory.grouped[categoryId].length > 0)
      .sort()
      .join(',')
    
    // Only update if the categories with tasks actually changed
    if (prevCategoryKeysRef.current !== categoryKeys) {
      const newExpanded = new Set<string>()
      Object.keys(tasksByCategory.grouped).forEach(categoryId => {
        if (tasksByCategory.grouped[categoryId].length > 0) {
          newExpanded.add(categoryId)
        }
      })
      setExpandedCategories(newExpanded)
      prevCategoryKeysRef.current = categoryKeys
    }
  }, [tasksByCategory])

  // Load notes and task info when task is selected
  useEffect(() => {
    // Reset selected subtask when switching root task
    setSelectedSubtask(null)
    if (selectedTask) {
      const taskNotes = selectedTask.content.notes || ''
      setNotes(taskNotes)
      setOriginalNotes(taskNotes)
      setTaskInfo({
        title: selectedTask.content.title || '',
        description: selectedTask.content.description || '',
        status: selectedTask.content.status || 'pending',
        priority: selectedTask.content.priority || 'medium',
        progress: selectedTask.content.progress || 0,
        due_date: selectedTask.content.due_date ? new Date(selectedTask.content.due_date).toISOString().slice(0, 16) : '',
        estimated_duration: selectedTask.content.estimated_duration || 0,
        assignee: selectedTask.content.assignee || '',
        tags: selectedTask.tags || []
      })
    } else {
      setNotes('')
      setOriginalNotes('')
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

  // Load notes when a subtask is selected
  useEffect(() => {
    if (selectedSubtask) {
      const subtaskNotes = selectedSubtask.content.notes || ''
      setNotes(subtaskNotes)
      setOriginalNotes(subtaskNotes)
    } else if (selectedTask) {
      const taskNotes = selectedTask.content.notes || ''
      setNotes(taskNotes)
      setOriginalNotes(taskNotes)
    }
  }, [selectedSubtask])

  // Hide memory panel when switching tasks
  useEffect(() => {
    setShowMemories(false)
  }, [selectedTask?.id])

  // Reset auto-save state when switching tasks or subtasks
  useEffect(() => {
    autoSave.resetAutoSave()
  }, [selectedTask?.id, selectedSubtask?.id])

  // Auto-select task and subtask from query params
  useEffect(() => {
    const taskId = searchParams.get('taskId')
    const subtaskId = searchParams.get('subtaskId')
    if (!taskId || !tasks.length) return

    // Find the main task and only select it if it's different from current selection
    const found = tasks.find(t => t.id === taskId)
    if (found && (!selectedTask || selectedTask.id !== taskId)) {
      setSelectedTask(found as TaskWithCategory)
      setSelectedSubtask(null) // Reset subtask selection
    }
  }, [searchParams, tasks])

  // Auto-select subtask if subtaskId is provided
  useEffect(() => {
    const subtaskId = searchParams.get('subtaskId')
    if (!subtaskId || !selectedTask || selectedSubtask?.id === subtaskId) return

    // We need to fetch the subtask to select it
    // For now, we'll show the subtasks section and let user navigate
    // In a full implementation, you'd fetch the subtask here
    setShowSubtasks(true)

    // Attempt to find and select the subtask from loaded tasks
    const foundSubtask = tasks.find(t => t.id === subtaskId)
    if (foundSubtask) {
      setSelectedSubtask(foundSubtask as TaskMemory)
      setShowSubtasks(false) // Hide the subtasks panel since we found it
    }
  }, [searchParams, selectedTask, tasks])

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleSubtaskStatusChange = useCallback(async (newStatus: TaskContent['status']) => {
    if (!selectedSubtask) return
    try {
      const updated = await updateSubtaskAction(selectedSubtask.id, { status: newStatus })
      if (updated) {
        setSelectedSubtask(updated as TaskMemory)
      } else {
        setSelectedSubtask(prev => prev ? ({
          ...prev,
          content: {
            ...prev.content,
            status: newStatus,
          }
        }) : prev)
      }
    } catch (error) {
      console.error('Failed to update subtask status:', error)
    }
  }, [selectedSubtask, updateSubtaskAction])

  // Toggle task description expansion
  const toggleDescriptionExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedDescriptions)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedDescriptions(newExpanded)
  }

  const handleSaveNotes = async () => {
    if (!selectedTask && !selectedSubtask) return
    
    // Cancel any pending auto-save
    autoSave.cancelAutoSave()
    
    setIsSaving(true)
    try {
      const targetId = selectedSubtask ? selectedSubtask.id : (selectedTask as TaskWithCategory).id
      const updated = await updateTask(targetId, { 
        content: { 
          notes 
        } 
      })
      if (selectedSubtask) {
        setSelectedSubtask(updated as TaskMemory)
      } else if (selectedTask) {
        const taskWithCategory = {
          ...updated,
          category: selectedTask.category,
          category_id: selectedTask.category_id || selectedTask.content.category_id
        } as TaskWithCategory
        setSelectedTask(taskWithCategory)
      }
      setOriginalNotes(notes)
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
      const updatedTask = await updateTask(selectedTask.id, { 
        content: {
          title: taskInfo.title,
          description: taskInfo.description,
          status: taskInfo.status,
          priority: taskInfo.priority,
          progress: taskInfo.progress,
          due_date: taskInfo.due_date && taskInfo.due_date.trim() ? new Date(taskInfo.due_date).toISOString() : undefined,
          estimated_duration: taskInfo.estimated_duration || undefined,
          assignee: taskInfo.assignee && taskInfo.assignee.trim() ? taskInfo.assignee : undefined
        },
        tags: taskInfo.tags
      })
      // Update the selectedTask state with the updated task data
      setSelectedTask(updatedTask as TaskWithCategory)
      setEditingTaskInfo(false)
    } catch (error) {
      console.error('Failed to save task info:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addTag = () => {
    const tag = prompt(t.ui.enterTag)
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

  const handleCompleteTask = async () => {
    if (!selectedTask) return

    setIsSaving(true)
    try {
      const updatedTask = await updateTask(selectedTask.id, {
        content: {
          status: 'completed',
          progress: 100,
          completion_date: new Date().toISOString()
        }
      })

      // Update the selectedTask state with the updated task data
      const taskWithCategory = {
        ...updatedTask,
        category: selectedTask.category,
        category_id: selectedTask.category_id || selectedTask.content.category_id
      } as TaskWithCategory

      setSelectedTask(taskWithCategory)

      // Update taskInfo to reflect the completion
      setTaskInfo(prev => ({
        ...prev,
        status: 'completed',
        progress: 100
      }))

      // Stop timer if running
      if (timer.isRunning && timer.runningTaskId === selectedTask.id) {
        timer.stop(selectedTask.id)
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Memory management handlers
  const handleMemoryCreated = async (memory: any, anchorData: any) => {
    try {
      await createMemoryWithAnchor(
        {
          title: memory.title,
          note: memory.note,
          tags: memory.tags
        },
        {
          anchor_item_id: selectedTask!.id,
          relation_type: anchorData.relation_type,
          weight: anchorData.weight,
          local_time_range: anchorData.local_time_range,
          notes: anchorData.notes
        }
      )
      refetchAnchors()
    } catch (error) {
      console.error('Failed to create memory:', error)
    }
  }

  const handleMemoryLinked = async (memoryId: string, anchorData: any) => {
    try {
      await linkMemoryToTask(memoryId, {
        anchor_item_id: selectedTask!.id,
        relation_type: anchorData.relation_type,
        weight: anchorData.weight,
        local_time_range: anchorData.local_time_range,
        notes: anchorData.notes
      })
      refetchAnchors()
    } catch (error) {
      console.error('Failed to link memory:', error)
    }
  }

  const handleMemoryRemoved = async (memoryId: string) => {
    if (!selectedTask) return
    try {
      await removeMemoryFromTask(memoryId, selectedTask.id)
      refetchAnchors()
    } catch (error) {
      console.error('Failed to remove memory:', error)
    }
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
      <div className="flex items-center justify-center min-h-screen text-red-600">{t.messages.failedToLoadTasks}</div>
    )
  }

  return (
    <>
    <div className="flex min-h-[calc(100vh-200px)] lg:min-h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border border-gray-200">
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
        ${!sidebarVisible ? 'lg:hidden' : ''}
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-lg font-semibold text-gray-900">{t.ui.taskExplorer}</h2>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-gray-900">{t.ui.taskExplorer}</h2>
            <p className="text-sm text-gray-600 mt-1">{t.ui.selectTaskToWork}</p>
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
{t.ui.currentTasks}
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
              {viewMode === 'current' ? t.ui.currentTasksDesc : t.ui.backlogTasksDesc}
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
                <span className="font-medium text-gray-700">{t.ui.uncategorized}</span>
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
              onClick={handleBack}
              className="flex items-center gap-2 px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              title={t.common?.back || 'Back'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Menu className="w-4 h-4" />
              {t.ui.taskList}
            </button>
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              title={sidebarVisible ? t.ui.hideSidebar : t.ui.showSidebar}
            >
              {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              {sidebarVisible ? t.ui.hideSidebar : t.ui.showSidebar}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/focus?view=kanban"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
            >
              <KanbanSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{t.ui.switchToKanban}</span>
              <span className="sm:hidden">{t.nav.kanban}</span>
            </Link>
          </div>
        </div>

        {selectedTask ? (
          <>
            {/* Task Header */}
            <div className="p-4 lg:p-6 border-b border-gray-200">
              {/* Task Info Section */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 break-words">
                    {selectedSubtask ? selectedSubtask.content.title : selectedTask.content.title}
                  </h1>
                  {((selectedSubtask && selectedSubtask.content.description) || (!selectedSubtask && selectedTask.content.description)) && (
                    <button
                      onClick={() => toggleDescriptionExpansion(selectedSubtask ? selectedSubtask.id : selectedTask.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      title={expandedDescriptions.has(selectedSubtask ? selectedSubtask.id : selectedTask.id) ? "Hide description" : "Show description"}
                    >
                      {expandedDescriptions.has(selectedSubtask ? selectedSubtask.id : selectedTask.id) ? (
                        <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5" />
                      ) : (
                        <Info className="w-4 h-4 lg:w-5 lg:h-5" />
                      )}
                    </button>
                  )}
                </div>
                {((selectedSubtask && selectedSubtask.content.description && expandedDescriptions.has(selectedSubtask.id)) ||
                  (!selectedSubtask && selectedTask.content.description && expandedDescriptions.has(selectedTask.id))) && (
                  <p className="text-gray-600 mt-2 break-words">
                    {selectedSubtask ? selectedSubtask.content.description : selectedTask.content.description}
                  </p>
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

              {/* Controls Section */}
              <div className="flex flex-wrap items-center gap-1 md:gap-2 min-h-[36px] sm:min-h-[40px]">
                {/* Timer and Controls - Compact Row */}
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 overflow-x-auto">
                  {/* Ultra-compact Timer */}
                  {selectedTask && (
                    <div className="flex items-center gap-0 sm:gap-1 px-1 py-0.5 bg-gray-100 rounded text-xs min-w-[45px] sm:min-w-[120px]">
                      <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                      <span className="text-gray-700 font-mono min-w-[25px] sm:min-w-[60px] text-center text-xs">
                        {timer.isRunning && timer.runningTaskId === selectedTask.id ? (
                          `${Math.floor(timer.elapsedMs / 60000).toString().padStart(2, '0')}:${Math.floor((timer.elapsedMs % 60000) / 1000).toString().padStart(2, '0')}`
                        ) : (
                          t.ui.idle
                        )}
                      </span>
                    </div>
                  )}
                  {/* Start/Stop Button */}
                  {selectedTask && (
                    <button
                      onClick={() => timer.isRunning && timer.runningTaskId === selectedTask.id 
                        ? timer.stop(selectedTask.id) 
                        : timer.start(selectedTask.id, { autoSwitch: true })
                      }
                      className={`flex items-center justify-center px-2 py-2 text-white rounded transition-colors text-xs min-w-[36px] ${
                        timer.isRunning && timer.runningTaskId === selectedTask.id 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {timer.isRunning && timer.runningTaskId === selectedTask.id ? (
                        <>
                          <Square className="w-3 h-3 flex-shrink-0" />
                          <span className="hidden sm:inline ml-1">{t.common.stop}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 flex-shrink-0" />
                          <span className="hidden sm:inline ml-1">{t.common.start}</span>
                        </>
                      )}
                    </button>
                  )}
                  {selectedSubtask && (
                    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
                      <span className="hidden sm:inline text-gray-500">{t.task.status}:</span>
                      <select
                        value={selectedSubtask.content.status}
                        onChange={(e) => handleSubtaskStatusChange(e.target.value as TaskContent['status'])}
                        className="bg-transparent text-gray-700 focus:outline-none"
                      >
                        {subtaskStatusOptions.map(option => (
                          <option key={option.value} value={option.value} className="text-gray-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Complete Button - Only show if task is not already completed */}
                  {selectedTask && selectedTask.content.status !== 'completed' && (
                    <button
                      onClick={handleCompleteTask}
                      disabled={isSaving}
                      className="flex items-center justify-center px-2 py-2 text-white bg-green-600 hover:bg-green-700 rounded transition-colors text-xs min-w-[36px] disabled:opacity-50"
                    >
                      <CheckCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="hidden sm:inline ml-1 truncate">{t.task.markCompleted}</span>
                    </button>
                  )}
                  {/* Task Info Button */}
                  <button
                    onClick={() => setShowTaskInfo(!showTaskInfo)}
                    className="flex items-center justify-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors text-xs min-w-[36px]"
                  >
                    <Settings className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline ml-1 truncate">{showTaskInfo ? t.ui.hideTaskInfo : t.ui.showTaskInfo}</span>
                  </button>
                  {/* Toggle Subtasks Button */}
                  <button
                    onClick={() => setShowSubtasks(prev => !prev)}
                    className="flex items-center justify-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors text-xs min-w-[36px]"
                    title={t.ui.subtasks}
                  >
                    <ListTodo className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline ml-1 truncate">{t.ui.subtasks}</span>
                  </button>
                  {/* Memory Anchor Button */}
                  <MemoryAnchorButton
                    onClick={() => {
                      setShowMemories(prev => {
                        const next = !prev
                        if (!prev && selectedTask) {
                          refetchAnchors()
                        }
                        return next
                      })
                    }}
                    memoryCount={taskAnchors.length}
                    disabled={!selectedTask}
                    size="md"
                    variant="default"
                    isActive={showMemories}
                  />
                </div>

                {/* Save Controls - Right Side (wraps below on mobile) */}
                <div className="flex items-center ml-0 md:ml-auto gap-1 md:gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
                  {/* Auto-save indicator - Hidden on mobile */}
                  <div className="hidden sm:flex items-center text-xs text-gray-400 min-w-[140px] justify-end">
                    {autoSave.status === 'error' ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
                        Save failed
                      </span>
                    ) : autoSave.lastSaved ? (
                      <span>Auto-saved {autoSave.lastSaved.toLocaleTimeString()}</span>
                    ) : null}
                  </div>
                  
                  {/* Save Button */}
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-primary-600 text-white rounded transition-colors text-xs min-w-[50px] sm:min-w-[100px] hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Save className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline ml-1 truncate">{isSaving ? t.ui.saving : t.ui.saveNotes}</span>
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
                    {t.ui.taskInfo}
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
                          {t.common.save}
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
                                due_date: selectedTask.content.due_date ? new Date(selectedTask.content.due_date).toISOString().slice(0, 16) : '',
                                estimated_duration: selectedTask.content.estimated_duration || 0,
                                assignee: selectedTask.content.assignee || '',
                                tags: selectedTask.tags || []
                              })
                            }
                          }}
                          className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm transition-colors"
                        >
                          {t.common.cancel}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingTaskInfo(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        {t.common.edit}
                      </button>
                    )}
                  </div>
                </div>

                {editingTaskInfo ? (
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.title}</label>
                      <input
                        type="text"
                        value={taskInfo.title}
                        onChange={(e) => setTaskInfo(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.description}</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.status}</label>
                        <select
                          value={taskInfo.status}
                          onChange={(e) => setTaskInfo(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="pending">{t.task.statusPending}</option>
                          <option value="in_progress">{t.task.statusInProgress}</option>
                          <option value="completed">{t.task.statusCompleted}</option>
                          <option value="cancelled">{t.task.statusCancelled}</option>
                          <option value="on_hold">{t.task.statusOnHold}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.priority}</label>
                        <select
                          value={taskInfo.priority}
                          onChange={(e) => setTaskInfo(prev => ({ ...prev, priority: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="low">{t.task.priorityLow}</option>
                          <option value="medium">{t.task.priorityMedium}</option>
                          <option value="high">{t.task.priorityHigh}</option>
                          <option value="urgent">{t.task.priorityUrgent}</option>
                        </select>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.progress} ({taskInfo.progress}%)</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.ui.dueDate}</label>
                        <input
                          type="datetime-local"
                          value={taskInfo.due_date}
                          onChange={(e) => setTaskInfo(prev => ({ ...prev, due_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.ui.estimatedDurationMinutes}</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.ui.assignee}</label>
                      <input
                        type="text"
                        value={taskInfo.assignee}
                        onChange={(e) => setTaskInfo(prev => ({ ...prev, assignee: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.tags}</label>
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
                        {t.ui.addTag}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">{t.task.status}:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.status}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t.task.priority}:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.priority}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t.task.progress}:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.progress}%</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t.ui.assignee}:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.assignee || t.ui.unassigned}</span>
                      </div>
                    </div>
                    {taskInfo.due_date && (
                      <div>
                        <span className="font-medium text-gray-700">{t.ui.dueDate}:</span>
                        <span className="ml-2 text-gray-600">{new Date(taskInfo.due_date).toLocaleString()}</span>
                      </div>
                    )}
                    {taskInfo.estimated_duration > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">{t.task.estimatedDuration}:</span>
                        <span className="ml-2 text-gray-600">{taskInfo.estimated_duration} {t.ui.minutes}</span>
                      </div>
                    )}
                    {taskInfo.tags.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">{t.task.tags}:</span>
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

            {/* Memory Display Section */}
            {selectedTask && showMemories && (
              <div className="p-4 lg:p-6 border-b border-gray-200 bg-gray-50">
                <TaskMemoryDisplay
                  taskId={selectedTask.id}
                  memories={taskAnchors}
                  onAddMemory={() => setMemoryModalOpen(true)}
                  onRemoveMemory={handleMemoryRemoved}
                  onViewMemory={() => {
                    // TODO: Implement memory detail view
                  }}
                  isLoading={anchorsLoading}
                  collapsible={true}
                  compact={false}
                />
              </div>
            )}

            {/* Subtasks Section (toggled) */}
            {showSubtasks && (
              <>
                {/* Desktop/tablet inline section */}
                <div className="hidden lg:block p-4 lg:p-6 border-b border-gray-200">
                  <SubtaskSection
                    taskId={selectedTask.id}
                    onSubtaskSelect={(subtask) => {
                      setSelectedSubtask(subtask)
                      setShowSubtasks(false)
                      // Update URL to reflect subtask selection
                      const url = new URL(window.location.href)
                      url.searchParams.set('subtaskId', subtask.id)
                      window.history.replaceState({}, '', url.toString())
                    }}
                    selectedSubtaskId={selectedSubtask?.id}
                    autoSelectSubtaskId={searchParams.get('subtaskId')}
                  />
                </div>

                {/* Mobile floating bottom sheet */}
                <div className="lg:hidden fixed inset-0 z-50">
                  <div
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setShowSubtasks(false)}
                  />
                  <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-2xl shadow-lg">
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">{t.ui.subtasks}</span>
                      <button
                        onClick={() => setShowSubtasks(false)}
                        className="p-2 text-gray-500 hover:text-gray-700"
                        aria-label="Close subtasks"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto">
                      <SubtaskSection
                        taskId={selectedTask.id}
                        onSubtaskSelect={(subtask) => {
                          setSelectedSubtask(subtask)
                          setShowSubtasks(false)
                          // Update URL to reflect subtask selection
                          const url = new URL(window.location.href)
                          url.searchParams.set('subtaskId', subtask.id)
                          window.history.replaceState({}, '', url.toString())
                        }}
                        selectedSubtaskId={selectedSubtask?.id}
                        autoSelectSubtaskId={searchParams.get('subtaskId')}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Markdown Editor */}
            <div className="flex-1 min-h-0 p-4 lg:p-6">
              {/* Editing mode indicator */}
              <div className="flex items-center gap-1 sm:gap-2 mb-2 text-xs text-gray-500 w-full overflow-hidden">
                {selectedSubtask ? (
                  <>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full flex-shrink-0 font-medium">
                      📝 Subtask
                    </span>
                    <span className="flex-1 min-w-0 truncate font-medium text-blue-900">
                      {selectedSubtask.content.title}
                    </span>
                    <span className="text-gray-400 flex-shrink-0 text-xs">
                      of: {selectedTask.content.title}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full flex-shrink-0">
                      📋 Task
                    </span>
                    <span className="flex-1 min-w-0 truncate">
                      {selectedTask.content.title}
                    </span>
                  </>
                )}
                <span className="ml-auto italic flex-shrink-0 hidden sm:inline">{t.common.edit}</span>
              </div>
              <NotionEditor
                value={notes}
                onChange={setNotes}
                placeholder={t.ui.writeNotesHere}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t.ui.selectTaskToStart}</h3>
              <p className="text-gray-600">{t.ui.selectTaskFromLeft}</p>
            </div>
          </div>
        )}
      </div>
    </div>
    {/* Memory Management Modal */}
    <MemoryManagementModal
      isOpen={memoryModalOpen}
      onClose={() => setMemoryModalOpen(false)}
      taskId={selectedTask?.id || ''}
      taskTitle={selectedTask?.content.title || ''}
      onMemoryCreated={handleMemoryCreated}
      onMemoryLinked={handleMemoryLinked}
      existingMemories={allMemories}
      isLoading={memoriesLoading || memoryActionLoading}
    />
    {/* Energy Review Modal */}
    <EnergyReviewModal
      open={energyReviewOpen}
      entry={energyReviewEntry}
      onClose={() => setEnergyReviewOpen(false)}
    />
    </>
  )
}

export default function WorkModeView() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <WorkModeViewInner />
    </Suspense>
  )
}
