import React from 'react'
import { Calendar, Target, CheckCircle, Star, TrendingUp, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from './ui'
import { useDailyPlanning } from '../../../lib/hooks/strategy/useDailyPlanning'
import type { StrategyTask } from '../../../lib/types/strategy'

interface DailyTrackingCardProps {
  onOpenPlanning: () => void
  onOpenReflection: () => void
}

export function DailyTrackingCard({ onOpenPlanning, onOpenReflection }: DailyTrackingCardProps) {
  const { dailyPlan, loading } = useDailyPlanning()
  const today = new Date().toLocaleDateString()

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasPlan = !!dailyPlan
  const hasAdventure = !!dailyPlan?.adventureMemory
  const priorityTasks = dailyPlan?.priorityTasks || []
  const completionRate = dailyPlan?.completionRate || 0

  return (
    <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Tracking
          </div>
          <Badge variant={hasPlan ? 'default' : 'secondary'}>
            {today}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPlan ? (
          // No plan yet
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Ready to plan your day?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set your daily intention and choose up to 3 priority tasks
            </p>
            <Button onClick={onOpenPlanning} className="bg-blue-600 hover:bg-blue-700">
              Start Daily Planning
            </Button>
          </div>
        ) : (
          // Has plan - show progress
          <div className="space-y-4">
            {/* Daily Adventure */}
            {hasAdventure && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Today&apos;s Adventure</span>
                </div>
                <p className="text-sm text-yellow-700 line-clamp-2">
                  {dailyPlan.adventureMemory?.note || dailyPlan.adventureMemory?.context}
                </p>
              </div>
            )}

            {/* Priority Tasks Progress */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Priority Tasks
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant={completionRate === 100 ? 'default' : 'secondary'}>
                    {completionRate}%
                  </Badge>
                  <TrendingUp className={`h-4 w-4 ${
                    completionRate >= 67 ? 'text-green-600' :
                    completionRate >= 33 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
              </div>

              <div className="space-y-2">
                {priorityTasks.length > 0 ? (
                  priorityTasks.map((task: StrategyTask, index: number) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        task.status === 'completed'
                          ? 'border-green-200 bg-green-50'
                          : task.status === 'in_progress'
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-sm text-gray-600">
                          {index + 1}.
                        </span>
                        {task.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium truncate ${
                          task.status === 'completed'
                            ? 'text-green-700 line-through'
                            : 'text-gray-900'
                        }`}>
                          {task.title}
                        </span>
                      </div>
                      <Badge
                        variant={task.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No priority tasks set</p>
                )}
              </div>
            </div>

            {/* Daily Intention */}
            {dailyPlan.dailyIntention && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h5 className="font-medium text-blue-900 text-sm mb-1">Today&apos;s Intention</h5>
                <p className="text-sm text-blue-700 line-clamp-2">
                  {dailyPlan.dailyIntention}
                </p>
              </div>
            )}

            {/* Energy Level */}
            {dailyPlan.energyLevel && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Energy Level:</span>
                <Badge
                  variant={
                    dailyPlan.energyLevel === 'high' ? 'default' :
                    dailyPlan.energyLevel === 'medium' ? 'secondary' : 'outline'
                  }
                  className={
                    dailyPlan.energyLevel === 'high' ? 'bg-green-100 text-green-800' :
                    dailyPlan.energyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }
                >
                  {dailyPlan.energyLevel.toUpperCase()}
                </Badge>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenReflection}
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-1" />
                End Day Reflection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}