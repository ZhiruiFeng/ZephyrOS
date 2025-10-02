'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookMarked,
  Plus,
  Search,
  Settings,
  X,
  Loader2,
  RefreshCw,
  Maximize2,
  Star,
  TrendingUp,
  Brain,
  Users,
  Lightbulb,
  Target,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react'
import type { ProfileModuleProps } from '@/profile'
import {
  corePrinciplesApi,
  type CorePrinciple,
  type CorePrincipleCategory
} from '@/lib/api/core-principles-api'

// =====================================================
// TYPES
// =====================================================

type CategoryFilter = 'all' | CorePrincipleCategory

// =====================================================
// HELPER COMPONENTS
// =====================================================

interface CategoryBadgeProps {
  category: string
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const getCategoryConfig = () => {
    switch (category) {
      case 'work_principles':
        return { icon: '💼', color: 'bg-blue-100 text-blue-700', label: 'Work' }
      case 'life_principles':
        return { icon: '🌟', color: 'bg-purple-100 text-purple-700', label: 'Life' }
      case 'decision_making':
        return { icon: '🎯', color: 'bg-green-100 text-green-700', label: 'Decisions' }
      case 'relationships':
        return { icon: '🤝', color: 'bg-pink-100 text-pink-700', label: 'Relationships' }
      case 'learning':
        return { icon: '📚', color: 'bg-yellow-100 text-yellow-700', label: 'Learning' }
      case 'leadership':
        return { icon: '👑', color: 'bg-indigo-100 text-indigo-700', label: 'Leadership' }
      case 'custom':
        return { icon: '✨', color: 'bg-gray-100 text-gray-700', label: 'Custom' }
      default:
        return { icon: '📌', color: 'bg-gray-100 text-gray-600', label: category }
    }
  }

  const config = getCategoryConfig()
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

interface PrincipleCardProps {
  principle: CorePrinciple
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit?: (principle: CorePrinciple) => void
  onDelete?: (principleId: string) => void
}

const PrincipleCard: React.FC<PrincipleCardProps> = ({
  principle,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}) => {
  const { content } = principle

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 flex-1">{content.title}</h3>
            {content.is_default && (
              <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                Default
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={content.category} />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{content.importance_level}/5</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span>{content.application_count} uses</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          {!content.is_default && onEdit && (
            <button
              onClick={() => onEdit(principle)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit principle"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {!content.is_default && onDelete && (
            <button
              onClick={() => onDelete(principle.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete principle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleExpand}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Description */}
      {content.description && (
        <p className="text-sm text-gray-600 mb-3">{content.description}</p>
      )}

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-gray-200 space-y-3">
              {/* Trigger Questions */}
              {content.trigger_questions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Trigger Questions
                  </h4>
                  <ul className="space-y-1">
                    {content.trigger_questions.map((question, idx) => (
                      <li key={idx} className="text-xs text-gray-600 pl-4 relative">
                        <span className="absolute left-0 top-1">•</span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Application Examples */}
              {content.application_examples.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Application Examples
                  </h4>
                  <ul className="space-y-1">
                    {content.application_examples.map((example, idx) => (
                      <li key={idx} className="text-xs text-gray-600 pl-4 relative">
                        <span className="absolute left-0 top-1">✓</span>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Personal Notes */}
              {content.personal_notes && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-1.5">Personal Notes</h4>
                  <p className="text-xs text-gray-600 italic">{content.personal_notes}</p>
                </div>
              )}

              {/* Last Applied */}
              {content.last_applied_at && (
                <div className="text-xs text-gray-500">
                  Last applied: {new Date(content.last_applied_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function CorePrinciplesModule({
  config,
  onConfigChange,
  isFullscreen = false,
  onToggleFullscreen,
  fullScreenPath
}: ProfileModuleProps) {
  console.log('[CorePrinciples] Component rendered with config:', config)

  const [principles, setPrinciples] = useState<CorePrinciple[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [expandedPrinciples, setExpandedPrinciples] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // Configuration
  const maxDisplayItems = isFullscreen
    ? (config.config.maxDisplayItems || 10) * 2
    : (config.config.maxDisplayItems || 10)
  const showQuickActions = config.config.showQuickActions !== false

  // Fetch principles
  const fetchPrinciples = useCallback(async () => {
    console.log('[CorePrinciples] Fetching principles...')
    setLoading(true)
    try {
      const data = await corePrinciplesApi.list({
        limit: maxDisplayItems,
        offset: 0,
        sort_by: 'importance_level',
        sort_order: 'desc',
        status: 'active',
        ...(categoryFilter !== 'all' && { category: categoryFilter as CorePrincipleCategory }),
        ...(searchQuery && { search: searchQuery })
      })

      console.log('[CorePrinciples] Fetched data:', data)
      setPrinciples(data)
      setError(null)
    } catch (err) {
      console.error('[CorePrinciples] Failed to load core principles:', err)
      setError(err instanceof Error ? err.message : 'Failed to load principles')
    } finally {
      setLoading(false)
    }
  }, [maxDisplayItems, categoryFilter, searchQuery])

  useEffect(() => {
    fetchPrinciples()
  }, [fetchPrinciples])

  const handleConfigChange = (key: string, value: any) => {
    onConfigChange({
      ...config,
      config: {
        ...config.config,
        [key]: value
      }
    })
  }

  const handleToggleExpand = (principleId: string) => {
    setExpandedPrinciples(prev => {
      const next = new Set(prev)
      if (next.has(principleId)) {
        next.delete(principleId)
      } else {
        next.add(principleId)
      }
      return next
    })
  }

  const handleDelete = async (principleId: string) => {
    if (!confirm('Are you sure you want to delete this principle?')) return

    try {
      await corePrinciplesApi.delete(principleId)
      setPrinciples(prev => prev.filter(p => p.id !== principleId))
    } catch (err) {
      console.error('Failed to delete principle:', err)
      alert('Failed to delete principle. Please try again.')
    }
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    const byCategory = principles.reduce((acc, p) => {
      const cat = p.content.category
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalApplications = principles.reduce((sum, p) => sum + p.content.application_count, 0)
    const avgImportance = principles.length > 0
      ? principles.reduce((sum, p) => sum + p.content.importance_level, 0) / principles.length
      : 0

    return {
      total: principles.length,
      byCategory,
      totalApplications,
      avgImportance: avgImportance.toFixed(1),
      mostApplied: [...principles].sort((a, b) =>
        b.content.application_count - a.content.application_count
      ).slice(0, 3)
    }
  }, [principles])

  console.log('[CorePrinciples] Rendering with:', { loading, error, principlesCount: principles.length })

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${isFullscreen ? 'p-8' : 'p-6'} ${isFullscreen ? 'h-full overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Core Principles</h2>
        </div>

        <div className="flex items-center gap-2">
          {showQuickActions && (
            <button
              onClick={() => alert('Create principle functionality coming soon')}
              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="New Principle"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={fetchPrinciples}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="p-4 bg-gray-50 rounded-lg border">
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
                    Max Items to Display
                  </label>
                  <select
                    value={config.config.maxDisplayItems || 10}
                    onChange={(e) => handleConfigChange('maxDisplayItems', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 items</option>
                    <option value={10}>10 items</option>
                    <option value={20}>20 items</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showQuickActions"
                    checked={config.config.showQuickActions !== false}
                    onChange={(e) => handleConfigChange('showQuickActions', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="showQuickActions" className="text-sm text-gray-700">
                    Show quick actions
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <BookMarked className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Principles</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
              <div className="text-sm text-gray-600">Total Applications</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-amber-600" />
            <div>
              <div className="text-2xl font-bold">{stats.avgImportance}</div>
              <div className="text-sm text-gray-600">Avg Importance</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-3 overflow-hidden"
            >
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search principles..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="work_principles">💼 Work Principles</option>
                  <option value="life_principles">🌟 Life Principles</option>
                  <option value="decision_making">🎯 Decision Making</option>
                  <option value="relationships">🤝 Relationships</option>
                  <option value="learning">📚 Learning</option>
                  <option value="leadership">👑 Leadership</option>
                  <option value="custom">✨ Custom</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading principles...</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={fetchPrinciples}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      ) : principles.length === 0 ? (
        <div className="text-center py-12">
          <BookMarked className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No principles found</h3>
          <p className="text-gray-600 mb-4 text-sm">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by exploring Ray Dalio\'s default principles'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {principles.map((principle) => (
              <PrincipleCard
                key={principle.id}
                principle={principle}
                isExpanded={expandedPrinciples.has(principle.id)}
                onToggleExpand={() => handleToggleExpand(principle.id)}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>

          {principles.length >= maxDisplayItems && (
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {principles.length} principles. Adjust filters or increase max items to see more.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CorePrinciplesModule
