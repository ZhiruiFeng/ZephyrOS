'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, BookOpen, Star } from 'lucide-react'
import { usePrincipleSelector, PrincipleSelectorConfig, CorePrincipleMemory } from './usePrincipleSelector'

export interface PrincipleSelectorDropdownProps {
  selectedPrincipleId?: string | null
  onSelectPrinciple: (principle: CorePrincipleMemory | null) => void
  placeholder?: string
  config?: PrincipleSelectorConfig
  className?: string
  disabled?: boolean
  allowClear?: boolean
}

export function PrincipleSelectorDropdown({
  selectedPrincipleId,
  onSelectPrinciple,
  placeholder = 'Select a principle...',
  config,
  className = '',
  disabled = false,
  allowClear = true
}: PrincipleSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredPrinciples,
    getPrincipleDisplayInfo,
    principles,
  } = usePrincipleSelector(config)

  // Find selected principle
  const selectedPrinciple = selectedPrincipleId
    ? principles.find(p => p.id === selectedPrincipleId)
    : null

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (principle: CorePrincipleMemory) => {
    onSelectPrinciple(principle)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectPrinciple(null)
  }

  const displayInfo = selectedPrinciple ? getPrincipleDisplayInfo(selectedPrinciple) : null

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-purple-500
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          flex items-center justify-between
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedPrinciple ? (
            <>
              <span className="text-lg">{displayInfo?.categoryIcon}</span>
              <span className="font-medium text-gray-900">{displayInfo?.title}</span>
              {selectedPrinciple.content.is_default && (
                <BookOpen className="w-4 h-4 text-blue-500" />
              )}
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {allowClear && selectedPrinciple && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              ✕
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search principles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Principle List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-xs text-gray-600">Loading...</p>
              </div>
            ) : filteredPrinciples.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                {searchQuery ? 'No principles found' : 'No available principles'}
              </div>
            ) : (
              <div className="py-1">
                {filteredPrinciples.map((principle) => {
                  const { title, categoryIcon, importanceLevel } = getPrincipleDisplayInfo(principle)
                  const isSelected = selectedPrincipleId === principle.id

                  return (
                    <button
                      key={principle.id}
                      type="button"
                      onClick={() => handleSelect(principle)}
                      className={`
                        w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors
                        ${isSelected ? 'bg-purple-100' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{categoryIcon}</span>
                        <span className="font-medium text-gray-900 text-sm truncate flex-1">
                          {title}
                        </span>
                        {principle.content.is_default && (
                          <BookOpen className="w-3 h-3 text-blue-500" />
                        )}
                        {importanceLevel >= 4 && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        )}
                      </div>
                      {principle.content.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 ml-6">
                          {principle.content.description}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
