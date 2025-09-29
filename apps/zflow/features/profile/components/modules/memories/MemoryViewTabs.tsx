'use client'

import React from 'react'
import { Calendar, Search, TrendingUp, Anchor, Target, Brain } from 'lucide-react'
import { MemoryViewMode } from './types'

interface MemoryViewTabsProps {
  selectedView: MemoryViewMode
  setSelectedView: (view: MemoryViewMode) => void
  showCollectionsView: boolean
}

export default function MemoryViewTabs({
  selectedView,
  setSelectedView,
  showCollectionsView
}: MemoryViewTabsProps) {
  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'anchored', label: 'Anchored', icon: Anchor },
    { id: 'strategy', label: 'Strategy', icon: Target },
    { id: 'episodes', label: 'Episodes', icon: Brain },
    { id: 'search', label: 'Search', icon: Search },
    ...(showCollectionsView ? [{ id: 'collections', label: 'Collections', icon: TrendingUp }] : [])
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setSelectedView(id as MemoryViewMode)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === id
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  )
}