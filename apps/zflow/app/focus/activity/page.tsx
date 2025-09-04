'use client'

import { Suspense } from 'react'
import ActivityFocusView from './ActivityFocusView'

export default function ActivityFocusPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ActivityFocusView />
    </Suspense>
  )
}
