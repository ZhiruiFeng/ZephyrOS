'use client'

import { Suspense } from 'react'
import MemoryFocusView from './MemoryFocusView'

export default function MemoryFocusPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <MemoryFocusView />
    </Suspense>
  )
}

