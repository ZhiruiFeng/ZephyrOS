'use client'

import React from 'react'
import { Button, Textarea } from '../ui'
import { ReflectionType, REFLECTION_TYPES } from './ReflectionTypeSelector'

interface ReflectionEditingState {
  id?: string
  type: ReflectionType
  title: string
  content: string
}

interface ReflectionItemEditorProps {
  editing: ReflectionEditingState
  onEditingChange: (editing: ReflectionEditingState) => void
  onCancel: () => void
  onSave: () => void
  isSubmitting: boolean
}

export function ReflectionItemEditor({
  editing,
  onEditingChange,
  onCancel,
  onSave,
  isSubmitting
}: ReflectionItemEditorProps) {
  const getReflectionTypeInfo = (type: ReflectionType) => REFLECTION_TYPES.find(rt => rt.type === type)
  const typeInfo = getReflectionTypeInfo(editing.type)

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={editing.title}
        onChange={(e) => onEditingChange({ ...editing, title: e.target.value })}
        placeholder="Title..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <Textarea
        value={editing.content}
        onChange={(e) => onEditingChange({ ...editing, content: e.target.value })}
        placeholder={typeInfo?.placeholder}
        className="w-full min-h-[100px]"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={isSubmitting || !editing.title.trim()}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}