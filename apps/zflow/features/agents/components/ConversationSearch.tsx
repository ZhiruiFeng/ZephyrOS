'use client'

import React, { useState, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface ConversationSearchProps {
  onSearch: (query: string) => void
  onClear: () => void
  loading?: boolean
  placeholder?: string
  className?: string
}

export function ConversationSearch({
  onSearch,
  onClear,
  loading = false,
  placeholder = 'Search conversations...',
  className = ''
}: ConversationSearchProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        onSearch(query.trim())
      } else if (query === '') {
        onClear()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, onSearch, onClear])

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className={`relative flex items-center transition-all duration-200 ${
        isFocused 
          ? 'ring-2 ring-blue-500 ring-opacity-50' 
          : 'ring-1 ring-gray-300'
      } rounded-lg bg-white`}>
        {/* Search Icon */}
        <div className="absolute left-3 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-transparent border-none focus:outline-none placeholder-gray-400"
          disabled={loading}
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search suggestions or recent searches could go here */}
      {isFocused && query.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10">
          <div className="p-3">
            <div className="text-xs text-gray-500 mb-2">Search suggestions:</div>
            <div className="space-y-1">
              {[
                'Recent messages',
                'Today\'s conversations', 
                'Code examples',
                'Questions about...'
              ].map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}