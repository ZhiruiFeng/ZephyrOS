'use client'

import React, { memo, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, KanbanSquare,
  Clock, Play, Square, CheckCircle, Settings, ListTodo, Save,
  ChevronDown, Info, BookOpen, X
} from 'lucide-react'
import { TaskMemory } from '@/lib/api'
import { useTranslation } from '@/contexts/LanguageContext'
import { useTimer } from '@/hooks/useTimer'
import { useAutoSave } from '@/hooks/useAutoSave'
import MemoryAnchorButton from '@/features/memory/components/MemoryAnchorButton'
import ConversationButton from './ConversationButton'
import { TaskWithCategory } from './TaskSidebar'
import { PrincipleSelectorModal, CorePrincipleMemory } from '@/shared/components/selectors/PrincipleSelector'
import { corePrinciplesApi } from '@/lib/api/core-principles-api'

interface TaskHeaderProps {
  selectedTask: TaskWithCategory | null
  selectedSubtask: TaskMemory | null
  expandedDescriptions: Set<string>
  toggleDescriptionExpansion: (taskId: string) => void
  handleBack: () => void
  setMobileSidebarOpen: (open: boolean) => void
  sidebarVisible: boolean
  setSidebarVisible: (visible: boolean) => void
  showTaskInfo: boolean
  setShowTaskInfo: (show: boolean) => void
  showSubtasks: boolean
  setShowSubtasks: (show: boolean) => void
  subtaskPanelTaskId: string | undefined
  subtaskPanelTitle: string | undefined
  handleCompleteTask: () => Promise<void>
  handleSaveNotes: () => Promise<void>
  isSaving: boolean
  autoSave: ReturnType<typeof useAutoSave>
  timer: ReturnType<typeof useTimer>
  taskAnchors: any[]
  setShowMemories: (fn: (prev: boolean) => boolean) => void
  showMemories: boolean
  refetchAnchors: () => void
  conversationOpen: boolean
  setConversationOpen: (open: boolean) => void
  messageCount: number
}

const TaskHeader = memo(function TaskHeader({
  selectedTask,
  selectedSubtask,
  expandedDescriptions,
  toggleDescriptionExpansion,
  handleBack,
  setMobileSidebarOpen,
  sidebarVisible,
  setSidebarVisible,
  showTaskInfo,
  setShowTaskInfo,
  showSubtasks,
  setShowSubtasks,
  subtaskPanelTaskId,
  subtaskPanelTitle,
  handleCompleteTask,
  handleSaveNotes,
  isSaving,
  autoSave,
  timer,
  taskAnchors,
  setShowMemories,
  showMemories,
  refetchAnchors,
  conversationOpen,
  setConversationOpen,
  messageCount
}: TaskHeaderProps) {
  const { t } = useTranslation()
  const [showPrincipleSelector, setShowPrincipleSelector] = useState(false)
  const [selectedPrinciples, setSelectedPrinciples] = useState<CorePrincipleMemory[]>([])
  const [principleMappings, setPrincipleMappings] = useState<Map<string, string>>(new Map()) // principleId -> mappingId

  // Load existing principle mappings when task changes
  useEffect(() => {
    const loadPrincipleMappings = async () => {
      if (!selectedTask) {
        setSelectedPrinciples([])
        setPrincipleMappings(new Map())
        return
      }

      try {
        // Fetch mappings for this timeline item
        // Only fetch user's custom principles
        const userPrinciples = await corePrinciplesApi.getCustom()
        const mappedPrinciples: CorePrincipleMemory[] = []
        const mappings = new Map<string, string>()

        for (const principle of userPrinciples) {
          try {
            const principleMappings = await corePrinciplesApi.getTimelineMappings(
              principle.id,
              selectedTask.id
            )
            if (principleMappings && principleMappings.length > 0) {
              mappedPrinciples.push(principle as any)
              mappings.set(principle.id, principleMappings[0].id)
            }
          } catch (err) {
            // Principle has no mappings for this task, skip
          }
        }

        setSelectedPrinciples(mappedPrinciples as any)
        setPrincipleMappings(mappings)
      } catch (err) {
        console.error('Failed to load principle mappings:', err)
      }
    }

    loadPrincipleMappings()
  }, [selectedTask?.id])

  const handleSelectPrinciple = async (principle: CorePrincipleMemory) => {
    // Add principle if not already selected
    if (!selectedPrinciples.find(p => p.id === principle.id) && selectedTask) {
      try {
        // Create the mapping in the database
        const mapping = await corePrinciplesApi.createTimelineMapping(
          principle.id,
          selectedTask.id,
          'pre_decision'
        )

        setSelectedPrinciples([...selectedPrinciples, principle])
        setPrincipleMappings(prev => new Map(prev).set(principle.id, mapping.id))
      } catch (err) {
        console.error('Failed to create principle mapping:', err)
        alert('Failed to add principle. Please try again.')
      }
    }
  }

  const handleRemovePrinciple = async (principleId: string) => {
    const mappingId = principleMappings.get(principleId)
    if (mappingId) {
      try {
        // Delete the mapping from the database
        await corePrinciplesApi.deleteTimelineMapping(principleId, mappingId)
        setSelectedPrinciples(selectedPrinciples.filter(p => p.id !== principleId))
        setPrincipleMappings(prev => {
          const next = new Map(prev)
          next.delete(principleId)
          return next
        })
      } catch (err) {
        console.error('Failed to delete principle mapping:', err)
        alert('Failed to remove principle. Please try again.')
      }
    }
  }

  return (
    <>
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

      {/* Task Header - Only show when task is selected */}
      {selectedTask && (
        <div className="p-4 lg:p-6 border-b border-gray-200">
        {/* Task Info Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 break-words">
              {selectedTask.content.title}
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
          {/* Category, Timer, and Start/Stop Section */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {selectedTask.category && (
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedTask.category.color }}
                />
                <span className="text-sm text-gray-500">{selectedTask.category.name}</span>
              </div>
            )}

            {/* Ultra-compact Timer */}
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

            {/* Start/Stop Button */}
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
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-wrap items-center gap-1 md:gap-2 min-h-[36px] sm:min-h-[40px] mt-3">
          {/* Left Side Controls */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 overflow-x-auto">
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
              onClick={() => subtaskPanelTaskId && setShowSubtasks(!showSubtasks)}
              disabled={!subtaskPanelTaskId}
              className="flex items-center justify-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors text-xs min-w-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
              title={subtaskPanelTitle ? `${t.ui.subtasks}: ${subtaskPanelTitle}` : t.ui.subtasks}
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

            {/* Conversation Button */}
            <ConversationButton
              onClick={() => setConversationOpen(!conversationOpen)}
              isActive={conversationOpen}
              messageCount={messageCount}
              disabled={!selectedTask}
            />
          </div>

          {/* Save Controls - Right Side */}
          <div className="flex items-center ml-auto gap-1 md:gap-2">
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

            {/* Complete Button - Only show if task is not already completed */}
            {selectedTask.content.status !== 'completed' && (
              <button
                onClick={handleCompleteTask}
                disabled={isSaving}
                className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 text-white bg-green-600 hover:bg-green-700 rounded transition-colors text-xs min-w-[50px] sm:min-w-[100px] disabled:opacity-50"
              >
                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                <span className="hidden sm:inline ml-1 truncate">{t.task.markCompleted}</span>
              </button>
            )}

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

        {/* Principles Section - New Row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {selectedPrinciples.map((principle) => (
            <div
              key={principle.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs border border-purple-200 hover:bg-purple-100 transition-colors"
              title={principle.content.description}
            >
              <BookOpen className="w-3 h-3" />
              <span className="max-w-[120px] truncate">{principle.content.title}</span>
              <button
                onClick={() => handleRemovePrinciple(principle.id)}
                className="ml-0.5 hover:text-purple-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add Principle Button */}
          <button
            onClick={() => setShowPrincipleSelector(true)}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-full text-xs border border-gray-300 hover:border-purple-300 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            <span>Add Principle</span>
          </button>
        </div>
        </div>
      )}

      {/* Principle Selector Modal */}
      <PrincipleSelectorModal
        isOpen={showPrincipleSelector}
        onSelectPrinciple={(principle) => {
          handleSelectPrinciple(principle)
          setShowPrincipleSelector(false)
        }}
        onCancel={() => setShowPrincipleSelector(false)}
        title="Select a Principle for this Task"
        config={{
          statuses: ['active'],
          sources: ['user_custom'], // Only show user's own principles
          sortBy: 'importance_level',
          sortOrder: 'desc'
        }}
        showCreateNew={false}
      />
    </>
  )
})

export default TaskHeader