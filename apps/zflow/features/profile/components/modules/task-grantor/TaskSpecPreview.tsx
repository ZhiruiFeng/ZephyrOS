import React from 'react'
import { Copy } from 'lucide-react'
import type { AITask } from '@/lib/api'

interface Props {
  task: AITask
}

export default function TaskSpecPreview({ task }: Props) {
  const taskSpec = {
    objective: task.objective,
    deliverables: task.deliverables,
    context: task.context,
    acceptance_criteria: task.acceptance_criteria,
    mode: task.mode,
    priority: task.metadata?.priority,
    agent_id: task.agent_id,
    guardrails: task.guardrails,
    task_id: task.task_id
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800">Task Spec (JSON)</span>
        <button
          className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
          onClick={() => {
            const taskSpecJson = JSON.stringify(taskSpec, null, 2)
            navigator.clipboard.writeText(taskSpecJson)
          }}
        >
          <Copy className="w-3 h-3"/>Copy JSON
        </button>
      </div>
      <pre className="bg-slate-50 border rounded-lg p-4 text-xs whitespace-pre-wrap max-h-80 overflow-y-auto font-mono leading-relaxed">
        {JSON.stringify(taskSpec, null, 2)}
      </pre>
    </div>
  )
}