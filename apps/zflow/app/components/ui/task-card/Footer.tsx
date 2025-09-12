'use client'

import React from 'react'
import { Calendar, Tag } from 'lucide-react'
import type { TaskCardVariant } from '../TaskCard'
import { formatDate, getTaskDisplayDate, shouldShowOverdue } from '../../../utils/taskUtils'

interface Props {
  variant: TaskCardVariant
  task: any
  categories: any[]
  displayMode: 'list' | 'grid'
  t: any
  onReopenTask?: (taskId: string) => void
  onActivateTask?: (taskId: string) => void
  onUpdateCategory?: (taskId: string, categoryId: string | undefined) => void
}

export default function Footer({ variant, task, categories, displayMode, t, onReopenTask, onActivateTask, onUpdateCategory }: Props) {
  const c = task.content || {}
  const isCompleted = c.status === 'completed'

  const categoryId = (task as any).category_id || c.category_id
  const category = categoryId ? categories.find((cat: any) => cat.id === categoryId) : null

  const CategoryDisplay = category ? (
    <div className="flex items-center gap-1">
      <Tag className="w-3 h-3" />
      <span style={{ color: category.color || '#6B7280' }}>{category.name}</span>
    </div>
  ) : null

  if (variant === 'current') {
    return (
      <div className={`text-xs text-gray-500 space-y-1 ${displayMode === 'grid' ? '' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1'}`}>
        <div className="flex items-center gap-1">
          <span>{t.ui?.createdAt || 'Created at'} {formatDate(task.created_at)}</span>
        </div>
        <div className={`flex items-center gap-2 ${displayMode === 'grid' ? 'flex-wrap' : ''}`}>
          {CategoryDisplay}
          {getTaskDisplayDate(c.status, c.due_date, c.completion_date) && (
            <div className={`flex items-center gap-1 ${shouldShowOverdue(c.status, c.due_date) ? 'text-red-600' : ''}`}>
              <Calendar className="w-3 h-3" />
              <span>
                {formatDate(getTaskDisplayDate(c.status, c.due_date, c.completion_date)!)}
                {shouldShowOverdue(c.status, c.due_date) && ` • ${t.ui?.overdue || 'Overdue'}`}
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
          <span>{t.ui?.createdAt || 'Created at'} {formatDate(task.created_at)}</span>
          {CategoryDisplay}
        </div>
        <div className={`${displayMode === 'grid' ? 'space-y-2' : 'flex flex-col sm:flex-row sm:items-center gap-2'}`}>
          {onUpdateCategory && (
            <select
              value={(task as any).category_id || (c as any).category_id || ''}
              onChange={(e) => onUpdateCategory(task.id, e.target.value || undefined)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">{t.ui?.noCategory || 'No Category'}</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
          {onActivateTask && (
            <button 
              onClick={(e) => { e.stopPropagation(); onActivateTask(task.id) }}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors duration-200"
            >
              {t.task?.activateTask || 'Activate'}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'archive') {
    return (
      <div className={`text-xs text-gray-500 ${displayMode === 'grid' ? 'space-y-1' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'}`}>
        <div className="flex items-center justify-between">
          <span>
            {isCompleted ? (t.ui?.completedAt || 'Completed at') : (t.ui?.cancelledAt || 'Cancelled at')} {formatDate(isCompleted && c.completion_date ? c.completion_date : task.created_at)}
          </span>
          {CategoryDisplay}
        </div>
        {isCompleted && onReopenTask && (
          <button 
            onClick={(e) => { e.stopPropagation(); onReopenTask(task.id) }}
            className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-lg border border-gray-300 hover:bg-white/50 transition-colors duration-200"
          >
            {t.task?.reopenTask || 'Reopen'}
          </button>
        )}
      </div>
    )
  }

  return null
}
