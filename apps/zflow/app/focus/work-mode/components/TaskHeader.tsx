'use client'

import React, { memo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, KanbanSquare,
  Clock, Play, Square, CheckCircle, Settings, ListTodo, Save,
  ChevronDown, Info
} from 'lucide-react'
import { TaskMemory } from '../../../../lib/api'
import { useTranslation } from '../../../../contexts/LanguageContext'
import { useTimer } from '../../../../hooks/useTimer'
import { useAutoSave } from '../../../../hooks/useAutoSave'
import MemoryAnchorButton from '../../../components/memory/MemoryAnchorButton'
import { TaskWithCategory } from './TaskSidebar'

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
  refetchAnchors
}: TaskHeaderProps) {
  const { t } = useTranslation()

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

            {/* Complete Button - Only show if task is not already completed */}
            {selectedTask.content.status !== 'completed' && (
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
      )}
    </>
  )
})

export default TaskHeader