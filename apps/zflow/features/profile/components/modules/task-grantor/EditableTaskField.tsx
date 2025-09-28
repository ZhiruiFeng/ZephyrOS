import React from 'react'
import type { AITask } from '@/lib/api'

interface Props {
  task: AITask
  field: keyof Pick<AITask, 'objective' | 'deliverables' | 'context' | 'acceptance_criteria'>
  label: string
  icon: React.ReactNode
  placeholder: string
  rows?: number
  isEditing: boolean
  tempValue: string
  onStartEdit: () => void
  onSaveEdit: (value: string) => Promise<void>
  onCancelEdit: () => void
  onValueChange: (value: string) => void
}

export default function EditableTaskField({
  task,
  field,
  label,
  icon,
  placeholder,
  rows = 3,
  isEditing,
  tempValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onValueChange
}: Props) {
  const value = task[field] || ''

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        {icon} {label}
      </h3>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={tempValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full resize-none rounded border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={rows}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => onSaveEdit(tempValue)}
              className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded border border-slate-200 px-3 py-1 text-xs transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onStartEdit}
          className="min-h-[2rem] cursor-pointer rounded-md p-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 -m-2"
        >
          {value || placeholder}
        </div>
      )}
    </div>
  )
}