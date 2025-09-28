import React from 'react'
import { AlertCircle, Clock, User } from 'lucide-react'
import type { AITask } from '@/lib/api'

interface Props {
  task: AITask
}

export default function GuardrailsSection({ task }: Props) {
  if (!task.guardrails) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <AlertCircle className="w-4 h-4 text-blue-500" /> Guardrails & Safety
      </h3>
      <div className="space-y-2 text-sm text-slate-700">
        {task.guardrails.timeCapMin && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Time Cap: {task.guardrails.timeCapMin} minutes</span>
          </div>
        )}
        {task.guardrails.costCapUSD && (
          <div className="flex items-center gap-2">
            <span>💰</span>
            <span>Cost Cap: ${task.guardrails.costCapUSD}</span>
          </div>
        )}
        {task.guardrails.requiresHumanApproval && (
          <div className="flex items-center gap-2">
            <User className="w-3 h-3" />
            <span>Requires human approval</span>
          </div>
        )}
        {task.guardrails?.dataScopes && task.guardrails.dataScopes.length > 0 && (
          <div>
            <span className="font-medium">Data Scopes:</span>
            <div className="mt-1">
              {task.guardrails?.dataScopes?.map((scope: string, i: number) => (
                <span key={i} className="mr-1 mb-1 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {scope}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}