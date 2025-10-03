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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPrinciple, setEditingPrinciple] = useState<CorePrinciple | null>(null)
  const [defaultPrinciples, setDefaultPrinciples] = useState<CorePrinciple[]>([])
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    category: 'custom' as CorePrincipleCategory,
    trigger_questions: [''],
    application_examples: [''],
    personal_notes: '',
    importance_level: 3
  })

  // Configuration
  const maxDisplayItems = isFullscreen
    ? (config.config.maxDisplayItems || 10) * 2
    : (config.config.maxDisplayItems || 10)
  const showQuickActions = config.config.showQuickActions !== false

  // Fetch principles (only user's own)
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
        source: 'user_custom', // Only fetch user's own principles
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

  // Fetch default principles for recommendations
  const fetchDefaultPrinciples = useCallback(async () => {
    try {
      const defaults = await corePrinciplesApi.getDefaults()
      // Filter out defaults that user has already copied
      const userPrincipleTitles = new Set(principles.map(p => p.content.title))
      const availableDefaults = defaults.filter(d => !userPrincipleTitles.has(d.content.title))
      setDefaultPrinciples(availableDefaults)
    } catch (err) {
      console.error('[CorePrinciples] Failed to load default principles:', err)
    }
  }, [principles])

  useEffect(() => {
    fetchPrinciples()
  }, [fetchPrinciples])

  useEffect(() => {
    if (showCreateModal) {
      fetchDefaultPrinciples()
    }
  }, [showCreateModal, fetchDefaultPrinciples])

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

  const handleCreatePrinciple = async () => {
    try {
      if (editingPrinciple) {
        // Update existing principle
        const updatedPrinciple = await corePrinciplesApi.update(editingPrinciple.id, {
          content: {
            title: createFormData.title,
            description: createFormData.description || undefined,
            category: createFormData.category,
            trigger_questions: createFormData.trigger_questions.filter(q => q.trim()),
            application_examples: createFormData.application_examples.filter(e => e.trim()),
            personal_notes: createFormData.personal_notes || undefined,
            importance_level: createFormData.importance_level
          }
        })

        setPrinciples(prev => prev.map(p => p.id === updatedPrinciple.id ? updatedPrinciple : p))
      } else {
        // Create new principle
        const newPrinciple = await corePrinciplesApi.create({
          type: 'core_principle',
          content: {
            title: createFormData.title,
            description: createFormData.description || undefined,
            category: createFormData.category,
            trigger_questions: createFormData.trigger_questions.filter(q => q.trim()),
            application_examples: createFormData.application_examples.filter(e => e.trim()),
            personal_notes: createFormData.personal_notes || undefined,
            importance_level: createFormData.importance_level
          }
        })

        setPrinciples(prev => [newPrinciple, ...prev])
      }

      setShowCreateModal(false)
      setEditingPrinciple(null)
      setShowRecommendations(true)
      setCreateFormData({
        title: '',
        description: '',
        category: 'custom',
        trigger_questions: [''],
        application_examples: [''],
        personal_notes: '',
        importance_level: 3
      })
    } catch (err) {
      console.error('Failed to save principle:', err)
      alert('Failed to save principle. Please try again.')
    }
  }

  const handleCopyDefaultPrinciple = (defaultPrinciple: CorePrinciple) => {
    setShowRecommendations(false)
    setCreateFormData({
      title: defaultPrinciple.content.title,
      description: defaultPrinciple.content.description || '',
      category: defaultPrinciple.content.category,
      trigger_questions: defaultPrinciple.content.trigger_questions.length > 0
        ? defaultPrinciple.content.trigger_questions
        : [''],
      application_examples: defaultPrinciple.content.application_examples.length > 0
        ? defaultPrinciple.content.application_examples
        : [''],
      personal_notes: '',
      importance_level: defaultPrinciple.content.importance_level
    })
  }

  const handleEdit = (principle: CorePrinciple) => {
    setEditingPrinciple(principle)
    setShowRecommendations(false)
    setCreateFormData({
      title: principle.content.title,
      description: principle.content.description || '',
      category: principle.content.category,
      trigger_questions: principle.content.trigger_questions.length > 0
        ? principle.content.trigger_questions
        : [''],
      application_examples: principle.content.application_examples.length > 0
        ? principle.content.application_examples
        : [''],
      personal_notes: principle.content.personal_notes || '',
      importance_level: principle.content.importance_level
    })
    setShowCreateModal(true)
  }

  const addTriggerQuestion = () => {
    setCreateFormData(prev => ({
      ...prev,
      trigger_questions: [...prev.trigger_questions, '']
    }))
  }

  const removeTriggerQuestion = (index: number) => {
    setCreateFormData(prev => ({
      ...prev,
      trigger_questions: prev.trigger_questions.filter((_, i) => i !== index)
    }))
  }

  const updateTriggerQuestion = (index: number, value: string) => {
    setCreateFormData(prev => ({
      ...prev,
      trigger_questions: prev.trigger_questions.map((q, i) => i === index ? value : q)
    }))
  }

  const addApplicationExample = () => {
    setCreateFormData(prev => ({
      ...prev,
      application_examples: [...prev.application_examples, '']
    }))
  }

  const removeApplicationExample = (index: number) => {
    setCreateFormData(prev => ({
      ...prev,
      application_examples: prev.application_examples.filter((_, i) => i !== index)
    }))
  }

  const updateApplicationExample = (index: number, value: string) => {
    setCreateFormData(prev => ({
      ...prev,
      application_examples: prev.application_examples.map((e, i) => i === index ? value : e)
    }))
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
              onClick={() => setShowCreateModal(true)}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No principles created yet</h3>
          <p className="text-gray-600 mb-4 text-sm">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first principle by clicking the + button above'}
          </p>
          <p className="text-sm text-blue-600 mb-4">
            💡 Tip: You can quickly copy from Ray Dalio's principles when creating new ones
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
                onEdit={handleEdit}
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

      {/* Create Principle Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingPrinciple ? 'Edit Principle' : 'Create New Principle'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingPrinciple(null)
                    setShowRecommendations(true)
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ray Dalio Recommendations - only show when creating, not editing */}
              {!editingPrinciple && showRecommendations && defaultPrinciples.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <BookMarked className="w-4 h-4" />
                      Ray Dalio's Principles - Quick Copy
                    </h4>
                    <button
                      onClick={() => setShowRecommendations(false)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {defaultPrinciples.slice(0, 5).map((principle) => (
                      <button
                        key={principle.id}
                        onClick={() => handleCopyDefaultPrinciple(principle)}
                        className="w-full text-left p-3 bg-white rounded border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{principle.content.title}</div>
                            {principle.content.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{principle.content.description}</div>
                            )}
                          </div>
                          <Star className="w-4 h-4 text-amber-500 fill-current ml-2 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">Click any principle to copy it and customize for yourself</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createFormData.title}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter principle title..."
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe this principle..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={createFormData.category}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, category: e.target.value as CorePrincipleCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="work_principles">💼 Work Principles</option>
                    <option value="life_principles">🌟 Life Principles</option>
                    <option value="decision_making">🎯 Decision Making</option>
                    <option value="relationships">🤝 Relationships</option>
                    <option value="learning">📚 Learning</option>
                    <option value="leadership">👑 Leadership</option>
                    <option value="custom">✨ Custom</option>
                  </select>
                </div>

                {/* Importance Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importance Level: {createFormData.importance_level}/5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={createFormData.importance_level}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, importance_level: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Trigger Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Questions</label>
                  <div className="space-y-2">
                    {createFormData.trigger_questions.map((question, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => updateTriggerQuestion(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="What question triggers this principle?"
                        />
                        {createFormData.trigger_questions.length > 1 && (
                          <button
                            onClick={() => removeTriggerQuestion(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addTriggerQuestion}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Question
                    </button>
                  </div>
                </div>

                {/* Application Examples */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Examples</label>
                  <div className="space-y-2">
                    {createFormData.application_examples.map((example, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={example}
                          onChange={(e) => updateApplicationExample(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="How to apply this principle?"
                        />
                        {createFormData.application_examples.length > 1 && (
                          <button
                            onClick={() => removeApplicationExample(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addApplicationExample}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Example
                    </button>
                  </div>
                </div>

                {/* Personal Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Notes</label>
                  <textarea
                    value={createFormData.personal_notes}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, personal_notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Any personal notes about this principle..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingPrinciple(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePrinciple}
                    disabled={!createFormData.title.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingPrinciple ? 'Update Principle' : 'Create Principle'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CorePrinciplesModule
