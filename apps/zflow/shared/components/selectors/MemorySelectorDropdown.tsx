'use client'

import React, { useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, Star } from 'lucide-react'
import { Memory } from 'types'
import { useMemorySelector, MemorySelectorConfig } from './useMemorySelector'

export interface MemorySelectorDropdownProps {
  selectedMemoryId?: string
  onSelectMemory: (memory: Memory | null) => void
  config?: MemorySelectorConfig
  placeholder?: string
  disabled?: boolean
  className?: string
  allowClear?: boolean
  label?: string
  helperText?: string
  errorText?: string
}

export function MemorySelectorDropdown({
  selectedMemoryId,
  onSelectMemory,
  config,
  placeholder = 'Choose a memory...',
  disabled = false,
  className = '',
  allowClear = true,
  label,
  helperText,
  errorText
}: MemorySelectorDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredMemories,
    getMemoryDisplayInfo,
  } = useMemorySelector(config)

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

  // Find selected memory info
  const selectedMemory = filteredMemories.find(memory => memory.id === selectedMemoryId)
  const selectedMemoryInfo = selectedMemory ? getMemoryDisplayInfo(selectedMemory) : null

  const handleToggleDropdown = () => {
    if (disabled) return
    setIsOpen(prev => !prev)
  }

  const handleSelectMemory = (memory: Memory) => {
    onSelectMemory(memory)
    setIsOpen(false)
  }

  const handleClearSelection = () => {
    onSelectMemory(null)
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
            {selectedMemoryInfo ? (
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span className="text-base">{selectedMemoryInfo.typeIcon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 flex items-center gap-1">
                    {selectedMemoryInfo.title}
                    {selectedMemoryInfo.isHighlight && (
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {selectedMemoryInfo.subtitle}
                  </p>
                </div>
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
                placeholder="Search by title, content, type, or tags"
                className="w-full border-0 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Memory List */}
            <div className="max-h-64 overflow-y-auto py-1">
              {loading ? (
                <div className="px-4 py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-xs text-slate-500">Loading memories...</p>
                </div>
              ) : error ? (
                <p className="px-4 py-8 text-center text-xs text-red-500">{error}</p>
              ) : filteredMemories.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">
                  {searchQuery ? 'No memories found matching your search' : 'No matching memories found.'}
                </p>
              ) : (
                filteredMemories.map((memory) => {
                  const { title, subtitle, typeIcon, isHighlight } = getMemoryDisplayInfo(memory)
                  const isSelected = memory.id === selectedMemoryId

                  return (
                    <button
                      key={memory.id}
                      type="button"
                      className={`flex w-full items-start gap-3 text-left text-sm transition px-4 py-2 border-t border-slate-100 first:border-t-0 ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                      onClick={() => handleSelectMemory(memory)}
                    >
                      <span className="text-base">{typeIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium flex items-center gap-1">
                          {title}
                          {isHighlight && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {subtitle}
                        </p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-indigo-500" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Clear Selection Footer */}
            {allowClear && selectedMemoryId && (
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