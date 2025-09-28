import React from 'react'
import { Loader2, FileText, History, Edit, Copy, Trash2, CheckCircle2, Clock } from 'lucide-react'
import type { AITask } from '@/lib/api'

interface Props {
  aiTasks: AITask[]
  runHistory: any[]
  selectedTask: AITask | null
  activeTab: 'pending' | 'history'
  loading: boolean
  loadingHistory: boolean
  tasks: any[]
  agents: any[]
  onSelectTask: (task: AITask) => void
  onTabChange: (tab: 'pending' | 'history') => void
  onEditTask: (task: AITask) => void
  onDuplicateTask: (task: AITask) => void
  onDeleteTask: (taskId: string) => void
  formatStatus: (status?: string | null) => string
}

export default function TaskListSidebar({
  aiTasks,
  runHistory,
  selectedTask,
  activeTab,
  loading,
  loadingHistory,
  tasks,
  agents,
  onSelectTask,
  onTabChange,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  formatStatus
}: Props) {
  return (
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
          onClick={() => onTabChange('pending')}
        >
          <FileText className="mr-1 inline h-4 w-4" /> Pending
        </button>
        <button
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900'
          }`}
          onClick={() => onTabChange('history')}
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
              <TaskListItem
                key={task.id}
                task={task}
                tasks={tasks}
                selectedTask={selectedTask}
                onSelectTask={onSelectTask}
                onEditTask={onEditTask}
                onDuplicateTask={onDuplicateTask}
                onDeleteTask={onDeleteTask}
                formatStatus={formatStatus}
              />
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
              <HistoryListItem
                key={index}
                run={run}
                agents={agents}
                onSelectTask={() => {
                  const originalTask = run.original_task
                  if (originalTask) {
                    onSelectTask(originalTask)
                    onTabChange('pending')
                  }
                }}
                formatStatus={formatStatus}
              />
            ))
          )}
        </div>
      )}
    </>
  )
}

function TaskListItem({
  task,
  tasks,
  selectedTask,
  onSelectTask,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  formatStatus
}: {
  task: AITask
  tasks: any[]
  selectedTask: AITask | null
  onSelectTask: (task: AITask) => void
  onEditTask: (task: AITask) => void
  onDuplicateTask: (task: AITask) => void
  onDeleteTask: (taskId: string) => void
  formatStatus: (status?: string | null) => string
}) {
  return (
    <div
      className={`group cursor-pointer rounded-xl border p-3 transition-all ${
        selectedTask?.id === task.id
          ? 'border-indigo-200 bg-indigo-50/70 shadow-sm'
          : 'border-slate-100 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md'
      }`}
      onClick={() => onSelectTask(task)}
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
            onEditTask(task)
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
            onDuplicateTask(task)
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
              onDeleteTask(task.id)
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
  )
}

function HistoryListItem({
  run,
  agents,
  onSelectTask,
  formatStatus
}: {
  run: any
  agents: any[]
  onSelectTask: () => void
  formatStatus: (status?: string | null) => string
}) {
  return (
    <div
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      onClick={onSelectTask}
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
  )
}