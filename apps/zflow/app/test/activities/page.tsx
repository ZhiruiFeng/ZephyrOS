'use client'

import React, { Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { useActivities } from '@/hooks/useActivities'
import { useCategories } from '@/hooks/useCategories'
import { useTimer } from '@/hooks/useTimer'
import { ActivitiesView } from '../../components/views'

function ActivitiesTestContent() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const { activities, isLoading: activitiesLoading } = useActivities(user ? undefined : undefined)
  const { categories } = useCategories()
  const timer = useTimer()

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return <div className="flex items-center justify-center min-h-screen">请先登录</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Activities (Test Page)</h1>
        <ActivitiesView
          activities={activities}
          activitiesLoading={activitiesLoading}
          categories={categories}
          timer={timer}
          displayMode={'grid'}
          t={t}
          onActivityClick={() => {}}
          onToggleActivityComplete={() => {}}
          onEditActivity={() => {}}
          onDeleteActivity={() => {}}
          onShowActivityTime={() => {}}
        />
      </div>
    </div>
  )
}

export default function ActivitiesTestPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ActivitiesTestContent />
    </Suspense>
  )
}


