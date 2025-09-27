'use client'

import React, { memo, useState, useEffect, useRef } from 'react'
import { ChevronDown, Bot } from 'lucide-react'
import { useTranslation } from '../../../../contexts/LanguageContext'
import { TaskMemory } from '../../../../lib/api'
import { TaskWithCategory } from './TaskSidebar'
import { Task } from 'types'
import { AITaskEditor, type AITaskForm } from '@/app/components/profile'

interface WorkModeEditorHeaderProps {
  selectedTask: TaskWithCategory
  selectedSubtask: TaskMemory | null
  onStatusChange?: (newStatus: Task['status']) => void
}

const WorkModeEditorHeader = memo(function WorkModeEditorHeader({
  selectedTask,
  selectedSubtask,
  onStatusChange
}: WorkModeEditorHeaderProps) {
  const { t } = useTranslation()
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [isAITaskModalOpen, setIsAITaskModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 获取当前状态
  const currentStatus = selectedSubtask ? selectedSubtask.content.status : selectedTask.content.status

  // 状态选项
  const statusOptions: {
    value: Task['status']
    label: string
    badgeClass: string
    dotClass: string
  }[] = [
    {
      value: 'pending',
      label: t.task.statusPending,
      badgeClass: 'bg-gray-100 text-gray-800',
      dotClass: 'bg-gray-400'
    },
    {
      value: 'in_progress',
      label: t.task.statusInProgress,
      badgeClass: 'bg-blue-100 text-blue-800',
      dotClass: 'bg-blue-500'
    },
    {
      value: 'completed',
      label: t.task.statusCompleted,
      badgeClass: 'bg-green-100 text-green-800',
      dotClass: 'bg-green-500'
    },
    {
      value: 'cancelled',
      label: t.task.statusCancelled,
      badgeClass: 'bg-red-100 text-red-800',
      dotClass: 'bg-red-500'
    },
    {
      value: 'on_hold',
      label: t.task.statusOnHold,
      badgeClass: 'bg-yellow-100 text-yellow-900',
      dotClass: 'bg-yellow-500'
    }
  ]

  // 获取当前状态的样式
  const getStatusStyle = (status: Task['status']) => {
    const option = statusOptions.find(opt => opt.value === status)
    return option ? option.badgeClass : 'bg-gray-100 text-gray-800'
  }

  const getStatusDotClass = (status: Task['status']) => {
    const option = statusOptions.find(opt => opt.value === status)
    return option ? option.dotClass : 'bg-gray-400'
  }

  // 获取当前状态的标签
  const getStatusLabel = (status: Task['status']) => {
    const option = statusOptions.find(opt => opt.value === status)
    return option ? option.label : status
  }

  // 处理状态变更
  const handleStatusChange = (newStatus: Task['status']) => {
    if (onStatusChange && newStatus !== currentStatus) {
      onStatusChange(newStatus)
    }
    setIsEditingStatus(false)
  }

  // 准备AI任务编辑器的初始数据
  const getAITaskInitialData = (): Partial<AITaskForm> => {
    const currentItem = selectedSubtask || selectedTask
    const itemTitle = selectedSubtask
      ? selectedSubtask.content.title
      : selectedTask.content.title
    const itemCategory = selectedTask.content.category || selectedTask.category?.name || ''

    return {
      task_id: currentItem.id,
      objective: `Complete: ${itemTitle}`,
      context: `Category: ${itemCategory}\nCurrent Status: ${currentStatus}\n\n${selectedSubtask ? 'This is a subtask' : 'This is a main task'}`,
      deliverables: selectedSubtask ? 'Completed subtask with documented progress' : 'Completed task with all requirements met',
      acceptance_criteria: 'Task status updated to completed and deliverables provided',
      metadata: {
        priority: 'medium' as const,
        tags: itemCategory ? [itemCategory] : []
      }
    }
  }

  // 处理AI任务模态框关闭
  const handleAITaskModalClose = () => {
    setIsAITaskModalOpen(false)
  }

  // 处理AI任务保存成功
  const handleAITaskSaved = (aiTaskId: string) => {
    console.log('AI task created with ID:', aiTaskId)
    setIsAITaskModalOpen(false)
  }

  // 点击外部区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsEditingStatus(false)
      }
    }

    if (isEditingStatus) {
      document.addEventListener('mousedown', handleClickOutside)
      // 在移动端也监听触摸事件
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isEditingStatus])

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsEditingStatus(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 text-xs text-gray-500 w-full">
      {selectedSubtask ? (
        <>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full flex-shrink-0 font-medium">
            📝 Subtask
          </span>
          <span className="flex-1 min-w-0 font-medium text-blue-900 break-words">
            {selectedSubtask.content.title}
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
      
      {/* 状态显示和编辑 */}
      <div ref={containerRef} className="relative flex items-center gap-2">
        {/* Assign to AI Button */}
        <button
          onClick={() => setIsAITaskModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 touch-manipulation min-h-[32px] sm:min-h-[36px] shadow-sm border border-blue-200 text-blue-600 bg-blue-50/50"
          title="Assign to AI"
          aria-label="Assign task to AI agent"
        >
          <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="hidden sm:inline truncate">AI</span>
        </button>

        <button
          onClick={() => setIsEditingStatus(prev => !prev)}
          className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium transition-all duration-200 hover:opacity-85 active:scale-95 touch-manipulation min-h-[32px] sm:min-h-[36px] shadow-sm ${getStatusStyle(currentStatus)}`}
          title={t.common.edit}
          aria-label={`${t.common.edit} ${t.task.status}`}
          aria-haspopup="listbox"
          aria-expanded={isEditingStatus}
        >
          <span className="truncate max-w-[8rem] sm:max-w-[6rem]">
            {getStatusLabel(currentStatus)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" aria-hidden="true" />
        </button>

        {isEditingStatus && (
          <div className="absolute right-0 top-full z-20 mt-1.5 w-52 max-w-[80vw] rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div
              role="listbox"
              aria-activedescendant={`status-${currentStatus}`}
              tabIndex={-1}
              onKeyDown={handleKeyDown}
              className="max-h-64 overflow-y-auto p-1"
            >
              {statusOptions.map(option => {
                const isActive = option.value === currentStatus
                return (
                  <button
                    key={option.value}
                    id={`status-${option.value}`}
                    role="option"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => handleStatusChange(option.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm sm:px-4 sm:py-3 sm:text-base font-medium transition-colors touch-manipulation ${
                      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${option.dotClass}`} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Task Editor Modal */}
      <AITaskEditor
        isOpen={isAITaskModalOpen}
        initial={getAITaskInitialData()}
        onClose={handleAITaskModalClose}
        onSaved={handleAITaskSaved}
      />
    </div>
  )
})

export default WorkModeEditorHeader
