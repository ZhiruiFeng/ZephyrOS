'use client'

import React from 'react'
import { Calendar, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import { Button } from '../ui'
import { formatDisplayDate } from './dateUtils'

interface DateNavigationProps {
  selectedDate: string
  onDateChange: (date: string) => void
  activeView: 'planning' | 'reflection'
  timezone: string
}

export function DateNavigation({ selectedDate, onDateChange, activeView, timezone }: DateNavigationProps) {
  const goToPreviousDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    onDateChange(date.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    onDateChange(date.toISOString().split('T')[0])
  }

  const goToToday = () => {
    onDateChange(new Date().toISOString().split('T')[0])
  }


  return (
    <div className={`rounded-2xl border border-slate-200 ${activeView === 'planning' ? 'bg-gradient-to-r from-white via-slate-50 to-sky-50/80' : 'bg-gradient-to-r from-white via-slate-50 to-purple-50/80'} p-6 shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 shadow-sm">
            <Calendar className="h-5 w-5 text-slate-500" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {formatDisplayDate(selectedDate)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeView === 'planning'
                ? 'Align your intention, adventure, and priorities for this date.'
                : 'Capture insights and celebrate progress for the same day.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={goToPreviousDay}
            className="rounded-full border-slate-300 bg-white/80 px-3 text-slate-600 hover:border-slate-400 hover:text-slate-900"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <Button
            variant="outline"
            onClick={goToNextDay}
            className="rounded-full border-slate-300 bg-white/80 px-3 text-slate-600 hover:border-slate-400 hover:text-slate-900"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span className="flex items-center gap-2">
          {activeView === 'planning' ? <Sun className="h-4 w-4 text-blue-500" /> : <Moon className="h-4 w-4 text-purple-500" />}
          <span>Local timezone: {timezone}</span>
        </span>
        {selectedDate !== new Date().toISOString().split('T')[0] && (
          <Button
            variant="outline"
            onClick={goToToday}
            className={`rounded-full border-slate-300 bg-white/80 px-4 py-1 text-slate-600 hover:text-${activeView === 'planning' ? 'blue' : 'purple'}-600`}
          >
            Jump to today
          </Button>
        )}
      </div>
    </div>
  )
}