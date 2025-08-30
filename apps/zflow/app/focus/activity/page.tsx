'use client'

import { Suspense } from 'react'
import ActivityFocusView from './ActivityFocusView'

export default function ActivityFocusPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <ActivityFocusView />
    </Suspense>
  )
}
