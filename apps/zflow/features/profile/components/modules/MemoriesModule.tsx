'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, Search, Calendar, Star, Settings, X, Loader2, RefreshCw, Maximize2, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { Memory, MemoryFilters } from '@/types/domain/memory'
import { memoriesApi } from '@/lib/api/memories-api'
import MemoryCapture from '@/features/memory/components/MemoryCapture'
import MemoryCard from '@/features/memory/components/MemoryCard'
import type { ProfileModuleProps } from '@/profile'

type SimpleViewMode = 'timeline' | 'search' | 'collections'

export function MemoriesModule({ config, onConfigChange, isFullscreen = false, onToggleFullscreen, fullScreenPath }: ProfileModuleProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const [showSettings, setShowSettings] = React.useState(false)
  const [selectedView, setSelectedView] = React.useState<SimpleViewMode>(
    config.config.defaultView || 'timeline'
  )
  const [isCaptureOpen, setIsCaptureOpen] = React.useState(false)
  const [editingMemory, setEditingMemory] = React.useState<Memory | undefined>()
  const [memories, setMemories] = React.useState<Memory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set())
  const [highlightedMemories, setHighlightedMemories] = React.useState<Memory[]>([])
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

  // Configuration options - adjust for fullscreen mode
  const baseMaxItems = config.config.maxDisplayItems || 5
  const maxDisplayItems = isFullscreen ? baseMaxItems * 3 : baseMaxItems
  const showQuickActions = config.config.showQuickActions !== false
  const showCollectionsView = config.config.showCollectionsView !== false

  const loadInitialData = React.useCallback(async () => {
    setLoading(true)
    try {
      // Simplified: Only fetch memories once with a reasonable limit
      const result = await memoriesApi.search({
        limit: maxDisplayItems * 2
      })

      setMemories(result.memories)

      // Extract highlights from fetched memories
      const highlights = result.memories.filter(m => m.is_highlight).slice(0, maxDisplayItems)
      setHighlightedMemories(highlights)

      // Extract popular tags from all memories
      const allTags = result.memories.flatMap(m => m.tags)
      const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const sortedTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .map(([tag]) => tag)
      setPopularTags(sortedTags)

      setError(null)
    } catch (err) {
      console.error('Failed to load memories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load memories')
    } finally {
      setLoading(false)
    }
  }, [maxDisplayItems])

  // Load initial data
  React.useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user, loadInitialData])

  const handleConfigChange = (key: string, value: any) => {
    onConfigChange({
      ...config,
      config: {
        ...config.config,
        [key]: value
      }
    })
  }

  const handleMemoryCreated = (memory: Memory) => {
    setMemories(prev => [memory, ...prev])
    if (memory.is_highlight) {
      setHighlightedMemories(prev => [memory, ...prev.slice(0, maxDisplayItems - 1)])
    }
  }

  const handleMemoryUpdated = (memory: Memory) => {
    setMemories(prev => prev.map(m => m.id === memory.id ? memory : m))
    setHighlightedMemories(prev => prev.map(m => m.id === memory.id ? memory : m))
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
    const returnTo = encodeURIComponent('/profile')
    router.push(`/focus/memory?memoryId=${encodeURIComponent(memoryId)}&from=profile&returnTo=${returnTo}`)
  }

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag)
    setSelectedView('search')
  }

  const handleViewAllMemories = () => {
    router.push('/memories')
  }

  // Simplified filtering logic
  const filteredMemories = React.useMemo(() => {
    let filtered = [...memories]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(memory =>
        (memory.note ?? '').toLowerCase().includes(query) ||
        (memory.title ?? memory.title_override ?? '').toLowerCase().includes(query) ||
        memory.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (memory.place_name ?? '').toLowerCase().includes(query)
      )
    }

    // Highlights filter
    if (filters.show_highlights_only) {
      filtered = filtered.filter(memory => memory.is_highlight)
    }

    return filtered.slice(0, maxDisplayItems)
  }, [memories, searchQuery, filters.show_highlights_only, maxDisplayItems])

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

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 3) // Limit to 3 days for module view
  }, [filteredMemories])

  // Helper function to format date groups
  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }
  }

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center py-8">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to access memories</h3>
          <p className="text-gray-600 text-sm">Please sign in to view and manage your personal memories.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white ${isFullscreen ? 'p-8' : 'p-6'} rounded-lg shadow-sm border border-gray-200 ${isFullscreen ? 'h-full' : ''}`}>
      {/* Module Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Memories</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {fullScreenPath && (
            <Link
              href={fullScreenPath}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="查看完整页面"
              aria-label="查看完整页面"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          )}

          {showQuickActions && (
            <button
              onClick={() => {
                setEditingMemory(undefined)
                setIsCaptureOpen(true)
              }}
              className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              title="New Memory"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t.common.settings}
            aria-label={t.common.settings}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Module Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default View
              </label>
              <select
                value={config.config.defaultView || 'timeline'}
                onChange={(e) => handleConfigChange('defaultView', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="timeline">Timeline</option>
                <option value="search">Search</option>
                {showCollectionsView && <option value="collections">Collections</option>}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Items to Display
              </label>
              <select
                value={config.config.maxDisplayItems || 5}
                onChange={(e) => handleConfigChange('maxDisplayItems', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={3}>3 items</option>
                <option value={5}>5 items</option>
                <option value={10}>10 items</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showQuickActions"
                checked={config.config.showQuickActions !== false}
                onChange={(e) => handleConfigChange('showQuickActions', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="showQuickActions" className="text-sm text-gray-700">
                Show quick actions
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Simple Navigation Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setSelectedView('timeline')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            selectedView === 'timeline'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setSelectedView('search')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            selectedView === 'search'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Search
        </button>
        {showCollectionsView && (
          <button
            onClick={() => setSelectedView('collections')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedView === 'collections'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Collections
          </button>
        )}
      </div>

      {/* Simple Filters */}
      {selectedView === 'timeline' && (
        <div className="mb-4 flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={filters.show_highlights_only}
              onChange={(e) => setFilters(prev => ({ ...prev, show_highlights_only: e.target.checked }))}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            Highlights only
          </label>
        </div>
      )}

      {/* Main Content */}
      {loading && memories.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading memories...</span>
          </div>
        </div>
      ) : error && memories.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={loadInitialData}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      ) : (
        <>
          {selectedView === 'timeline' && (
            <div className="space-y-4">
              {groupedMemories.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No memories found</h3>
                  <p className="text-gray-600 mb-4 text-sm">Start capturing your thoughts and experiences</p>
                  <button 
                    onClick={() => setIsCaptureOpen(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Create your first memory
                  </button>
                </div>
              ) : (
                <>
                  {groupedMemories.map(([dateString, dayMemories]) => (
                    <div key={dateString}>
                      {/* Date Header */}
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDateGroup(dateString)}
                        <span className="text-xs text-gray-500">({dayMemories.length})</span>
                      </h4>

                      {/* Memories */}
                      <div className="space-y-2 mb-4">
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
                  ))}
                  
                  {memories.length > maxDisplayItems && (
                    <div className="text-center pt-4 border-t border-gray-200">
                      <button
                        onClick={handleViewAllMemories}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        View all memories →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {selectedView === 'search' && (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories and anchors..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Search Results */}
              <div className="space-y-2">
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-6">
                    <Search className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">
                      {searchQuery ? `No memories found for "${searchQuery}"` : 'Enter a search term to find memories'}
                    </p>
                  </div>
                ) : (
                  <>
                    {filteredMemories.map((memory) => (
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
                    ))}

                    {memories.length > maxDisplayItems && (
                      <div className="text-center pt-2">
                        <button
                          onClick={handleViewAllMemories}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          View all results →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {selectedView === 'collections' && showCollectionsView && (
            <div className="space-y-4">
              {/* Collections Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-600" />
                      <h4 className="font-medium text-amber-900">Highlights</h4>
                    </div>
                    <span className="text-sm text-amber-700">{highlightedMemories.length}</span>
                  </div>
                  {highlightedMemories.length > 0 ? (
                    <div className="space-y-1">
                      {highlightedMemories.slice(0, 2).map(memory => (
                        <button
                          key={memory.id}
                          onClick={() => handleMemoryClick(memory.id)}
                          className="block w-full text-left p-2 hover:bg-amber-100 rounded text-sm transition-colors"
                        >
                          <div className="font-medium text-amber-900 truncate">
                            {memory.title || memory.title_override || (memory.note?.split('\n')[0] || 'Untitled')}
                          </div>
                        </button>
                      ))}
                      {highlightedMemories.length > 2 && (
                        <p className="text-xs text-amber-700 text-center pt-1">
                          +{highlightedMemories.length - 2} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">No highlights yet</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <h4 className="font-medium text-green-900">Popular Tags</h4>
                    </div>
                    <span className="text-sm text-green-700">{popularTags.length}</span>
                  </div>
                  {popularTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {popularTags.slice(0, 4).map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagClick(tag)}
                          className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded-full hover:bg-green-300 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-700">No tags yet</p>
                  )}
                </div>
              </div>

              {/* View All Button */}
              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  onClick={handleViewAllMemories}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  View full memories page →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Memory Capture Modal */}
      {isCaptureOpen && (
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
      )}
    </div>
  )
}
