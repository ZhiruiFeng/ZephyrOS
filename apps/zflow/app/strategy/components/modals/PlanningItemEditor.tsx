'use client'

import React from 'react'
import { Check, X } from 'lucide-react'
import { Button, Textarea } from '../ui'

interface PlanningEditingState {
  type: 'intention' | 'adventure' | 'priority'
  index?: number
  title: string
  description: string
}

interface PlanningItemEditorProps {
  editing: PlanningEditingState
  onEditingChange: (editing: PlanningEditingState) => void
  onCancel: () => void
  onSave: () => void
  isSubmitting: boolean
}

export function PlanningItemEditor({
  editing,
  onEditingChange,
  onCancel,
  onSave,
  isSubmitting
}: PlanningItemEditorProps) {
  const getTitle = () => {
    if (editing.type === 'intention') return 'Intention'
    if (editing.type === 'adventure') return 'Adventure'
    if (editing.type === 'priority') return `Priority ${(editing.index ?? 0) + 1}`
    return 'Item'
  }

  const title = getTitle()

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={editing.title || ''}
        onChange={(e) => onEditingChange({ ...editing, title: e.target.value })}
        placeholder={`${title} title...`}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      <Textarea
        value={editing.description || ''}
        onChange={(e) => onEditingChange({ ...editing, description: e.target.value })}
        placeholder={`Describe your ${title.toLowerCase()}...`}
        className="w-full rounded-lg border border-slate-200 bg-white/80 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-full border-slate-200 text-slate-600 hover:border-slate-300"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSubmitting || !editing.title?.trim()}
          className="rounded-full bg-blue-600 text-white hover:bg-blue-500"
        >
          <Check className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  )
}