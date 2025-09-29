'use client'

import React from 'react'
import { X, Copy } from 'lucide-react'
import { tasksApi, aiAgentsApi, aiTasksApi, agentFeaturesApi } from '@/lib/api'
import { TaskSelectorDropdown } from '@/shared/components'
import { TaskMemory } from '@/lib/api/api-base'

export type AITaskForm = {
  id?: string
  task_id?: string
  agent_id?: string
  task_type?: string
  objective?: string
  deliverables?: string
  context?: string
  acceptance_criteria?: string
  dependencies?: string[]
  mode?: 'plan_only' | 'dry_run' | 'execute'
  guardrails?: { costCapUSD?: number | null; timeCapMin?: number | null; requiresHumanApproval?: boolean; dataScopes?: string[] }
  metadata?: { priority?: 'low' | 'medium' | 'high' | 'urgent'; tags?: string[] }
  status?: 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
  isEditing?: boolean
}

export interface AITaskEditorProps {
  isOpen: boolean
  initial?: Partial<AITaskForm>
  onClose: () => void
  onSaved?: (aiTaskId: string) => void
}

export default function AITaskEditor({ isOpen, initial, onClose, onSaved }: AITaskEditorProps) {
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [agents, setAgents] = React.useState<any[]>([])
  const [features, setFeatures] = React.useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [useGuardrails, setUseGuardrails] = React.useState<boolean>(false)
  const isTaskSelectDisabled = Boolean(initial?.isEditing)
  const initialKey = React.useMemo(() => (initial ? JSON.stringify(initial) : 'null'), [initial])
  const [form, setForm] = React.useState<AITaskForm>({
    task_id: initial?.task_id,
    agent_id: initial?.agent_id,
    task_type: initial?.task_type || 'coding',
    objective: initial?.objective || '',
    deliverables: initial?.deliverables || '',
    context: initial?.context || '',
    acceptance_criteria: initial?.acceptance_criteria || '',
    dependencies: initial?.dependencies || [],
    mode: initial?.mode || 'plan_only',
    guardrails: initial?.guardrails,
    metadata: initial?.metadata || { priority: 'medium', tags: [] },
    status: initial?.status || 'pending'
  })

  // Update form when initial data changes (for editing) - only when modal opens or task ID changes
  React.useEffect(() => {
    if (!isOpen) return

    setError(null)

    if (initial) {
      setForm({
        task_id: initial.task_id,
        agent_id: initial.agent_id,
        task_type: initial.task_type || 'coding',
        objective: initial.objective || '',
        deliverables: initial.deliverables || '',
        context: initial.context || '',
        acceptance_criteria: initial.acceptance_criteria || '',
        dependencies: initial.dependencies || [],
        mode: initial.mode || 'plan_only',
        guardrails: initial.guardrails,
        metadata: initial.metadata || { priority: 'medium', tags: [] },
        status: initial.status || 'pending'
      })
      setUseGuardrails(Boolean(initial.guardrails))
    } else {
      // Reset form for new task
      setForm({
        task_id: undefined,
        agent_id: undefined,
        task_type: 'coding',
        objective: '',
        deliverables: '',
        context: '',
        acceptance_criteria: '',
        dependencies: [],
        mode: 'plan_only',
        guardrails: undefined,
        metadata: { priority: 'medium', tags: [] },
        status: 'pending'
      })
      setUseGuardrails(false)
    }
  }, [isOpen, initialKey])

  React.useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    setError(null)
    setLoading(true)
    Promise.all([
      aiAgentsApi.list({ limit: 100, sort_by: 'activity_score', sort_order: 'desc' as any }),
      agentFeaturesApi.list({ is_active: true, limit: 200 })
    ])
      .then(([ags, fts]) => {
        if (cancelled) return

        setAgents(ags)
        setFeatures(fts)

        if (initial?.guardrails) {
          setUseGuardrails(true)
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load AI task editor data', err)
        setError('Failed to load AI task resources')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen])

  const handleChange = React.useCallback((patch: Partial<AITaskForm>) => {
    setForm(prev => {
      const updated = { ...prev }

      // Deep merge for nested objects
      Object.keys(patch).forEach(key => {
        const typedKey = key as keyof AITaskForm
        const value = patch[typedKey]

        if (typedKey === 'metadata' && value && typeof value === 'object') {
          updated.metadata = { ...prev.metadata, ...value }
        } else if (typedKey === 'guardrails' && value && typeof value === 'object') {
          updated.guardrails = { ...prev.guardrails, ...value }
        } else {
          updated[typedKey] = value as any
        }
      })

      return updated
    })
  }, [])



  const brief = React.useMemo(() => {
    return [
      '## Acceptance Criteria',
      form.acceptance_criteria || '(define testable checks)',
      '',
      '## Constraints',
      `- Time cap: ${form.guardrails?.timeCapMin ?? 'n/a'} minutes`,
      `- Cost cap: $${form.guardrails?.costCapUSD ?? 'n/a'}`,
      `- Human approval required: ${form.guardrails?.requiresHumanApproval ? 'Yes' : 'No'}`,
      `- Data scopes: ${(form.guardrails?.dataScopes || []).join(', ') || 'none'}`,
      '',
      '## Agent',
      `- Mode: ${form.mode}`,
      '',
      '## Notes',
      '- Keep a changelog of actions.',
      '- Ask clarifying questions only if strictly blocking.',
      '- Prefer small safe steps with review gates.'
    ].join('\n')
  }, [form])

  const taskSpecJson = React.useMemo(() => JSON.stringify({
    dependencies: (form.dependencies || []).join(', '),
    guardrails: form.guardrails,
    metadata: form.metadata,
  }, null, 2), [form])

  const handleSave = async () => {
    setError(null)
    if (!form.task_id) { setError('Please link a task'); return }
    if (!form.agent_id) { setError('Please select an agent'); return }
    if (!form.objective || !form.task_type) { setError('Please fill in objective and type'); return }
    try {
      setSaving(true)
      const payload: any = {
        task_id: form.task_id,
        agent_id: form.agent_id,
        task_type: form.task_type,
        objective: form.objective,
        deliverables: form.deliverables,
        context: form.context,
        acceptance_criteria: form.acceptance_criteria,
        dependencies: form.dependencies,
        mode: form.mode,
        metadata: form.metadata,
        status: form.status,
      }
      if (useGuardrails && form.guardrails) payload.guardrails = form.guardrails

      let result
      if (initial?.id) {
        // Update existing task
        result = await aiTasksApi.update(initial.id, payload)
      } else {
        // Create new task
        result = await aiTasksApi.create(payload)
      }

      onSaved?.(result.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {initial?.id ? 'Edit AI Task' : 'Create AI Task'}
            </h3>
            <p className="text-sm text-gray-600">
              {initial?.id ? 'Modify task parameters and guardrails' : 'Design a new task for AI agent execution'}
            </p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (<div className="text-sm text-red-600">{error}</div>)}
          {/* Row 1: Type, Agent, Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600">Type</label>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.task_type || ''} onChange={e => handleChange({ task_type: e.target.value })}>
                <option value="">Select type</option>
                {features.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Agent</label>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.agent_id || ''} onChange={e => handleChange({ agent_id: e.target.value })}>
                <option value="">Select agent</option>
                {agents.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Execution Mode</label>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.mode} onChange={e => handleChange({ mode: e.target.value as any })}>
                <option value="plan_only">Plan only (no actions)</option>
                <option value="dry_run">Dry-run (simulate)</option>
                <option value="execute">Execute (gated)</option>
              </select>
            </div>
          </div>

          {/* Task Selector - Using shared component */}
          <TaskSelectorDropdown
            selectedTaskId={form.task_id}
            onSelectTask={(task: TaskMemory | null) => handleChange({ task_id: task?.id })}
            label="Link to Task"
            placeholder="Choose a task to assign to AI..."
            disabled={isTaskSelectDisabled}
            config={{
              statuses: ['pending', 'in_progress'],
              includeSubtasks: true,
              limit: 100
            }}
            helperText={initial?.isEditing
              ? "Task link is locked when editing existing AI task assignments."
              : "Only pending/in-progress tasks can be assigned to AI."
            }
            errorText={initial?.isEditing ? "Task link is locked when editing existing AI task assignments." : undefined}
          />

          {/* Objective & Deliverables - Compact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Objective</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
                value={form.objective}
                onChange={e => handleChange({ objective: e.target.value })}
                placeholder="What outcome do you want the AI to achieve?"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Deliverables</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
                value={form.deliverables}
                onChange={e => handleChange({ deliverables: e.target.value })}
                placeholder="Expected outputs: files, docs, analysis..."
              />
            </div>
          </div>

          {/* Context - Compact */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Context & Instructions</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              rows={3}
              value={form.context}
              onChange={e => handleChange({ context: e.target.value })}
              placeholder="Additional context, constraints, links, examples..."
            />
          </div>

          {/* Acceptance & Dependencies - Compact */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Success Criteria</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
                value={form.acceptance_criteria}
                onChange={e => handleChange({ acceptance_criteria: e.target.value })}
                placeholder="How will you know the task is complete?"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-3"
                value={form.metadata?.priority || 'medium'}
                onChange={e => handleChange({ metadata: { ...form.metadata, priority: e.target.value as any } })}
              >
                <option value="low">Low (P4)</option>
                <option value="medium">Medium (P3)</option>
                <option value="high">High (P2)</option>
                <option value="urgent">Urgent (P1)</option>
              </select>

              <label className="text-sm font-medium text-gray-700 mb-2 block">Dependencies</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={(form.dependencies || []).join(', ')}
                onChange={e => handleChange({ dependencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="task-1, task-2"
              />
            </div>
          </div>

          {/* Guardrails - Collapsible */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <input
                id="enable-guardrails"
                type="checkbox"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                checked={useGuardrails}
                onChange={e => {
                  setUseGuardrails(e.target.checked)
                  if (e.target.checked && !form.guardrails) {
                    handleChange({ guardrails: { costCapUSD: null, timeCapMin: null, requiresHumanApproval: true, dataScopes: [] } })
                  }
                }}
              />
              <label htmlFor="enable-guardrails" className="text-sm font-medium text-gray-700">
                Add safety guardrails
              </label>
              <span className="text-xs text-gray-500">(optional limits and constraints)</span>
            </div>
            {useGuardrails && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cost Cap (USD)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={form.guardrails?.costCapUSD ?? ''}
                      onChange={e => handleChange({ guardrails: { ...form.guardrails, costCapUSD: e.target.value === '' ? null : Number(e.target.value) } })}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Time Cap (minutes)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={form.guardrails?.timeCapMin ?? ''}
                      onChange={e => handleChange({ guardrails: { ...form.guardrails, timeCapMin: e.target.value === '' ? null : Number(e.target.value) } })}
                      placeholder="60"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="human-approval"
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    checked={!!form.guardrails?.requiresHumanApproval}
                    onChange={e => handleChange({ guardrails: { ...form.guardrails, requiresHumanApproval: e.target.checked } })}
                  />
                  <label htmlFor="human-approval" className="text-sm text-gray-700">
                    Require human approval before execution
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Preview - Collapsible */}
          <div className="border-t pt-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Preview Generated Brief & Spec
              </summary>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">AI Task Brief</span>
                    <button
                      className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 inline-flex items-center gap-1 transition-colors"
                      onClick={() => navigator.clipboard.writeText(brief)}
                    >
                      <Copy className="w-3 h-3"/>Copy
                    </button>
                  </div>
                  <pre className="bg-gray-50 border rounded-lg p-3 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">{brief}</pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Task Spec (JSON)</span>
                    <button
                      className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 inline-flex items-center gap-1 transition-colors"
                      onClick={() => navigator.clipboard.writeText(taskSpecJson)}
                    >
                      <Copy className="w-3 h-3"/>Copy
                    </button>
                  </div>
                  <pre className="bg-gray-50 border rounded-lg p-3 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">{taskSpecJson}</pre>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {form.task_id ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Task selected and ready to assign
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Please select a task to continue
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              disabled={saving || !form.task_id}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 hover:bg-primary-700 transition-colors flex items-center gap-2"
              onClick={handleSave}
            >
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {saving ? 'Assigning...' : (initial?.id ? 'Update Assignment' : 'Assign to AI')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
