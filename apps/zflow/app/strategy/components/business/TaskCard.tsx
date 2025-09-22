import React from 'react'
import { Badge } from '../ui'

interface Task {
  id: string
  title: string
  status: string
  progress: number
  initiativeTitle?: string
}

interface TaskCardProps {
  task: Task
  progressIntent: (p: number) => string
}

export const TaskCard = React.memo(function TaskCard({
  task,
  progressIntent
}: TaskCardProps) {
  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight min-w-0 flex-1">
          {task.title}
        </div>
        <Badge variant="outline" className="flex-shrink-0 text-xs">
          {task.status}
        </Badge>
      </div>
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 ${progressIntent(task.progress)} rounded-full transition-all duration-300`}
          style={{ width: `${task.progress}%` }}
        />
      </div>
      {task.initiativeTitle && (
        <div className="mt-2 text-xs text-gray-500 truncate">
          {task.initiativeTitle}
        </div>
      )}
    </div>
  )
})
