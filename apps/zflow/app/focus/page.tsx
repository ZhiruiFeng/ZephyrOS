'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslation } from '../../contexts/LanguageContext'

const KanbanPage = dynamic(() => import('../kanban/KanbanView'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )
})
const WorkModePage = dynamic(() => import('./work-mode/WorkModeView'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )
})

type ViewMode = 'kanban' | 'work'

function FocusPageContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
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
        {viewMode === 'kanban' ? <KanbanPage /> : <WorkModePage />}
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
