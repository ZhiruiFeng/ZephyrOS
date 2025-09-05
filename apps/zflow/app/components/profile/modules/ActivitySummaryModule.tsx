'use client'

import React from 'react'
import { Activity, Settings, X, Clock, CheckCircle, Circle, MoreHorizontal } from 'lucide-react'
import { useTranslation } from '../../../../contexts/LanguageContext'
import type { ProfileModuleProps } from '../types'

export function ActivitySummaryModule({ config, onConfigChange }: ProfileModuleProps) {
  const { t } = useTranslation()
  const [showSettings, setShowSettings] = React.useState(false)

  // Mock data - in a real app, this would come from your API
  const recentActivities = [
    {
      id: 1,
      title: 'Complete project proposal',
      category: 'Work',
      status: 'completed',
      timeSpent: '2h 30m',
      completedAt: '2024-01-15T14:30:00Z',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Review team feedback',
      category: 'Work',
      status: 'in-progress',
      timeSpent: '45m',
      startedAt: '2024-01-15T15:00:00Z',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Update documentation',
      category: 'Work',
      status: 'pending',
      priority: 'low'
    },
    {
      id: 4,
      title: 'Morning workout',
      category: 'Health',
      status: 'completed',
      timeSpent: '1h 15m',
      completedAt: '2024-01-15T08:00:00Z',
      priority: 'medium'
    },
    {
      id: 5,
      title: 'Read industry news',
      category: 'Learning',
      status: 'completed',
      timeSpent: '30m',
      completedAt: '2024-01-15T12:00:00Z',
      priority: 'low'
    }
  ]

  const handleConfigChange = (key: string, value: any) => {
    onConfigChange({
      ...config,
      config: {
        ...config.config,
        [key]: value
      }
    })
  }

  const maxItems = config.config.maxItems || 10
  const showRecentTasks = config.config.showRecentTasks !== false
  const filteredActivities = recentActivities.slice(0, maxItems)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Work':
        return 'bg-blue-100 text-blue-800'
      case 'Health':
        return 'bg-green-100 text-green-800'
      case 'Learning':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {t.profile.activitySummary}
          </h2>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={t.common.settings}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">{t.common.settings}</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showRecentTasks}
                  onChange={(e) => handleConfigChange('showRecentTasks', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t.profile.showRecentTasks}</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.profile.maxItems}
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxItems}
                onChange={(e) => handleConfigChange('maxItems', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      {showRecentTasks && (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {getStatusIcon(activity.status)}
              </div>

              {/* Activity Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(activity.priority)}`}>
                    {activity.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}>
                    {activity.category}
                  </span>
                  {activity.timeSpent && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.timeSpent}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600">
              {recentActivities.filter(a => a.status === 'completed').length}
            </div>
            <div className="text-xs text-gray-500">{t.profile.completed}</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {recentActivities.filter(a => a.status === 'in-progress').length}
            </div>
            <div className="text-xs text-gray-500">{t.profile.inProgress}</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-600">
              {recentActivities.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-500">{t.profile.pending}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
