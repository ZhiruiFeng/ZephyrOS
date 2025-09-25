'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTasks, useUpdateTask } from '../../hooks/useMemories'
import { useCategories } from '../../hooks/useCategories'
import { useTimer } from '../../hooks/useTimer'
import { usePrefs } from '../../contexts/PrefsContext'
import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/auth/LoginPage'
import { TaskMemory, categoriesApi, TaskContent } from '../../lib/api'
import { KanbanSquare, Search, Filter, ListTodo, Calendar, Pencil, FileText, Tag, Hourglass } from 'lucide-react'
import TaskEditor from '../components/editors/TaskEditor'
import { getPriorityIcon, getTimerIcon } from '../components/ui/TaskIcons'
import { 
  isOverdue, 
  formatDate,
  formatTagsString,
  getTaskDisplayDate,
  shouldShowOverdue
} from '../utils/taskUtils'
import { useTranslation } from '../../contexts/LanguageContext'
import EnergyReviewModal from '../components/modals/EnergyReviewModal'
import { CelebrationAnimation } from '../components/ui/CelebrationAnimation'
import { useCelebration } from '../../hooks/useCelebration'

type StatusKey = TaskContent['status']

// Focused attention pool: only show pending, in_progress, completed (within 24h)
const getColumns = (t: any): Array<{ key: StatusKey; title: string; hint?: string }> => [
  { key: 'pending', title: t.ui.todo },
  { key: 'in_progress', title: t.ui.inProgress },
  { key: 'completed', title: t.ui.done24h },
]

export default function KanbanView() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? { root_tasks_only: true } : null)
  const { categories } = useCategories()
  const { updateTask } = useUpdateTask()
  const timer = useTimer()
  const [energyReviewOpen, setEnergyReviewOpen] = useState(false)
  const [energyReviewEntry, setEnergyReviewEntry] = useState<any>(null)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const { filterPriority, setFilterPriority, hideCompleted, setHideCompleted, selectedCategory, setSelectedCategory, sortMode } = (usePrefs() as any)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const router = useRouter()

  // Celebration state
  const { isVisible: celebrationVisible, triggerCelebration, hideCelebration } = useCelebration()

  // Mobile long-press drag state
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null)
  const [touchDragTitle, setTouchDragTitle] = useState<string>('')
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null)
  const [hoveredStatus, setHoveredStatus] = useState<StatusKey | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const isLongPressActiveRef = useRef(false)
  const sectionRefs = useRef<Partial<Record<StatusKey, HTMLDivElement | null>>>({})

  const goToWork = (taskId: string) => {
    // Avoid navigating when currently dragging
    if (draggingId) return
    router.push(`/focus?view=work&taskId=${encodeURIComponent(taskId)}`)
  }

  // Categories are now loaded via useCategories hook

  // using shared prefs; local persistence handled by PrefsProvider

  const filtered = useMemo(() => {
    // Note: In Kanban view, we don't hide completed tasks at this level because
    // we need them for the Done(24h) column. The hideCompleted setting is handled
    // in the byStatus logic instead.
    return tasks.filter((t) => {
      const c = t.content as TaskContent
      const catId = (t as any).category_id || (t as any).content?.category_id
      const matchCategory = selectedCategory === 'all' ? true : selectedCategory === 'uncategorized' ? !catId : catId === selectedCategory
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      // Don't filter completed tasks here - handle in byStatus for Done(24h) column
      return matchCategory && matchSearch && matchPriority
    })
  }, [tasks, search, filterPriority, selectedCategory])

  // sort mode from shared prefs

  const byStatus = useMemo<Record<StatusKey, TaskMemory[]>>(() => {
    const map = {
      pending: [] as TaskMemory[],
      in_progress: [] as TaskMemory[],
      completed: [] as TaskMemory[],
      cancelled: [] as TaskMemory[],
      on_hold: [] as TaskMemory[],
    }
    const now = Date.now()
    const windowMs = 24 * 60 * 60 * 1000
    
    for (const t of filtered) {
      const s = (t.content as TaskContent).status
      if (s === 'completed') {
        const completion = (t.content as TaskContent).completion_date
        const completedAt = completion ? new Date(completion).getTime() : 0
        const withinWindow = completedAt && now - completedAt <= windowMs
        
        // Show completed tasks within 24h regardless of hideCompleted setting
        // This is the "Done(24h)" column behavior
        if (withinWindow) {
          map.completed.push(t)
        }
        // else: older completed tasks are hidden from Kanban; visible in Archive page
      } else if (s === 'pending' || s === 'in_progress') {
        map[s].push(t)
      }
    }
    
    // sort inside each column
    const priorityOrder: Record<TaskContent['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    const sorters: Record<typeof sortMode, (a: TaskMemory, b: TaskMemory) => number> = {
      none: () => 0,
      priority: (a, b) => priorityOrder[(a.content as TaskContent).priority] - priorityOrder[(b.content as TaskContent).priority],
      due_date: (a, b) => {
        const da = (a.content as TaskContent).due_date
        const db = (b.content as TaskContent).due_date
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return new Date(da).getTime() - new Date(db).getTime()
      },
    }
    const sorter = sorters[sortMode]
    ;(Object.keys(map) as StatusKey[]).forEach((k) => map[k].sort(sorter))
    return map
  }, [filtered, sortMode])

  const onDragStart = (taskId: string, e: React.DragEvent) => {
    setDraggingId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragEnd = () => setDraggingId(null)

  const onDropTo = async (status: StatusKey, e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggingId
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const current = (task.content as TaskContent).status
    if (current === status) return
    try {
      await updateTask(id, { content: { status } })

      // Trigger celebration animation when task is completed
      if (status === 'completed') {
        triggerCelebration()
      }
    } catch (err) {
      console.error('Failed to move task:', err)
      alert(t.messages.taskUpdateFailed)
    } finally {
      setDraggingId(null)
    }
  }

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // --- Mobile long-press drag helpers ---
  const beginTouchDrag = (task: TaskMemory, startX: number, startY: number) => {
    setTouchDraggingId(task.id)
    setTouchDragTitle((task.content as TaskContent).title)
    setTouchPos({ x: startX, y: startY })
    isLongPressActiveRef.current = true
  }

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const cancelTouchDrag = useCallback(() => {
    setTouchDraggingId(null)
    setTouchDragTitle('')
    setTouchPos(null)
    setHoveredStatus(null)
    isLongPressActiveRef.current = false
    startPosRef.current = null
    clearLongPressTimer()
  }, [clearLongPressTimer])

  const onGlobalPointerMove = (e: PointerEvent) => {
    if (!isLongPressActiveRef.current) return
    setTouchPos({ x: e.clientX, y: e.clientY })
    // Hit test which section is hovered
    const statuses: StatusKey[] = ['pending', 'in_progress', 'completed']
    let hovered: StatusKey | null = null
    for (const s of statuses) {
      const el = sectionRefs.current[s]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        hovered = s
        break
      }
    }
    setHoveredStatus(hovered)
    // Prevent page scroll while dragging
    e.preventDefault()
  }

  const onGlobalPointerUp = useCallback(async () => {
    if (!isLongPressActiveRef.current) return cancelTouchDrag()
    const currentId = touchDraggingId
    const targetStatus = hoveredStatus
    cancelTouchDrag()
    if (!currentId || !targetStatus) return
    const task = tasks.find((t) => t.id === currentId)
    if (!task) return
    const current = (task.content as TaskContent).status
    if (current === targetStatus) return
    try {
      await updateTask(currentId, { content: { status: targetStatus } })

      // Trigger celebration animation when task is completed
      if (targetStatus === 'completed') {
        triggerCelebration()
      }
    } catch (err) {
      console.error('Failed to move task (touch):', err)
      alert(t.messages.taskUpdateFailed)
    }
  }, [touchDraggingId, hoveredStatus, tasks, updateTask, t.messages.taskUpdateFailed, triggerCelebration, cancelTouchDrag])

  useEffect(() => {
    // Attach global listeners while dragging
    const move = (e: PointerEvent) => onGlobalPointerMove(e)
    const up = () => onGlobalPointerUp()
    if (isLongPressActiveRef.current) {
      window.addEventListener('pointermove', move, { passive: false })
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    }
    return () => {
      window.removeEventListener('pointermove', move as any)
      window.removeEventListener('pointerup', up as any)
      window.removeEventListener('pointercancel', up as any)
    }
    // It's okay to re-run when state toggles via ref flag
  }, [touchDraggingId, onGlobalPointerUp])

  const openEditor = (taskMemory: TaskMemory) => {
    // Convert TaskMemory to Task format expected by TaskEditor
    const task = {
      id: taskMemory.id,
      ...taskMemory.content,
      tags: taskMemory.tags,
      created_at: taskMemory.created_at,
      updated_at: taskMemory.updated_at,
      // Add category_id from the top level if available
      category_id: (taskMemory as any).category_id || taskMemory.content.category_id,
    }
    setSelected(task as any)
    setEditorOpen(true)
  }

  // Listen for timer stopped to open energy review modal
  useEffect(() => {
    const { default: eventBus } = require('../core/events/event-bus')
    const off = eventBus.onTimerStopped((detail: any) => {
      const entry = detail?.entry
      if (entry) {
        setEnergyReviewEntry(entry)
        setEnergyReviewOpen(true)
      }
    })
    return off
  }, [])

  const closeEditor = () => {
    setEditorOpen(false)
    setSelected(null)
  }

  const handleSaveTask = async (taskId: string, data: any) => {
    await updateTask(taskId, data)
  }

  const holdTask = async (id: string) => {
    try {
      await updateTask(id, { 
        content: { 
          status: 'on_hold'
        } 
      })
    } catch (err) {
      console.error('Failed to hold task:', err)
      alert(t.messages.taskUpdateFailed)
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />
  }

  // Show loading while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">{t.messages.failedToLoadTasks}</div>
    )
  }

  return (
    <>
    <div className="py-4 sm:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-4 sm:mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                <KanbanSquare className="w-6 h-6 sm:w-7 sm:h-7" /> {t.ui.kanbanTitle}
              </h1>
              <p className="mt-1 text-white/90 text-sm sm:text-base">{t.ui.dragToUpdateStatus}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Search */}
              <div className="sm:hidden flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 flex-1 max-w-xs">
                <Search className="w-4 h-4 text-white/70" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.ui.searchTasks}
                  className="text-sm outline-none bg-transparent placeholder:text-white/70 text-white flex-1"
                />
              </div>
              
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="sm:hidden flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {/* Desktop Search and Filters */}
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.ui.searchTasks}
                  className="text-sm outline-none bg-transparent placeholder:text-white/70 text-white"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="text-sm outline-none bg-transparent text-white"
                >
                  <option value="all" className="text-gray-800">{t.ui.allPriorities}</option>
                  <option value="urgent" className="text-gray-800">{t.task.priorityUrgent}</option>
                  <option value="high" className="text-gray-800">{t.task.priorityHigh}</option>
                  <option value="medium" className="text-gray-800">{t.task.priorityMedium}</option>
                  <option value="low" className="text-gray-800">{t.task.priorityLow}</option>
                </select>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value || 'all')}
                  className="text-sm outline-none bg-transparent text-white"
                >
                  <option value="all" className="text-gray-800">{t.ui.allCategories}</option>
                  <option value="uncategorized" className="text-gray-800">{t.ui.uncategorized}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="text-gray-800">{c.name}</option>
                  ))}
                </select>
              </div>
              <Link href="/focus?view=work" className="btn btn-secondary bg-white text-primary-700 hover:bg-white/90 inline-flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" /> 
                <span className="hidden lg:inline">{t.ui.workMode}</span>
                <span className="lg:hidden">{t.ui.work}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters Panel */}
      {showMobileFilters && (
        <div className="sm:hidden mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.priority}</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{t.ui.allPriorities}</option>
                <option value="urgent">{t.task.priorityUrgent}</option>
                <option value="high">{t.task.priorityHigh}</option>
                <option value="medium">{t.task.priorityMedium}</option>
                <option value="low">{t.task.priorityLow}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.category}</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value || 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{t.ui.allCategories}</option>
                <option value="uncategorized">{t.ui.uncategorized}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Soft WIP limit hints */}
      {byStatus.in_progress.length > 3 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2 text-sm">
          {t.ui.wipLimitExceeded}
        </div>
      )}
      {byStatus.pending.length > 10 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 px-4 py-2 text-sm">
          {t.ui.backlogLimitExceeded}
        </div>
      )}

      {/* Mobile: Three vertical sections, each with horizontal 2-row waterfall and long-press drag */}
      <div className="sm:hidden space-y-4">
        {getColumns(t).map((col) => {
          const items = (byStatus[col.key] || [])
          const rowA: TaskMemory[] = []
          const rowB: TaskMemory[] = []
          items.forEach((task, idx) => (idx % 2 === 0 ? rowA.push(task) : rowB.push(task)))
          return (
            <div
              key={col.key}
              ref={(el) => {
                sectionRefs.current[col.key] = el
              }}
              className={`glass rounded-2xl p-3 transition ring-offset-2 ${hoveredStatus === col.key ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-primary-600" /> {col.title}
                </h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {items.length}
                </span>
              </div>

              <div className={`rounded-xl p-2 bg-white/40`}>
                <div className="overflow-x-auto overflow-y-hidden">
                  <div className="flex flex-col gap-3 h-[28vh]">
                    <div className="inline-flex items-stretch gap-3 pr-4">
                      {rowA.map((task) => {
                        const c = task.content as TaskContent
                        return (
                          <div
                            key={task.id}
                            onPointerDown={(e) => {
                              // Start long-press detection for touch drag
                              if ((e.pointerType === 'touch' || e.pointerType === 'pen')) {
                                startPosRef.current = { x: e.clientX, y: e.clientY }
                                clearLongPressTimer()
                                longPressTimerRef.current = window.setTimeout(() => {
                                  beginTouchDrag(task, e.clientX, e.clientY)
                                }, 350)
                              }
                            }}
                            onPointerUp={() => {
                              clearLongPressTimer()
                              if (!isLongPressActiveRef.current) {
                                // treat as tap
                                goToWork(task.id)
                              }
                            }}
                            onPointerMove={(e) => {
                              const start = startPosRef.current
                              if (!start || isLongPressActiveRef.current) return
                              const dx = Math.abs(e.clientX - start.x)
                              const dy = Math.abs(e.clientY - start.y)
                              if (dx > 8 || dy > 8) {
                                // cancel long press if user moves
                                clearLongPressTimer()
                              }
                            }}
                            className="card card-hover select-none rounded-xl p-3 min-w-[15rem] max-w-[16rem] active:cursor-grabbing touch-none"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h3 className="font-medium text-gray-900 text-sm leading-tight pr-2 line-clamp-2">
                                  {c.title}
                                </h3>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {c.status !== 'on_hold' && c.status !== 'completed' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        holdTask(task.id)
                                      }}
                                      className="p-1 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                                      title={t.task.holdTask}
                                    >
                                      <Hourglass className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditor(task)
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> {t.ui.editTask}
                                  </button>
                                </div>
                              </div>
                              {c.description && (
                                <div className="text-xs text-gray-600 line-clamp-2">{c.description}</div>
                              )}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  {getPriorityIcon(c.priority)}
                                  {getTimerIcon(
                                    timer.isRunning,
                                    timer.runningTaskId === task.id,
                                    (e) => {
                                      e.stopPropagation()
                                      if (timer.isRunning && timer.runningTaskId === task.id) {
                                        timer.stop(task.id)
                                      } else {
                                        timer.start(task.id, { autoSwitch: true })
                                      }
                                    },
                                    undefined,
                                    { start: t.activity?.startTimer || 'Start Timer', stop: t.activity?.stopTimer || 'Stop Timer' }
                                  )}
                                  {getTaskDisplayDate(c.status, c.due_date, c.completion_date) && (
                                    <span className={`${shouldShowOverdue(c.status, c.due_date) ? 'text-red-600' : ''} inline-flex items-center gap-1`}>
                                      <Calendar className="w-3.5 h-3.5" />
                                      {formatDate(getTaskDisplayDate(c.status, c.due_date, c.completion_date)!)}
                                    </span>
                                  )}
                                </div>
                                {(() => {
                                  const categoryId = (task as any).category_id || c.category_id
                                  const category = categoryId ? categories.find(cat => cat.id === categoryId) : null
                                  return category ? (
                                    <div className="flex items-center gap-1">
                                      <Tag className="w-3 h-3" style={{ color: category.color || '#6B7280' }} />
                                      <span style={{ color: category.color || '#6B7280' }} className="text-xs">
                                        {category.name}
                                      </span>
                                    </div>
                                  ) : null
                                })()}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="inline-flex items-stretch gap-3 pr-4">
                      {rowB.map((task) => {
                        const c = task.content as TaskContent
                        return (
                          <div
                            key={task.id}
                            onPointerDown={(e) => {
                              if ((e.pointerType === 'touch' || e.pointerType === 'pen')) {
                                startPosRef.current = { x: e.clientX, y: e.clientY }
                                clearLongPressTimer()
                                longPressTimerRef.current = window.setTimeout(() => {
                                  beginTouchDrag(task, e.clientX, e.clientY)
                                }, 350)
                              }
                            }}
                            onPointerUp={() => {
                              clearLongPressTimer()
                              if (!isLongPressActiveRef.current) {
                                goToWork(task.id)
                              }
                            }}
                            onPointerMove={(e) => {
                              const start = startPosRef.current
                              if (!start || isLongPressActiveRef.current) return
                              const dx = Math.abs(e.clientX - start.x)
                              const dy = Math.abs(e.clientY - start.y)
                              if (dx > 8 || dy > 8) {
                                clearLongPressTimer()
                              }
                            }}
                            className="card card-hover select-none rounded-xl p-3 min-w-[15rem] max-w-[16rem] active:cursor-grabbing touch-none"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h3 className="font-medium text-gray-900 text-sm leading-tight pr-2 line-clamp-2">
                                  {c.title}
                                </h3>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {c.status !== 'on_hold' && c.status !== 'completed' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        holdTask(task.id)
                                      }}
                                      className="p-1 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                                      title={t.task.holdTask}
                                    >
                                      <Hourglass className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditor(task)
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> {t.ui.editTask}
                                  </button>
                                </div>
                              </div>
                              {c.description && (
                                <div className="text-xs text-gray-600 line-clamp-2">{c.description}</div>
                              )}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  {getPriorityIcon(c.priority)}
                                  {getTaskDisplayDate(c.status, c.due_date, c.completion_date) && (
                                    <span className={`${shouldShowOverdue(c.status, c.due_date) ? 'text-red-600' : ''} inline-flex items-center gap-1`}>
                                      <Calendar className="w-3.5 h-3.5" />
                                      {formatDate(getTaskDisplayDate(c.status, c.due_date, c.completion_date)!)}
                                    </span>
                                  )}
                                </div>
                                {(() => {
                                  const categoryId = (task as any).category_id || c.category_id
                                  const category = categoryId ? categories.find(cat => cat.id === categoryId) : null
                                  return category ? (
                                    <div className="flex items-center gap-1">
                                      <Tag className="w-3 h-3" style={{ color: category.color || '#6B7280' }} />
                                      <span style={{ color: category.color || '#6B7280' }} className="text-xs">
                                        {category.name}
                                      </span>
                                    </div>
                                  ) : null
                                })()}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: drag overlay */}
      {touchDraggingId && touchPos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: 0, top: 0, transform: `translate(${touchPos.x + 8}px, ${touchPos.y + 8}px)` }}
        >
          <div className="rounded-lg bg-white shadow-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 max-w-[14rem]">
            {touchDragTitle}
          </div>
        </div>
      )}

      {/* Desktop: Multi Column Layout */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {getColumns(t).map((col) => (
          <div key={col.key} className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary-600" /> {col.title}
              </h2>
              <span className="text-xs text-gray-500">{byStatus[col.key]?.length || 0}</span>
            </div>

            <div
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(col.key, e)}
              className={`min-h-[320px] rounded-xl p-2 transition-colors ${draggingId ? 'bg-white/60' : 'bg-white/40'}`}
            >
              {(byStatus[col.key] || []).map((task) => {
                const c = task.content as TaskContent
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(task.id, e)}
                    onDragEnd={onDragEnd}
                    onClick={() => goToWork(task.id)}
                    className="card card-hover mb-2 cursor-pointer active:cursor-grabbing select-none rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-2 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {c.title}
                        </div>
                        {c.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</div>
                        )}
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(c.priority)}
                            {getTimerIcon(
                              timer.isRunning,
                              timer.runningTaskId === task.id,
                              (e) => {
                                e.stopPropagation()
                                if (timer.isRunning && timer.runningTaskId === task.id) {
                                  timer.stop(task.id)
                                } else {
                                  timer.start(task.id, { autoSwitch: true })
                                }
                              },
                              undefined,
                              { start: t.activity?.startTimer || 'Start Timer', stop: t.activity?.stopTimer || 'Stop Timer' }
                            )}
                            {getTaskDisplayDate(c.status, c.due_date, c.completion_date) && (
                              <span className={`${shouldShowOverdue(c.status, c.due_date) ? 'text-red-600' : ''} inline-flex items-center gap-1`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(getTaskDisplayDate(c.status, c.due_date, c.completion_date)!)}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const categoryId = (task as any).category_id || c.category_id
                            const category = categoryId ? categories.find(cat => cat.id === categoryId) : null
                            return category ? (
                              <div className="flex items-center gap-1">
                                <Tag className="w-3 h-3" style={{ color: category.color || '#6B7280' }} />
                                <span style={{ color: category.color || '#6B7280' }} className="text-xs">
                                  {category.name}
                                </span>
                              </div>
                            ) : null
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {c.status !== 'on_hold' && c.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              holdTask(task.id)
                            }}
                            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                            title={t.task.holdTask}
                          >
                            <Hourglass className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditor(task)
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" /> {t.ui.editTask}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <TaskEditor
        isOpen={editorOpen}
        onClose={closeEditor}
        task={selected}
        categories={categories}
        onSave={handleSaveTask}
        title={t.task.editTask}
      />
    </div>
    <EnergyReviewModal
      open={energyReviewOpen}
      entry={energyReviewEntry}
      onClose={() => setEnergyReviewOpen(false)}
    />

    <CelebrationAnimation
      isVisible={celebrationVisible}
      onComplete={hideCelebration}
    />
    </>
  )
}
