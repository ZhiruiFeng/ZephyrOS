'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslation } from '@/contexts/LanguageContext'
import type { FocusViewMode } from './types/focus'

// Lazy load the heavy components
const KanbanView = dynamic(() => import('@/kanban').then(mod => mod.KanbanPage), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )
})

// For now, keep the WorkModeView in the app folder until we complete migration
const WorkModeView = dynamic(() => import('@/app/focus/work-mode/WorkModeView'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )
})

function FocusPageContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<FocusViewMode>('kanban')
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check URL parameter for initial view mode
  useEffect(() => {
    if (!isClient) return
    
    const view = searchParams.get('view')
    if (view === 'work') {
      setViewMode('work')
    } else if (view === 'kanban') {
      setViewMode('kanban')
    }
  }, [searchParams, isClient])

  // Don't render anything until we're on the client side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {viewMode === 'kanban' ? <KanbanView /> : <WorkModeView />}
      </div>
    </div>
  )
}

export default function FocusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    }>
      <FocusPageContent />
    </Suspense>
  )
}