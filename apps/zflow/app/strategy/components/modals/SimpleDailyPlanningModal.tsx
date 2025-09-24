'use client'

import React, { useState, useEffect } from 'react'
import { Sun, Heart, Target, Calendar, ChevronLeft, ChevronRight, Edit3, Check, X } from 'lucide-react'
import { FullscreenModal } from './FullscreenModal'
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge } from '../ui'
import { useDailyStrategy } from '../../../../hooks/useDailyStrategy'
import { TaskSelector } from './TaskSelector'
import { TaskMemory } from '../../../../lib/api/api-base'

interface SimpleDailyPlanningModalProps {
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

export function SimpleDailyPlanningModal({ isOpen, onClose, seasonId }: SimpleDailyPlanningModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  })
  
  const { data, loading, error, saveIntention, saveAdventure, savePriority, linkExistingTaskToPriority, removePriority, markCompleted } = useDailyStrategy(selectedDate, seasonId)
  
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTaskSelector, setShowTaskSelector] = useState<{ index: number } | null>(null)

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
      title = data.intention.title
      description = data.intention.description || ''
    } else if (type === 'adventure' && data.adventure) {
      title = data.adventure.title
      description = data.adventure.description || ''
    } else if (type === 'priority' && typeof index === 'number' && data.priorities[index]) {
      title = data.priorities[index].title
      description = data.priorities[index].description || ''
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
  const renderItem = (
    title: string,
    type: 'intention' | 'adventure' | 'priority',
    icon: React.ReactNode,
    color: string,
    item?: any,
    index?: number,
    placeholder?: string
  ) => {
    const isEditing = editing?.type === type && editing?.index === index
    const hasContent = item && item.title
    
    return (
      <Card className={`border-l-4 border-l-${color} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-lg">{title}</span>
              {item?.status === 'completed' && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Completed
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
                value={editing.title}
                onChange={(e) => setEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder={`${title} title...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Textarea
                value={editing.description}
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
                  disabled={isSubmitting || !editing.title.trim()}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : hasContent ? (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">{item.title}</h3>
              {item.description && (
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{item.description}</p>
              )}
              {item.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markCompleted(item.id)}
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
                ? (placeholder || 'Click to add task or link existing task...')
                : (placeholder || `Click to add your ${title.toLowerCase()}...`)
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
