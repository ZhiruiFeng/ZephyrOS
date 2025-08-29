'use client'

import React from 'react'
import useSWR from 'swr'
import { 
  User, 
  BarChart3
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import EnergySpectrum from '../components/EnergySpectrum'
import { getUserTimezone, getTimezoneAbbr } from '../utils/timeUtils'


export default function ProfilePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  
  // Get current date in user's local timezone
  const getCurrentLocalDate = React.useCallback(() => {
    const now = new Date()
    // Create a new date in local timezone (not UTC)
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return localDate.toISOString().slice(0, 10)
  }, [])
  
  const [selectedDate, setSelectedDate] = React.useState<string>(getCurrentLocalDate())
  
  // Get max selectable date (today in user's timezone)
  const maxDate = React.useMemo(() => getCurrentLocalDate(), [getCurrentLocalDate])
  
  // Ensure selected date doesn't exceed max date (handles day transitions)
  React.useEffect(() => {
    if (selectedDate > maxDate) {
      setSelectedDate(maxDate)
    }
  }, [selectedDate, maxDate])
  
  // Extract display name from user data
  const displayName = React.useMemo(() => {
    if (!user) return t.profile.yourProfile
    
    // Try to get name from user metadata first
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name
    if (fullName) return fullName
    
    // Fall back to extracting username from email
    if (user.email) {
      const username = user.email.split('@')[0]
      return username.charAt(0).toUpperCase() + username.slice(1)
    }
    
    return t.profile.yourProfile
  }, [user])
  


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-full">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {displayName}
            </h1>
            <p className="text-gray-600">{t.profile.personalProductivityInsights}</p>
          </div>
        </div>
      </div>

      {/* Energy Spectrum */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          {t.ui.energySpectrumTitle}
        </h2>
        <div className="mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={selectedDate}
                max={maxDate}
                onChange={(e) => {
                  const newDate = e.target.value
                  // Ensure the selected date doesn't exceed today in local timezone
                  if (newDate <= maxDate) {
                    setSelectedDate(newDate)
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600">
              <span>🌍</span>
              <span className="font-medium">{getTimezoneAbbr()}</span>
              <span className="text-gray-400 hidden sm:inline">({getUserTimezone()})</span>
            </div>
          </div>
        </div>
        <EnergySpectrum date={selectedDate} onSaved={() => { /* no-op */ }} />
      </div>

    </div>
  )
}

