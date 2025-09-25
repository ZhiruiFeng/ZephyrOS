'use client'

import React from 'react'
import { Target, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui'
import type { DailyStrategyItemWithDetails } from '../../../../lib/api/daily-strategy-api'

interface ReflectionData {
  completionRate: number
  completedCount: number
  totalCount: number
  priorities: DailyStrategyItemWithDetails[]
}

interface PriorityTasksPerformanceProps {
  reflectionData: ReflectionData
}

export function PriorityTasksPerformance({ reflectionData }: PriorityTasksPerformanceProps) {
  return (
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
  )
}