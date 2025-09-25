'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Sun,
  Heart,
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  ExternalLink,
  Moon,
  CheckCircle,
  Star,
  Plus,
} from 'lucide-react'
import { FullscreenModal } from './FullscreenModal'
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge, CardDescription } from '../ui'
import { TaskSelector } from './TaskSelector'
import { useDailyStrategy } from '../../../../hooks/useDailyStrategy'
import { useDayReflection } from '../../../../hooks/useDayReflection'
import { TaskMemory } from '../../../../lib/api/api-base'
import type { DailyStrategyItemWithDetails, DailyStrategyStatus } from '../../../../lib/api/daily-strategy-api'
import { ReflectionTypeSelector, ReflectionType, REFLECTION_TYPES } from './ReflectionTypeSelector'

interface DailyRhythmModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId?: string
  initialView?: 'planning' | 'reflection'
}

interface PlanningEditingState {
  type: 'intention' | 'adventure' | 'priority'
  index?: number
  title: string
  description: string
}

interface ReflectionEditingState {
  id?: string
  type: ReflectionType
  title: string
  content: string
}

export function DailyRhythmModal({ isOpen, onClose, seasonId, initialView = 'planning' }: DailyRhythmModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toLocaleDateString('en-CA'))
  const [activeView, setActiveView] = useState<'planning' | 'reflection'>(initialView)

  useEffect(() => {
    if (isOpen) {
      setActiveView(initialView)
    }
  }, [isOpen, initialView])

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const {
    data: planningData,
    loading: planningLoading,
    error: planningError,
    saveIntention,
    saveAdventure,
    savePriority,
    linkExistingTaskToPriority,
    removePriority,
    markCompleted,
  } = useDailyStrategy(selectedDate, timezone, seasonId)

  const {
    data: reflectionData,
    loading: reflectionLoading,
    error: reflectionError,
    reflectionsByType,
    addReflection,
    updateReflection,
    deleteReflection,
    loadData: loadReflectionData,
  } = useDayReflection(selectedDate, seasonId)

  const [planningEditing, setPlanningEditing] = useState<PlanningEditingState | null>(null)
  const [planningSubmitting, setPlanningSubmitting] = useState(false)
  const [showTaskSelector, setShowTaskSelector] = useState<{ index: number } | null>(null)

  const [showReflectionTypeSelector, setShowReflectionTypeSelector] = useState(false)
  const [reflectionEditing, setReflectionEditing] = useState<ReflectionEditingState | null>(null)
  const [reflectionSubmitting, setReflectionSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadReflectionData()
    }
  }, [isOpen, loadReflectionData, selectedDate])

  const existingPriorities = useMemo(
    () => planningData.priorities.filter(item => Boolean(item?.timeline_item?.title?.trim() || item?.title?.trim())),
    [planningData.priorities]
  )

  const hasExistingPlan = Boolean(
    (planningData.intention && (planningData.intention.timeline_item?.title?.trim() || planningData.intention.title?.trim())) ||
    (planningData.adventure && (planningData.adventure.timeline_item?.title?.trim() || planningData.adventure.title?.trim())) ||
    existingPriorities.length > 0
  )

  const accentStyles: Record<'intention' | 'adventure' | 'priority', { card: string; aura: string; icon: string }> = {
    intention: {
      card: 'border-l-4 border-l-pink-300',
      aura: 'from-pink-50/70 via-white/90 to-white',
      icon: 'bg-pink-100 text-pink-600',
    },
    adventure: {
      card: 'border-l-4 border-l-orange-300',
      aura: 'from-orange-50/70 via-white/95 to-white',
      icon: 'bg-orange-100 text-orange-600',
    },
    priority: {
      card: 'border-l-4 border-l-blue-300',
      aura: 'from-sky-50/80 via-white/95 to-white',
      icon: 'bg-blue-100 text-blue-600',
    }
  }

  const microCopy: Record<'intention' | 'adventure' | 'priority', string> = {
    intention: 'Name the tone you want every moment to inherit.',
    adventure: 'Invite something delightful or courageous into the day.',
    priority: 'Shine a light on the work that moves your story forward.',
  }

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

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    if (dateStr === todayStr) return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'
    if (dateStr === tomorrowStr) return 'Tomorrow'

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

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

  const startPlanningEdit = (type: 'intention' | 'adventure' | 'priority', index?: number) => {
    let title = ''
    let description = ''

    if (type === 'intention' && planningData.intention) {
      title = planningData.intention.timeline_item?.title || planningData.intention.title || ''
      description = planningData.intention.timeline_item?.description || planningData.intention.description || ''
    } else if (type === 'adventure' && planningData.adventure) {
      title = planningData.adventure.timeline_item?.title || planningData.adventure.title || ''
      description = planningData.adventure.timeline_item?.description || planningData.adventure.description || ''
    } else if (type === 'priority' && typeof index === 'number' && planningData.priorities[index]) {
      const priority = planningData.priorities[index]
      title = priority.timeline_item?.title || priority.title || ''
      description = priority.timeline_item?.description || priority.description || ''
    }

    setPlanningEditing({ type, index, title, description })
  }

  const cancelPlanningEdit = () => {
    setPlanningEditing(null)
  }

  const savePlanningEdit = async () => {
    if (!planningEditing) return

    setPlanningSubmitting(true)
    try {
      if (planningEditing.type === 'intention') {
        await saveIntention(planningEditing.title, planningEditing.description)
      } else if (planningEditing.type === 'adventure') {
        await saveAdventure(planningEditing.title, planningEditing.description)
      } else if (planningEditing.type === 'priority' && typeof planningEditing.index === 'number') {
        await savePriority(planningEditing.index, planningEditing.title, planningEditing.description)
      }

      setPlanningEditing(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setPlanningSubmitting(false)
    }
  }

  const handleSelectExistingTask = async (task: TaskMemory) => {
    if (!showTaskSelector) return

    setPlanningSubmitting(true)
    try {
      await linkExistingTaskToPriority(showTaskSelector.index, task)
      setShowTaskSelector(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to link task')
    } finally {
      setPlanningSubmitting(false)
    }
  }

  const handleCreateNewTask = () => {
    if (!showTaskSelector) return

    setPlanningEditing({
      type: 'priority',
      index: showTaskSelector.index,
      title: '',
      description: '',
    })
    setShowTaskSelector(null)
  }

  const renderPlanningItem = (
    title: string,
    type: 'intention' | 'adventure' | 'priority',
    icon: React.ReactNode,
    item?: DailyStrategyItemWithDetails | null,
    index?: number,
    placeholder?: string
  ) => {
    const isEditing = planningEditing?.type === type && planningEditing?.index === index
    const currentItem = item ?? null
    const itemTitle = currentItem?.timeline_item?.title?.trim() || currentItem?.title?.trim() || ''
    const itemDescription = currentItem?.timeline_item?.description?.trim() || currentItem?.description?.trim() || ''
    const hasContent = Boolean(itemTitle || itemDescription)
    const statusClass = currentItem?.status ? statusBadgeStyles[currentItem.status] : undefined
    const accent = accentStyles[type]
    const supportiveCopy = type === 'priority' && typeof index === 'number'
      ? `Give priority #${index + 1} the clarity it deserves.`
      : microCopy[type]

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
      <Card
        className={`relative overflow-hidden rounded-xl border shadow-sm transition-all ${accent.card} ${hasContent ? 'bg-white/95 hover:-translate-y-0.5 hover:shadow-md' : 'bg-slate-50/70 border-dashed border-slate-300 hover:border-slate-400'}`}
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.aura}`} aria-hidden />
        <CardHeader className="relative z-10 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${accent.icon}`}>
                {icon}
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {title}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {supportiveCopy}
                </p>
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (type === 'priority' && typeof index === 'number' && !hasContent) {
                    setShowTaskSelector({ index })
                  } else {
                    startPlanningEdit(type, index)
                  }
                }}
                className="flex items-center gap-2 rounded-full border-slate-200 bg-white/60 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <Edit3 className="h-4 w-4" />
                <span className="text-xs font-medium">Edit</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={planningEditing.title || ''}
                onChange={(e) => setPlanningEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder={`${title} title...`}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <Textarea
                value={planningEditing.description || ''}
                onChange={(e) => setPlanningEditing(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder={`Describe your ${title.toLowerCase()}...`}
                className="w-full rounded-lg border border-slate-200 bg-white/80 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelPlanningEdit}
                  disabled={planningSubmitting}
                  className="rounded-full border-slate-200 text-slate-600 hover:border-slate-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={savePlanningEdit}
                  disabled={planningSubmitting || !planningEditing.title?.trim()}
                  className="rounded-full bg-blue-600 text-white hover:bg-blue-500"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : hasContent ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`flex-1 font-medium text-gray-900 ${currentItem?.timeline_item_id ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                  onClick={() => {
                    if (currentItem?.timeline_item_id) {
                      window.open(`/focus/work-mode?taskId=${currentItem.timeline_item_id}&from=strategy`, '_blank')
                    }
                  }}
                  title={currentItem?.timeline_item_id ? 'Click to open task in focus mode' : ''}
                >
                  {itemTitle}
                </h3>
                {currentItem?.status && (
                  <Badge
                    variant="outline"
                    className={`whitespace-nowrap text-xs font-medium ${statusClass ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    {formatLabel(currentItem.status)}
                  </Badge>
                )}
                {currentItem?.timeline_item_id && (
                  <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-600 cursor-pointer" />
                )}
              </div>
              {itemDescription && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{itemDescription}</p>
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
                  className="mt-3 rounded-full border-slate-300 text-slate-600 hover:border-green-400 hover:text-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}
            </div>
          ) : (
            <div
              className="cursor-pointer text-sm font-medium text-slate-400 italic transition-colors hover:text-slate-600"
              onClick={() => {
                if (type === 'priority' && typeof index === 'number') {
                  setShowTaskSelector({ index })
                } else {
                  startPlanningEdit(type, index)
                }
              }}
            >
              {type === 'priority'
                ? (placeholder || `Spotlight the priority that earns your attention in slot #${(index ?? 0) + 1}.`)
                : (placeholder || `Tap to capture the intention already whispering for this day.`)
              }
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const getReflectionTypeInfo = (type: ReflectionType) => REFLECTION_TYPES.find(rt => rt.type === type)

  const startReflectionEdit = (reflection: DailyStrategyItemWithDetails, type: ReflectionType) => {
    setReflectionEditing({
      id: reflection.id,
      type,
      title: reflection.title,
      content: reflection.description || '',
    })
  }

  const startReflectionCreate = (type: ReflectionType) => {
    setReflectionEditing({
      type,
      title: '',
      content: '',
    })
    setShowReflectionTypeSelector(false)
  }

  const cancelReflectionEdit = () => {
    setReflectionEditing(null)
  }

  const saveReflection = async () => {
    if (!reflectionEditing || !reflectionEditing.title.trim()) return

    setReflectionSubmitting(true)
    try {
      if (reflectionEditing.id) {
        await updateReflection(reflectionEditing.id, reflectionEditing.title, reflectionEditing.content)
      } else {
        await addReflection(reflectionEditing.type, reflectionEditing.title, reflectionEditing.content)
      }
      setReflectionEditing(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save reflection')
    } finally {
      setReflectionSubmitting(false)
    }
  }

  const handleDeleteReflection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reflection?')) return

    try {
      await deleteReflection(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete reflection')
    }
  }

  const renderReflectionItem = (reflection: DailyStrategyItemWithDetails, type: ReflectionType) => {
    const typeInfo = getReflectionTypeInfo(type)
    const isEditing = reflectionEditing?.id === reflection.id

    return (
      <Card key={reflection.id} className={`border-l-4 border-l-${typeInfo?.color}-500`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {typeInfo?.icon}
              <span className="text-base font-medium">{typeInfo?.title}</span>
            </div>
            {!isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startReflectionEdit(reflection, type)}
                  className="opacity-60 hover:opacity-100"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteReflection(reflection.id)}
                  className="opacity-60 hover:opacity-100 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={reflectionEditing.title}
                onChange={(e) => setReflectionEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="Title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Textarea
                value={reflectionEditing.content}
                onChange={(e) => setReflectionEditing(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder={typeInfo?.placeholder}
                className="w-full min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelReflectionEdit}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveReflection}
                  disabled={reflectionSubmitting || !reflectionEditing.title.trim()}
                >
                  {reflectionSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{reflection.title}</h4>
              {reflection.description && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {reflection.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const planningLoadingState = planningLoading
  const reflectionLoadingState = reflectionLoading

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Rhythm"
      icon={activeView === 'planning' ? <Sun className="w-6 h-6 text-blue-600" /> : <Moon className="w-6 h-6 text-purple-600" />}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-medium text-slate-600">
            <span>Craft your day • Reflect your story</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Design &amp; Honour Your Day</h3>
          <CardDescription className="text-slate-600">
            Toggle between planning what matters and reflecting on how it unfolded.
          </CardDescription>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
            {(['planning', 'reflection'] as const).map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeView === view
                    ? view === 'planning'
                      ? 'bg-white text-blue-600 shadow'
                      : 'bg-white text-purple-600 shadow'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {view === 'planning' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {view === 'planning' ? 'Planning' : 'Reflection'}
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border border-slate-200 ${activeView === 'planning' ? 'bg-gradient-to-r from-white via-slate-50 to-sky-50/80' : 'bg-gradient-to-r from-white via-slate-50 to-purple-50/80'} p-6 shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 shadow-sm">
                <Calendar className="h-5 w-5 text-slate-500" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {formatDisplayDate(selectedDate)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeView === 'planning'
                    ? 'Align your intention, adventure, and priorities for this date.'
                    : 'Capture insights and celebrate progress for the same day.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={goToPreviousDay}
                className="rounded-full border-slate-300 bg-white/80 px-3 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <Button
                variant="outline"
                onClick={goToNextDay}
                className="rounded-full border-slate-300 bg-white/80 px-3 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              {activeView === 'planning' ? <Sun className="h-4 w-4 text-blue-500" /> : <Moon className="h-4 w-4 text-purple-500" />}
              <span>Local timezone: {timezone}</span>
            </span>
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <Button
                variant="outline"
                onClick={goToToday}
                className={`rounded-full border-slate-300 bg-white/80 px-4 py-1 text-slate-600 hover:text-${activeView === 'planning' ? 'blue' : 'purple'}-600`}
              >
                Jump to today
              </Button>
            )}
          </div>
        </div>

        {activeView === 'planning' ? (
          planningLoadingState ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading your daily plan...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {planningError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {planningError}
                </div>
              )}

              {hasExistingPlan ? (
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/70 p-5 shadow-sm">
                  <p className="text-base font-semibold text-emerald-800">
                    You already planted seeds for {formatDisplayDate(selectedDate)}.
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {[
                      planningData.intention && 'Intention captured',
                      planningData.adventure && 'Adventure set',
                      existingPriorities.length ? `${existingPriorities.length} priority ${existingPriorities.length === 1 ? 'task' : 'tasks'}` : null,
                    ].filter(Boolean).join(' • ')}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-violet-50/60 p-5 shadow-sm text-slate-700">
                  <p className="text-base font-semibold text-slate-800">No daily plan is saved yet.</p>
                  <p className="mt-1 text-sm">Take a gentle minute to jot the intention, pick a small adventure, and choose the priorities future you will thank you for.</p>
                </div>
              )}

              {renderPlanningItem(
                'Daily Intention',
                'intention',
                <Heart className="h-4 w-4" />,
                planningData.intention,
                undefined,
                'What is your main intention for this day?'
              )}

              {renderPlanningItem(
                'Daily Adventure',
                'adventure',
                <Sun className="h-4 w-4" />,
                planningData.adventure,
                undefined,
                'What new experience will you seek today?'
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Top 3 Priorities
                </h3>

                {[0, 1, 2].map(index => (
                  <div key={`priority-${index}`}>
                    {renderPlanningItem(
                      `Priority ${index + 1}`,
                      'priority',
                      <Target className="h-4 w-4" />,
                      planningData.priorities[index],
                      index,
                      `What's your #${index + 1} priority today?`
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          reflectionLoadingState ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">Loading your reflections...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {reflectionError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {reflectionError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Priority Tasks Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {reflectionData.completionRate}%
                        </div>
                        <p className="text-sm text-gray-600">
                          Completion Rate ({reflectionData.completedCount} of {reflectionData.totalCount} priorities)
                        </p>
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${reflectionData.completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {reflectionData.priorities.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Today&apos;s Priorities:</h4>
                          <div className="space-y-2">
                            {reflectionData.priorities.map((priority, index) => (
                              <div
                                key={priority.id}
                                className={`p-3 border rounded-lg ${
                                  priority.status === 'completed'
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{index + 1}.</span>
                                  {priority.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                                  <span
                                    className={`flex-1 text-sm ${
                                      priority.status === 'completed' ? 'text-green-700 line-through' : 'text-gray-700'
                                    } ${priority.timeline_item_id ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                                    onClick={() => {
                                      if (priority.timeline_item_id) {
                                        window.open(`/focus/work-mode?taskId=${priority.timeline_item_id}&from=strategy`, '_blank')
                                      }
                                    }}
                                    title={priority.timeline_item_id ? 'Open in focus mode' : ''}
                                  >
                                    {priority.timeline_item?.title || priority.title}
                                  </span>
                                  {priority.status && (
                                    <Badge variant={priority.status === 'completed' ? 'default' : 'secondary'}>
                                      {priority.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-6">
                          <p>No priorities were set for this day</p>
                          <p className="text-xs mt-1">Set priorities in your daily planning to track completion rate</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-dashed border-2 border-blue-300">
                    <CardContent className="py-6">
                      <div
                        className="text-center cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors"
                        onClick={() => setShowReflectionTypeSelector(true)}
                      >
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
                          <Plus className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Add a Reflection</p>
                        <p className="text-xs text-gray-500">Share insights, learnings, or gratitude from this day</p>
                      </div>
                    </CardContent>
                  </Card>

                  {REFLECTION_TYPES.map(typeInfo => {
                    const reflections = reflectionsByType[typeInfo.type]
                    if (reflections.length > 0) {
                      return (
                        <div key={typeInfo.type} className="space-y-3">
                          {reflections.map(reflection =>
                            renderReflectionItem(reflection, typeInfo.type)
                          )}
                        </div>
                      )
                    }
                    return null
                  })}

                  {reflectionData.reflections.length === 0 && !reflectionEditing && (
                    <div className="text-center text-gray-500 py-8">
                      <p>No reflections added yet</p>
                      <p className="text-xs mt-1">Click “Add a Reflection” to get started</p>
                    </div>
                  )}
                </div>
              </div>

              {reflectionEditing && !reflectionEditing.id && (
                <Card className="border-2 border-blue-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getReflectionTypeInfo(reflectionEditing.type)?.icon}
                      <span>New {getReflectionTypeInfo(reflectionEditing.type)?.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={reflectionEditing.title}
                        onChange={(e) => setReflectionEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                        placeholder="Title..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <Textarea
                        value={reflectionEditing.content}
                        onChange={(e) => setReflectionEditing(prev => prev ? { ...prev, content: e.target.value } : null)}
                        placeholder={getReflectionTypeInfo(reflectionEditing.type)?.placeholder}
                        className="w-full min-h-[100px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelReflectionEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={saveReflection}
                          disabled={reflectionSubmitting || !reflectionEditing.title.trim()}
                        >
                          {reflectionSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        )}

        {showTaskSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <TaskSelector
                onSelectExisting={handleSelectExistingTask}
                onCreateNew={handleCreateNewTask}
                onCancel={() => setShowTaskSelector(null)}
              />
            </div>
          </div>
        )}

        {showReflectionTypeSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <ReflectionTypeSelector
                onAddReflection={(type) => startReflectionCreate(type)}
                onCancel={() => setShowReflectionTypeSelector(false)}
              />
            </div>
          </div>
        )}
      </div>
    </FullscreenModal>
  )
}

export function DailyPlanningModal(props: DailyRhythmModalProps) {
  return <DailyRhythmModal {...props} initialView="planning" />
}

export function DailyReflectionModal(props: DailyRhythmModalProps) {
  return <DailyRhythmModal {...props} initialView="reflection" />
}
