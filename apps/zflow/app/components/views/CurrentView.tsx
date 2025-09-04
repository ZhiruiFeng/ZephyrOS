'use client'

import React from 'react'
import { TaskMemory } from '../../../lib/api'
import TaskCard from '../ui/TaskCard'

interface CurrentViewProps {
  tasks: TaskMemory[]
  categories: any[]
  timer: any
  displayMode: 'list' | 'grid'
  expandedDescriptions: Set<string>
  t: any
  
  // Event handlers
  onTaskClick: (taskId: string) => void
  onToggleComplete: (taskId: string, currentStatus: string) => void
  onHoldTask: (taskId: string) => void
  onEditTask: (task: any) => void
  onDeleteTask: (taskId: string) => void
  onShowTime: (task: { id: string; title: string }) => void
  onToggleDescription: (taskId: string) => void
}

export default function CurrentView({
  tasks,
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
  onToggleDescription
}: CurrentViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
        {t.ui?.noCurrentTasks || 'No current tasks'}
      </div>
    )
  }

  return (
    <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          variant="current"
          categories={categories}
          timer={timer}
          displayMode={displayMode}
          expandedDescriptions={expandedDescriptions}
          t={t}
          onTaskClick={onTaskClick}
          onToggleComplete={onToggleComplete}
          onHoldTask={onHoldTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onShowTime={onShowTime}
          onToggleDescription={onToggleDescription}
        />
      ))}
    </div>
  )
}
