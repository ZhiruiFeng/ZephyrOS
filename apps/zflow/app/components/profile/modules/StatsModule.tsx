'use client'

import React from 'react'
import Link from 'next/link'
import { TrendingUp, Settings, X, Calendar, Clock, Target, CheckCircle, Maximize2 } from 'lucide-react'
import { useTranslation } from '../../../../contexts/LanguageContext'
import type { ProfileModuleProps } from '../types'

export function StatsModule({ config, onConfigChange, fullScreenPath }: ProfileModuleProps) {
  const { t } = useTranslation()
  const [showSettings, setShowSettings] = React.useState(false)

  // Mock data - in a real app, this would come from your API
  const statsData = {
    tasksCompleted: 12,
    tasksTotal: 18,
    timeSpent: '4h 32m',
    productivityScore: 85,
    streak: 7,
    weeklyGoal: 20
  }

  const handleConfigChange = (key: string, value: any) => {
    onConfigChange({
      ...config,
      config: {
        ...config.config,
        [key]: value
      }
    })
  }

  const completionRate = Math.round((statsData.tasksCompleted / statsData.tasksTotal) * 100)
  const goalProgress = Math.round((statsData.tasksCompleted / statsData.weeklyGoal) * 100)

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {t.profile.productivityStats}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {fullScreenPath && (
            <Link
              href={fullScreenPath}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={t.profile.viewFullModule}
              aria-label={t.profile.viewFullModule}
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t.common.settings}
            aria-label={t.common.settings}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.profile.timeRange}
              </label>
              <select
                value={config.config.timeRange || 'week'}
                onChange={(e) => handleConfigChange('timeRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="day">{t.ui.today}</option>
                <option value="week">{t.ui.thisWeek}</option>
                <option value="month">{t.ui.thisMonth}</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.config.showTrends || true}
                  onChange={(e) => handleConfigChange('showTrends', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t.profile.showTrends}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Completed */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {statsData.tasksCompleted}
              </div>
              <div className="text-sm text-blue-700">
                {t.profile.tasksCompleted}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            {completionRate}% {t.profile.completionRate}
          </div>
        </div>

        {/* Time Spent */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">
                {statsData.timeSpent}
              </div>
              <div className="text-sm text-green-700">
                {t.profile.timeSpent}
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Score */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {statsData.productivityScore}%
              </div>
              <div className="text-sm text-purple-700">
                {t.profile.productivityScore}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-900">
                {goalProgress}%
              </div>
              <div className="text-sm text-orange-700">
                {t.profile.weeklyGoal}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-orange-600">
            {statsData.tasksCompleted}/{statsData.weeklyGoal} {t.profile.tasks}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t.profile.weeklyProgress}
          </span>
          <span className="text-sm text-gray-500">
            {statsData.tasksCompleted}/{statsData.weeklyGoal}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(goalProgress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
