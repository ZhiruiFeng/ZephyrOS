'use client'

import React from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateSelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
}

export default function DateSelector({
  selectedDate,
  onDateChange,
  className = ''
}: DateSelectorProps) {
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() - 1)
    onDateChange(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + 1)
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '明天'
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      })
    }
  }

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Previous Day Button */}
      <button
        onClick={goToPreviousDay}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="前一天"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Date Display */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          <span className="text-lg font-semibold text-gray-900">
            {formatDate(selectedDate)}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {formatFullDate(selectedDate)}
        </span>
      </div>

      {/* Next Day Button */}
      <button
        onClick={goToNextDay}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="后一天"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Today Button */}
      <button
        onClick={goToToday}
        className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
        title="回到今天"
      >
        <Calendar className="w-4 h-4 inline mr-1" />
        今天
      </button>
    </div>
  )
}
