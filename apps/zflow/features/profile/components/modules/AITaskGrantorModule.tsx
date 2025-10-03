'use client'

import React from 'react'
import { Plus, Loader2, Maximize2, PanelLeftClose, PanelLeft, X, FileText } from 'lucide-react'
import { aiTasksApi, tasksApi, type AITask } from '@/lib/api'
import type { ProfileModuleConfig } from '@/profile'
import AITaskEditor from './AITaskEditor'
import { TaskListSidebar, TaskInfoView } from './task-grantor'

interface Props {
  config: ProfileModuleConfig
  onConfigChange?: (newConfig: ProfileModuleConfig) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export default function AITaskGrantorModule({ isFullscreen, onToggleFullscreen }: Props) {
  // State management
  const [isOpen, setOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [aiTasks, setAiTasks] = React.useState<AITask[]>([])
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
  const [workspaces, setWorkspaces] = React.useState<any[]>([])

  const formatStatus = React.useCallback((status?: string | null) => {
    if (!status) return 'unknown'
    return status.split('_').join(' ')
  }, [])

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadingHistory(true)
    try {
      const [allAiTaskItems, taskItems, agentItems, workspaceItems] = await Promise.all([
        aiTasksApi.list({ limit: 100, sort_by: 'assigned_at', sort_order: 'desc' }),
        tasksApi.getAll({ limit: 100, sort_by: 'created_at', sort_order: 'desc' }),
        import('@/lib/api').then(api => api.aiAgentsApi.list({ limit: 100 })),
        fetch('/api/executor/workspaces').then(res => res.ok ? res.json() : { workspaces: [] }).then(data => data.workspaces || []).catch(() => [])
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
      setWorkspaces(workspaceItems)

      // Update selectedTask if it's in the refreshed data
      setSelectedTask(prev => {
        if (!prev) return null
        const updated = allAiTaskItems.find(t => t.id === prev.id)
        return updated || prev
      })

      // Populate run history with completed and failed tasks
      const historyItems = completedTasks.map(task => {
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

  const handleEditTask = (task: AITask) => {
    const taskToEdit = {
      ...task,
      id: task.id,
      isEditing: true
    }
    setEditingTask(taskToEdit)
    setOpen(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await aiTasksApi.remove(taskId)
      if (selectedTask?.id === taskId) setSelectedTask(null)
      load()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleEditField = (field: string, values: any) => {
    setEditingField(field)
    setTempValues(values)
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setTempValues({})
  }

  const sidebarContent = (
    <TaskListSidebar
      aiTasks={aiTasks}
      runHistory={runHistory}
      selectedTask={selectedTask}
      activeTab={activeTab}
      loading={loading}
      loadingHistory={loadingHistory}
      tasks={tasks}
      agents={agents}
      onSelectTask={handleSelectTask}
      onTabChange={setActiveTab}
      onEditTask={handleEditTask}
      onDuplicateTask={handleDuplicateTask}
      onDeleteTask={handleDeleteTask}
      formatStatus={formatStatus}
    />
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
        {/* Sidebar - Tasks Navigation */}
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

          <div className={`space-y-4 p-4 ${sidebarCollapsed ? 'lg:hidden' : ''} lg:h-full lg:overflow-y-auto`}>
            {sidebarContent}
          </div>
        </div>

        {/* Main Panel - Task Details */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedTask ? (
            <TaskInfoView
              task={selectedTask}
              tasks={tasks}
              agents={agents}
              workspaces={workspaces}
              editingField={editingField}
              tempValues={tempValues}
              onEditField={handleEditField}
              onCancelEdit={handleCancelEdit}
              onTaskUpdate={load}
              onTabChange={setActiveTab}
              onEditTask={handleEditTask}
              onDuplicateTask={handleDuplicateTask}
            />
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

      {/* Mobile Sidebar Overlay */}
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

      {/* Task Editor Modal */}
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