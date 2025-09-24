import React, { useMemo } from 'react'
import { Calendar, Target, CheckCircle, Star, TrendingUp, Clock, Sun, Moon, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from './ui'
import { useDailyStrategy } from '../../../hooks/useDailyStrategy'
import { useDayReflection } from '../../../hooks/useDayReflection'

interface DailyTrackingCardProps {
  onOpenPlanning: () => void
  onOpenReflection: () => void
  refreshTrigger?: number // Optional prop to trigger data refresh
}

export function DailyTrackingCard({ onOpenPlanning, onOpenReflection, refreshTrigger }: DailyTrackingCardProps) {
  const today = new Date().toISOString().split('T')[0]
  
  // Determine if it's morning/planning time (before 6 PM) or evening/reflection time (after 6 PM)
  const { isReflectionTime, currentTime } = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    return {
      isReflectionTime: hour >= 18, // 6 PM or later
      currentTime: now
    }
  }, [])

  const { data: planningData, loading: planningLoading, error: planningError, loadData } = useDailyStrategy(today)
  const { data: reflectionData, loading: reflectionLoading } = useDayReflection(today)

  // Trigger refresh when refreshTrigger changes
  React.useEffect(() => {
    if (refreshTrigger) {
      loadData()
    }
  }, [refreshTrigger, loadData])

  const loading = planningLoading || reflectionLoading

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

  const hasIntention = !!planningData.intention
  const hasAdventure = !!planningData.adventure
  const priorities = planningData.priorities || []

  // Show error state if there are errors
  if (planningError) {
    console.error('Daily strategy error:', planningError)
  }
  const completionRate = reflectionData.completionRate || 0
  const hasReflections = reflectionData.reflections.length > 0

  // Choose mode based on time and data availability
  const shouldShowPlanning = !isReflectionTime || (!hasIntention && !hasAdventure && priorities.length === 0)
  const mode = shouldShowPlanning ? 'planning' : 'reflection'

  return (
    <Card className={`rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300 ${
      mode === 'planning' 
        ? 'bg-gradient-to-br from-white via-blue-50/30 to-white' 
        : 'bg-gradient-to-br from-white via-purple-50/30 to-white'
    }`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'planning' ? (
              <Sun className="h-5 w-5 text-blue-600" />
            ) : (
              <Moon className="h-5 w-5 text-purple-600" />
            )}
            Daily {mode === 'planning' ? 'Planning' : 'Reflection'}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isReflectionTime ? 'default' : 'secondary'}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
            <Badge variant="outline">
              {new Date(today).toLocaleDateString()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'planning' ? (
          // Planning Mode
          <div className="space-y-4">
            {!hasIntention && !hasAdventure && priorities.length === 0 ? (
              // No plan yet
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Sun className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Ready to plan your day?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set your daily intention, adventure, and priority tasks
                </p>
                <Button onClick={onOpenPlanning} className="bg-blue-600 hover:bg-blue-700">
                  <Sun className="h-4 w-4 mr-2" />
                  Start Daily Planning
                </Button>
              </div>
            ) : (
              // Show planning progress
              <div className="space-y-4">
                {/* Daily Intention */}
                {hasIntention && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-900 text-sm mb-1 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Today&apos;s Intention
                    </h5>
                    <p
                      className={`text-sm text-blue-700 line-clamp-2 ${planningData.intention?.timeline_item_id ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                      onClick={() => {
                        if (planningData.intention?.timeline_item_id) {
                          window.open(`/focus/work-mode?taskId=${planningData.intention.timeline_item_id}&from=strategy`, '_blank')
                        }
                      }}
                      title={planningData.intention?.timeline_item_id ? 'Click to open intention in focus mode' : ''}
                    >
                      {planningData.intention?.timeline_item?.title || planningData.intention?.title || 'Untitled Intention'}
                    </p>
                  </div>
                )}

                {/* Daily Adventure */}
                {hasAdventure && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
                    <h5 className="font-medium text-yellow-800 text-sm mb-1 flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Today&apos;s Adventure
                    </h5>
                    <p
                      className={`text-sm text-yellow-700 line-clamp-2 ${planningData.adventure?.timeline_item_id ? 'cursor-pointer hover:text-yellow-600 hover:underline' : ''}`}
                      onClick={() => {
                        if (planningData.adventure?.timeline_item_id) {
                          window.open(`/focus/work-mode?taskId=${planningData.adventure.timeline_item_id}&from=strategy`, '_blank')
                        }
                      }}
                      title={planningData.adventure?.timeline_item_id ? 'Click to open adventure in focus mode' : ''}
                    >
                      {planningData.adventure?.timeline_item?.title || planningData.adventure?.title || 'Untitled Adventure'}
                    </p>
                  </div>
                )}

                {/* Priority Tasks */}
                {priorities.length > 0 && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <h5 className="font-medium text-orange-900 text-sm mb-2 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Priority Tasks ({priorities.length}/3)
                    </h5>
                    <div className="space-y-2">
                      {priorities.map((task, index) => {
                        // Prioritize timeline item title (the actual task title) over daily strategy title
                        const taskTitle = task.timeline_item?.title || task.title || 'Untitled Task'
                        const isCompleted = task.status === 'completed'
                        const timelineItemId = task.timeline_item_id

                        const handleTaskClick = () => {
                          if (timelineItemId) {
                            // Navigate to focus mode with the timeline item ID
                            window.open(`/focus/work-mode?taskId=${timelineItemId}&from=strategy`, '_blank')
                          }
                        }

                        return (
                          <div
                            key={task.id}
                            className={`group flex items-center gap-2 ${timelineItemId ? 'cursor-pointer hover:bg-orange-100 rounded px-1 py-0.5 transition-colors' : ''}`}
                            onClick={timelineItemId ? handleTaskClick : undefined}
                            title={timelineItemId ? `Click to open task in focus mode: ${taskTitle}` : taskTitle}
                          >
                            <span className="font-medium text-orange-800 text-xs bg-orange-200 rounded-full w-5 h-5 flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className={`text-xs flex-1 ${isCompleted ? 'line-through text-green-600' : 'text-orange-700'}`}>
                              {taskTitle}
                            </span>
                            <div className="flex items-center gap-1">
                              {timelineItemId && (
                                <ExternalLink className="h-3 w-3 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                              {isCompleted && (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty Priority Tasks Prompt */}
                {priorities.length === 0 && (hasIntention || hasAdventure) && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h5 className="font-medium text-gray-700 text-sm mb-1 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Priority Tasks (0/3)
                    </h5>
                    <p className="text-xs text-gray-500 italic">
                      Add priority tasks to complete your daily plan
                    </p>
                  </div>
                )}

                {/* Planning Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenPlanning}
                    className="flex-1"
                  >
                    <Sun className="h-4 w-4 mr-1" />
                    Edit Plan
                  </Button>
                  {isReflectionTime && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenReflection}
                      className="flex-1"
                    >
                      <Moon className="h-4 w-4 mr-1" />
                      Reflect
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Reflection Mode
          <div className="space-y-4">
            {/* Completion Rate */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-purple-900 text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Today&apos;s Completion Rate
                </h5>
                <Badge variant={completionRate >= 80 ? 'default' : 'secondary'}>
                  {completionRate}%
                </Badge>
              </div>
              <div className="w-full bg-white rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-purple-700 mt-1">
                {reflectionData.completedCount} of {reflectionData.totalCount} priorities completed
              </p>
            </div>

            {/* Reflections Summary */}
            <div>
              <h5 className="font-medium text-gray-900 text-sm mb-2 flex items-center gap-1">
                <Moon className="h-3 w-3" />
                Reflections ({reflectionData.reflections.length})
              </h5>
              {hasReflections ? (
                <div className="space-y-1">
                  {reflectionData.reflections.slice(0, 3).map((reflection) => (
                    <div key={reflection.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></span>
                      <span className="truncate">{reflection.title}</span>
                    </div>
                  ))}
                  {reflectionData.reflections.length > 3 && (
                    <p className="text-xs text-gray-500 italic">
                      +{reflectionData.reflections.length - 3} more reflections
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No reflections added yet</p>
              )}
            </div>

            {/* Reflection Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenReflection}
                className="flex-1"
              >
                <Moon className="h-4 w-4 mr-1" />
                {hasReflections ? 'Continue Reflection' : 'Start Reflection'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenPlanning}
                className="flex-1"
              >
                <Sun className="h-4 w-4 mr-1" />
                View Plan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}