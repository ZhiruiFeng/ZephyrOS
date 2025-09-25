'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TaskMemory, TaskContent } from '../../../../lib/api'
import { Category } from '../../../types/task'
import { TaskWithCategory } from '../components/TaskSidebar'

interface TaskInfo {
  title: string
  description: string
  status: TaskContent['status']
  priority: TaskContent['priority']
  progress: number
  due_date: string
  estimated_duration: number
  assignee: string
  tags: string[]
}

export function useWorkModeState(tasks: TaskMemory[], categories: Category[]) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL params
  const returnTo = searchParams.get('returnTo')
  const from = searchParams.get('from')
  const subtaskIdParam = searchParams.get('subtaskId')

  // Main state
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
  const [taskInfo, setTaskInfo] = useState<TaskInfo>({
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

  // Memory anchoring
  const [showMemories, setShowMemories] = useState(false)
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)

  // Energy review
  const [energyReviewOpen, setEnergyReviewOpen] = useState(false)
  const [energyReviewEntry, setEnergyReviewEntry] = useState<any>(null)

  // Conversation sidebar
  const [conversationOpen, setConversationOpen] = useState(false)
  const [conversationMinimized, setConversationMinimized] = useState(false)
  const [conversationWidth, setConversationWidth] = useState(400)

  // Refs for subtask auto-open behavior
  const autoOpenSubtasksRef = useRef(false)
  const lastSubtaskIdRef = useRef<string | null>(null)

  const updateFocusUrl = useCallback((updates: Record<string, string | null | undefined>) => {
    if (typeof window === 'undefined') return
    const current = new URLSearchParams(window.location.search)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        current.delete(key)
      } else {
        current.set(key, value)
      }
    })
    const queryString = current.toString()
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`
    router.replace(nextUrl, { scroll: false })
  }, [router])

  // Context-aware back navigation
  const handleBack = useCallback(() => {
    if (returnTo) {
      router.push(returnTo)
      return
    }
    if (from) {
      try { router.back(); return } catch {}
    }
    router.push('/')
  }, [returnTo, from, router])

  // Filter tasks based on view mode
  const filteredTasks = useMemo(() => {
    if (typeof window === 'undefined') return tasks

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(startOfToday)
    endOfToday.setHours(23, 59, 59, 999)

    return tasks.filter((task) => {
      const content = task.content as TaskContent
      const dueDate = content.due_date ? new Date(content.due_date) : null

      if (viewMode === 'current') {
        if (content.status === 'in_progress') return true
        if (content.status === 'pending' && !dueDate) return true
        if (content.status === 'pending' && dueDate && dueDate <= endOfToday) return true
        return false
      } else {
        if (content.status === 'on_hold') return true
        if (content.status === 'pending' && dueDate && dueDate > endOfToday) return true
        return false
      }
    })
  }, [tasks, viewMode])

  // Group tasks by category
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, TaskWithCategory[]> = {}
    const uncategorized: TaskWithCategory[] = []

    filteredTasks.forEach((task) => {
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

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }, [expandedCategories])

  // Toggle task description expansion
  const toggleDescriptionExpansion = useCallback((taskId: string) => {
    const newExpanded = new Set(expandedDescriptions)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedDescriptions(newExpanded)
  }, [expandedDescriptions])

  // Auto-expand categories with tasks
  const prevCategoryKeysRef = useRef<string>('')

  useEffect(() => {
    const categoryKeys = Object.keys(tasksByCategory.grouped)
      .filter(categoryId => tasksByCategory.grouped[categoryId].length > 0)
      .sort()
      .join(',')

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

  // Auto-hide mobile sidebar when task is selected on mobile
  useEffect(() => {
    if (selectedTask && window.innerWidth < 1024) {
      setMobileSidebarOpen(false)
    }
  }, [selectedTask])

  // Hide memory panel when switching tasks
  useEffect(() => {
    setShowMemories(false)
  }, [selectedTask?.id])

  // Auto-select task from query params
  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (!taskId || !tasks.length) return

    const found = tasks.find(t => t.id === taskId)
    if (found && (!selectedTask || selectedTask.id !== taskId)) {
      setSelectedTask(found as TaskWithCategory)
      setSelectedSubtask(null)
    }
  }, [searchParams, tasks, selectedTask])

  // Load notes when selectedTask changes (for URL-based task selection)
  // Only update if notes are empty to avoid conflicts with manual task selection
  useEffect(() => {
    if (!selectedTask) {
      setNotes('')
      setOriginalNotes('')
      return
    }

    // Only set notes if they're currently empty (indicating URL-based selection)
    // Manual task selection via handleTaskSelect will handle notes independently
    if (notes === '' && originalNotes === '') {
      const taskNotes = selectedTask.content?.notes || ''
      setNotes(taskNotes)
      setOriginalNotes(taskNotes)

      // Also update task info for the selected task
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
  }, [selectedTask?.id, selectedTask?.content, selectedTask, notes, originalNotes])

  // Load notes when selectedSubtask changes
  useEffect(() => {
    if (!selectedSubtask) {
      // If no subtask is selected, show the parent task's notes
      if (selectedTask) {
        const taskNotes = selectedTask.content?.notes || ''
        setNotes(taskNotes)
        setOriginalNotes(taskNotes)
      }
      return
    }

    // Show subtask's notes when a subtask is selected
    const subtaskNotes = selectedSubtask.content?.notes || ''
    setNotes(subtaskNotes)
    setOriginalNotes(subtaskNotes)
  }, [selectedSubtask?.id, selectedSubtask?.content, selectedSubtask, selectedTask])

  // Auto-open subtasks panel for direct subtask links
  useEffect(() => {
    if (lastSubtaskIdRef.current !== subtaskIdParam) {
      autoOpenSubtasksRef.current = false
      lastSubtaskIdRef.current = subtaskIdParam
    }

    if (!subtaskIdParam || !selectedTask) return
    if (subtaskIdParam === selectedTask.id) return
    if (selectedSubtask?.id === subtaskIdParam) return

    if (!autoOpenSubtasksRef.current) {
      autoOpenSubtasksRef.current = true
      setShowSubtasks(true)
    }
  }, [selectedSubtask?.id, selectedTask, subtaskIdParam])

  return {
    // State
    selectedTask,
    setSelectedTask,
    selectedSubtask,
    setSelectedSubtask,
    expandedCategories,
    setExpandedCategories,
    notes,
    setNotes,
    isSaving,
    setIsSaving,
    originalNotes,
    setOriginalNotes,
    viewMode,
    setViewMode,
    showTaskInfo,
    setShowTaskInfo,
    showSubtasks,
    setShowSubtasks,
    editingTaskInfo,
    setEditingTaskInfo,
    sidebarVisible,
    setSidebarVisible,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    taskInfo,
    setTaskInfo,
    expandedDescriptions,
    setExpandedDescriptions,
    showMemories,
    setShowMemories,
    memoryModalOpen,
    setMemoryModalOpen,
    energyReviewOpen,
    setEnergyReviewOpen,
    energyReviewEntry,
    setEnergyReviewEntry,
    conversationOpen,
    setConversationOpen,
    conversationMinimized,
    setConversationMinimized,
    conversationWidth,
    setConversationWidth,

    // Computed values
    filteredTasks,
    tasksByCategory,

    // Functions
    updateFocusUrl,
    handleBack,
    toggleCategory,
    toggleDescriptionExpansion,

    // Refs and derived values
    subtaskIdParam,
    autoOpenSubtasksRef,
    lastSubtaskIdRef
  }
}