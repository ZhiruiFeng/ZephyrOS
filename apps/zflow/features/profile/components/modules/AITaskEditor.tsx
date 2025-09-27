'use client'

import React from 'react'
import { X, Copy, ChevronDown, Search, Check } from 'lucide-react'
import { tasksApi, aiAgentsApi, aiTasksApi, agentFeaturesApi } from '@/lib/api'

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
  const [tasks, setTasks] = React.useState<any[]>([])
  const [agents, setAgents] = React.useState<any[]>([])
  const [features, setFeatures] = React.useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [taskQuery, setTaskQuery] = React.useState('')
  const [taskMenuOpen, setTaskMenuOpen] = React.useState(false)
  const [useGuardrails, setUseGuardrails] = React.useState<boolean>(false)
  const taskSelectRef = React.useRef<HTMLDivElement | null>(null)
  const taskSearchRef = React.useRef<HTMLInputElement | null>(null)
  const isTaskSelectDisabled = Boolean(initial?.isEditing)
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
      // Set guardrails checkbox if there are existing guardrails
      if (initial.guardrails) {
        setUseGuardrails(true)
      }
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
  }, [isOpen, initial])

  React.useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    Promise.all([
      tasksApi.getAll({ limit: 100, sort_by: 'created_at', sort_order: 'desc' }),
      aiAgentsApi.list({ limit: 100, sort_by: 'activity_score', sort_order: 'desc' as any }),
      agentFeaturesApi.list({ is_active: true, limit: 200 })
    ]).then(([ts, ags, fts]) => {
      // Filter tasks to show statuses that are ready for AI assignment
      const filteredTasks = ts.filter((task: any) => {
        const status = task.content?.status || task.status
        return status === 'pending' || status === 'in_progress'
      })
      setTasks(filteredTasks)
      setAgents(ags)
      setFeatures(fts)

      // Set guardrails checkbox state based on initial data
      if (initial?.guardrails) {
        setUseGuardrails(true)
      }
    }).finally(() => setLoading(false))
  }, [isOpen, initial])

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

  React.useEffect(() => {
    if (!taskMenuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (taskSelectRef.current && !taskSelectRef.current.contains(event.target as Node)) {
        setTaskMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTaskMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    const timer = window.setTimeout(() => taskSearchRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.clearTimeout(timer)
    }
  }, [taskMenuOpen])

  React.useEffect(() => {
    if (!taskMenuOpen) {
      setTaskQuery('')
    }
  }, [taskMenuOpen])

  React.useEffect(() => {
    if (isTaskSelectDisabled) {
      setTaskMenuOpen(false)
    }
  }, [isTaskSelectDisabled])

  const orderedTasks = React.useMemo(() => {
    if (!tasks?.length) return []

    const byId = new Map(tasks.map(task => [task.id, task]))
    const childrenMap = new Map<string, any[]>()
    const rootTasks: any[] = []

    for (const task of tasks) {
      const parentId = task.content?.parent_task_id || task.parent_id
      if (parentId && byId.has(parentId)) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, [])
        }
        childrenMap.get(parentId)!.push(task)
      } else {
        rootTasks.push(task)
      }
    }

    const ordered: any[] = []
    const visited = new Set<string>()

    const addTaskWithChildren = (task: any) => {
      if (!task || visited.has(task.id)) return
      visited.add(task.id)
      ordered.push(task)
      const children = childrenMap.get(task.id)
      if (children) {
        for (const child of children) {
          addTaskWithChildren(child)
        }
      }
    }

    for (const root of rootTasks) {
      addTaskWithChildren(root)
    }

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        addTaskWithChildren(task)
      }
    }

    return ordered
  }, [tasks])

  const selectedTaskInfo = React.useMemo(() => {
    return orderedTasks.find((task: any) => task.id === form.task_id)
  }, [orderedTasks, form.task_id])

  const filteredTasks = React.useMemo(() => {
    const query = taskQuery.trim().toLowerCase()
    if (!query) return orderedTasks
    return orderedTasks.filter((task: any) => {
      const title = (task.content?.title || task.title || '').toLowerCase()
      const category = (task.content?.category || '').toLowerCase()
      const status = (task.content?.status || task.status || '').toLowerCase()
      return title.includes(query) || category.includes(query) || status.includes(query) || task.id.toLowerCase().includes(query)
    })
  }, [orderedTasks, taskQuery])

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

          {/* Task Selector - Enhanced */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Link to Task</label>
            <div ref={taskSelectRef} className="relative">
              <button
                type="button"
                className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isTaskSelectDisabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50'
                } ${taskMenuOpen ? '!border-indigo-300 shadow-md' : ''}`}
                onClick={() => {
                  if (isTaskSelectDisabled) return
                  setTaskMenuOpen(prev => !prev)
                }}
                aria-haspopup="listbox"
                aria-expanded={taskMenuOpen}
                aria-disabled={isTaskSelectDisabled}
              >
                <div className="flex items-center justify-between gap-3">
                  {selectedTaskInfo ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {selectedTaskInfo.content?.title || selectedTaskInfo.title || 'Untitled Task'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {selectedTaskInfo.content?.category ? `${selectedTaskInfo.content.category} • ` : ''}
                        {(selectedTaskInfo.content?.status || selectedTaskInfo.status || 'pending').replace(/_/g, ' ')}
                      </p>
                    </div>
                  ) : (
                    <span className="flex-1 text-sm text-slate-400">
                      Choose a task to assign to AI…
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${taskMenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {!isTaskSelectDisabled && taskMenuOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      ref={taskSearchRef}
                      type="text"
                      value={taskQuery}
                      onChange={(e) => setTaskQuery(e.target.value)}
                      placeholder="Search by title, status, or id"
                      className="w-full border-0 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredTasks.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-slate-500">No matching tasks found.</p>
                    ) : (
                      filteredTasks.map((task: any) => {
                        const isSelected = task.id === form.task_id
                        const title = task.content?.title || task.title || 'Untitled Task'
                        const category = task.content?.category
                        const status = (task.content?.status || task.status || 'pending').replace(/_/g, ' ')
                        const isSubtask = Boolean(task.content?.parent_task_id || task.parent_id)
                        return (
                          <button
                            key={task.id}
                            type="button"
                            className={`flex w-full items-start gap-3 px-4 py-2 text-left text-sm transition ${
                              isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                            onClick={() => {
                              handleChange({ task_id: task.id })
                              setTaskMenuOpen(false)
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">
                                {isSubtask && <span className="text-slate-400">↳ </span>}
                                {title}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {category ? `${category} • ` : ''}{status}
                              </p>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-indigo-500" />}
                          </button>
                        )
                      })
                    )}
                  </div>
                  {form.task_id && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
                        onClick={() => {
                          handleChange({ task_id: undefined })
                          setTaskMenuOpen(false)
                        }}
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {initial?.isEditing ? (
              <p className="mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Task link is locked when editing existing AI task assignments.
              </p>
            ) : tasks.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                No active tasks found. Only pending/in-progress tasks can be assigned to AI.
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                {tasks.length} active task{tasks.length !== 1 ? 's' : ''} available • Subtasks shown with ↳
              </p>
            )}
          </div>

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
