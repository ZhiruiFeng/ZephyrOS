import React from 'react'
import { Play, RotateCcw, CheckCircle2, Loader2, X } from 'lucide-react'
import { aiTasksApi } from '@/lib/api'
import type { AITask } from '@/lib/api'

interface Props {
  task: AITask
  onTaskUpdate: () => void
  onTabChange: (tab: 'pending' | 'history') => void
}

export default function QuickActionsSection({ task, onTaskUpdate, onTabChange }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <Play className="h-4 w-4 text-indigo-500" /> Quick Actions
      </h3>
      <div className="space-y-2">
        <button
          disabled={task?.status === 'in_progress'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => {
            // TODO: Implement plan generation
            console.log('Generate plan for:', task.id)
          }}
        >
          <Play className="h-4 w-4" /> Generate Plan
        </button>
        <button
          disabled={task?.status === 'in_progress'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => {
            // TODO: Implement dry run
            console.log('Dry run for:', task.id)
          }}
        >
          <RotateCcw className="h-4 w-4" /> Simulate (Dry Run)
        </button>
        <button
          disabled={task?.status === 'in_progress' || task?.status === 'completed'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => {
            // TODO: Implement execution
            console.log('Execute:', task.id)
          }}
        >
          <CheckCircle2 className="h-4 w-4" /> Execute
        </button>

        {/* Manual Status Update Buttons */}
        {task?.status !== 'completed' && task?.status !== 'failed' && (
          <div className="mt-3 pt-3 border-t border-slate-300 space-y-2">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              onClick={async () => {
                if (!task) return
                try {
                  await aiTasksApi.update(task.id, {
                    status: 'completed',
                    completed_at: new Date().toISOString()
                  })
                  onTaskUpdate()
                  onTabChange('history')
                } catch (error) {
                  console.error('Failed to mark task as completed:', error)
                  alert('Failed to mark task as completed. Please try again.')
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Mark as Completed
            </button>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              onClick={async () => {
                if (!task) return
                if (!confirm('Are you sure you want to mark this task as failed? This action cannot be undone.')) return
                try {
                  await aiTasksApi.update(task.id, {
                    status: 'failed',
                    completed_at: new Date().toISOString()
                  })
                  onTaskUpdate()
                  onTabChange('history')
                } catch (error) {
                  console.error('Failed to mark task as failed:', error)
                  alert('Failed to mark task as failed. Please try again.')
                }
              }}
            >
              <X className="h-4 w-4" /> Mark as Failed
            </button>
          </div>
        )}
      </div>

      {task?.status === 'in_progress' && (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Task is currently running...</span>
          </div>
        </div>
      )}
    </div>
  )
}