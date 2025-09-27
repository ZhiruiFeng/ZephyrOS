'use client'

import React from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

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
  const { t, currentLang } = useTranslation()
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
      return t.common?.today || 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t.common?.yesterday || 'Yesterday'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      })
    }
  }

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
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
        title={t.common?.previous || 'Previous'}
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
        title={t.common?.next || 'Next'}
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Today Button */}
      <button
        onClick={goToToday}
        className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
        title={t.common?.today || 'Today'}
      >
        <Calendar className="w-4 h-4 inline mr-1" />
        {t.common?.today || 'Today'}
      </button>
    </div>
  )
}
