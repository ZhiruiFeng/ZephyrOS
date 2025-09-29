'use client'

import React, { useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import { TaskMemory } from '@/lib/api/api-base'
import { useTaskSelector, TaskSelectorConfig } from './useTaskSelector'

export interface TaskSelectorDropdownProps {
  selectedTaskId?: string
  onSelectTask: (task: TaskMemory | null) => void
  config?: TaskSelectorConfig
  placeholder?: string
  disabled?: boolean
  className?: string
  allowClear?: boolean
  label?: string
  helperText?: string
  errorText?: string
}

export function TaskSelectorDropdown({
  selectedTaskId,
  onSelectTask,
  config,
  placeholder = 'Choose a task...',
  disabled = false,
  className = '',
  allowClear = true,
  label,
  helperText,
  errorText
}: TaskSelectorDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredTasks,
    getTaskDisplayInfo,
  } = useTaskSelector(config)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)

    // Focus search input when opened
    const timer = setTimeout(() => searchRef.current?.focus(), 0)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      clearTimeout(timer)
    }
  }, [isOpen])

  // Clear search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen, setSearchQuery])

  // Close dropdown if disabled
  useEffect(() => {
    if (disabled) {
      setIsOpen(false)
    }
  }, [disabled])

  // Find selected task info
  const selectedTask = filteredTasks.find(task => task.id === selectedTaskId)
  const selectedTaskInfo = selectedTask ? getTaskDisplayInfo(selectedTask) : null

  const handleToggleDropdown = () => {
    if (disabled) return
    setIsOpen(prev => !prev)
  }

  const handleSelectTask = (task: TaskMemory) => {
    onSelectTask(task)
    setIsOpen(false)
  }

  const handleClearSelection = () => {
    onSelectTask(null)
    setIsOpen(false)
  }

  const buttonClass = `
    w-full rounded-xl border px-4 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500
    ${disabled
      ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
      : errorText
        ? 'border-red-300 bg-white text-slate-700 shadow-sm hover:border-red-400'
        : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50'
    }
    ${isOpen ? '!border-indigo-300 shadow-md' : ''}
    ${className}
  `.trim()

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          {label}
        </label>
      )}

      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          className={buttonClass}
          onClick={handleToggleDropdown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-disabled={disabled}
        >
          <div className="flex items-center justify-between gap-3">
            {selectedTaskInfo ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {selectedTaskInfo.isSubtask && <span className="text-slate-400 mr-1">↳</span>}
                  {selectedTaskInfo.title}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {selectedTaskInfo.subtitle}
                </p>
              </div>
            ) : (
              <span className="flex-1 text-sm text-slate-400">
                {placeholder}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {!disabled && isOpen && (
          <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {/* Search Header */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, status, or id"
                className="w-full border-0 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Task List */}
            <div className="max-h-64 overflow-y-auto py-1">
              {loading ? (
                <div className="px-4 py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-xs text-slate-500">Loading tasks...</p>
                </div>
              ) : error ? (
                <p className="px-4 py-8 text-center text-xs text-red-500">{error}</p>
              ) : filteredTasks.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">
                  {searchQuery ? 'No tasks found matching your search' : 'No matching tasks found.'}
                </p>
              ) : (
                filteredTasks.map((task) => {
                  const { title, subtitle, isSubtask, isContextTask } = getTaskDisplayInfo(task)
                  const isSelected = task.id === selectedTaskId

                  return (
                    <button
                      key={task.id}
                      type="button"
                      disabled={isContextTask}
                      className={`flex w-full items-start gap-3 text-left text-sm transition ${
                        isSubtask ? 'pl-8 pr-4 py-1.5' : 'px-4 py-2'
                      } ${
                        isContextTask
                          ? 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-60'
                          : isSelected
                            ? 'bg-indigo-50 text-indigo-700'
                            : isSubtask
                              ? 'hover:bg-slate-25 text-slate-600'
                              : 'hover:bg-slate-50 text-slate-700'
                      } ${
                        !isSubtask && !isContextTask ? 'border-t border-slate-100 first:border-t-0' : ''
                      }`}
                      onClick={() => !isContextTask && handleSelectTask(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`truncate ${isSubtask ? 'text-xs' : 'font-medium'}`}>
                          {isSubtask && <span className="text-slate-400 mr-1">↳</span>}
                          {title}
                          {isContextTask && <span className="text-xs ml-2">(parent context)</span>}
                        </p>
                        {!isSubtask && (
                          <p className="truncate text-xs text-slate-500">
                            {subtitle}
                          </p>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-indigo-500" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Clear Selection Footer */}
            {allowClear && selectedTaskId && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-right">
                <button
                  type="button"
                  className="text-xs font-medium text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
                  onClick={handleClearSelection}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper/Error Text */}
      {(helperText || errorText) && (
        <p className={`mt-1 text-xs ${errorText ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-gray-500'}`}>
          {errorText || helperText}
        </p>
      )}
    </div>
  )
}