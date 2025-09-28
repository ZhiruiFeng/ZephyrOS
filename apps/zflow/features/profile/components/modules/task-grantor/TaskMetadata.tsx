import React from 'react'
import { AlertCircle, User } from 'lucide-react'
import type { AITask } from '@/lib/api'

interface Props {
  task: AITask
  agents: any[]
  tasks: any[]
}

export default function TaskMetadata({ task, agents, tasks }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-medium min-w-[60px]">Status:</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            task.status === 'completed'
              ? 'bg-emerald-100 text-emerald-700'
              : task.status === 'in_progress'
                ? 'bg-blue-100 text-blue-700'
                : task.status === 'failed'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
          }`}
        >
          {task.status ? task.status.replace(/_/g, ' ') : 'unknown'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        <span className="text-slate-500 font-medium">Priority:</span>
        <span className="text-slate-700">{task.metadata?.priority || 'medium'}</span>
      </div>
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <span className="text-slate-500 font-medium">Mode:</span>
        <span className="text-slate-700">{task.mode}</span>
      </div>
      {(() => {
        const agent = agents.find(a => a.id === task.agent_id)
        return agent && (
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-indigo-500 flex-shrink-0"></span>
            <span className="text-slate-500 font-medium">Agent:</span>
            <span className="text-slate-700 truncate">{agent.name}</span>
          </div>
        )
      })()}
      {(() => {
        const linkedTask = tasks.find(t => t.id === task.task_id)
        return linkedTask?.content?.category && (
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-400 flex-shrink-0"></span>
            <span className="text-slate-500 font-medium">Category:</span>
            <span className="text-slate-700 truncate">{linkedTask.content.category}</span>
          </div>
        )
      })()}
    </div>
  )
}