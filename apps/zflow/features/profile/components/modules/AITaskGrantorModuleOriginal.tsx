'use client'

import React from 'react'
import { Plus, Loader2, Maximize2, Edit, Trash2, Clock, User, Target, AlertCircle, CheckCircle2, Copy, FileText, History, Play, Pause, RotateCcw, PanelLeftClose, PanelLeft, ExternalLink, X } from 'lucide-react'
import { aiTasksApi, tasksApi, type AITask } from '@/lib/api'
import type { ProfileModuleConfig } from '@/profile'
import AITaskEditor from './AITaskEditor'
import { useRouter } from 'next/navigation'

interface Props {
  config: ProfileModuleConfig
  onConfigChange?: (newConfig: ProfileModuleConfig) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export default function AITaskGrantorModule({ isFullscreen, onToggleFullscreen }: Props) {
  const router = useRouter()
  const [isOpen, setOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [aiTasks, setAiTasks] = React.useState<AITask[]>([])
  const [drafts, setDrafts] = React.useState<any[]>([])
  const [selectedTask, setSelectedTask] = React.useState<AITask | null>(null)
  const [activeTab, setActiveTab] = React.useState<'pending' | 'history'>('pending')
  const [runHistory, setRunHistory] = React.useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = React.useState(false)
  const [tasks, setTasks] = React.useState<any[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [isMobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const [editingField, setEditingField] = React.useState<string | null>(null)
  const [tempValues, setTempValues] = React.useState<Partial<{
    objective: string;
    deliverables: string;
    context: string;
    acceptance_criteria: string;
  }>>({})
  const [agents, setAgents] = React.useState<any[]>([])
  const [improvedPrompt, setImprovedPrompt] = React.useState<string | null>(null)
  const [isImprovingPrompt, setIsImprovingPrompt] = React.useState(false)

  const formatStatus = React.useCallback((status?: string | null) => {
    if (!status) return 'unknown'
    return status.split('_').join(' ')
  }, [])

  const generateBasicPrompt = React.useCallback((task: any) => {
    return [
      `You are an AI assistant tasked with helping complete the following task:`,
      '',
      `## Task Objective`,
      task.objective || 'Please specify the main objective of this task.',
      '',
      ...(task.deliverables ? [
        `## Required Deliverables`,
        task.deliverables,
        ''
      ] : []),
      ...(task.context ? [
        `## Context & Background`,
        task.context,
        ''
      ] : []),
      ...(task.acceptance_criteria ? [
        `## Success Criteria`,
        `The task will be considered complete when:`,
        task.acceptance_criteria,
        ''
      ] : []),
      `## Guidelines`,
      `- Work mode: ${task.mode}`,
      task.metadata?.priority && `- Priority level: ${task.metadata.priority}`,
      task.guardrails?.timeCapMin && `- Time constraint: Complete within ${task.guardrails.timeCapMin} minutes`,
      task.guardrails?.costCapUSD && `- Budget constraint: Stay within $${task.guardrails.costCapUSD}`,
      task.guardrails?.requiresHumanApproval && '- Human approval required before implementation',
      '',
      'Please approach this task systematically and provide detailed explanations for your approach. Ask clarifying questions if any requirements are unclear.',
    ].filter(line => line !== undefined).join('\n')
  }, [])

  const improvePromptWithChatGPT = React.useCallback(async (task: any) => {
    setIsImprovingPrompt(true)
    try {
      const basicPrompt = generateBasicPrompt(task)

      // Create a meta-prompt to improve the basic prompt
      const improvementPrompt = `You are an expert prompt engineer. Please improve the following AI task prompt to be more effective, clear, and comprehensive. Make it more engaging and specific while maintaining all the original requirements.

Original prompt:
${basicPrompt}

Please provide an improved version that:
1. Is more engaging and motivating
2. Provides clearer structure and expectations
3. Includes helpful examples or guidance where appropriate
4. Maintains professional tone
5. Ensures all original requirements are preserved

Return only the improved prompt without any explanation or meta-commentary.`

      // Call ChatGPT API (placeholder - you'll need to implement the actual API call)
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: improvementPrompt
            }
          ],
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1500
        })
      })

      if (response.ok) {
        const data = await response.json()
        const improvedPromptText = data.choices[0]?.message?.content || basicPrompt
        setImprovedPrompt(improvedPromptText)
      } else {
        console.error('Failed to improve prompt with ChatGPT')
        setImprovedPrompt(basicPrompt)
      }
    } catch (error) {
      console.error('Error improving prompt:', error)
      setImprovedPrompt(generateBasicPrompt(task))
    } finally {
      setIsImprovingPrompt(false)
    }
  }, [generateBasicPrompt])

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadingHistory(true)
    try {
      const [allAiTaskItems, taskItems, agentItems] = await Promise.all([
        aiTasksApi.list({ limit: 100, sort_by: 'assigned_at', sort_order: 'desc' }),
        tasksApi.getAll({ limit: 100, sort_by: 'created_at', sort_order: 'desc' }),
import('@/lib/api').then(api => api.aiAgentsApi.list({ limit: 100 }))
      ])

      // Separate pending and completed tasks
      const pendingTasks = allAiTaskItems.filter(task =>
        task.status !== 'completed' && task.status !== 'failed'
      )
      const completedTasks = allAiTaskItems.filter(task =>
        task.status === 'completed' || task.status === 'failed'
      )

      setAiTasks(pendingTasks)
      setTasks(taskItems)
      setAgents(agentItems)

      // Populate run history with completed and failed tasks
      const historyItems = completedTasks.map(task => {
        // Find the linked task to get the title
        const linkedTask = taskItems.find(t => t.id === task.task_id)
        return {
          task_objective: linkedTask?.content?.title || task.objective,
          status: task.status,
          started_at: task.assigned_at,
          completed_at: task.completed_at,
          duration: task.completed_at && task.assigned_at ?
            Math.round((new Date(task.completed_at).getTime() - new Date(task.assigned_at).getTime()) / 1000) : null,
          mode: task.mode,
          task_id: task.id,
          agent_id: task.agent_id,
          original_task: task
        }
      })
      setRunHistory(historyItems)
    } finally {
      setLoading(false)
      setLoadingHistory(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // Reset improved prompt when task selection changes
  React.useEffect(() => {
    setImprovedPrompt(null)
    setIsImprovingPrompt(false)
  }, [selectedTask?.id])

  const handleDuplicateTask = (task: any) => {
    const duplicated = {
      ...task,
      id: undefined,
      objective: `${task.objective} (Copy)`,
      status: 'pending'
    }
    setEditingTask(duplicated)
    setOpen(true)
  }

  const handleSelectTask = (task: any) => {
    setSelectedTask(task)
    setMobileSidebarOpen(false)
  }

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-base font-semibold text-slate-900">Task Workspace</h4>
        <span className="text-xs text-slate-500 sm:text-sm">
          {loading ? 'Loading...' : `${aiTasks.length} pending ${aiTasks.length === 1 ? 'task' : 'tasks'}`}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 flex gap-1 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
        <button
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
            activeTab === 'pending'
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          <FileText className="mr-1 inline h-4 w-4" /> Pending
        </button>
        <button
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <History className="mr-1 inline h-4 w-4" /> History
        </button>
      </div>

      {/* Pending Task List */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500"/> Loading tasks...
            </div>
          ) : aiTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-slate-500">
              <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No pending tasks</p>
              <p className="text-xs text-slate-500">Create your first AI task to get started</p>
            </div>
          ) : (
            aiTasks.map(task => (
              <div
                key={task.id}
                className={`group cursor-pointer rounded-xl border p-3 transition-all ${
                  selectedTask?.id === task.id
                    ? 'border-indigo-200 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-100 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md'
                }`}
                onClick={() => handleSelectTask(task)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {(() => {
                      const linkedTask = tasks.find(t => t.id === task.task_id)
                      return linkedTask?.content?.title || linkedTask?.title || task.objective || 'Untitled Task'
                    })()}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      task.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : task.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {formatStatus(task.status)}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {task.mode} • {task.metadata?.priority || 'medium'}
                </div>

                {/* Quick Actions */}
                <div className="mt-3 flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTask(task)
                      setOpen(true)
                    }}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                    title="Edit"
                    aria-label="Edit task"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDuplicateTask(task)
                    }}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                    title="Duplicate"
                    aria-label="Duplicate task"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (confirm('Delete this task?')) {
                        try {
                          await aiTasksApi.remove(task.id)
                          if (selectedTask?.id === task.id) setSelectedTask(null)
                          load()
                        } catch (error) {
                          console.error('Failed to delete task:', error)
                        }
                      }
                    }}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Delete"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500"/> Loading history...
            </div>
          ) : runHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-slate-500">
              <History className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No completed tasks yet</p>
              <p className="text-xs text-slate-500">Completed and failed tasks will appear here</p>
            </div>
          ) : (
            runHistory.map((run, index) => (
              <div
                key={index}
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                onClick={() => {
                  // Find the original task and select it for viewing
                  const originalTask = run.original_task
                  if (originalTask) {
                    handleSelectTask(originalTask)
                    setActiveTab('pending')
                  }
                }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {run.task_objective || 'Task Run'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      run.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : run.status === 'failed'
                          ? 'bg-rose-100 text-rose-700'
                          : run.status === 'running'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {formatStatus(run.status)}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Started: {run.started_at ? new Date(run.started_at).toLocaleString() : 'Unknown time'}</span>
                  </div>
                  {run.completed_at && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>
                    </div>
                  )}
                  {run.duration && (
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      <span>Duration: {run.duration}s</span>
                    </div>
                  )}
                  {run.mode && (
                    <div className="flex items-center gap-1">
                      <span>🔧</span>
                      <span>Mode: {run.mode}</span>
                    </div>
                  )}
                  {(() => {
                    const agent = agents.find(a => a.id === run.agent_id)
                    return agent && (
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                        <span>Agent: {agent.name}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )

  return (
    <div
      className={`overflow-hidden bg-white ${isFullscreen ? 'h-full flex flex-col' : 'rounded-2xl border border-slate-200 shadow-sm'}`}
    >
      {/* Header */}
      <div
        className={`border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white ${isFullscreen ? '' : 'rounded-t-2xl'} px-4 py-4 sm:px-6`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h3 className="text-2xl font-semibold text-slate-900">AI Task Grantor</h3>
            <p className="text-sm text-slate-500">
              Design and assign tasks to AI agents with clear objectives and guardrails
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4 text-indigo-500"/> Assign Task
            </button>
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="hidden rounded-full border border-slate-200 bg-white/70 p-2 text-slate-500 transition-colors hover:bg-white sm:inline-flex"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Task Trigger */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900">Task Workspace</span>
          <span className="text-xs text-slate-500">
            {loading ? 'Loading tasks…' : `${aiTasks.length} pending ${aiTasks.length === 1 ? 'task' : 'tasks'}`}
          </span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white"
        >
          <PanelLeft className="h-4 w-4" />
          Browse
        </button>
      </div>

      {/* Main Content Area */}
      <div
        className={`flex flex-col lg:flex-row ${isFullscreen ? 'flex-1 overflow-hidden' : 'min-h-[32rem]'} bg-slate-50`}
      >
        {/* Sidebar - Drafts & Navigation */}
        <div
          className={`${sidebarCollapsed ? 'lg:w-20' : 'lg:w-80'} relative w-full border-b border-slate-200 bg-slate-50/90 backdrop-blur transition-all duration-300 lg:border-b-0 lg:border-r`}
        >
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-4 z-10 hidden items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-slate-100 lg:inline-flex"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <div className={`space-y-4 p-4 ${sidebarCollapsed ? 'lg:hidden' : ''} lg:h-full lg:overflow-y-auto`}
          >
            {sidebarContent}
          </div>
        </div>

        {/* Main Panel - Task Details */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedTask ? (
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
              {/* Task Header */}
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      const linkedTask = tasks.find(t => t.id === selectedTask.task_id)
                      if (linkedTask) {
                        const parentId = linkedTask.content?.parent_task_id
                        const currentUrl = window.location.pathname + window.location.search

                        if (parentId) {
                          // This is a subtask - navigate with both root task and subtask IDs
                          const parentTask = tasks.find(t => t.id === parentId)
                          if (parentTask) {
                            router.push(`/focus/work-mode?taskId=${parentTask.id}&subtaskId=${linkedTask.id}&returnTo=${encodeURIComponent(currentUrl)}`)
                          } else {
                            // Fallback if parent not found
                            router.push(`/focus/work-mode?taskId=${linkedTask.id}&returnTo=${encodeURIComponent(currentUrl)}`)
                          }
                        } else {
                          // This is a root task
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
                          const linkedTask = tasks.find(t => t.id === selectedTask.task_id)
                          return linkedTask?.content?.title || linkedTask?.title || selectedTask.objective || 'Untitled Task'
                        })()}
                      </h2>
                    </div>
                    <ExternalLink className="h-5 w-5 text-slate-400 transition-colors group-hover:text-indigo-600" />
                  </button>

                  {/* Task Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium min-w-[60px]">Status:</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          selectedTask.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : selectedTask.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : selectedTask.status === 'failed'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {selectedTask.status ? selectedTask.status.replace(/_/g, ' ') : 'unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span className="text-slate-500 font-medium">Priority:</span>
                      <span className="text-slate-700">{selectedTask.metadata?.priority || 'medium'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="text-slate-500 font-medium">Mode:</span>
                      <span className="text-slate-700">{selectedTask.mode}</span>
                    </div>
                    {(() => {
                      const agent = agents.find(a => a.id === selectedTask.agent_id)
                      return agent && (
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-indigo-500 flex-shrink-0"></span>
                          <span className="text-slate-500 font-medium">Agent:</span>
                          <span className="text-slate-700 truncate">{agent.name}</span>
                        </div>
                      )
                    })()}
                    {(() => {
                      const linkedTask = tasks.find(t => t.id === selectedTask.task_id)
                      return linkedTask?.content?.category && (
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-slate-400 flex-shrink-0"></span>
                          <span className="text-slate-500 font-medium">Category:</span>
                          <span className="text-slate-700 truncate">{linkedTask.content.category}</span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => handleDuplicateTask(selectedTask)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <Copy className="h-4 w-4" /> Duplicate
                  </button>
                  <button
                    onClick={() => {
                      // Ensure we pass the complete task data for editing
                      const taskToEdit = {
                        ...selectedTask,
                        id: selectedTask.id, // Make sure the ID is included
                        isEditing: true // Flag to indicate this is an edit operation
                      }
                      setEditingTask(taskToEdit)
                      setOpen(true)
                    }}
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
                  {/* Objective - Inline Editable */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                      <Target className="w-4 h-4 text-indigo-500" /> Objective
                    </h3>
                    {editingField === 'objective' ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempValues.objective ?? selectedTask.objective ?? ''}
                          onChange={(e) => setTempValues(prev => ({ ...prev, objective: e.target.value }))}
                          className="w-full resize-none rounded border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await aiTasksApi.update(selectedTask.id, { objective: tempValues.objective })
                                setSelectedTask(prev => prev && tempValues.objective !== undefined ? { ...prev, objective: tempValues.objective } : prev)
                                setEditingField(null)
                                setTempValues({})
                                load()
                              } catch (error) {
                                console.error('Failed to update objective:', error)
                              }
                            }}
                            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null)
                              setTempValues({})
                            }}
                            className="rounded border border-slate-200 px-3 py-1 text-xs transition-colors hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingField('objective')
                          setTempValues({ objective: selectedTask.objective })
                        }}
                        className="-m-2 flex min-h-[2rem] cursor-pointer items-center rounded-md p-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {selectedTask.objective || 'Click to add objective...'}
                      </div>
                    )}
                  </div>

                  {/* Deliverables - Inline Editable */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                      <Target className="w-4 h-4 text-emerald-500" /> Deliverables
                    </h3>
                    {editingField === 'deliverables' ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempValues.deliverables ?? selectedTask.deliverables ?? ''}
                          onChange={(e) => setTempValues(prev => ({ ...prev, deliverables: e.target.value }))}
                          className="w-full resize-none rounded border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await aiTasksApi.update(selectedTask.id, { deliverables: tempValues.deliverables })
                                setSelectedTask(prev => prev && tempValues.deliverables !== undefined ? { ...prev, deliverables: tempValues.deliverables } : prev)
                                setEditingField(null)
                                setTempValues({})
                                load()
                              } catch (error) {
                                console.error('Failed to update deliverables:', error)
                              }
                            }}
                            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null)
                              setTempValues({})
                            }}
                            className="rounded border border-slate-200 px-3 py-1 text-xs transition-colors hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingField('deliverables')
                          setTempValues({ deliverables: selectedTask.deliverables || undefined })
                        }}
                        className="-m-2 flex min-h-[2rem] cursor-pointer items-center rounded-md p-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {selectedTask.deliverables || 'Click to add deliverables...'}
                      </div>
                    )}
                  </div>

                  {/* Context - Inline Editable */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                      <FileText className="w-4 h-4 text-blue-500" /> Context
                    </h3>
                    {editingField === 'context' ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempValues.context ?? selectedTask.context ?? ''}
                          onChange={(e) => setTempValues(prev => ({ ...prev, context: e.target.value }))}
                          className="w-full resize-none rounded border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={4}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await aiTasksApi.update(selectedTask.id, { context: tempValues.context })
                                setSelectedTask(prev => prev && tempValues.context !== undefined ? { ...prev, context: tempValues.context } : prev)
                                setEditingField(null)
                                setTempValues({})
                                load()
                              } catch (error) {
                                console.error('Failed to update context:', error)
                              }
                            }}
                            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null)
                              setTempValues({})
                            }}
                            className="rounded border border-slate-200 px-3 py-1 text-xs transition-colors hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingField('context')
                          setTempValues({ context: selectedTask.context || undefined })
                        }}
                        className="-m-2 flex min-h-[2rem] cursor-pointer items-start whitespace-pre-wrap rounded-md p-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {selectedTask.context || 'Click to add context...'}
                      </div>
                    )}
                  </div>

                  {/* Acceptance Criteria - Inline Editable */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Acceptance Criteria
                    </h3>
                    {editingField === 'acceptance_criteria' ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempValues.acceptance_criteria ?? selectedTask.acceptance_criteria ?? ''}
                          onChange={(e) => setTempValues(prev => ({ ...prev, acceptance_criteria: e.target.value }))}
                          className="w-full resize-none rounded border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={4}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await aiTasksApi.update(selectedTask.id, { acceptance_criteria: tempValues.acceptance_criteria })
                                setSelectedTask(prev => prev && tempValues.acceptance_criteria !== undefined ? { ...prev, acceptance_criteria: tempValues.acceptance_criteria } : prev)
                                setEditingField(null)
                                setTempValues({})
                                load()
                              } catch (error) {
                                console.error('Failed to update acceptance criteria:', error)
                              }
                            }}
                            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null)
                              setTempValues({})
                            }}
                            className="rounded border border-slate-200 px-3 py-1 text-xs transition-colors hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingField('acceptance_criteria')
                          setTempValues({ acceptance_criteria: selectedTask.acceptance_criteria || undefined })
                        }}
                        className="-m-2 flex min-h-[2rem] cursor-pointer items-start whitespace-pre-wrap rounded-md p-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {selectedTask.acceptance_criteria || 'Click to add acceptance criteria...'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Guardrails */}
                  {selectedTask.guardrails && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                        <AlertCircle className="w-4 h-4 text-blue-500" /> Guardrails & Safety
                      </h3>
                      <div className="space-y-2 text-sm text-slate-700">
                        {selectedTask.guardrails.timeCapMin && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Time Cap: {selectedTask.guardrails.timeCapMin} minutes</span>
                          </div>
                        )}
                        {selectedTask.guardrails.costCapUSD && (
                          <div className="flex items-center gap-2">
                            <span>💰</span>
                            <span>Cost Cap: ${selectedTask.guardrails.costCapUSD}</span>
                          </div>
                        )}
                        {selectedTask.guardrails.requiresHumanApproval && (
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span>Requires human approval</span>
                          </div>
                        )}
                        {selectedTask.guardrails?.dataScopes && selectedTask.guardrails.dataScopes.length > 0 && (
                          <div>
                            <span className="font-medium">Data Scopes:</span>
                            <div className="mt-1">
                              {selectedTask.guardrails?.dataScopes?.map((scope: string, i: number) => (
                                <span key={i} className="mr-1 mb-1 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                      <Play className="h-4 w-4 text-indigo-500" /> Quick Actions
                    </h3>
                    <div className="space-y-2">
                      <button
                        disabled={selectedTask?.status === 'in_progress'}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        onClick={() => {
                          // TODO: Implement plan generation
                          console.log('Generate plan for:', selectedTask.id)
                        }}
                      >
                        <Play className="h-4 w-4" /> Generate Plan
                      </button>
                      <button
                        disabled={selectedTask?.status === 'in_progress'}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        onClick={() => {
                          // TODO: Implement dry run
                          console.log('Dry run for:', selectedTask.id)
                        }}
                      >
                        <RotateCcw className="h-4 w-4" /> Simulate (Dry Run)
                      </button>
                      <button
                        disabled={selectedTask?.status === 'in_progress' || selectedTask?.status === 'completed'}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        onClick={() => {
                          // TODO: Implement execution
                          console.log('Execute:', selectedTask.id)
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Execute
                      </button>

                      {/* Manual Status Update Buttons */}
                      {selectedTask?.status !== 'completed' && selectedTask?.status !== 'failed' && (
                        <div className="mt-3 pt-3 border-t border-slate-300 space-y-2">
                          <button
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                            onClick={async () => {
                              if (!selectedTask) return
                              try {
                                await aiTasksApi.update(selectedTask.id, {
                                  status: 'completed',
                                  completed_at: new Date().toISOString()
                                })
                                // Refresh the data to update the UI
                                await load()
                                // Move to history tab to show the completed task
                                setActiveTab('history')
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
                              if (!selectedTask) return
                              if (!confirm('Are you sure you want to mark this task as failed? This action cannot be undone.')) return
                              try {
                                await aiTasksApi.update(selectedTask.id, {
                                  status: 'failed',
                                  completed_at: new Date().toISOString()
                                })
                                // Refresh the data to update the UI
                                await load()
                                // Move to history tab to show the failed task
                                setActiveTab('history')
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

                    {selectedTask?.status === 'in_progress' && (
                      <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                        <div className="flex items-center gap-2 text-sm text-indigo-700">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Task is currently running...</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Preview Generated Brief & Spec - Full Width Bottom Row */}
              <div className="mt-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                    <FileText className="w-4 h-4 text-purple-500" /> Preview Generated Brief & Spec
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* AI Task Brief */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-800">AI Prompt</span>
                        <div className="flex gap-2">
                          <button
                            className={`text-xs px-3 py-1.5 border rounded-md inline-flex items-center gap-1.5 transition-colors ${
                              isImprovingPrompt
                                ? 'border-indigo-300 bg-indigo-100 text-indigo-600 cursor-not-allowed'
                                : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                            onClick={() => improvePromptWithChatGPT(selectedTask)}
                            disabled={isImprovingPrompt}
                          >
                            {isImprovingPrompt ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin"/>Improving...
                              </>
                            ) : (
                              <>
                                <span className="text-xs">✨</span>Improve with AI
                              </>
                            )}
                          </button>
                          <button
                            className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
                            onClick={() => {
                              const currentPrompt = improvedPrompt || generateBasicPrompt(selectedTask)
                              navigator.clipboard.writeText(currentPrompt)
                            }}
                          >
                            <Copy className="w-3 h-3"/>Copy Prompt
                          </button>
                          {improvedPrompt && (
                            <button
                              className="text-xs px-3 py-1.5 border border-orange-300 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 inline-flex items-center gap-1.5 transition-colors"
                              onClick={() => {
                                setImprovedPrompt(null)
                              }}
                            >
                              <RotateCcw className="w-3 h-3"/>Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-4 text-sm relative">
                        {improvedPrompt && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              <span className="text-xs mr-1">✨</span>AI Enhanced
                            </span>
                          </div>
                        )}
                        <pre className="whitespace-pre-wrap text-slate-700 font-mono text-xs leading-relaxed pr-20">
                          {improvedPrompt || generateBasicPrompt(selectedTask)}
                        </pre>
                      </div>
                    </div>

                    {/* Task Spec (JSON) */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-800">Task Spec (JSON)</span>
                        <button
                          className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
                          onClick={() => {
                            const taskSpec = JSON.stringify({
                              objective: selectedTask.objective,
                              deliverables: selectedTask.deliverables,
                              context: selectedTask.context,
                              acceptance_criteria: selectedTask.acceptance_criteria,
                              mode: selectedTask.mode,
                              priority: selectedTask.metadata?.priority,
                              agent_id: selectedTask.agent_id,
                              guardrails: selectedTask.guardrails,
                              task_id: selectedTask.task_id
                            }, null, 2)
                            navigator.clipboard.writeText(taskSpec)
                          }}
                        >
                          <Copy className="w-3 h-3"/>Copy JSON
                        </button>
                      </div>
                      <pre className="bg-slate-50 border rounded-lg p-4 text-xs whitespace-pre-wrap max-h-80 overflow-y-auto font-mono leading-relaxed">
                        {JSON.stringify({
                          objective: selectedTask.objective,
                          deliverables: selectedTask.deliverables,
                          context: selectedTask.context,
                          acceptance_criteria: selectedTask.acceptance_criteria,
                          mode: selectedTask.mode,
                          priority: selectedTask.metadata?.priority,
                          agent_id: selectedTask.agent_id,
                          guardrails: selectedTask.guardrails,
                          task_id: selectedTask.task_id
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-slate-50">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="mb-2 text-lg font-medium text-slate-900">Select a Task</h3>
                <p className="mb-4 text-slate-600">Choose a task from the sidebar to view details</p>
                <button
                  onClick={() => setOpen(true)}
                  className="mx-auto inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Assign Task
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Task Workspace</p>
                <p className="text-xs text-slate-500">
                  {loading ? 'Loading tasks…' : `${aiTasks.length} pending ${aiTasks.length === 1 ? 'task' : 'tasks'}`}
                </p>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:bg-white"
                aria-label="Close task workspace"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(80vh-3.5rem)] overflow-y-auto px-4 py-4">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      <AITaskEditor
        isOpen={isOpen}
        initial={editingTask}
        onClose={() => {
          setOpen(false)
          setEditingTask(null)
        }}
        onSaved={() => {
          setOpen(false)
          setEditingTask(null)
          load()
        }}
      />
    </div>
  )
}
