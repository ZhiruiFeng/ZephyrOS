'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Sun, Heart, Target, Calendar, ChevronLeft, ChevronRight, Edit3, Check, X, ExternalLink } from 'lucide-react'
import { FullscreenModal } from './FullscreenModal'
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge } from '../ui'
import { useDailyStrategy } from '../../../../hooks/useDailyStrategy'
import { TaskSelector } from './TaskSelector'
import { TaskMemory } from '../../../../lib/api/api-base'
import type { DailyStrategyItemWithDetails, DailyStrategyStatus } from '../../../../lib/api/daily-strategy-api'

interface DailyPlanningModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId?: string
}

interface EditingState {
  type: 'intention' | 'adventure' | 'priority'
  index?: number
  title: string
  description: string
}

export function DailyPlanningModal({ isOpen, onClose, seasonId }: DailyPlanningModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Get local date in YYYY-MM-DD format
    return new Date().toLocaleDateString('en-CA')
  })

  const timezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }, [])

  const { data, loading, error, saveIntention, saveAdventure, savePriority, linkExistingTaskToPriority, removePriority, markCompleted } = useDailyStrategy(selectedDate, timezone, seasonId)
  
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTaskSelector, setShowTaskSelector] = useState<{ index: number } | null>(null)

  const existingPriorities = useMemo(
    () => data.priorities.filter(item => Boolean(item?.timeline_item?.title?.trim() || item?.title?.trim())),
    [data.priorities]
  )

  const hasExistingPlan = Boolean(
    (data.intention && (data.intention.timeline_item?.title?.trim() || data.intention.title?.trim())) ||
    (data.adventure && (data.adventure.timeline_item?.title?.trim() || data.adventure.title?.trim())) ||
    existingPriorities.length > 0
  )

  // Navigation functions
  const goToPreviousDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  // Edit handlers
  const startEditing = (type: 'intention' | 'adventure' | 'priority', index?: number) => {
    let title = ''
    let description = ''

    if (type === 'intention' && data.intention) {
      title = data.intention.timeline_item?.title || data.intention.title || ''
      description = data.intention.timeline_item?.description || data.intention.description || ''
    } else if (type === 'adventure' && data.adventure) {
      title = data.adventure.timeline_item?.title || data.adventure.title || ''
      description = data.adventure.timeline_item?.description || data.adventure.description || ''
    } else if (type === 'priority' && typeof index === 'number' && data.priorities[index]) {
      const priority = data.priorities[index]
      title = priority.timeline_item?.title || priority.title || ''
      description = priority.timeline_item?.description || priority.description || ''
    }

    setEditing({ type, index, title, description })
  }

  const cancelEditing = () => {
    setEditing(null)
  }

  const saveEditing = async () => {
    if (!editing) return
    
    setIsSubmitting(true)
    try {
      if (editing.type === 'intention') {
        await saveIntention(editing.title, editing.description)
      } else if (editing.type === 'adventure') {
        await saveAdventure(editing.title, editing.description)
      } else if (editing.type === 'priority' && typeof editing.index === 'number') {
        await savePriority(editing.index, editing.title, editing.description)
      }
      
      setEditing(null)
    } catch (err) {
      console.error('Failed to save:', err)
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Task selector handlers
  const handleSelectExistingTask = async (task: TaskMemory) => {
    if (!showTaskSelector) return
    
    setIsSubmitting(true)
    try {
      await linkExistingTaskToPriority(showTaskSelector.index, task)
      setShowTaskSelector(null)
    } catch (err) {
      console.error('Failed to link task:', err)
      alert(err instanceof Error ? err.message : 'Failed to link task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNewTask = () => {
    if (!showTaskSelector) return
    
    // Start editing mode for creating a new task
    setEditing({
      type: 'priority',
      index: showTaskSelector.index,
      title: '',
      description: ''
    })
    setShowTaskSelector(null)
  }

  const handleCancelTaskSelector = () => {
    setShowTaskSelector(null)
  }

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const dateOnly = dateStr
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    if (dateOnly === todayStr) return 'Today'
    if (dateOnly === yesterdayStr) return 'Yesterday'
    if (dateOnly === tomorrowStr) return 'Tomorrow'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Render item component
  const formatLabel = (label?: string | null) => {
    if (!label) return ''
    return label
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const statusBadgeStyles: Record<DailyStrategyStatus, string> = {
    planned: 'border-blue-200 bg-blue-50 text-blue-700',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
    completed: 'border-green-200 bg-green-50 text-green-700',
    deferred: 'border-purple-200 bg-purple-50 text-purple-700',
    cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
  }

  const renderItem = (
    title: string,
    type: 'intention' | 'adventure' | 'priority',
    icon: React.ReactNode,
    color: string,
    item?: DailyStrategyItemWithDetails | null,
    index?: number,
    placeholder?: string
  ) => {
    const isEditing = editing?.type === type && editing?.index === index
    const currentItem = item ?? null
    const itemTitle = currentItem?.timeline_item?.title?.trim() || currentItem?.title?.trim() || ''
    const itemDescription = currentItem?.timeline_item?.description?.trim() || currentItem?.description?.trim() || ''
    const hasContent = Boolean(itemTitle || itemDescription)
    const statusClass = currentItem?.status ? statusBadgeStyles[currentItem.status] : undefined

    const metadataBadges = [
      currentItem?.importance_level ? {
        key: 'importance',
        label: `${formatLabel(currentItem.importance_level)} importance`,
        className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      } : null,
      currentItem?.planned_time_of_day ? {
        key: 'timeOfDay',
        label: formatLabel(currentItem.planned_time_of_day),
        className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      } : null,
      typeof currentItem?.required_energy_level === 'number' ? {
        key: 'energy',
        label: `Energy ${currentItem.required_energy_level}/10`,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      } : null,
      typeof currentItem?.planned_duration_minutes === 'number' ? {
        key: 'duration',
        label: `${currentItem.planned_duration_minutes} min planned`,
        className: 'border-slate-200 bg-slate-50 text-slate-700',
      } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; className?: string }>

    return (
      <Card className={`border-l-4 border-l-${color} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-lg">{title}</span>
              {currentItem?.status && (
                <Badge 
                  variant="outline" 
                  className={`whitespace-nowrap text-xs font-medium ${statusClass ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  {formatLabel(currentItem.status)}
                </Badge>
              )}
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (type === 'priority' && typeof index === 'number' && !hasContent) {
                    // For empty priority slots, show task selector
                    setShowTaskSelector({ index })
                  } else {
                    // For existing items or non-priority items, start editing
                    startEditing(type, index)
                  }
                }}
                className="opacity-60 hover:opacity-100"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editing.title || ''}
                onChange={(e) => setEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder={`${title} title...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Textarea
                value={editing.description || ''}
                onChange={(e) => setEditing(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder={`Describe your ${title.toLowerCase()}...`}
                className="w-full"
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelEditing}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveEditing}
                  disabled={isSubmitting || !editing.title?.trim()}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : hasContent ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3
                  className={`font-medium text-gray-900 flex-1 ${item.timeline_item_id ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                  onClick={() => {
                    if (currentItem?.timeline_item_id) {
                      window.open(`/focus/work-mode?taskId=${currentItem.timeline_item_id}&from=strategy`, '_blank')
                    }
                  }}
                  title={currentItem?.timeline_item_id ? 'Click to open task in focus mode' : ''}
                >
                  {itemTitle}
                </h3>
                {currentItem?.timeline_item_id && (
                  <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-600 cursor-pointer" />
                )}
              </div>
              {itemDescription && (
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{itemDescription}</p>
              )}
              {metadataBadges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {metadataBadges.map(badge => (
                    <Badge
                      key={badge.key}
                      variant="outline"
                      className={`text-xs font-medium ${badge.className ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    >
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
              {currentItem?.status !== 'completed' && currentItem && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markCompleted(currentItem.id)}
                  className="mt-2"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}
            </div>
          ) : (
            <div 
              className="text-gray-400 italic cursor-pointer hover:text-gray-600 transition-colors"
              onClick={() => {
                if (type === 'priority' && typeof index === 'number') {
                  setShowTaskSelector({ index })
                } else {
                  startEditing(type, index)
                }
              }}
            >
              {type === 'priority'
                ? (placeholder || 'Map the priority that already exists for this day or capture a new one.')
                : (placeholder || `Capture the ${title.toLowerCase()} that is already planned for this date.`)
              }
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Planning"
      icon={<Sun className="w-6 h-6 text-blue-600" />}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
          <Button variant="outline" onClick={goToPreviousDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              {formatDisplayDate(selectedDate)}
            </h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <Button variant="outline" onClick={goToNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {selectedDate !== new Date().toISOString().split('T')[0] && (
          <div className="text-center">
            <Button variant="outline" onClick={goToToday}>
              Go to Today
            </Button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading your daily plan...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {hasExistingPlan ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                <p className="font-medium">Plan on record for {formatDisplayDate(selectedDate)}.</p>
                <p className="text-sm mt-1 text-blue-700">
                  {[
                    data.intention && 'Intention captured',
                    data.adventure && 'Adventure set',
                    existingPriorities.length ? `${existingPriorities.length} priority ${existingPriorities.length === 1 ? 'task' : 'tasks'}` : null,
                  ].filter(Boolean).join(' • ')}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                <p className="font-medium">No daily plan captured for this date yet.</p>
                <p className="text-sm mt-1">Record your intention, pick an adventure, and surface the priorities that will keep you on track.</p>
              </div>
            )}

            {/* Daily Intention */}
            {renderItem(
              'Daily Intention',
              'intention',
              <Heart className="h-5 w-5 text-pink-600" />,
              'pink-500',
              data.intention,
              undefined,
              'What is your main intention for this day?'
            )}

            {/* Daily Adventure */}
            {renderItem(
              'Daily Adventure',
              'adventure',
              <Sun className="h-5 w-5 text-orange-600" />,
              'orange-500',
              data.adventure,
              undefined,
              'What new experience will you seek today?'
            )}

            {/* Priority Tasks */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Top 3 Priorities
              </h3>
              
              {[0, 1, 2].map((index) => 
                <div key={`priority-${index}`}>
                  {renderItem(
                    `Priority ${index + 1}`,
                    'priority',
                    <Target className="h-4 w-4 text-blue-600" />,
                    'blue-500',
                    data.priorities[index],
                    index,
                    `What's your #${index + 1} priority today?`
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Selector Modal */}
        {showTaskSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <TaskSelector
                onSelectExisting={handleSelectExistingTask}
                onCreateNew={handleCreateNewTask}
                onCancel={handleCancelTaskSelector}
              />
            </div>
          </div>
        )}
      </div>
    </FullscreenModal>
  )
}
