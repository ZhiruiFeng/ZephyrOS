'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/LanguageContext'
import { Grid, BarChart3 } from 'lucide-react'
import {
  // Auth components
  LoginPage,
} from './components/auth'
import { MobileCategorySheet } from './components/navigation'
import { FloatingAddButton } from './components/ui'
import {
  // Modal components
  AddTaskModal,
  TaskTimeModal,
  ActivityTimeModal,
  DailyTimeModal,
  EnergyReviewModal,
} from './components/modals'
import {
  // Editor components
  TaskEditor,
  ActivityEditor,
} from './components/editors'
// views rendered via containers
import { useTasks } from '../hooks/useMemories'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories'
import { useActivities } from '../hooks/useActivities'
import { useTimer } from '../hooks/useTimer'
import { useTaskFiltering } from '../hooks/useTaskFiltering'
import { useTaskActions } from '../hooks/useTaskActions'
import { useActivityActions } from '../hooks/useActivityActions'
import { useModalState } from '../hooks/useModalState'
import { useTimeline, TimelineItem } from '../hooks/useTimeline'
import eventBus from './core/events/event-bus'
import TimelineHome from './modules/timeline/containers/TimelineHome'
import TasksHome from './modules/tasks/containers/TasksHome'

export type ViewKey = 'current' | 'future' | 'archive'
export type DisplayMode = 'list' | 'grid'
export type MainViewMode = 'tasks' | 'timeline'

function ZFlowPageContent() {
  const { user, loading: authLoading } = useAuth()
  const { t, currentLang } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const viewParam = params.get('view') || 'current'
  const isTimelineViewParam = viewParam === 'timeline'
  const view: ViewKey = (['current','future','archive'] as const).includes(viewParam as any) 
    ? (viewParam as ViewKey) 
    : 'current'
  const setView = (v: ViewKey) => router.push(`/?view=${v}`)
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('list')
  const [mainViewMode, setMainViewMode] = React.useState<MainViewMode>('tasks')
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  // Data hooks
  // Fetch more tasks and sort by recent activity to avoid hiding older unfinished ones
  const { tasks, isLoading, error } = useTasks(user ? { 
    root_tasks_only: true,
    limit: 500,
    sort_by: 'updated_at',
    sort_order: 'desc'
  } : null)
  // Do not fetch activities list on home page unless needed
  const { activities, isLoading: activitiesLoading } = useActivities(user ? undefined : undefined, { enabled: false })
  const { categories } = useCategories()
  const { createCategory } = useCreateCategory()
  const { updateCategory } = useUpdateCategory()
  const { deleteCategory } = useDeleteCategory()
  const timer = useTimer()
  const { timelineData, isLoading: timelineLoading, error: timelineError, refetch: refetchTimeline } = useTimeline(selectedDate)

  // Shared filters
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | 'uncategorized' | string>('all')
  const [filterPriority, setFilterPriority] = React.useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')
  const [search, setSearch] = React.useState('')
  const [sortMode, setSortMode] = React.useState<'none' | 'priority' | 'due_date'>('none')

  // Custom hooks
  const modalState = useModalState()
  const taskActions = useTaskActions({ t })
  const activityActions = useActivityActions({ t })
  const {
    currentList,
    futureList,
    archiveList,
    groupedArchiveList,
    stats: taskStats
  } = useTaskFiltering({
    tasks,
    selectedCategory,
    search,
    filterPriority,
    sortMode,
    timerRunningTaskId: timer.runningTaskId
  })

  // Statistics for three views only
  const stats = React.useMemo(() => ({
    current: taskStats.current,
    future: taskStats.future,
    archive: taskStats.archive
  }), [taskStats])

  // If URL requests timeline view, switch the main view accordingly
  React.useEffect(() => {
    if (isTimelineViewParam) {
      setMainViewMode('timeline')
    }
  }, [isTimelineViewParam])

  // If URL contains a date param (YYYY-MM-DD), use it for timeline view state
  React.useEffect(() => {
    const dateParam = params.get('date')
    if (dateParam) {
      const d = new Date(`${dateParam}T00:00:00`)
      if (!isNaN(d.getTime())) {
        setSelectedDate(d)
      }
    }
  }, [params])

  // Calculate category counts for sidebar
  const viewBasedCounts = React.useMemo(() => {
    const isRootTask = (t: any) => {
      const level = (t as any).hierarchy_level
      const parentId = (t as any).content?.parent_task_id
      return (level === 0) || (level === undefined && !parentId)
    }

    const getTasksForView = (viewType: ViewKey) => {
      switch (viewType) {
        case 'current':
          return currentList.filter(isRootTask)
        case 'future':
          return futureList.filter(isRootTask)
        case 'archive':
          return archiveList.filter(isRootTask)
        default:
          return []
      }
    }

    const viewTasks = getTasksForView(view)
    const counts = {
      byId: {} as Record<string, number>,
      byIdCompleted: {} as Record<string, number>,
      byIdIncomplete: {} as Record<string, number>,
      uncategorized: 0,
      uncategorizedCompleted: 0,
      uncategorizedIncomplete: 0,
      total: viewTasks.length,
      totalCompleted: 0,
      totalIncomplete: 0,
    }

    for (const t of viewTasks) {
      const c = t.content as any
      const completed = c.status === 'completed'
      const catId = (t as any).category_id || c.category_id
      if (catId) {
        counts.byId[catId] = (counts.byId[catId] || 0) + 1
        if (completed) counts.byIdCompleted[catId] = (counts.byIdCompleted[catId] || 0) + 1
        else counts.byIdIncomplete[catId] = (counts.byIdIncomplete[catId] || 0) + 1
      } else {
        counts.uncategorized += 1
        if (completed) counts.uncategorizedCompleted += 1
        else counts.uncategorizedIncomplete += 1
      }
      if (completed) counts.totalCompleted += 1
      else counts.totalIncomplete += 1
    }

    return counts
  }, [view, currentList, futureList, archiveList])

  // Event handlers
  React.useEffect(() => {
    const off = eventBus.onAddTaskFromPage(() => {
      if (selectedCategory !== 'all' && selectedCategory !== 'uncategorized') {
        eventBus.emitAddTask({ categoryId: selectedCategory })
      } else {
        eventBus.emitAddTask(undefined)
      }
    })
    return off
  }, [selectedCategory])

  React.useEffect(() => {
    const off = eventBus.onTimerStopped((detail) => {
      const entry = detail?.entry
      if (entry) {
        modalState.setEnergyReviewEntry(entry)
        modalState.setEnergyReviewOpen(true)
      }
    })
    return off
  }, [modalState])

  // Navigation functions
  const goToWork = (taskId: string) => {
    if (mainViewMode === 'timeline') {
      const dateKey = selectedDate.toISOString().slice(0,10)
      const returnTo = encodeURIComponent(`/?view=timeline&date=${dateKey}`)
      router.push(`/focus?view=work&taskId=${encodeURIComponent(taskId)}&from=timeline&returnTo=${returnTo}`)
    } else {
      // Return to the current task list subview (current/future/archive)
      const returnTo = encodeURIComponent(`/?view=${view}`)
      router.push(`/focus?view=work&taskId=${encodeURIComponent(taskId)}&from=tasks&returnTo=${returnTo}`)
    }
  }

  const goToActivityFocus = (activityId: string) => {
    const dateKey = selectedDate.toISOString().slice(0,10)
    const returnTo = encodeURIComponent(`/?view=timeline&date=${dateKey}`)
    router.push(`/focus/activity?activityId=${encodeURIComponent(activityId)}&from=timeline&returnTo=${returnTo}`)
  }

  const goToMemoryFocus = (memoryId: string) => {
    const dateKey = selectedDate.toISOString().slice(0,10)
    const returnTo = encodeURIComponent(`/?view=timeline&date=${dateKey}`)
    router.push(`/focus/memory?memoryId=${encodeURIComponent(memoryId)}&from=timeline&returnTo=${returnTo}`)
  }

  // Timeline item click -> navigate to corresponding focus page
  const handleTimelineItemClick = (item: TimelineItem) => {
    try {
      if (item.type === 'task') {
        goToWork(item.id)
        return
      }

      if (item.type === 'activity') {
        goToActivityFocus(item.id)
        return
      }

      if (item.type === 'memory') {
        goToMemoryFocus(item.id)
        return
      }

      if (item.type === 'time_entry') {
        const timelineItemType = item.metadata?.timelineItemType
        const relatedId = item.metadata?.timelineItemId || item.metadata?.taskId
        if (timelineItemType === 'task' && relatedId) {
          goToWork(relatedId)
          return
        }
        if (timelineItemType === 'activity' && relatedId) {
          goToActivityFocus(relatedId)
          return
        }
        // fallback: if只拿到taskId也跳任务专注
        if (relatedId) {
          goToWork(relatedId)
          return
        }
      }
      // 未匹配则不跳转
    } catch (e) {
      console.error('Failed to open editor from timeline item:', e)
    }
  }

  // Task event handlers
  const handleTaskEdit = (task: any) => {
    const convertedTask = taskActions.openEditor(task)
    modalState.openTaskEditor(convertedTask)
  }

  const handleSaveTask = async (taskId: string, data: any) => {
    await taskActions.handleSaveTask(taskId, data)
    modalState.closeTaskEditor()
  }

  // Activity event handlers
  const handleSaveActivity = async (activityId: string, updates: any) => {
    await activityActions.handleSaveActivity(activityId, updates)
    modalState.closeActivityEditor()
  }

  const handleCreateTaskAndStart = async (taskData: any) => {
    try {
      const newTask = await taskActions.handleAddTask(taskData)
      modalState.closeAddModal()
      // Start timer for the newly created task
      if (newTask && newTask.id) {
        await timer.start(newTask.id, { autoSwitch: true })
      }
    } catch (error) {
      console.error('Failed to create task and start timer:', error)
    }
  }


  // Authentication/loading guards
  if (authLoading) return <div className="flex items-center justify-center min-h-screen">{t.common.loading}</div>
  if (!user) return <LoginPage />
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">{t.common.loading}</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">{t.messages.failedToLoadTasks || 'Failed to load'}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        {/* Main View Mode Toggle at the top */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center glass rounded-full p-1">
            <button
              onClick={() => setMainViewMode('tasks')}
              className={`flex items-center gap-2 px-4 py-3 rounded-full text-base font-medium transition-all duration-200 ${
                mainViewMode === 'tasks'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Grid className="w-5 h-5" />
              {t.ui.taskList}
            </button>
            <button
              onClick={() => setMainViewMode('timeline')}
              className={`flex items-center gap-2 px-4 py-3 rounded-full text-base font-medium transition-all duration-200 ${
                mainViewMode === 'timeline'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              {t.ui.timelineView}
            </button>
          </div>
        </div>

        {/* Content based on view mode */}
        {mainViewMode === 'timeline' ? (
          <TimelineHome
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            items={timelineData.items}
            loading={timelineLoading}
            refetch={refetchTimeline}
            t={t}
            lang={currentLang}
            onItemClick={handleTimelineItemClick}
          />
        ) : (
          <TasksHome
            view={view}
            setView={setView}
            displayMode={displayMode}
            setDisplayMode={setDisplayMode}
            categories={categories}
            stats={stats}
            currentList={currentList}
            futureList={futureList}
            archiveList={archiveList}
            groupedArchiveList={groupedArchiveList}
            timer={timer}
            expandedDescriptions={modalState.expandedDescriptions}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            search={search}
            setSearch={setSearch}
            sortMode={sortMode}
            setSortMode={setSortMode}
            viewBasedCounts={viewBasedCounts}
            t={t}
            goToWork={goToWork}
            onToggleComplete={taskActions.toggleComplete}
            onHoldTask={taskActions.holdTask}
            onEditTask={handleTaskEdit}
            onDeleteTask={taskActions.handleDeleteTask}
            onShowTime={modalState.setTimeModalTask}
            onToggleDescription={modalState.toggleDescriptionExpansion}
            onActivateTask={taskActions.activate}
            onUpdateCategory={taskActions.handleUpdateCategory}
            onReopenTask={taskActions.reopen}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            onOpenMobileCategorySelector={() => modalState.setShowMobileCategorySelector(true)}
            onOpenDailyModal={() => modalState.setShowDailyModal(true)}
          />
        )}
      </div>

      {/* Floating Add Button (desktop only) */}
      <div className="hidden sm:block">
        <FloatingAddButton 
          onClick={modalState.openAddModal} 
        />
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={modalState.showAddModal}
        onClose={modalState.closeAddModal}
        onSubmit={taskActions.handleAddTask}
        onSubmitAndStart={handleCreateTaskAndStart}
        categories={categories}
        defaultCategoryId={selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined}
      />

      {/* Task Editor */}
      <TaskEditor
        isOpen={modalState.showTaskEditor}
        onClose={modalState.closeTaskEditor}
        task={modalState.editingTask}
        categories={categories}
        onSave={handleSaveTask}
        title={t.task?.editTask || 'Edit Task'}
      />

      {/* Activity Editor */}
      <ActivityEditor
        isOpen={modalState.showActivityEditor}
        onClose={modalState.closeActivityEditor}
        activity={modalState.editingActivity}
        categories={categories}
        onSave={handleSaveActivity}
      />

      {/* Task Time Modal */}
      <TaskTimeModal
        isOpen={!!modalState.timeModalTask}
        onClose={() => modalState.setTimeModalTask(null)}
        taskId={modalState.timeModalTask?.id || ''}
        taskTitle={modalState.timeModalTask?.title}
      />

      {/* Activity Time Modal */}
      <ActivityTimeModal
        isOpen={!!modalState.timeModalActivity}
        onClose={() => modalState.setTimeModalActivity(null)}
        activityId={modalState.timeModalActivity?.id || ''}
        activityTitle={modalState.timeModalActivity?.title}
      />

      {/* Daily Time Overview Modal */}
      <DailyTimeModal isOpen={modalState.showDailyModal} onClose={() => modalState.setShowDailyModal(false)} />

      {/* Energy Review Modal */}
      <EnergyReviewModal
        open={modalState.energyReviewOpen}
        entry={modalState.energyReviewEntry}
        onClose={() => modalState.setEnergyReviewOpen(false)}
      />

      {/* Mobile Category Selector Sheet */}
      <MobileCategorySheet
        open={modalState.showMobileCategorySelector}
        onClose={() => modalState.setShowMobileCategorySelector(false)}
        categories={categories}
        counts={viewBasedCounts}
        selected={selectedCategory}
        onSelect={(key) => setSelectedCategory(key as any)}
        onCreate={async (payload) => {
          await createCategory({ name: payload.name, color: payload.color })
        }}
        onUpdate={async (id, payload) => {
          await updateCategory(id, payload)
        }}
        onDelete={async (id) => {
          await deleteCategory(id)
          if (selectedCategory === id) setSelectedCategory('all')
        }}
      />
    </div>
  )
}


export default function ZFlowPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ZFlowPageContent />
    </Suspense>
  )
}
