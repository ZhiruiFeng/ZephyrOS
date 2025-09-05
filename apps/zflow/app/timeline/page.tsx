'use client'

// Disable prerender/SSG for this page to avoid build-time errors
export const dynamic = 'force-dynamic'

import React, { Suspense } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import TimelineView from '../components/views/TimelineView'
import { useRouter, useSearchParams } from 'next/navigation'
import { TimelineItem } from '@/hooks/useTimeline'
import DateSelector from '../components/ui/DateSelector'
import TimelineStats, { TimelineDetailedStats } from '../components/ui/TimelineStats'
import { useTimeline } from '@/hooks/useTimeline'
import { Clock, Calendar, BarChart3, Settings } from 'lucide-react'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function TimelineContent() {
  const { user } = useAuth()
  const { t, currentLang } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  const [viewMode, setViewMode] = React.useState<'timeline' | 'stats'>('timeline')
  
  const { timelineData, isLoading, error, refetch } = useTimeline(selectedDate)
  
  // Read date from URL if provided (YYYY-MM-DD)
  React.useEffect(() => {
    const dateParam = params.get('date')
    if (dateParam) {
      const d = new Date(`${dateParam}T00:00:00`)
      if (!isNaN(d.getTime())) setSelectedDate(d)
    }
  }, [params])

  const handleItemClick = (item: TimelineItem) => {
    try {
      const dateKey = selectedDate.toISOString().slice(0,10)
      const returnTo = encodeURIComponent(`/timeline?date=${dateKey}`)
      if (item.type === 'task') {
        router.push(`/focus?view=work&taskId=${encodeURIComponent(item.id)}&from=timeline&returnTo=${returnTo}`)
        return
      }
      if (item.type === 'activity') {
        router.push(`/focus/activity?activityId=${encodeURIComponent(item.id)}&from=timeline&returnTo=${returnTo}`)
        return
      }
      if (item.type === 'memory') {
        router.push(`/focus/memory?memoryId=${encodeURIComponent(item.id)}&from=timeline&returnTo=${returnTo}`)
        return
      }
      if (item.type === 'time_entry') {
        const timelineItemType = item.metadata?.timelineItemType
        const relatedId = (item.metadata as any)?.timelineItemId || (item.metadata as any)?.taskId
        if (timelineItemType === 'task' && relatedId) {
          router.push(`/focus?view=work&taskId=${encodeURIComponent(relatedId)}&from=timeline&returnTo=${returnTo}`)
          return
        }
        if (timelineItemType === 'activity' && relatedId) {
          router.push(`/focus/activity?activityId=${encodeURIComponent(relatedId)}&from=timeline&returnTo=${returnTo}`)
          return
        }
      }
    } catch (e) {
      console.error('Failed to navigate from timeline item:', e)
    }
  }

  const handleEditItem = (item: TimelineItem) => {
    // TODO: Implement item editing
    console.log('Edit timeline item:', item)
  }

  const handleDeleteItem = (item: TimelineItem) => {
    // TODO: Implement item deletion
    console.log('Delete timeline item:', item)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">{t.ui?.loginRequired ?? 'Please sign in'}</h2>
          <p className="text-gray-600">{t.ui?.loginToViewTimeline ?? 'Sign in to view your timeline records'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary-600" />
              <h1 className="text-xl font-semibold text-gray-900">{t.ui.timelineView}</h1>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {t.ui.timelineView}
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'stats'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                {t.ui.statistics ?? 'Statistics'}
              </button>
            </div>
          </div>

          {/* Date Selector */}
          <div className="mt-4">
            <DateSelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{t.messages.failedToLoadSubtasks}: {String(error)}</div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {t.messages.retry}
            </button>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="mb-6">
              <TimelineStats timelineData={timelineData} t={t} />
            </div>

            {/* Content based on view mode */}
            {viewMode === 'timeline' ? (
              <TimelineView
                selectedDate={selectedDate}
                timelineItems={timelineData.items}
                loading={isLoading}
                onItemClick={handleItemClick}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                refetchTimeline={refetch}
                t={t}
                lang={currentLang}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">{t.ui.statistics ?? 'Statistics'}</h2>
                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    {t.common?.refresh ?? 'Refresh'}
                  </button>
                </div>
                <TimelineDetailedStats timelineData={timelineData} t={t} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Loading fallback component
function TimelineLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="sticky top-14 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary-600" />
            <h1 className="text-xl font-semibold text-gray-900">Timeline</h1>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading timeline...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelineLoading />}>
      <TimelineContent />
    </Suspense>
  )
}
