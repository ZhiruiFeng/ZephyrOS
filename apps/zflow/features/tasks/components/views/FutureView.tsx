'use client'

import React from 'react'
import { TaskMemory } from '@/lib/api'
import TaskCard from '../ui/TaskCard'

interface FutureViewProps {
  tasks: TaskMemory[]
  categories: any[]
  timer: any
  displayMode: 'list' | 'grid'
  expandedDescriptions: Set<string>
  t: any
  
  // Event handlers
  onTaskClick: (taskId: string) => void
  onEditTask: (task: any) => void
  onDeleteTask: (taskId: string) => void
  onShowTime: (task: { id: string; title: string }) => void
  onToggleDescription: (taskId: string) => void
  onActivateTask: (taskId: string) => void
  onUpdateCategory: (taskId: string, categoryId: string | undefined) => void
}

const FutureView = React.memo(function FutureView({
  tasks,
  categories,
  timer,
  displayMode,
  expandedDescriptions,
  t,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onShowTime,
  onToggleDescription,
  onActivateTask,
  onUpdateCategory
}: FutureViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
        {t.ui?.noBacklogItems || 'No backlog items'}
      </div>
    )
  }

  return (
    <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          variant="future"
          categories={categories}
          timer={timer}
          displayMode={displayMode}
          expandedDescriptions={expandedDescriptions}
          t={t}
          onTaskClick={onTaskClick}
          onToggleComplete={() => {}} // Not used in future view
          onHoldTask={() => {}} // Not used in future view
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onShowTime={onShowTime}
          onToggleDescription={onToggleDescription}
          onActivateTask={onActivateTask}
          onUpdateCategory={onUpdateCategory}
        />
      ))}
    </div>
  )
})

export default FutureView
