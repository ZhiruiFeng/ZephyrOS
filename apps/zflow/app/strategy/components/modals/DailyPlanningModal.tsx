'use client'

import React, { useState, useMemo } from 'react'
import { Sun, CheckCircle, Target, Zap, Plus, Calendar } from 'lucide-react'
import { FullscreenModal } from './FullscreenModal'
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge } from '../ui'
import { useStrategyTasks, useStrategyMemories } from '../../../../lib/hooks/strategy'
import type { StrategyTask } from '../../../../lib/types/strategy'

interface DailyPlanningModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId?: string
}

export function DailyPlanningModal({ isOpen, onClose, seasonId }: DailyPlanningModalProps) {
  const { myTasks, createTask } = useStrategyTasks(seasonId)
  const { createReflection } = useStrategyMemories(seasonId)

  const [dailyIntention, setDailyIntention] = useState('')
  const [topPriorities, setTopPriorities] = useState<string[]>([])
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Calculate yesterday's completed tasks
  const yesterdaysCompletedTasks = useMemo(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    return myTasks.filter((task: StrategyTask) =>
      task.status === 'completed' &&
      task.completion_date &&
      task.completion_date.startsWith(yesterdayStr)
    )
  }, [myTasks])

  // Available tasks for prioritization
  const availableTasks = useMemo(() => {
    return myTasks.filter((task: StrategyTask) =>
      task.status === 'pending' || task.status === 'in_progress'
    ).slice(0, 10) // Show max 10 tasks
  }, [myTasks])

  const handleTogglePriority = (taskId: string) => {
    setTopPriorities(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId)
      } else if (prev.length < 3) {
        return [...prev, taskId]
      }
      return prev
    })
  }

  const handleAddQuickTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      await createTask({
        type: 'task',
        content: {
          title: newTaskTitle.trim(),
          description: 'Created during daily planning',
          status: 'pending',
          priority: 'high'
        },
        tags: ['daily-planning', 'quick-add']
      })
      setNewTaskTitle('')
    } catch (error) {
      console.error('Error creating quick task:', error)
    }
  }

  const handleSavePlan = async () => {
    setIsLoading(true)
    try {
      const priorityTasks = availableTasks.filter((task: StrategyTask) => topPriorities.includes(task.id))

      const planContent = `Daily Plan - ${new Date().toLocaleDateString()}

DAILY INTENTION:
${dailyIntention}

TOP 3 PRIORITIES:
${priorityTasks.map((task: StrategyTask, index: number) => `${index + 1}. ${task.title}`).join('\n')}

ENERGY LEVEL: ${energyLevel.toUpperCase()}

YESTERDAY'S WINS:
${yesterdaysCompletedTasks.length > 0
  ? yesterdaysCompletedTasks.map((task: StrategyTask) => `✅ ${task.title}`).join('\n')
  : 'No completed tasks from yesterday'
}`

      await createReflection({
        content: planContent,
        strategyType: 'goal',
        seasonId,
        impact: 'medium',
        actionable: true,
        tags: ['daily-planning', 'morning-ritual']
      })

      onClose()
    } catch (error) {
      console.error('Error saving daily plan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Planning"
      icon={<Sun className="w-6 h-6 text-blue-600" />}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Day with Purpose</h3>
          <p className="text-gray-600">Set intentions and priorities for {new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Yesterday's Wins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Yesterday&apos;s Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {yesterdaysCompletedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {yesterdaysCompletedTasks.slice(0, 5).map((task: StrategyTask) => (
                      <div key={task.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-700">{task.title}</span>
                      </div>
                    ))}
                    {yesterdaysCompletedTasks.length > 5 && (
                      <p className="text-sm text-gray-500">...and {yesterdaysCompletedTasks.length - 5} more</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No completed tasks from yesterday. Today is a fresh start!</p>
                )}
              </CardContent>
            </Card>

            {/* Daily Intention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Daily Intention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="What do you want to accomplish or focus on today? (e.g., &apos;Make meaningful progress on the Q1 strategy review&apos;)"
                  value={dailyIntention}
                  onChange={(e) => setDailyIntention(e.target.value)}
                  className="w-full min-h-[80px]"
                />
              </CardContent>
            </Card>

            {/* Energy & Capacity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Energy Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(level => (
                    <Button
                      key={level}
                      variant={energyLevel === level ? 'primary' : 'secondary'}
                      onClick={() => setEnergyLevel(level)}
                      className="flex-1"
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {energyLevel === 'low' && 'Take it easy today. Focus on smaller, manageable tasks.'}
                  {energyLevel === 'medium' && 'Good energy for a balanced mix of tasks.'}
                  {energyLevel === 'high' && 'High energy day! Perfect for tackling challenging priorities.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Top 3 Priorities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  Top 3 Priorities
                  <Badge variant="secondary">{topPriorities.length}/3</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableTasks.map((task: StrategyTask) => (
                    <div
                      key={task.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        topPriorities.includes(task.id)
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-200 hover:bg-orange-25'
                      }`}
                      onClick={() => handleTogglePriority(task.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border-2 rounded ${
                          topPriorities.includes(task.id)
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300'
                        }`} />
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 ml-6">{task.description}</p>
                      )}
                    </div>
                  ))}
                  {availableTasks.length === 0 && (
                    <p className="text-gray-500 text-sm">No pending tasks. Create some below!</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Task Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-600" />
                  Add Urgent Task
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Quick task for today..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddQuickTask()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <Button onClick={handleAddQuickTask} disabled={!newTaskTitle.trim()}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-6 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSavePlan}
            disabled={isLoading || !dailyIntention.trim()}
            className="px-8"
          >
            {isLoading ? 'Saving...' : 'Save Daily Plan'}
          </Button>
        </div>
      </div>
    </FullscreenModal>
  )
}