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
import {
  // Navigation components
  CategorySidebar,
  MobileCategorySheet,
} from './components/navigation'
import {
  // UI components
  FloatingAddButton,
  StatisticsCards,
  FilterControls,
  DateSelector,
} from './components/ui'
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
import {
  // View components
  CurrentView,
  FutureView,
  ArchiveView,
  ActivitiesView,
  TimelineView,
} from './components/views'
import { useTasks } from '../hooks/useMemories'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories'
import { useActivities } from '../hooks/useActivities'
import { useTimer } from '../hooks/useTimer'
import { useTaskFiltering } from '../hooks/useTaskFiltering'
import { useTaskActions } from '../hooks/useTaskActions'
import { useActivityActions } from '../hooks/useActivityActions'
import { useModalState } from '../hooks/useModalState'
import { useTimeline, TimelineItem } from '../hooks/useTimeline'

export type ViewKey = 'current' | 'future' | 'archive' | 'activities'
export type DisplayMode = 'list' | 'grid'
export type MainViewMode = 'tasks' | 'timeline'

function ZFlowPageContent() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const view = (params.get('view') as ViewKey) || 'current'
  const setView = (v: ViewKey) => router.push(`/?view=${v}`)
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('list')
  const [mainViewMode, setMainViewMode] = React.useState<MainViewMode>('tasks')
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  // Data hooks
  const { tasks, isLoading, error } = useTasks(user ? { root_tasks_only: true } : null)
  const { activities, isLoading: activitiesLoading } = useActivities(user ? undefined : undefined)
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

  // Statistics including activities count
  const stats = React.useMemo(() => ({
    ...taskStats,
    activities: activities?.filter(a => a.status === 'active' || a.status === 'completed').length || 0
  }), [taskStats, activities])

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
  }, [tasks, view, currentList, futureList, archiveList])

  // Event handlers
  React.useEffect(() => {
    const handler = () => {
      if (selectedCategory !== 'all' && selectedCategory !== 'uncategorized') {
        window.dispatchEvent(new CustomEvent('zflow:addTask', {
          detail: { categoryId: selectedCategory }
        }))
      } else {
        window.dispatchEvent(new CustomEvent('zflow:addTask'))
      }
    }
    
    window.addEventListener('zflow:addTaskFromPage', handler)
    return () => window.removeEventListener('zflow:addTaskFromPage', handler)
  }, [selectedCategory])

  React.useEffect(() => {
    const handler = (e: any) => {
      const entry = e?.detail?.entry
      if (entry) {
        modalState.setEnergyReviewEntry(entry)
        modalState.setEnergyReviewOpen(true)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('zflow:timerStopped', handler)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('zflow:timerStopped', handler)
      }
    }
  }, [modalState])

  // Navigation functions
  const goToWork = (taskId: string) => {
    router.push(`/focus?view=work&taskId=${encodeURIComponent(taskId)}`)
  }

  const goToActivityFocus = (activityId: string) => {
    router.push(`/focus/activity?activityId=${encodeURIComponent(activityId)}`)
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
      await taskActions.handleAddTask(taskData)
      modalState.closeAddModal()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }


  // Authentication/loading guards
  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return <LoginPage />
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">Failed to load</div>

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
              任务视图
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
              时间线视图
            </button>
          </div>
        </div>

        {/* Content based on view mode */}
        {mainViewMode === 'timeline' ? (
          /* Timeline View - Just date selector and timeline */
          <div className="space-y-6">
            {/* Date Selector */}
            <div className="flex items-center justify-center">
              <DateSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>
            
            {/* Timeline Content */}
            <TimelineView
              selectedDate={selectedDate}
              timelineItems={timelineData.items}
              loading={timelineLoading}
              onItemClick={(item: TimelineItem) => {
                // Handle timeline item click - could navigate to focus mode or edit
                console.log('Timeline item clicked:', item)
              }}
              onEditItem={(item: TimelineItem) => {
                // Handle timeline item edit
                console.log('Edit timeline item:', item)
              }}
              onDeleteItem={(item: TimelineItem) => {
                // Handle timeline item deletion
                console.log('Delete timeline item:', item)
              }}
              t={t}
            />
          </div>
        ) : (
          /* Task View - Categories sidebar + main content */
          <div className="flex gap-4 md:gap-6">
            {/* Left: Category sidebar */}
            <CategorySidebar
              categories={categories}
              selected={selectedCategory}
              counts={viewBasedCounts}
              view={view}
              onSelect={(key) => setSelectedCategory(key as any)}
              onCreate={async (payload) => { await createCategory({ name: payload.name, color: payload.color }) }}
              onUpdate={async (id, payload) => { await updateCategory(id, payload) }}
              onDelete={async (id) => { await deleteCategory(id); if (selectedCategory === id) setSelectedCategory('all') }}
              className="hidden md:block rounded-lg"
            />

            {/* Right: Main Content */}
            <div className="flex-1">
              {/* Statistics Cards */}
              <StatisticsCards
                stats={stats}
                activeView={view}
                onViewChange={setView}
                t={t}
              />

              {/* Filter Controls */}
              <FilterControls
                search={search}
                filterPriority={filterPriority}
                selectedCategory={selectedCategory}
                displayMode={displayMode}
                sortMode={sortMode}
                onSearchChange={setSearch}
                onPriorityChange={setFilterPriority}
                onDisplayModeChange={setDisplayMode}
                onSortModeChange={setSortMode}
                onOpenMobileCategorySelector={() => modalState.setShowMobileCategorySelector(true)}
                onOpenDailyModal={() => modalState.setShowDailyModal(true)}
                categories={categories}
                t={t}
              />

              {/* View content */}
              <div className="space-y-3 md:space-y-4">
                {view === 'current' && (
                  <CurrentView
                    tasks={currentList}
                    categories={categories}
                    timer={timer}
                    displayMode={displayMode}
                    expandedDescriptions={modalState.expandedDescriptions}
                    t={t}
                    onTaskClick={goToWork}
                    onToggleComplete={taskActions.toggleComplete}
                    onHoldTask={taskActions.holdTask}
                    onEditTask={handleTaskEdit}
                    onDeleteTask={taskActions.handleDeleteTask}
                    onShowTime={modalState.setTimeModalTask}
                    onToggleDescription={modalState.toggleDescriptionExpansion}
                  />
                )}

                {view === 'future' && (
                  <FutureView
                    tasks={futureList}
                    categories={categories}
                    timer={timer}
                    displayMode={displayMode}
                    expandedDescriptions={modalState.expandedDescriptions}
                    t={t}
                    onTaskClick={goToWork}
                    onEditTask={handleTaskEdit}
                    onDeleteTask={taskActions.handleDeleteTask}
                    onShowTime={modalState.setTimeModalTask}
                    onToggleDescription={modalState.toggleDescriptionExpansion}
                    onActivateTask={taskActions.activate}
                    onUpdateCategory={taskActions.handleUpdateCategory}
                  />
                )}

                {view === 'archive' && (
                  <ArchiveView
                    groupedArchiveList={groupedArchiveList}
                    categories={categories}
                    timer={timer}
                    displayMode={displayMode}
                    expandedDescriptions={modalState.expandedDescriptions}
                    t={t}
                    onTaskClick={goToWork}
                    onEditTask={handleTaskEdit}
                    onDeleteTask={taskActions.handleDeleteTask}
                    onShowTime={modalState.setTimeModalTask}
                    onToggleDescription={modalState.toggleDescriptionExpansion}
                    onReopenTask={taskActions.reopen}
                  />
                )}

                {view === 'activities' && (
                  <ActivitiesView
                    activities={activities}
                    activitiesLoading={activitiesLoading}
                    categories={categories}
                    timer={timer}
                    displayMode={displayMode}
                    t={t}
                    onActivityClick={goToActivityFocus}
                    onToggleActivityComplete={activityActions.toggleActivityComplete}
                    onEditActivity={modalState.openActivityEditor}
                    onDeleteActivity={activityActions.handleDeleteActivity}
                    onShowActivityTime={modalState.setTimeModalActivity}
                  />
                )}
              </div>
            </div>
          </div>
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
        title={t.task?.editTask || '编辑任务'}
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