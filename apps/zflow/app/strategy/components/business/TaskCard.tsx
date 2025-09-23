import React from 'react'
import { Badge } from '../ui'
import { Clock, ExternalLink, Bot, Zap } from 'lucide-react'

interface Task {
  id: string
  title: string
  status: string
  progress: number
  initiativeTitle?: string
  timelineTaskId?: string
  aiTaskId?: string
  assignedAgent?: {
    id: string
    name: string
    status: 'online' | 'offline' | 'busy'
  }
  agentStatus?: 'idle' | 'working' | 'blocked'
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
          <div className="flex items-center gap-2">
            {task.title}
            <div className="flex items-center gap-1">
              {task.timelineTaskId && (
                <div
                  className="flex items-center gap-1 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded-full"
                  title="Linked to timeline task"
                >
                  <Clock className="h-3 w-3" />
                  <span>Timeline</span>
                </div>
              )}
              {task.aiTaskId && (
                <div
                  className="flex items-center gap-1 text-purple-600 text-xs bg-purple-50 px-2 py-1 rounded-full"
                  title={`AI task assigned to ${task.assignedAgent?.name || 'agent'}`}
                >
                  <Bot className="h-3 w-3" />
                  <span>AI</span>
                  {task.agentStatus === 'working' && <Zap className="h-3 w-3 animate-pulse" />}
                </div>
              )}
            </div>
          </div>
          {task.assignedAgent && (
            <div className="text-xs text-gray-500 mt-1">
              Assigned to {task.assignedAgent.name} • {task.agentStatus || 'pending'}
            </div>
          )}
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
