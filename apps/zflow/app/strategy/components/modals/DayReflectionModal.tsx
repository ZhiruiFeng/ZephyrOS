'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Moon, CheckCircle, AlertCircle, Lightbulb, TrendingUp, Star, Target, BookOpen } from 'lucide-react'
import { FullscreenModal } from './FullscreenModal'
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge } from '../ui'
import { useStrategyTasks, useStrategyMemories } from '../../../../lib/hooks/strategy'
import { memoriesApi } from '../../../../lib/api/memories-api'
import type { StrategyTask } from '../../../../lib/types/strategy'

interface DayReflectionModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId?: string
}

export function DayReflectionModal({ isOpen, onClose, seasonId }: DayReflectionModalProps) {
  const { myTasks } = useStrategyTasks(seasonId)
  const { createReflection } = useStrategyMemories(seasonId)

  const [lessonsLearned, setLessonsLearned] = useState('')
  const [energyReflection, setEnergyReflection] = useState('')
  const [tomorrowPreparation, setTomorrowPreparation] = useState('')
  const [winRating, setWinRating] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [challengeHighlight, setChallengeHighlight] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Daily planning memory and anchored tasks
  const [todaysPlanning, setTodaysPlanning] = useState<any>(null)
  const [priorityTasks, setPriorityTasks] = useState<StrategyTask[]>([])

  // Calculate today's task performance
  const todaysTaskPerformance = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    const completedToday = myTasks.filter((task: StrategyTask) =>
      task.status === 'completed' &&
      task.completion_date &&
      task.completion_date.startsWith(today)
    )

    const plannedToday = myTasks.filter((task: StrategyTask) =>
      task.due_date && task.due_date.startsWith(today)
    )

    const inProgressToday = myTasks.filter((task: StrategyTask) =>
      task.status === 'in_progress' &&
      ((task.due_date && task.due_date.startsWith(today)) ||
       (task.updated_at && task.updated_at.startsWith(today)))
    )

    const overdue = myTasks.filter((task: StrategyTask) =>
      task.status !== 'completed' &&
      task.due_date &&
      task.due_date < today
    )

    return {
      completed: completedToday,
      planned: plannedToday,
      inProgress: inProgressToday,
      overdue: overdue,
      completionRate: plannedToday.length > 0
        ? Math.round((completedToday.length / plannedToday.length) * 100)
        : completedToday.length > 0 ? 100 : 0
    }
  }, [myTasks])

  // Load today's planning and priority tasks
  useEffect(() => {
    const loadTodaysPlanning = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]

        // Get today's planning memories
        const planningMemories = await memoriesApi.search({
          tags: ['daily-planning'],
          date_from: today,
          date_to: today,
          limit: 1
        })

        if (planningMemories.memories.length > 0) {
          const planMemory = planningMemories.memories[0]
          setTodaysPlanning(planMemory)

          // Get anchored priority tasks
          const anchors = await memoriesApi.getAnchors(planMemory.id, {
            relation_type: 'about',
            anchor_item_type: 'task'
          })

          // Get task details for anchored tasks
          const anchoredTaskIds = anchors.map(anchor => anchor.anchor_item_id)
          const anchoredTasks = myTasks.filter(task => anchoredTaskIds.includes(task.id))
          setPriorityTasks(anchoredTasks)
        }
      } catch (error) {
        console.warn('Failed to load today\'s planning:', error)
      }
    }

    if (myTasks.length > 0) {
      loadTodaysPlanning()
    }
  }, [myTasks])

  const handleSaveReflection = async () => {
    setIsLoading(true)
    try {
      const today = new Date().toLocaleDateString()
      const { completed, planned, completionRate } = todaysTaskPerformance

      const reflectionContent = `Day Reflection - ${today}

⭐ DAY RATING: ${winRating}/5 stars

📊 TASK PERFORMANCE:
- Completed: ${completed.length} tasks
- Planned: ${planned.length} tasks
- Completion Rate: ${completionRate}%

✅ TODAY'S ACCOMPLISHMENTS:
${completed.length > 0
  ? completed.map((task: StrategyTask) => `• ${task.title}`).join('\n')
  : '• No tasks completed today'
}

🎯 PRIORITY TASKS REVIEW:
${priorityTasks.length > 0
  ? priorityTasks.map((task: StrategyTask, index: number) =>
      `${index + 1}. ${task.title} - ${task.status === 'completed' ? '✅ COMPLETED' : task.status.toUpperCase()}`
    ).join('\n')
  : 'No priority tasks were set for today'
}

💡 LESSONS LEARNED:
${lessonsLearned || 'None captured'}

⚡ ENERGY & PRODUCTIVITY PATTERNS:
${energyReflection || 'None captured'}

🚧 BIGGEST CHALLENGE:
${challengeHighlight || 'None captured'}

🎯 TOMORROW'S PREPARATION:
${tomorrowPreparation || 'None captured'}`

      await createReflection({
        content: reflectionContent,
        strategyType: 'reflection',
        seasonId,
        impact: winRating >= 4 ? 'high' : winRating >= 3 ? 'medium' : 'low',
        actionable: !!tomorrowPreparation.trim(),
        tags: ['daily-reflection', 'evening-ritual', `rating-${winRating}`]
      })

      onClose()
    } catch (error) {
      console.error('Error saving daily reflection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Day Reflection"
      icon={<Moon className="w-6 h-6 text-purple-600" />}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Reflect on Your Day</h3>
          <p className="text-gray-600">Capture insights and prepare for tomorrow - {new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Today's Priority Tasks */}
            {priorityTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Today&apos;s Priority Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {priorityTasks.map((task: StrategyTask, index: number) => (
                      <div key={task.id} className={`p-3 border rounded-lg ${
                        task.status === 'completed'
                          ? 'border-green-300 bg-green-50'
                          : task.status === 'in_progress'
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{index + 1}.</span>
                          {task.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          <span className={`text-sm font-medium ${
                            task.status === 'completed' ? 'text-green-700 line-through' : 'text-gray-700'
                          }`}>
                            {task.title}
                          </span>
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-1 ml-6">{task.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Priority Completion:</strong> {priorityTasks.filter(t => t.status === 'completed').length} of {priorityTasks.length} completed
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Today's Planning Context */}
            {todaysPlanning && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    Today&apos;s Plan Context
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    {todaysPlanning.note || todaysPlanning.content}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Today&apos;s Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Completion Rate */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <Badge variant={todaysTaskPerformance.completionRate >= 80 ? 'default' : 'secondary'}>
                      {todaysTaskPerformance.completionRate}%
                    </Badge>
                  </div>

                  {/* Tasks Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{todaysTaskPerformance.completed.length}</div>
                      <div className="text-xs text-green-700">Completed</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{todaysTaskPerformance.inProgress.length}</div>
                      <div className="text-xs text-orange-700">In Progress</div>
                    </div>
                  </div>

                  {/* Completed Tasks */}
                  {todaysTaskPerformance.completed.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Completed Today:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {todaysTaskPerformance.completed.slice(0, 5).map((task: StrategyTask) => (
                          <div key={task.id} className="flex items-center gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-gray-700">{task.title}</span>
                          </div>
                        ))}
                        {todaysTaskPerformance.completed.length > 5 && (
                          <p className="text-xs text-gray-500">...and {todaysTaskPerformance.completed.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Day Rating */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Overall Day Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setWinRating(rating as any)}
                      className={`p-2 rounded-lg transition-all ${
                        winRating >= rating
                          ? 'text-yellow-500'
                          : 'text-gray-300 hover:text-yellow-400'
                      }`}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-600">
                  {winRating === 1 && "Tough day, but tomorrow is a fresh start"}
                  {winRating === 2 && "Below expectations, but lessons learned"}
                  {winRating === 3 && "Solid day with steady progress"}
                  {winRating === 4 && "Great day with strong momentum"}
                  {winRating === 5 && "Exceptional day! Outstanding progress"}
                </p>
              </CardContent>
            </Card>

            {/* Biggest Challenge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Biggest Challenge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="What was the most challenging aspect of today? How did you handle it?"
                  value={challengeHighlight}
                  onChange={(e) => setChallengeHighlight(e.target.value)}
                  className="w-full min-h-[80px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Lessons Learned */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  Lessons Learned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="What insights or lessons did you gain today? What would you do differently?"
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  className="w-full min-h-[100px]"
                />
              </CardContent>
            </Card>

            {/* Energy & Productivity Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Energy & Productivity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="When were you most/least productive today? What factors influenced your energy levels?"
                  value={energyReflection}
                  onChange={(e) => setEnergyReflection(e.target.value)}
                  className="w-full min-h-[80px]"
                />
              </CardContent>
            </Card>

            {/* Tomorrow's Preparation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  Tomorrow&apos;s Preparation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="What can you prepare tonight to set tomorrow up for success? Any adjustments needed?"
                  value={tomorrowPreparation}
                  onChange={(e) => setTomorrowPreparation(e.target.value)}
                  className="w-full min-h-[80px]"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-6 border-t">
          <Button variant="secondary" onClick={onClose}>
            Skip Reflection
          </Button>
          <Button
            onClick={handleSaveReflection}
            disabled={isLoading}
            className="px-8"
          >
            {isLoading ? 'Saving...' : 'Save Reflection'}
          </Button>
        </div>
      </div>
    </FullscreenModal>
  )
}