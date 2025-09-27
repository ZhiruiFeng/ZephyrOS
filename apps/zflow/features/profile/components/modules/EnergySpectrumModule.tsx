'use client'

import React from 'react'
import Link from 'next/link'
import { BarChart3, Settings, X, Maximize2 } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'
import EnergySpectrum from '../ui/EnergySpectrum'
import { getUserTimezone, getTimezoneAbbr } from '@/shared/utils'
import type { ProfileModuleProps } from '@/profile'

export function EnergySpectrumModule({ config, onConfigChange, isFullscreen = false, onToggleFullscreen, fullScreenPath }: ProfileModuleProps) {
  const { t } = useTranslation()
  const [showSettings, setShowSettings] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    // Get current date in user's local timezone
    const now = new Date()
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return localDate.toISOString().slice(0, 10)
  })

  // Get max selectable date (today in user's timezone)
  const maxDate = React.useMemo(() => {
    const now = new Date()
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return localDate.toISOString().slice(0, 10)
  }, [])

  // Ensure selected date doesn't exceed max date (handles day transitions)
  React.useEffect(() => {
    if (selectedDate > maxDate) {
      setSelectedDate(maxDate)
    }
  }, [selectedDate, maxDate])

  const handleConfigChange = (key: string, value: any) => {
    onConfigChange({
      ...config,
      config: {
        ...config.config,
        [key]: value
      }
    })
  }

  return (
    <div className={`bg-white ${isFullscreen ? 'p-8' : 'p-6'} rounded-lg shadow-sm border border-gray-200 ${isFullscreen ? 'h-full' : ''}`}>
      {/* Module Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {t.ui.energySpectrumTitle}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {fullScreenPath && (
            <Link
              href={fullScreenPath}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="查看完整页面"
              aria-label="查看完整页面"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
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
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
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
                {t.ui.defaultDate}
              </label>
              <select
                value={config.config.defaultDate || 'today'}
                onChange={(e) => handleConfigChange('defaultDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="today">{t.ui.today}</option>
                <option value="yesterday">{t.ui.yesterday}</option>
                <option value="week">{t.ui.thisWeek}</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.config.showTimezone || true}
                  onChange={(e) => handleConfigChange('showTimezone', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t.ui.showTimezone}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Date Selector */}
      <div className="mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={selectedDate}
              max={maxDate}
              onChange={(e) => {
                const newDate = e.target.value
                if (newDate <= maxDate) {
                  setSelectedDate(newDate)
                }
              }}
            />
          </div>
          {config.config.showTimezone !== false && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600">
              <span>🌍</span>
              <span className="font-medium">{getTimezoneAbbr()}</span>
              <span className="text-gray-400 hidden sm:inline">({getUserTimezone()})</span>
            </div>
          )}
        </div>
      </div>

      {/* Energy Spectrum Component */}
      <EnergySpectrum 
        date={selectedDate} 
        onSaved={() => { /* no-op */ }} 
      />
    </div>
  )
}
