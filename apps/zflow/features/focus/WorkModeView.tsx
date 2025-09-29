'use client'

import React, { Suspense, useEffect, useCallback, startTransition, useState } from 'react'
import { useTasks } from '@/features/tasks/hooks'
import { useCategories } from '@/hooks/useCategories'
import { useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/shared/components'
import { X } from 'lucide-react'
// Lazy load heavy components that are conditionally rendered
const SubtaskSection = React.lazy(() => import('@/features/tasks').then(m => ({ default: m.SubtaskSection })))
const EnergyReviewModal = React.lazy(() => import('@/features/profile').then(m => ({ default: m.EnergyReviewModal })))
const TaskMemoryDisplay = React.lazy(() => import('@/features/memory/components/TaskMemoryDisplay'))
const MemoryManagementModal = React.lazy(() => import('@/features/memory/components/MemoryManagementModal'))
import { useTaskMemoryAnchors, useMemoryActions, useMemories } from '@/features/memory/hooks'
import eventBus from '@/app/core/events/event-bus'
import { useTranslation } from '@/contexts/LanguageContext'
import { CelebrationAnimation } from '@/shared/components'
import { useCelebration } from '@/hooks/useCelebration'
import { usePerformanceTracking } from '@/lib/performance'

// Import modular components from focus feature
import {
  WorkModeTaskSidebar as TaskSidebar,
  TaskHeader,
  TaskInfoPanel,
  WorkModeEditor,
  Message
} from '@/focus'

// Import custom hooks
import { useWorkModeState } from '@/focus'

// Import hooks directly
import { useUpdateTask } from '@/features/tasks/hooks'
import { useTimer } from '@/hooks/useTimer'
import { useAutoSave } from '@/hooks/useAutoSave'

// Create a simplified task operations hook that includes auto-save internally
function useTaskOperationsWithAutoSave({
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
}: any) {
  const { t } = useTranslation()
  const { updateTask, updateTaskSilent } = useUpdateTask()
  const timer = useTimer(5000)

  // Auto-save logic built directly into the hook to avoid circular dependencies
  const autoSaveNotes = useCallback(async () => {
    if (!selectedTask && !selectedSubtask) return

    try {
      const targetId = selectedSubtask ? selectedSubtask.id : selectedTask.id
      const updated = await updateTaskSilent(targetId, {
        content: { notes }
      })

      if (selectedSubtask) {
        setSelectedSubtask(updated)
      } else if (selectedTask) {
        const taskWithCategory = {
          ...updated,
          category: selectedTask.category,
          category_id: selectedTask.category_id || selectedTask.content.category_id
        }
        setSelectedTask(taskWithCategory)
      }
      setOriginalNotes(notes)
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [selectedTask, selectedSubtask, notes, updateTaskSilent, setSelectedSubtask, setSelectedTask, setOriginalNotes])

  // Auto-save setup with stable configuration
  const autoSave = useAutoSave({
    delay: 5000,
    enabled: !!(selectedTask || selectedSubtask),
    onSave: autoSaveNotes,
    hasChanges: useCallback(() => {
      const trimmedNotes = notes.trim()
      const trimmedOriginal = originalNotes.trim()
      if (trimmedNotes === trimmedOriginal) return false

      const lengthDiff = Math.abs(trimmedNotes.length - trimmedOriginal.length)
      const minLength = Math.min(trimmedNotes.length, trimmedOriginal.length)
      const changeRatio = minLength > 0 ? lengthDiff / minLength : 1

      return lengthDiff >= 20 || changeRatio >= 0.3
    }, [notes, originalNotes])
  })

  const handleTaskSelect = useCallback((task: any) => {
    // Cancel auto-save during task switching
    autoSave.cancelAutoSave()

    // Use startTransition for non-urgent UI updates
    startTransition(() => {
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
    })

    // Update URL synchronously for immediate feedback
    updateFocusUrl({ taskId: task.id, subtaskId: null })

    // Reset auto-save after state settles
    setTimeout(() => autoSave.resetAutoSave(), 50)
  }, [setSelectedTask, setSelectedSubtask, setShowSubtasks, setNotes, setOriginalNotes, setTaskInfo, updateFocusUrl, autoSave])

  const handleSubtaskSelect = useCallback((subtask: any) => {
    autoSave.cancelAutoSave()

    const shouldAutoClose = typeof window !== 'undefined' && window.innerWidth < 1024

    startTransition(() => {
      if (selectedTask && subtask.id === selectedTask.id) {
        const taskNotes = selectedTask.content?.notes || ''
        setSelectedSubtask(null)
        setNotes(taskNotes)
        setOriginalNotes(taskNotes)
        if (shouldAutoClose) setShowSubtasks(false)
        updateFocusUrl({ subtaskId: null })
      } else {
        const nextNotes = subtask.content?.notes || ''
        setSelectedSubtask(subtask)
        setNotes(nextNotes)
        setOriginalNotes(nextNotes)
        if (shouldAutoClose) setShowSubtasks(false)
        updateFocusUrl({ subtaskId: subtask.id })
      }
    })

    setTimeout(() => autoSave.resetAutoSave(), 50)
  }, [selectedTask, updateFocusUrl, setSelectedSubtask, setNotes, setOriginalNotes, setShowSubtasks, autoSave])

  const handleSaveNotes = useCallback(async () => {
    if (!selectedTask && !selectedSubtask) return

    autoSave.cancelAutoSave()
    setIsSaving(true)

    try {
      const targetId = selectedSubtask ? selectedSubtask.id : selectedTask.id
      const updated = await updateTask(targetId, { content: { notes } })

      if (selectedSubtask) {
        setSelectedSubtask(updated)
      } else if (selectedTask) {
        const taskWithCategory = {
          ...updated,
          category: selectedTask.category,
          category_id: selectedTask.category_id || selectedTask.content.category_id
        }
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
      setSelectedTask(updatedTask)
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
      setTaskInfo((prev: any) => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }, [t.ui.enterTag, setTaskInfo])

  const removeTag = useCallback((tagToRemove: string) => {
    setTaskInfo((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove)
    }))
  }, [setTaskInfo])

  const handleCompleteTask = useCallback(async (onTaskCompleted?: () => void) => {
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
      }

      setSelectedTask(taskWithCategory)
      setTaskInfo((prev: any) => ({
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
  }, [selectedTask, updateTask, setIsSaving, setSelectedTask, setTaskInfo, timer])

  const handleStatusChange = useCallback(async (newStatus: any) => {
    if (!selectedTask && !selectedSubtask) return

    setIsSaving(true)
    try {
      const targetId = selectedSubtask ? selectedSubtask.id : selectedTask.id
      const updated = await updateTask(targetId, {
        content: { status: newStatus }
      })

      if (selectedSubtask) {
        setSelectedSubtask(updated)
      } else if (selectedTask) {
        const taskWithCategory = {
          ...updated,
          category: selectedTask.category,
          category_id: selectedTask.category_id || selectedTask.content.category_id
        }
        setSelectedTask(taskWithCategory)
        setTaskInfo((prev: any) => ({
          ...prev,
          status: newStatus
        }))
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsSaving(false)
    }
  }, [selectedTask, selectedSubtask, updateTask, setIsSaving, setSelectedTask, setSelectedSubtask, setTaskInfo])

  // Auto-save trigger
  useEffect(() => {
    if ((selectedTask || selectedSubtask) && notes !== originalNotes) {
      autoSave.triggerAutoSave()
    }
  }, [notes, originalNotes, selectedTask, selectedSubtask, autoSave])

  return {
    timer,
    autoSave,
    autoSaveNotes,
    handleTaskSelect,
    handleSubtaskSelect,
    handleSaveNotes,
    handleSaveTaskInfo,
    addTag,
    removeTag,
    handleCompleteTask,
    handleStatusChange
  }
}

function WorkModeViewInner() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? {
    limit: 500,
    root_tasks_only: true,
    sort_by: 'updated_at',
    sort_order: 'desc'
  } : null)
  const { categories } = useCategories()

  // Celebration state
  const { isVisible: celebrationVisible, triggerCelebration, hideCelebration } = useCelebration()

  // Conversation state
  const [conversationMessages, setConversationMessages] = useState<Message[]>([])
  const [messageCount, setMessageCount] = useState(0)

  // Use custom hooks for state management
  const workModeState = useWorkModeState(tasks, categories)
  const {
    selectedTask,
    selectedSubtask,
    notes,
    setNotes,
    originalNotes,
    setOriginalNotes,
    isSaving,
    setIsSaving,
    taskInfo,
    setTaskInfo,
    editingTaskInfo,
    setEditingTaskInfo,
    sidebarVisible,
    setSidebarVisible,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    viewMode,
    setViewMode,
    showTaskInfo,
    setShowTaskInfo,
    showSubtasks,
    setShowSubtasks,
    expandedDescriptions,
    showMemories,
    setShowMemories,
    memoryModalOpen,
    setMemoryModalOpen,
    energyReviewOpen,
    setEnergyReviewOpen,
    energyReviewEntry,
    setEnergyReviewEntry,
    tasksByCategory,
    handleBack,
    toggleDescriptionExpansion,
    toggleCategory,
    expandedCategories,
    subtaskIdParam,
    conversationOpen,
    setConversationOpen,
    conversationMinimized,
    setConversationMinimized,
    conversationWidth,
    setConversationWidth
  } = workModeState

  // Simplified task operations with built-in auto-save
  const taskOperations = useTaskOperationsWithAutoSave({
    selectedTask,
    selectedSubtask,
    notes,
    setNotes,
    originalNotes,
    setOriginalNotes,
    setSelectedTask: workModeState.setSelectedTask,
    setSelectedSubtask: workModeState.setSelectedSubtask,
    setIsSaving,
    taskInfo,
    setTaskInfo,
    setEditingTaskInfo,
    updateFocusUrl: workModeState.updateFocusUrl,
    setShowSubtasks,
  })

  // Create task completion handler with celebration
  const handleCompleteTaskWithCelebration = useCallback(async () => {
    await taskOperations.handleCompleteTask(triggerCelebration)
  }, [taskOperations, triggerCelebration])

  const { handleStatusChange } = taskOperations

  // Stable memory hooks
  const selectedTaskId = selectedTask?.id || ''
  const { anchors: taskAnchors, isLoading: anchorsLoading, refetch: refetchAnchors } = useTaskMemoryAnchors(selectedTaskId)
  const { memories: allMemories, isLoading: memoriesLoading } = useMemories({ limit: 100 })
  const { createMemoryWithAnchor, linkMemoryToTask, removeMemoryFromTask, isLoading: memoryActionLoading } = useMemoryActions()

  // Stable event listeners with startTransition
  useEffect(() => {
    const off = eventBus.onTimerStopped((detail: any) => {
      const entry = detail?.entry
      if (entry) {
        startTransition(() => {
          setEnergyReviewEntry(entry)
          setEnergyReviewOpen(true)
        })
      }
    })
    return off
  }, [setEnergyReviewEntry, setEnergyReviewOpen])

  // Stable memory handlers
  const handleMemoryCreated = useCallback(async (memory: any, anchorData: any) => {
    if (!selectedTask) return
    try {
      await createMemoryWithAnchor(
        { title: memory.title, note: memory.note, tags: memory.tags },
        {
          anchor_item_id: selectedTask.id,
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
  }, [selectedTask, createMemoryWithAnchor, refetchAnchors])

  const handleMemoryLinked = useCallback(async (memoryId: string, anchorData: any) => {
    if (!selectedTask) return
    try {
      await linkMemoryToTask(memoryId, {
        anchor_item_id: selectedTask.id,
        relation_type: anchorData.relation_type,
        weight: anchorData.weight,
        local_time_range: anchorData.local_time_range,
        notes: anchorData.notes
      })
      refetchAnchors()
    } catch (error) {
      console.error('Failed to link memory:', error)
    }
  }, [selectedTask, linkMemoryToTask, refetchAnchors])

  const handleMemoryRemoved = useCallback(async (memoryId: string) => {
    if (!selectedTask) return
    try {
      await removeMemoryFromTask(memoryId, selectedTask.id)
      refetchAnchors()
    } catch (error) {
      console.error('Failed to remove memory:', error)
    }
  }, [selectedTask, removeMemoryFromTask, refetchAnchors])

  // Conversation handlers
  const handleSendMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      context: selectedTask ? {
        taskId: selectedTask.id,
        taskTitle: selectedTask.content.title,
        subtaskId: selectedSubtask?.id
      } : undefined
    }

    setConversationMessages(prev => [...prev, newMessage])
    setMessageCount(prev => prev + 1)

    // Simulate AI response (placeholder for future integration)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Thanks for your message! I understand you're working on "${selectedTask?.content.title || 'your current task'}". While I'm not fully connected yet, I'm here to help you stay organized and focused. What would you like to explore about this task?`,
        timestamp: new Date(),
        context: selectedTask ? {
          taskId: selectedTask.id,
          taskTitle: selectedTask.content.title,
          subtaskId: selectedSubtask?.id
        } : undefined
      }
      setConversationMessages(prev => [...prev, aiResponse])
      setMessageCount(prev => prev + 1)
    }, 1500)
  }, [selectedTask, selectedSubtask])

  // Early returns for loading/error states
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) return <LoginPage />

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

  const subtaskPanelTaskId = selectedTask?.id
  const subtaskPanelTitle = selectedTask?.content?.title
  const subtaskPanelAutoSelectId = selectedSubtask ? null : subtaskIdParam

  return (
    <>
      <div className="flex min-h-[calc(100vh-200px)] lg:min-h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border border-gray-200">
        <TaskSidebar
          sidebarVisible={sidebarVisible}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          viewMode={viewMode}
          setViewMode={setViewMode}
          tasksByCategory={tasksByCategory}
          categories={categories}
          expandedCategories={expandedCategories}
          toggleCategory={toggleCategory}
          selectedTask={selectedTask}
          handleTaskSelect={taskOperations.handleTaskSelect}
        />

        <div className="flex-1 flex flex-col">
          <TaskHeader
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            expandedDescriptions={expandedDescriptions}
            toggleDescriptionExpansion={toggleDescriptionExpansion}
            handleBack={handleBack}
            setMobileSidebarOpen={setMobileSidebarOpen}
            sidebarVisible={sidebarVisible}
            setSidebarVisible={setSidebarVisible}
            showTaskInfo={showTaskInfo}
            setShowTaskInfo={setShowTaskInfo}
            showSubtasks={showSubtasks}
            setShowSubtasks={setShowSubtasks}
            subtaskPanelTaskId={subtaskPanelTaskId}
            subtaskPanelTitle={subtaskPanelTitle}
            handleCompleteTask={handleCompleteTaskWithCelebration}
            handleSaveNotes={taskOperations.handleSaveNotes}
            isSaving={isSaving}
            autoSave={taskOperations.autoSave}
            timer={taskOperations.timer}
            taskAnchors={taskAnchors}
            setShowMemories={setShowMemories}
            showMemories={showMemories}
            refetchAnchors={refetchAnchors}
            conversationOpen={conversationOpen}
            setConversationOpen={setConversationOpen}
            messageCount={messageCount}
          />

          <TaskInfoPanel
            showTaskInfo={showTaskInfo}
            editingTaskInfo={editingTaskInfo}
            setEditingTaskInfo={setEditingTaskInfo}
            taskInfo={taskInfo}
            setTaskInfo={setTaskInfo}
            handleSaveTaskInfo={taskOperations.handleSaveTaskInfo}
            isSaving={isSaving}
            addTag={taskOperations.addTag}
            removeTag={taskOperations.removeTag}
            selectedTask={selectedTask}
          />

          {selectedTask && showMemories && (
            <div className="p-4 lg:p-6 border-b border-gray-200 bg-gray-50">
              <Suspense fallback={<div className="flex items-center justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>}>
                <TaskMemoryDisplay
                  taskId={selectedTask.id}
                  memories={taskAnchors}
                  onAddMemory={() => setMemoryModalOpen(true)}
                  onRemoveMemory={handleMemoryRemoved}
                  onViewMemory={() => {}}
                  isLoading={anchorsLoading}
                  collapsible={true}
                  compact={false}
                />
              </Suspense>
            </div>
          )}

          {showSubtasks && subtaskPanelTaskId && (
            <>
              <div className="hidden lg:block p-4 lg:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-700 truncate">
                    {subtaskPanelTitle ? (
                      <>{t.ui.subtasks} - <span className="text-gray-900">{subtaskPanelTitle}</span></>
                    ) : (
                      t.ui.subtasks
                    )}
                  </div>
                  <button
                    onClick={() => setShowSubtasks(false)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Close subtasks"
                    aria-label="Close subtasks"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Suspense fallback={<div className="flex items-center justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>}>
                  <SubtaskSection
                    taskId={subtaskPanelTaskId}
                    onSubtaskSelect={taskOperations.handleSubtaskSelect}
                    selectedSubtaskId={selectedSubtask?.id}
                    autoSelectSubtaskId={subtaskPanelAutoSelectId}
                    onSubtaskCompleted={triggerCelebration}
                  />
                </Suspense>
              </div>

              <div className="lg:hidden fixed inset-0 z-50">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setShowSubtasks(false)}
                />
                <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-2xl shadow-lg">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 gap-2">
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                      {subtaskPanelTitle ? `${t.ui.subtasks} - ${subtaskPanelTitle}` : t.ui.subtasks}
                    </span>
                    <button
                      onClick={() => setShowSubtasks(false)}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      aria-label="Close subtasks"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto">
                    <Suspense fallback={<div className="flex items-center justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>}>
                      <SubtaskSection
                        taskId={subtaskPanelTaskId}
                        onSubtaskSelect={taskOperations.handleSubtaskSelect}
                        selectedSubtaskId={selectedSubtask?.id}
                        autoSelectSubtaskId={subtaskPanelAutoSelectId}
                        onSubtaskCompleted={triggerCelebration}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </>
          )}

          <WorkModeEditor
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            notes={notes}
            setNotes={setNotes}
            onStatusChange={handleStatusChange}
            conversationOpen={conversationOpen}
            onConversationClose={() => setConversationOpen(false)}
            onConversationOpen={() => setConversationOpen(true)}
            conversationMessages={conversationMessages}
            onSendMessage={handleSendMessage}
            conversationMinimized={conversationMinimized}
            onToggleConversationMinimize={() => setConversationMinimized(prev => !prev)}
            conversationWidth={conversationWidth}
            onConversationWidthChange={setConversationWidth}
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <MemoryManagementModal
          isOpen={memoryModalOpen}
          onClose={() => setMemoryModalOpen(false)}
          taskId={selectedTask?.id || ''}
          taskTitle={selectedTask?.content.title || ''}
          onMemoryCreated={handleMemoryCreated}
          onMemoryLinked={handleMemoryLinked}
          isLoading={memoryActionLoading}
        />
      </Suspense>

      <Suspense fallback={null}>
        <EnergyReviewModal
          open={energyReviewOpen}
          entry={energyReviewEntry}
          onClose={() => setEnergyReviewOpen(false)}
        />
      </Suspense>

      <CelebrationAnimation
        isVisible={celebrationVisible}
        onComplete={hideCelebration}
      />
    </>
  )
}

export default function WorkModeView() {
  usePerformanceTracking('WorkModeView')
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