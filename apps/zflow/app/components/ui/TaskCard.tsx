'use client'

import React from 'react'
import { Info, ChevronDown } from 'lucide-react'
import { TaskMemory, TaskContent } from '../../../lib/api'
import { getPriorityIcon, getTimerIcon } from './TaskIcons'
import StatusIndicator from './task-card/StatusIndicator'
import ActionButtons from './task-card/ActionButtons'
import Footer from './task-card/Footer'

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
              <StatusIndicator variant={variant} isCompleted={isCompleted} isTiming={isTiming} isInProgress={isInProgress} />
            </button>
          )}
          {variant !== 'current' && (
            <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0">
              <StatusIndicator variant={variant} isCompleted={isCompleted} isTiming={isTiming} isInProgress={isInProgress} />
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
            },
            undefined,
            { start: t.activity?.startTimer || 'Start Timer', stop: t.activity?.stopTimer || 'Stop Timer' }
          )}
        </div>
        <ActionButtons 
          variant={variant} 
          t={t} 
          task={task}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onShowTime={onShowTime}
          onHoldTask={onHoldTask}
        />
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
                {t.ui?.timing || 'Timing'} {formatElapsedTime(timer.elapsedMs)}
              </span>
            ) : isInProgress && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                {t.ui?.inProgress || 'In Progress'}
              </span>
            )}
          </div>
        )}
        
        {c.description && expandedDescriptions.has(task.id) && (
          <p className="text-xs text-gray-600">{c.description}</p>
        )}
      </div>

      {/* Footer */}
      <Footer 
        variant={variant}
        task={task}
        categories={categories}
        displayMode={displayMode}
        t={t}
        onReopenTask={onReopenTask}
        onActivateTask={onActivateTask}
        onUpdateCategory={onUpdateCategory}
      />
    </div>
  )
}
