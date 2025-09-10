'use client'

import React from 'react'
import { Pencil, Trash2, Timer, Hourglass } from 'lucide-react'
import type { TaskCardVariant } from '../TaskCard'

interface Props {
  variant: TaskCardVariant
  t: any
  task: any
  onEditTask: (task: any) => void
  onDeleteTask: (taskId: string) => void
  onShowTime: (task: { id: string; title: string }) => void
  onHoldTask?: (taskId: string) => void
}

export default function ActionButtons({ variant, t, task, onEditTask, onDeleteTask, onShowTime, onHoldTask }: Props) {
  const c = task?.content || {}
  const common = (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); onEditTask(task) }}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
        title={t.task?.editTask || 'Edit Task'}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id) }}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
        title={t.task?.deleteTask || 'Delete Task'}
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onShowTime({ id: task.id, title: c.title }) }}
        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
        title={t.task?.viewTime || 'View focus time'}
      >
        <Timer className="w-4 h-4" />
      </button>
    </>
  )

  if (variant === 'current') {
    return (
      <div className="flex items-center gap-1">
        {onHoldTask && c.status !== 'on_hold' && c.status !== 'completed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onHoldTask(task.id) }}
            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md"
            title={t.task?.holdTask || 'Hold task'}
          >
            <Hourglass className="w-4 h-4" />
          </button>
        )}
        {common}
      </div>
    )
  }

  return <div className="flex items-center gap-1">{common}</div>
}

