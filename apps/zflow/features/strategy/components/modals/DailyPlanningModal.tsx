'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Sun,
  Heart,
  Target,
  Moon,
  Plus,
} from 'lucide-react'
import { FullscreenModal } from './FullscreenModal'
import { Card, CardContent } from '../ui'
import { TaskSelector } from './TaskSelector'
import { useDailyStrategy } from '../../hooks/useDailyStrategy'
import { useDayReflection } from '../../../../hooks/timeline/useDayReflection'
import { TaskMemory } from '../../../../lib/api/api-base'
import type { DailyStrategyItemWithDetails } from '../../api/daily-strategy-api'
import { ReflectionTypeSelector, ReflectionType, REFLECTION_TYPES } from './ReflectionTypeSelector'
import { DateNavigation } from './DateNavigation'
import { ViewToggle } from './ViewToggle'
import { PlanningItemDisplay } from './PlanningItemDisplay'
import { PlanningItemEditor } from './PlanningItemEditor'
import { ReflectionItemDisplay } from './ReflectionItemDisplay'
import { ReflectionItemEditor } from './ReflectionItemEditor'
import { PriorityTasksPerformance } from './PriorityTasksPerformance'
import { formatDisplayDate } from './dateUtils'

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

    if (isEditing && planningEditing) {
      return (
        <div className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm">
          <PlanningItemEditor
            editing={planningEditing}
            onEditingChange={setPlanningEditing}
            onCancel={cancelPlanningEdit}
            onSave={savePlanningEdit}
            isSubmitting={planningSubmitting}
          />
        </div>
      )
    }

    return (
      <PlanningItemDisplay
        title={title}
        type={type}
        icon={icon}
        item={item}
        index={index}
        placeholder={placeholder}
        onEdit={() => {
          if (type === 'priority' && typeof index === 'number' && !Boolean(item?.timeline_item?.title?.trim() || item?.title?.trim())) {
            setShowTaskSelector({ index })
          } else {
            startPlanningEdit(type, index)
          }
        }}
        onMarkComplete={markCompleted}
      />
    )
  }

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
        <ViewToggle activeView={activeView} onViewChange={setActiveView} />

        <DateNavigation
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          activeView={activeView}
          timezone={timezone}
        />

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
                <PriorityTasksPerformance reflectionData={reflectionData} />

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
                          {reflections.map(reflection => {
                            const isEditing = reflectionEditing?.id === reflection.id
                            return isEditing && reflectionEditing ? (
                              <div key={reflection.id} className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm">
                                <ReflectionItemEditor
                                  editing={reflectionEditing}
                                  onEditingChange={setReflectionEditing}
                                  onCancel={cancelReflectionEdit}
                                  onSave={saveReflection}
                                  isSubmitting={reflectionSubmitting}
                                />
                              </div>
                            ) : (
                              <ReflectionItemDisplay
                                key={reflection.id}
                                reflection={reflection}
                                type={typeInfo.type}
                                onEdit={startReflectionEdit}
                                onDelete={handleDeleteReflection}
                              />
                            )
                          })}
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
                <div className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {REFLECTION_TYPES.find(rt => rt.type === reflectionEditing.type)?.icon}
                      <span>New {REFLECTION_TYPES.find(rt => rt.type === reflectionEditing.type)?.title}</span>
                    </h3>
                  </div>
                  <ReflectionItemEditor
                    editing={reflectionEditing}
                    onEditingChange={setReflectionEditing}
                    onCancel={cancelReflectionEdit}
                    onSave={saveReflection}
                    isSubmitting={reflectionSubmitting}
                  />
                </div>
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
