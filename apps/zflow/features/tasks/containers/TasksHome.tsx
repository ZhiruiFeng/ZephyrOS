'use client'

import React, { useMemo } from 'react'
import { CategorySidebar } from '@/app/components/navigation'
import { StatisticsCards, FilterControls } from '@/app/components/ui'
import CurrentView from '../components/views/CurrentView'
import FutureView from '../components/views/FutureView'
import ArchiveView from '../components/views/ArchiveView'
import type { TaskMemory } from '@/lib/api'
import { usePerformanceTracking } from '@/lib/performance'

import type { ViewKey, DisplayMode } from '../types/tasks'

interface TasksHomeProps {
  // State
  view: ViewKey
  setView: (v: ViewKey) => void
  displayMode: DisplayMode
  setDisplayMode: (m: DisplayMode) => void

  // Data
  categories: any[]
  stats: any
  currentList: TaskMemory[]
  futureList: TaskMemory[]
  archiveList: TaskMemory[]
  groupedArchiveList: Array<{ date: string; tasks: TaskMemory[] }>
  timer: any
  expandedDescriptions: Set<string>

  // Filters
  selectedCategory: 'all' | 'uncategorized' | string
  setSelectedCategory: (v: 'all' | 'uncategorized' | string) => void
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent'
  setFilterPriority: (v: 'all' | 'low' | 'medium' | 'high' | 'urgent') => void
  search: string
  setSearch: (v: string) => void
  sortMode: 'none' | 'priority' | 'due_date'
  setSortMode: (v: 'none' | 'priority' | 'due_date') => void

  // Category counts for sidebar & mobile sheet
  viewBasedCounts: any

  // Actions
  t: any
  goToWork: (taskId: string) => void
  onToggleComplete: (taskId: string, currentStatus: string) => void
  onHoldTask: (taskId: string) => void
  onEditTask: (task: any) => void
  onDeleteTask: (taskId: string) => void
  onShowTime: (task: { id: string; title: string }) => void
  onToggleDescription: (taskId: string) => void
  onActivateTask: (taskId: string) => void
  onUpdateCategory: (taskId: string, categoryId: string | undefined) => void
  onReopenTask: (taskId: string) => void

  // Category CRUD
  createCategory: (payload: any) => Promise<any>
  updateCategory: (id: string, payload: any) => Promise<any>
  deleteCategory: (id: string) => Promise<any>
  onOpenMobileCategorySelector: () => void

  onOpenDailyModal: () => void
}

const TasksHome = React.memo(function TasksHome(props: TasksHomeProps) {
  usePerformanceTracking('TasksHome')

  const {
    view,
    setView,
    displayMode,
    setDisplayMode,
    categories,
    stats,
    currentList,
    futureList,
    archiveList,
    groupedArchiveList,
    timer,
    expandedDescriptions,
    selectedCategory,
    setSelectedCategory,
    filterPriority,
    setFilterPriority,
    search,
    setSearch,
    sortMode,
    setSortMode,
    viewBasedCounts,
    t,
    goToWork,
    onToggleComplete,
    onHoldTask,
    onEditTask,
    onDeleteTask,
    onShowTime,
    onToggleDescription,
    onActivateTask,
    onUpdateCategory,
    onReopenTask,
    createCategory,
    updateCategory,
    deleteCategory,
    onOpenMobileCategorySelector,
    onOpenDailyModal,
  } = props

  // Memoize callback handlers to prevent unnecessary re-renders
  const categoryHandlers = useMemo(() => ({
    onSelect: (key: any) => setSelectedCategory(key),
    onCreate: async (payload: any) => {
      await createCategory({ name: payload.name, color: payload.color })
    },
    onUpdate: async (id: string, payload: any) => {
      await updateCategory(id, payload)
    },
    onDelete: async (id: string) => {
      await deleteCategory(id)
      if (selectedCategory === id) setSelectedCategory('all')
    }
  }), [setSelectedCategory, createCategory, updateCategory, deleteCategory, selectedCategory])

  return (
    <div className="flex gap-4 md:gap-6">
      <CategorySidebar
        categories={categories}
        selected={selectedCategory}
        counts={viewBasedCounts}
        view={view}
        onSelect={categoryHandlers.onSelect}
        onCreate={categoryHandlers.onCreate}
        onUpdate={categoryHandlers.onUpdate}
        onDelete={categoryHandlers.onDelete}
        className="hidden md:block rounded-lg"
      />

      <div className="flex-1">
        <StatisticsCards stats={stats} activeView={view} onViewChange={setView} t={t} />

        <FilterControls
          search={search}
          filterPriority={filterPriority}
          selectedCategory={selectedCategory}
          displayMode={displayMode}
          sortMode={sortMode}
          categories={categories}
          onSearchChange={setSearch}
          onPriorityChange={setFilterPriority}
          onDisplayModeChange={setDisplayMode}
          onSortModeChange={setSortMode}
          onOpenMobileCategorySelector={onOpenMobileCategorySelector}
          onOpenDailyModal={onOpenDailyModal}
          t={t}
        />

        <div className="space-y-3 md:space-y-3">
          {view === 'current' && (
            <CurrentView
              tasks={currentList}
              categories={categories}
              timer={timer}
              displayMode={displayMode}
              expandedDescriptions={expandedDescriptions}
              t={t}
              onTaskClick={goToWork}
              onToggleComplete={onToggleComplete}
              onHoldTask={onHoldTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onShowTime={onShowTime}
              onToggleDescription={onToggleDescription}
            />
          )}

          {view === 'future' && (
            <FutureView
              tasks={futureList}
              categories={categories}
              timer={timer}
              displayMode={displayMode}
              expandedDescriptions={expandedDescriptions}
              t={t}
              onTaskClick={goToWork}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onShowTime={onShowTime}
              onToggleDescription={onToggleDescription}
              onActivateTask={onActivateTask}
              onUpdateCategory={onUpdateCategory}
            />
          )}

          {view === 'archive' && (
            <ArchiveView
              groupedArchiveList={groupedArchiveList}
              categories={categories}
              timer={timer}
              displayMode={displayMode}
              expandedDescriptions={expandedDescriptions}
              t={t}
              onTaskClick={goToWork}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onShowTime={onShowTime}
              onToggleDescription={onToggleDescription}
              onReopenTask={onReopenTask}
            />
          )}
        </div>
      </div>
    </div>
  )
})

export default TasksHome
