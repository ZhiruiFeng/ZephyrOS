import React from 'react'
import { ExternalLink, Copy, Edit, Target, FileText, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { aiTasksApi, type AITask } from '@/lib/api'
import TaskMetadata from './TaskMetadata'
import EditableTaskField from './EditableTaskField'
import GuardrailsSection from './GuardrailsSection'
import QuickActionsSection from './QuickActionsSection'
import AIPromptPreview from './AIPromptPreview'
import TaskSpecPreview from './TaskSpecPreview'

interface Props {
  task: AITask
  tasks: any[]
  agents: any[]
  editingField: string | null
  tempValues: any
  onEditField: (field: string, value: any) => void
  onCancelEdit: () => void
  onTaskUpdate: () => void
  onTabChange: (tab: 'pending' | 'history') => void
  onEditTask: (task: AITask) => void
  onDuplicateTask: (task: AITask) => void
}

export default function TaskInfoView({
  task,
  tasks,
  agents,
  editingField,
  tempValues,
  onEditField,
  onCancelEdit,
  onTaskUpdate,
  onTabChange,
  onEditTask,
  onDuplicateTask
}: Props) {
  const router = useRouter()

  const handleFieldSave = async (field: string, value: string) => {
    try {
      await aiTasksApi.update(task.id, { [field]: value })
      onTaskUpdate()
      onCancelEdit()
    } catch (error) {
      console.error(`Failed to update ${field}:`, error)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Task Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <button
            onClick={() => {
              const linkedTask = tasks.find(t => t.id === task.task_id)
              if (linkedTask) {
                const parentId = linkedTask.content?.parent_task_id
                const currentUrl = window.location.pathname + window.location.search

                if (parentId) {
                  const parentTask = tasks.find(t => t.id === parentId)
                  if (parentTask) {
                    router.push(`/focus/work-mode?taskId=${parentTask.id}&subtaskId=${linkedTask.id}&returnTo=${encodeURIComponent(currentUrl)}`)
                  } else {
                    router.push(`/focus/work-mode?taskId=${linkedTask.id}&returnTo=${encodeURIComponent(currentUrl)}`)
                  }
                } else {
                  router.push(`/focus/work-mode?taskId=${linkedTask.id}&returnTo=${encodeURIComponent(currentUrl)}`)
                }
              }
            }}
            className="group flex w-full max-w-2xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            title="Open in Task Focus Mode"
          >
            <div className="flex flex-1 flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Linked Task</span>
              <h2 className="text-xl font-semibold text-slate-900 transition-colors group-hover:text-indigo-600">
                {(() => {
                  const linkedTask = tasks.find(t => t.id === task.task_id)
                  return linkedTask?.content?.title || linkedTask?.title || task.objective || 'Untitled Task'
                })()}
              </h2>
            </div>
            <ExternalLink className="h-5 w-5 text-slate-400 transition-colors group-hover:text-indigo-600" />
          </button>

          {/* Task Metadata */}
          <TaskMetadata task={task} agents={agents} tasks={tasks} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => onDuplicateTask(task)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <button
            onClick={() => onEditTask(task)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Edit className="h-4 w-4" /> Advanced Edit
          </button>
        </div>
      </div>

      {/* Task Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <EditableTaskField
            task={task}
            field="objective"
            label="Objective"
            icon={<Target className="w-4 h-4 text-indigo-500" />}
            placeholder="Click to add objective..."
            isEditing={editingField === 'objective'}
            tempValue={tempValues.objective ?? task.objective ?? ''}
            onStartEdit={() => onEditField('objective', { objective: task.objective })}
            onSaveEdit={(value) => handleFieldSave('objective', value)}
            onCancelEdit={onCancelEdit}
            onValueChange={(value) => onEditField('objective', { objective: value })}
          />

          <EditableTaskField
            task={task}
            field="deliverables"
            label="Deliverables"
            icon={<Target className="w-4 h-4 text-emerald-500" />}
            placeholder="Click to add deliverables..."
            isEditing={editingField === 'deliverables'}
            tempValue={tempValues.deliverables ?? task.deliverables ?? ''}
            onStartEdit={() => onEditField('deliverables', { deliverables: task.deliverables || undefined })}
            onSaveEdit={(value) => handleFieldSave('deliverables', value)}
            onCancelEdit={onCancelEdit}
            onValueChange={(value) => onEditField('deliverables', { deliverables: value })}
          />

          <EditableTaskField
            task={task}
            field="context"
            label="Context"
            icon={<FileText className="w-4 h-4 text-blue-500" />}
            placeholder="Click to add context..."
            rows={4}
            isEditing={editingField === 'context'}
            tempValue={tempValues.context ?? task.context ?? ''}
            onStartEdit={() => onEditField('context', { context: task.context || undefined })}
            onSaveEdit={(value) => handleFieldSave('context', value)}
            onCancelEdit={onCancelEdit}
            onValueChange={(value) => onEditField('context', { context: value })}
          />

          <EditableTaskField
            task={task}
            field="acceptance_criteria"
            label="Acceptance Criteria"
            icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            placeholder="Click to add acceptance criteria..."
            rows={4}
            isEditing={editingField === 'acceptance_criteria'}
            tempValue={tempValues.acceptance_criteria ?? task.acceptance_criteria ?? ''}
            onStartEdit={() => onEditField('acceptance_criteria', { acceptance_criteria: task.acceptance_criteria || undefined })}
            onSaveEdit={(value) => handleFieldSave('acceptance_criteria', value)}
            onCancelEdit={onCancelEdit}
            onValueChange={(value) => onEditField('acceptance_criteria', { acceptance_criteria: value })}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <GuardrailsSection task={task} />
          <QuickActionsSection
            task={task}
            onTaskUpdate={onTaskUpdate}
            onTabChange={onTabChange}
          />
        </div>
      </div>

      {/* Preview Generated Brief & Spec - Full Width Bottom Row */}
      <div className="mt-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <FileText className="w-4 h-4 text-purple-500" /> Preview Generated Brief & Spec
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIPromptPreview task={task} />
            <TaskSpecPreview task={task} />
          </div>
        </div>
      </div>
    </div>
  )
}