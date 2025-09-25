'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { CardDescription } from '../ui'

interface ViewToggleProps {
  activeView: 'planning' | 'reflection'
  onViewChange: (view: 'planning' | 'reflection') => void
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-medium text-slate-600">
        <span>Craft your day • Reflect your story</span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900">Design &amp; Honour Your Day</h3>
      <CardDescription className="text-slate-600">
        Toggle between planning what matters and reflecting on how it unfolded.
      </CardDescription>
      <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
        {(['planning', 'reflection'] as const).map(view => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              activeView === view
                ? view === 'planning'
                  ? 'bg-white text-blue-600 shadow'
                  : 'bg-white text-purple-600 shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {view === 'planning' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {view === 'planning' ? 'Planning' : 'Reflection'}
          </button>
        ))}
      </div>
    </div>
  )
}