'use client'

import React, { memo } from 'react'
import { FileText } from 'lucide-react'
import NotionEditor from '../../../components/editors/NotionEditor'
import { TaskMemory } from '../../../../lib/api'
import { useTranslation } from '../../../../contexts/LanguageContext'
import { TaskWithCategory } from './TaskSidebar'

interface WorkModeEditorProps {
  selectedTask: TaskWithCategory | null
  selectedSubtask: TaskMemory | null
  notes: string
  setNotes: (notes: string) => void
}

const WorkModeEditor = memo(function WorkModeEditor({
  selectedTask,
  selectedSubtask,
  notes,
  setNotes
}: WorkModeEditorProps) {
  const { t } = useTranslation()

  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.ui.selectTaskToStart}</h3>
          <p className="text-gray-600">{t.ui.selectTaskFromLeft}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 p-4 lg:p-6">
      {/* Editing mode indicator */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 text-xs text-gray-500 w-full">
        {selectedSubtask ? (
          <>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full flex-shrink-0 font-medium">
              📝 Subtask
            </span>
            <span className="flex-1 min-w-0 font-medium text-blue-900 break-words">
              {selectedSubtask.content.title}
            </span>
          </>
        ) : (
          <>
            <span className="px-2 py-0.5 bg-gray-100 rounded-full flex-shrink-0">
              📋 Task
            </span>
            <span className="flex-1 min-w-0 truncate">
              {selectedTask.content.title}
            </span>
          </>
        )}
        <span className="ml-auto italic flex-shrink-0 hidden sm:inline">{t.common.edit}</span>
      </div>
      <NotionEditor
        value={notes}
        onChange={setNotes}
        placeholder={t.ui.writeNotesHere}
      />
    </div>
  )
})

export default WorkModeEditor