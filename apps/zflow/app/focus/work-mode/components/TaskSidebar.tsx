'use client'

import React from 'react'
import { Folder, FileText, ChevronRight, ChevronDown, Clock, Calendar, X } from 'lucide-react'
import { Category } from '../../../types/task'
import { TaskMemory } from '../../../../lib/api'
import { useTranslation } from '../../../../contexts/LanguageContext'

export interface TaskWithCategory extends TaskMemory {
  category?: Category
  category_id?: string
}

interface TasksByCategoryResult {
  grouped: Record<string, TaskWithCategory[]>
  uncategorized: TaskWithCategory[]
}

interface TaskSidebarProps {
  sidebarVisible: boolean
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  viewMode: 'current' | 'backlog'
  setViewMode: (mode: 'current' | 'backlog') => void
  tasksByCategory: TasksByCategoryResult
  categories: Category[]
  expandedCategories: Set<string>
  toggleCategory: (categoryId: string) => void
  selectedTask: TaskWithCategory | null
  handleTaskSelect: (task: TaskWithCategory) => void
}

export default function TaskSidebar({
  sidebarVisible,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  viewMode,
  setViewMode,
  tasksByCategory,
  categories,
  expandedCategories,
  toggleCategory,
  selectedTask,
  handleTaskSelect
}: TaskSidebarProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Task Explorer */}
      <div className={`
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 border-r border-gray-200 flex flex-col bg-white
        transition-transform duration-300 ease-in-out lg:transition-none
        ${!sidebarVisible ? 'lg:hidden' : ''}
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-lg font-semibold text-gray-900">{t.ui.taskExplorer}</h2>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-gray-900">{t.ui.taskExplorer}</h2>
            <p className="text-sm text-gray-600 mt-1">{t.ui.selectTaskToWork}</p>
          </div>

          {/* View Mode Toggle */}
          <div className="mt-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setViewMode('current')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'current'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                {t.ui.currentTasks}
              </button>
              <button
                onClick={() => setViewMode('backlog')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'backlog'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Backlog
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {viewMode === 'current' ? t.ui.currentTasksDesc : t.ui.backlogTasksDesc}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Uncategorized Tasks */}
          {tasksByCategory.uncategorized.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => toggleCategory('uncategorized')}
                className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                {expandedCategories.has('uncategorized') ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <Folder className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">{t.ui.uncategorized}</span>
                <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {tasksByCategory.uncategorized.length}
                </span>
              </button>

              {expandedCategories.has('uncategorized') && (
                <div className="ml-6 mt-2 space-y-1">
                  {tasksByCategory.uncategorized.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskSelect(task)}
                      className={`flex items-center gap-2 w-full text-left p-2 rounded-md text-sm transition-colors ${
                        selectedTask?.id === task.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{task.content.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categorized Tasks */}
          {categories.map((category) => {
            const categoryTasks = tasksByCategory.grouped[category.id] || []
            if (categoryTasks.length === 0) return null

            return (
              <div key={category.id} className="mb-6">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Folder className="w-4 h-4" style={{ color: category.color }} />
                  <span className="font-medium text-gray-700">{category.name}</span>
                  <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {categoryTasks.length}
                  </span>
                </button>

                {expandedCategories.has(category.id) && (
                  <div className="ml-6 mt-2 space-y-1">
                    {categoryTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleTaskSelect(task)}
                        className={`flex items-center gap-2 w-full text-left p-2 rounded-md text-sm transition-colors ${
                          selectedTask?.id === task.id
                            ? 'bg-primary-100 text-primary-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span className="truncate">{task.content.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}