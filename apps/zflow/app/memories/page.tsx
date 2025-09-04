'use client'

import React from 'react'
import { Plus, Search, Filter, Calendar, BookOpen, Star, Heart, TrendingUp, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import { Memory, MemoryFilters } from '../types/memory'
import { memoriesApi } from '../../lib/memories-api'
import MemoryCapture from '../components/memories/MemoryCapture'
import MemoryCard from '../components/memories/MemoryCard'

export default function MemoriesPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [selectedView, setSelectedView] = React.useState<'timeline' | 'search' | 'collections'>('timeline')
  const [isCaptureOpen, setIsCaptureOpen] = React.useState(false)
  const [editingMemory, setEditingMemory] = React.useState<Memory | undefined>()
  const [memories, setMemories] = React.useState<Memory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set())
  const [highlightedMemories, setHighlightedMemories] = React.useState<Memory[]>([])
  const [recentMemories, setRecentMemories] = React.useState<Memory[]>([])
  const [popularTags, setPopularTags] = React.useState<string[]>([])
  
  const [filters, setFilters] = React.useState<MemoryFilters>({
    view: 'timeline',
    display_mode: 'list',
    sort_by: 'created_at',
    sort_order: 'desc',
    search_query: '',
    selected_tags: [],
    selected_categories: [],
    show_highlights_only: false
  })

  // Load initial data
  React.useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [highlights, recent, allMemories] = await Promise.all([
        memoriesApi.getHighlights(5),
        memoriesApi.getRecent(20),
        memoriesApi.search({ limit: 50 })
      ])
      
      setHighlightedMemories(highlights)
      setRecentMemories(recent.slice(0, 5))
      setMemories(allMemories.memories)
      
      // Extract popular tags from recent memories
      const allTags = recent.flatMap(m => m.tags)
      const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const sortedTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag)
      setPopularTags(sortedTags)
      
      setError(null)
    } catch (err) {
      console.error('Failed to load memories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load memories')
    } finally {
      setLoading(false)
    }
  }

  const handleMemoryCreated = (memory: Memory) => {
    setMemories(prev => [memory, ...prev])
    if (memory.is_highlight) {
      setHighlightedMemories(prev => [memory, ...prev.slice(0, 4)])
    }
    setRecentMemories(prev => [memory, ...prev.slice(0, 4)])
  }

  const handleMemoryUpdated = (memory: Memory) => {
    setMemories(prev => prev.map(m => m.id === memory.id ? memory : m))
    setHighlightedMemories(prev => prev.map(m => m.id === memory.id ? memory : m))
    setRecentMemories(prev => prev.map(m => m.id === memory.id ? memory : m))
  }

  const handleEditMemory = (memory: Memory) => {
    setEditingMemory(memory)
    setIsCaptureOpen(true)
  }

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await memoriesApi.delete(memoryId)
      setMemories(prev => prev.filter(m => m.id !== memoryId))
      setHighlightedMemories(prev => prev.filter(m => m.id !== memoryId))
      setRecentMemories(prev => prev.filter(m => m.id !== memoryId))
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  const handleToggleHighlight = async (memory: Memory) => {
    try {
      const updated = await memoriesApi.update(memory.id, {
        is_highlight: !memory.is_highlight
      })
      handleMemoryUpdated(updated)
    } catch (err) {
      console.error('Failed to toggle highlight:', err)
    }
  }

  const handleToggleDescription = (memoryId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev)
      if (next.has(memoryId)) {
        next.delete(memoryId)
      } else {
        next.add(memoryId)
      }
      return next
    })
  }

  const handleMemoryClick = (memoryId: string) => {
    // TODO: Implement memory detail view
    console.log('Open memory:', memoryId)
  }

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag)
    setSelectedView('search')
  }

  // Filter memories based on current view and search
  const filteredMemories = React.useMemo(() => {
    let filtered = [...memories]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(memory => 
        (memory.note ?? '').toLowerCase().includes(query) ||
        (memory.title ?? memory.title_override ?? '').toLowerCase().includes(query) ||
        memory.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (memory.place_name ?? '').toLowerCase().includes(query)
      )
    }

    if (filters.show_highlights_only) {
      filtered = filtered.filter(memory => memory.is_highlight)
    }

    return filtered
  }, [memories, searchQuery, filters.show_highlights_only])

  // Group memories by date for timeline view
  const groupedMemories = React.useMemo(() => {
    const grouped: { [date: string]: Memory[] } = {}
    
    filteredMemories.forEach(memory => {
      const date = new Date(memory.created_at).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(memory)
    })

    return Object.entries(grouped).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    )
  }, [filteredMemories])

  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      const diffTime = today.getTime() - date.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 7) {
        return `${diffDays} days ago`
      } else if (date.getFullYear() === today.getFullYear()) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      } else {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Sign in to access memories</h2>
          <p className="text-gray-600">Please sign in to view and manage your personal memories.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary-600" />
              <h1 className="text-xl font-semibold text-gray-900">Memories</h1>
            </div>
            
            {/* Quick Capture Button */}
            <button 
              onClick={() => {
                setEditingMemory(undefined)
                setIsCaptureOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Memory</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-4">
            <button
              onClick={() => setSelectedView('timeline')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'timeline'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Timeline
            </button>
            <button
              onClick={() => setSelectedView('search')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'search'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={() => setSelectedView('collections')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'collections'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4" />
              Collections
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading && memories.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading memories...</span>
            </div>
          </div>
        ) : error && memories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={loadInitialData}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          <>
            {selectedView === 'timeline' && (
              <div className="space-y-8">
                {groupedMemories.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No memories found</h3>
                    <p className="text-gray-600 mb-6">Start capturing your thoughts and experiences</p>
                    <button 
                      onClick={() => setIsCaptureOpen(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Create your first memory
                    </button>
                  </div>
                ) : (
                  groupedMemories.map(([dateString, dayMemories]) => (
                    <div key={dateString}>
                      {/* Date Header */}
                      <div className="sticky top-32 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 pb-2 mb-4">
                        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDateGroup(dateString)}
                          <span className="text-xs text-gray-500">({dayMemories.length})</span>
                        </h3>
                      </div>

                      {/* Memories */}
                      <div className="space-y-4">
                        {dayMemories.map((memory) => (
                          <MemoryCard
                            key={memory.id}
                            memory={memory}
                            variant="timeline"
                            displayMode="list"
                            expandedDescriptions={expandedDescriptions}
                            onMemoryClick={handleMemoryClick}
                            onEditMemory={handleEditMemory}
                            onDeleteMemory={handleDeleteMemory}
                            onToggleHighlight={handleToggleHighlight}
                            onToggleDescription={handleToggleDescription}
                            onTagClick={handleTagClick}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedView === 'search' && (
              <div className="space-y-6">
                {/* Search Input */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memories..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, show_highlights_only: !prev.show_highlights_only }))}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filters.show_highlights_only
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Star className="w-3 h-3 inline mr-1" />
                    Highlights
                  </button>
                </div>

                {/* Search Results */}
                <div className="space-y-4">
                  {filteredMemories.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {searchQuery ? `No memories found for "${searchQuery}"` : 'Enter a search term to find memories'}
                      </p>
                    </div>
                  ) : (
                    filteredMemories.map((memory) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        variant="search"
                        displayMode="list"
                        expandedDescriptions={expandedDescriptions}
                        onMemoryClick={handleMemoryClick}
                        onEditMemory={handleEditMemory}
                        onDeleteMemory={handleDeleteMemory}
                        onToggleHighlight={handleToggleHighlight}
                        onToggleDescription={handleToggleDescription}
                        onTagClick={handleTagClick}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedView === 'collections' && (
              <div className="space-y-6">
                {/* Collections Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h3 className="font-medium text-gray-900">Highlights</h3>
                      </div>
                      <span className="text-sm text-amber-600">{highlightedMemories.length}</span>
                    </div>
                    {highlightedMemories.length > 0 ? (
                      <div className="space-y-2">
                        {highlightedMemories.slice(0, 3).map(memory => (
                          <button
                            key={memory.id}
                            onClick={() => handleMemoryClick(memory.id)}
                            className="block w-full text-left p-2 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {memory.title || memory.title_override || (memory.note?.split('\n')[0] || 'Untitled')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(memory.created_at).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                        {highlightedMemories.length > 3 && (
                          <button
                            onClick={() => {
                              setFilters(prev => ({ ...prev, show_highlights_only: true }))
                              setSelectedView('search')
                            }}
                            className="text-xs text-amber-600 hover:text-amber-700 underline"
                          >
                            View all {highlightedMemories.length} highlights
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No highlighted memories yet</p>
                    )}
                  </div>

                  <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <h3 className="font-medium text-gray-900">Recent</h3>
                      </div>
                      <span className="text-sm text-blue-600">{recentMemories.length}</span>
                    </div>
                    {recentMemories.length > 0 ? (
                      <div className="space-y-2">
                        {recentMemories.slice(0, 3).map(memory => (
                          <button
                            key={memory.id}
                            onClick={() => handleMemoryClick(memory.id)}
                            className="block w-full text-left p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {memory.title || memory.title_override || (memory.note?.split('\n')[0] || 'Untitled')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(memory.created_at).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => setSelectedView('timeline')}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          View timeline
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No memories yet</p>
                    )}
                  </div>

                  <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <h3 className="font-medium text-gray-900">Popular Tags</h3>
                      </div>
                      <span className="text-sm text-green-600">{popularTags.length}</span>
                    </div>
                    {popularTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {popularTags.slice(0, 6).map(tag => (
                          <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No tags yet</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-xl p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Quick Start</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setEditingMemory(undefined)
                        setIsCaptureOpen(true)
                      }}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg hover:from-primary-100 hover:to-primary-200 transition-all duration-200"
                    >
                      <Plus className="w-5 h-5 text-primary-600" />
                      <div className="text-left">
                        <div className="font-medium text-primary-700">New Memory</div>
                        <div className="text-sm text-primary-600">Capture a moment</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedView('search')}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200"
                    >
                      <Search className="w-5 h-5 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium text-blue-700">Search</div>
                        <div className="text-sm text-blue-600">Find memories</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, show_highlights_only: true }))
                        setSelectedView('search')
                      }}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg hover:from-amber-100 hover:to-amber-200 transition-all duration-200"
                    >
                      <Heart className="w-5 h-5 text-amber-600" />
                      <div className="text-left">
                        <div className="font-medium text-amber-700">Highlights</div>
                        <div className="text-sm text-amber-600">Special moments</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* Mobile FAB */}
      <button 
        onClick={() => {
          setEditingMemory(undefined)
          setIsCaptureOpen(true)
        }}
        className="fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Memory Capture Modal */}
      <MemoryCapture
        isOpen={isCaptureOpen}
        onClose={() => {
          setIsCaptureOpen(false)
          setEditingMemory(undefined)
        }}
        onMemoryCreated={handleMemoryCreated}
        onMemoryUpdated={handleMemoryUpdated}
        categories={[]} // TODO: Connect with categories
        editingMemory={editingMemory}
      />
    </div>
  )
}
