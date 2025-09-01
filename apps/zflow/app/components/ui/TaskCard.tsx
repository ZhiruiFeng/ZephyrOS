'use client'

import React from 'react'
import { ListTodo, Tag, Calendar, Pencil, Trash2, Timer, Info, ChevronDown, Hourglass, Archive, CheckCircle, Square, Play } from 'lucide-react'
import { TaskMemory, TaskContent } from '../../../lib/api'
import { getPriorityIcon, getTimerIcon } from './TaskIcons'
import { formatDate, getTaskDisplayDate, shouldShowOverdue } from '../../utils/taskUtils'

export type TaskCardVariant = 'current' | 'future' | 'archive'

interface TaskCardProps {
  task: TaskMemory
  variant: TaskCardVariant
  categories: any[]
  timer: {
    isRunning: boolean
    runningTaskId?: string
    elapsedMs: number
    start: (taskId: string, options?: any) => void
    stop: (taskId: string) => void
  }
  displayMode: 'list' | 'grid'
  expandedDescriptions: Set<string>
  t: any // translations
  
  // Event handlers
  onTaskClick: (taskId: string) => void
  onToggleComplete: (taskId: string, currentStatus: string) => void
  onHoldTask: (taskId: string) => void
  onEditTask: (task: any) => void
  onDeleteTask: (taskId: string) => void
  onShowTime: (task: { id: string; title: string }) => void
  onToggleDescription: (taskId: string) => void
  onActivateTask?: (taskId: string) => void
  onReopenTask?: (taskId: string) => void
  onUpdateCategory?: (taskId: string, categoryId: string | undefined) => void
}

export default function TaskCard({
  task,
  variant,
  categories,
  timer,
  displayMode,
  expandedDescriptions,
  t,
  onTaskClick,
  onToggleComplete,
  onHoldTask,
  onEditTask,
  onDeleteTask,
  onShowTime,
  onToggleDescription,
  onActivateTask,
  onReopenTask,
  onUpdateCategory
}: TaskCardProps) {
  const c = task.content as TaskContent
  const isInProgress = c.status === 'in_progress'
  const isTiming = timer.runningTaskId === task.id
  const isCompleted = c.status === 'completed'
  const isOnHold = variant === 'future'

  // Format elapsed time from milliseconds
  const formatElapsedTime = (elapsedMs: number): string => {
    const totalSeconds = Math.floor(elapsedMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Get card styling based on state
  const getCardStyling = () => {
    if (isTiming) {
      return 'bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-400 shadow-lg shadow-green-200/60 ring-2 ring-green-300/50 hover:shadow-xl hover:shadow-green-200/70'
    }
    if (isInProgress && variant === 'current') {
      return 'bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-300 shadow-lg shadow-primary-200/50 hover:shadow-xl hover:shadow-primary-200/60'
    }
    return 'glass'
  }

  // Get status indicator
  const getStatusIndicator = () => {
    if (variant === 'archive') {
      return isCompleted ? (
        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
      ) : (
        <Archive className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
      )
    }

    if (variant === 'future') {
      return <ListTodo className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
    }

    // Current view
    if (isCompleted) {
      return (
        <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/>
        </svg>
      )
    }
    
    if (isTiming) {
      return (
        <div className="relative">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <div className="absolute inset-0 w-4 h-4 md:w-5 md:h-5 border-2 border-green-600 rounded-full animate-ping"></div>
          <div className="absolute inset-1 w-2 h-2 md:w-3 md:h-3 bg-green-600 rounded-full animate-pulse"></div>
        </div>
      )
    }
    
    if (isInProgress) {
      return (
        <div className="relative">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <div className="absolute inset-0 w-4 h-4 md:w-5 md:h-5 border-2 border-primary-600 rounded-full animate-pulse"></div>
        </div>
      )
    }
    
    return (
      <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    )
  }

  // Get action buttons based on variant
  const getActionButtons = () => {
    const commonButtons = (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEditTask(task)
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
          title={t.task?.editTask || "编辑任务"}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDeleteTask(task.id)
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
          title={t.task?.deleteTask || "删除任务"}
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onShowTime({ id: task.id, title: c.title })
          }}
          className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
          title={t.task?.viewTime || "查看专注时间"}
        >
          <Timer className="w-4 h-4" />
        </button>
      </>
    )

    if (variant === 'current') {
      return (
        <div className="flex items-center gap-1">
          {c.status !== 'on_hold' && c.status !== 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onHoldTask(task.id)
              }}
              className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md"
              title={t.task?.holdTask || "暂停任务"}
            >
              <Hourglass className="w-4 h-4" />
            </button>
          )}
          {commonButtons}
        </div>
      )
    }

    return <div className="flex items-center gap-1">{commonButtons}</div>
  }

  // Get category display
  const getCategoryDisplay = () => {
    const categoryId = (task as any).category_id || c.category_id
    const category = categoryId ? categories.find(cat => cat.id === categoryId) : null
    
    if (!category) return null
    
    return (
      <div className="flex items-center gap-1">
        <Tag className="w-3 h-3" />
        <span style={{ color: category.color || '#6B7280' }}>
          {category.name}
        </span>
      </div>
    )
  }

  // Get footer content based on variant
  const getFooterContent = () => {
    const categoryDisplay = getCategoryDisplay()
    
    if (variant === 'current') {
      return (
        <div className={`text-xs text-gray-500 space-y-1 ${displayMode === 'grid' ? '' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1'}`}>
          <div className="flex items-center gap-1">
            <span>{t.ui?.createdAt || '创建于'} {formatDate(task.created_at)}</span>
          </div>
          <div className={`flex items-center gap-2 ${displayMode === 'grid' ? 'flex-wrap' : ''}`}>
            {categoryDisplay}
            {getTaskDisplayDate(c.status, c.due_date, c.completion_date) && (
              <div className={`flex items-center gap-1 ${shouldShowOverdue(c.status, c.due_date) ? 'text-red-600' : ''}`}>
                <Calendar className="w-3 h-3" />
                <span>
                  {formatDate(getTaskDisplayDate(c.status, c.due_date, c.completion_date)!)}
                  {shouldShowOverdue(c.status, c.due_date) && ` • ${t.ui?.overdue || '逾期'}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (variant === 'future') {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t.ui?.createdAt || '创建于'} {formatDate(task.created_at)}</span>
            {categoryDisplay}
          </div>
          <div className={`${displayMode === 'grid' ? 'space-y-2' : 'flex flex-col sm:flex-row sm:items-center gap-2'}`}>
            {onUpdateCategory && (
              <select
                value={(task as any).category_id || (c as any).category_id || ''}
                onChange={(e) => onUpdateCategory(task.id, e.target.value || undefined)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">{t.ui?.noCategory || '无分类'}</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}
            
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditTask(task)
                }}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title={t.task?.editTask || '编辑任务'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              {onActivateTask && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    onActivateTask(task.id)
                  }}
                  className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors duration-200"
                >
                  {t.task?.activateTask || '激活任务'}
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (variant === 'archive') {
      return (
        <div className={`text-xs text-gray-500 ${displayMode === 'grid' ? 'space-y-1' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'}`}>
          <div className="flex items-center justify-between">
            <span>
              {isCompleted ? (t.ui?.completedAt || '完成于') : (t.ui?.cancelledAt || '取消于')} {formatDate(isCompleted && c.completion_date ? c.completion_date : task.created_at)}
            </span>
            {categoryDisplay}
          </div>
          {isCompleted && onReopenTask && (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onReopenTask(task.id)
              }}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-lg border border-gray-300 hover:bg-white/50 transition-colors duration-200"
            >
              {t.task?.reopenTask || '重新打开'}
            </button>
          )}
        </div>
      )
    }
  }

  return (
    <div 
      className={`${getCardStyling()} rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer`}
      onClick={(e) => {
        // Prevent click when clicking on buttons or select elements
        if ((e.target as HTMLElement).tagName === 'BUTTON' || 
            (e.target as HTMLElement).tagName === 'SELECT' ||
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('select')) {
          return
        }
        onTaskClick(task.id)
      }}
    >
      {/* Header with action buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {variant === 'current' && (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onToggleComplete(task.id, c.status)
              }}
              className="flex-shrink-0"
            >
              {getStatusIndicator()}
            </button>
          )}
          {variant !== 'current' && (
            <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0">
              {getStatusIndicator()}
            </div>
          )}
          {getPriorityIcon(c.priority)}
          {getTimerIcon(
            timer.isRunning,
            timer.runningTaskId === task.id,
            (e) => {
              e.stopPropagation()
              if (timer.isRunning && timer.runningTaskId === task.id) {
                timer.stop(task.id)
              } else {
                timer.start(task.id, { autoSwitch: true })
              }
            }
          )}
        </div>
        {getActionButtons()}
      </div>

      {/* Title and description */}
      <div className="mb-3">
        <div className="flex items-start gap-2 mb-2">
          <h3 className={`font-medium text-sm md:text-base flex-1 ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {c.title}
          </h3>
          {c.description && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleDescription(task.id)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              title={expandedDescriptions.has(task.id) ? "Hide description" : "Show description"}
            >
              {expandedDescriptions.has(task.id) ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <Info className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
        
        {/* Status badges for current view */}
        {variant === 'current' && (isTiming || isInProgress) && (
          <div className="mb-2">
            {isTiming ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                {t.ui?.timing || '计时中'} {formatElapsedTime(timer.elapsedMs)}
              </span>
            ) : isInProgress && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                {t.ui?.inProgress || '进行中'}
              </span>
            )}
          </div>
        )}
        
        {c.description && expandedDescriptions.has(task.id) && (
          <p className="text-xs text-gray-600">{c.description}</p>
        )}
      </div>

      {/* Footer */}
      {getFooterContent()}
    </div>
  )
}