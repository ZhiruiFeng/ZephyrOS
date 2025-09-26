'use client'

import { useCallback, useEffect, useRef } from 'react'
import { TaskMemory } from '@/lib/api'
import { useUpdateTask } from '@/hooks/memory/useMemories'
import { useAutoSave } from '@/shared/hooks/useAutoSave'
import { useTimerShared } from '@/shared/hooks/useTimerShared'
import { useTranslation } from '@/contexts/LanguageContext'
import type { TaskWithCategory, TaskInfo } from '../types/focus'

interface UseFocusTaskOperationsProps {
  selectedTask: TaskWithCategory | null
  selectedSubtask: TaskMemory | null
  notes: string
  setNotes: (notes: string) => void
  originalNotes: string
  setOriginalNotes: (notes: string) => void
  setSelectedTask: (task: TaskWithCategory) => void
  setSelectedSubtask: (subtask: TaskMemory | null) => void
  setIsSaving: (saving: boolean) => void
  taskInfo: TaskInfo
  setTaskInfo: React.Dispatch<React.SetStateAction<TaskInfo>>
  setEditingTaskInfo: (editing: boolean) => void
  updateFocusUrl: (updates: Record<string, string | null | undefined>) => void
  setShowSubtasks: (show: boolean) => void
  autoSave: ReturnType<typeof useAutoSave>
  onTaskCompleted?: () => void
}

export function useFocusTaskOperations({
  selectedTask,
  selectedSubtask,
  notes,
  setNotes,
  originalNotes,
  setOriginalNotes,
  setSelectedTask,
  setSelectedSubtask,
  setIsSaving,
  taskInfo,
  setTaskInfo,
  setEditingTaskInfo,
  updateFocusUrl,
  setShowSubtasks,
  autoSave,
  onTaskCompleted
}: UseFocusTaskOperationsProps) {
  const { t } = useTranslation()
  const { updateTask, updateTaskSilent } = useUpdateTask()
  const timer = useTimerShared(5000)

  // Track if we're currently switching tasks to prevent auto-save conflicts
  const isSwitchingTaskRef = useRef(false)
  const lastTaskIdRef = useRef<string | null>(null)
  const lastSubtaskIdRef = useRef<string | null>(null)

  // Auto-save functionality for notes
  const autoSaveNotes = useCallback(async () => {
    if (!selectedTask && !selectedSubtask) return
    if (isSwitchingTaskRef.current) return // Prevent auto-save during task switching

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
  }, [selectedTask, selectedSubtask, notes, updateTaskSilent, setSelectedSubtask, setSelectedTask, setOriginalNotes])

  const handleTaskSelect = useCallback((task: TaskWithCategory) => {
    // Mark as switching to prevent auto-save conflicts
    isSwitchingTaskRef.current = true

    // Cancel any pending auto-save
    autoSave.cancelAutoSave()

    // Batch all state updates for smooth transition
    const taskNotes = task.content?.notes || ''

    setSelectedTask(task)
    setSelectedSubtask(null)
    setShowSubtasks(false)
    setNotes(taskNotes)
    setOriginalNotes(taskNotes)
    setTaskInfo({
      title: task.content.title || '',
      description: task.content.description || '',
      status: task.content.status || 'pending',
      priority: task.content.priority || 'medium',
      progress: task.content.progress || 0,
      due_date: task.content.due_date ? new Date(task.content.due_date).toISOString().slice(0, 16) : '',
      estimated_duration: task.content.estimated_duration || 0,
      assignee: task.content.assignee || '',
      tags: task.tags || []
    })

    updateFocusUrl({ taskId: task.id, subtaskId: null })

    // Reset switching flag after a brief delay to allow state to settle
    setTimeout(() => {
      isSwitchingTaskRef.current = false
      autoSave.resetAutoSave()
    }, 100)
  }, [setSelectedTask, setSelectedSubtask, setShowSubtasks, setNotes, setOriginalNotes, setTaskInfo, updateFocusUrl, autoSave])

  const handleSubtaskSelect = useCallback((subtask: TaskMemory) => {
    // Mark as switching to prevent auto-save conflicts
    isSwitchingTaskRef.current = true

    // Cancel any pending auto-save
    autoSave.cancelAutoSave()

    const shouldAutoClose = typeof window !== 'undefined' && window.innerWidth < 1024

    if (selectedTask && subtask.id === selectedTask.id) {
      const taskNotes = selectedTask.content?.notes || ''
      setSelectedSubtask(null)
      setNotes(taskNotes)
      setOriginalNotes(taskNotes)
      if (shouldAutoClose) {
        setShowSubtasks(false)
      }
      updateFocusUrl({ subtaskId: null })
    } else {
      const nextNotes = subtask.content?.notes || ''
      setSelectedSubtask(subtask)
      setNotes(nextNotes)
      setOriginalNotes(nextNotes)
      if (shouldAutoClose) {
        setShowSubtasks(false)
      }
      updateFocusUrl({ subtaskId: subtask.id })
    }

    // Reset switching flag after a brief delay
    setTimeout(() => {
      isSwitchingTaskRef.current = false
      autoSave.resetAutoSave()
    }, 100)
  }, [selectedTask, updateFocusUrl, setSelectedSubtask, setNotes, setOriginalNotes, setShowSubtasks, autoSave])

  const handleSaveNotes = useCallback(async () => {
    if (!selectedTask && !selectedSubtask) return

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
  }, [selectedTask, selectedSubtask, notes, updateTask, autoSave, setIsSaving, setSelectedSubtask, setSelectedTask, setOriginalNotes])

  const handleSaveTaskInfo = useCallback(async () => {
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
      setSelectedTask(updatedTask as TaskWithCategory)
      setEditingTaskInfo(false)
    } catch (error) {
      console.error('Failed to save task info:', error)
    } finally {
      setIsSaving(false)
    }
  }, [selectedTask, taskInfo, updateTask, setIsSaving, setSelectedTask, setEditingTaskInfo])

  const addTag = useCallback(() => {
    const tag = prompt(t.ui.enterTag)
    if (tag && tag.trim()) {
      setTaskInfo(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }, [t.ui.enterTag, setTaskInfo])

  const removeTag = useCallback((tagToRemove: string) => {
    setTaskInfo(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }, [setTaskInfo])

  const handleCompleteTask = useCallback(async () => {
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

      const taskWithCategory = {
        ...updatedTask,
        category: selectedTask.category,
        category_id: selectedTask.category_id || selectedTask.content.category_id
      } as TaskWithCategory

      setSelectedTask(taskWithCategory)

      setTaskInfo(prev => ({
        ...prev,
        status: 'completed',
        progress: 100
      }))

      if (timer.isRunning && timer.runningTaskId === selectedTask.id) {
        timer.stop(selectedTask.id)
      }

      // Trigger celebration animation
      onTaskCompleted?.()
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setIsSaving(false)
    }
  }, [selectedTask, updateTask, setIsSaving, setSelectedTask, setTaskInfo, timer, onTaskCompleted])

  // OPTIMIZED: Single effect for task/subtask changes with proper cleanup
  useEffect(() => {
    const currentTaskId = selectedTask?.id || null
    const currentSubtaskId = selectedSubtask?.id || null

    // Only trigger if task or subtask actually changed
    if (lastTaskIdRef.current === currentTaskId && lastSubtaskIdRef.current === currentSubtaskId) {
      return
    }

    // Update refs
    lastTaskIdRef.current = currentTaskId
    lastSubtaskIdRef.current = currentSubtaskId

    // Only update notes/taskInfo if not switching manually (to prevent conflicts)
    if (!isSwitchingTaskRef.current) {
      if (selectedSubtask) {
        const subtaskNotes = selectedSubtask.content.notes || ''
        setNotes(subtaskNotes)
        setOriginalNotes(subtaskNotes)
      } else if (selectedTask) {
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
    }

    // Reset auto-save state for new task/subtask
    autoSave.resetAutoSave()
  }, [selectedTask?.id, selectedSubtask?.id, selectedTask, selectedSubtask, setNotes, setOriginalNotes, setTaskInfo, autoSave])

  // OPTIMIZED: Auto-save trigger with switching protection
  useEffect(() => {
    if (!isSwitchingTaskRef.current && (selectedTask || selectedSubtask) && notes !== originalNotes) {
      autoSave.triggerAutoSave()
    }
  }, [notes, originalNotes, selectedTask, selectedSubtask, autoSave])

  return {
    timer,
    autoSaveNotes,
    handleTaskSelect,
    handleSubtaskSelect,
    handleSaveNotes,
    handleSaveTaskInfo,
    addTag,
    removeTag,
    handleCompleteTask
  }
}