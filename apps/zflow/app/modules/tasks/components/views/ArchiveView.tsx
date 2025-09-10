'use client'

import React from 'react'
import { TaskMemory } from '../../../../../lib/api'
import TaskCard from '../../../../components/ui/TaskCard'
import { formatDate } from '../../../../utils/taskUtils'

interface ArchiveViewProps {
  groupedArchiveList: Array<{ date: string; tasks: TaskMemory[] }>
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
  onReopenTask: (taskId: string) => void
}

export default function ArchiveView({
  groupedArchiveList,
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
  onReopenTask
}: ArchiveViewProps) {
  if (groupedArchiveList.length === 0) {
    return (
      <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
        {t.ui?.noArchivedTasks || 'No archived tasks'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupedArchiveList.map((group, groupIndex) => (
        <div key={group.date}>
          {/* Date separator */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
            <div className="glass px-4 py-2 rounded-full">
              <span className="text-sm font-medium text-gray-600">
                {formatDate(group.date)}
              </span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
          </div>

          {/* Tasks for this date */}
          <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
            {group.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                variant="archive"
                categories={categories}
                timer={timer}
                displayMode={displayMode}
                expandedDescriptions={expandedDescriptions}
                t={t}
                onTaskClick={onTaskClick}
                onToggleComplete={() => {}} // Not used in archive view
                onHoldTask={() => {}} // Not used in archive view
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onShowTime={onShowTime}
                onToggleDescription={onToggleDescription}
                onReopenTask={onReopenTask}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
