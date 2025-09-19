'use client'

import React, { memo } from 'react'
import { FileText } from 'lucide-react'
import NotionEditor from '../../../components/editors/NotionEditor'
import { TaskMemory } from '../../../../lib/api'
import { useTranslation } from '../../../../contexts/LanguageContext'
import { TaskWithCategory } from './TaskSidebar'
import WorkModeEditorHeader from './WorkModeEditorHeader'
import { Task } from '../../../../app/types/task'

interface WorkModeEditorProps {
  selectedTask: TaskWithCategory | null
  selectedSubtask: TaskMemory | null
  notes: string
  setNotes: (notes: string) => void
  onStatusChange?: (newStatus: Task['status']) => void
}

const WorkModeEditor = memo(function WorkModeEditor({
  selectedTask,
  selectedSubtask,
  notes,
  setNotes,
  onStatusChange
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
      <WorkModeEditorHeader
        selectedTask={selectedTask}
        selectedSubtask={selectedSubtask}
        onStatusChange={onStatusChange}
      />
      <NotionEditor
        value={notes}
        onChange={setNotes}
        placeholder={t.ui.writeNotesHere}
      />
    </div>
  )
})

export default WorkModeEditor
