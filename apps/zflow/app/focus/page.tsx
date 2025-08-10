'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { KanbanSquare, FileText, Target, Menu, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslation } from '../../contexts/LanguageContext'

const KanbanPage = dynamic(() => import('../kanban/page'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )
})
const WorkModePage = dynamic(() => import('./work-mode/page'), { 
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
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{t.nav.focusMode}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'kanban' ? 'work' : 'kanban')}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
            >
              {viewMode === 'kanban' ? (
                <>
                  <FileText className="w-4 h-4" />
                  {t.nav.workMode}
                </>
              ) : (
                <>
                  <KanbanSquare className="w-4 h-4" />
                  {t.nav.kanban}
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile View Mode Tabs */}
        <div className="mt-3">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <KanbanSquare className="w-4 h-4" />
              {t.nav.kanban}
            </button>
            <button
              onClick={() => setViewMode('work')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'work'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              {t.nav.workMode}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {viewMode === 'kanban' ? (
          <KanbanPage />
        ) : (
          <WorkModePage />
        )}
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
