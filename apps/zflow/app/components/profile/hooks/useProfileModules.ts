'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import type { ProfileModule, ProfileModuleConfig, ProfileModulesState } from '../types'

// Available modules configuration
const AVAILABLE_MODULES: ProfileModule[] = [
  {
    id: 'energy-spectrum',
    name: 'Energy Spectrum',
    description: 'Track your energy levels throughout the day',
    icon: 'BarChart3',
    category: 'analytics',
    defaultEnabled: true,
    defaultConfig: {
      showTimezone: true,
      defaultDate: 'today'
    }
  },
  {
    id: 'stats',
    name: 'Productivity Stats',
    description: 'Overview of your productivity metrics',
    icon: 'TrendingUp',
    category: 'analytics',
    defaultEnabled: false,
    defaultConfig: {
      timeRange: 'week',
      showTrends: true
    }
  },
  {
    id: 'activity-summary',
    name: 'Activity Summary',
    description: 'Recent activities and task completion',
    icon: 'Activity',
    category: 'productivity',
    defaultEnabled: false,
    defaultConfig: {
      showRecentTasks: true,
      maxItems: 10
    }
  }
]

// Default enabled modules for new users
const DEFAULT_ENABLED_MODULES: ProfileModuleConfig[] = [
  {
    id: 'energy-spectrum',
    enabled: true,
    order: 0,
    config: {
      showTimezone: true,
      defaultDate: 'today'
    }
  }
]

export function useProfileModules() {
  const { user } = useAuth()
  const [state, setState] = useState<ProfileModulesState>({
    enabledModules: [],
    availableModules: AVAILABLE_MODULES,
    isLoading: true,
    error: null
  })

  // Load user's module preferences
  const loadUserPreferences = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      // In a real app, this would fetch from your backend/database
      // For now, we'll use localStorage as a fallback
      const savedPreferences = localStorage.getItem(`profile-modules-${user.id}`)
      
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences)
        setState(prev => ({
          ...prev,
          enabledModules: parsed.enabledModules || DEFAULT_ENABLED_MODULES,
          isLoading: false
        }))
      } else {
        // First time user - use defaults
        setState(prev => ({
          ...prev,
          enabledModules: DEFAULT_ENABLED_MODULES,
          isLoading: false
        }))
      }
    } catch (error) {
      console.error('Failed to load profile module preferences:', error)
      setState(prev => ({
        ...prev,
        enabledModules: DEFAULT_ENABLED_MODULES,
        isLoading: false,
        error: 'Failed to load preferences'
      }))
    }
  }, [user])

  // Save user's module preferences
  const saveUserPreferences = useCallback(async (enabledModules: ProfileModuleConfig[]) => {
    if (!user) return

    try {
      // In a real app, this would save to your backend/database
      // For now, we'll use localStorage as a fallback
      const preferences = {
        enabledModules,
        lastUpdated: new Date().toISOString()
      }
      
      localStorage.setItem(`profile-modules-${user.id}`, JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save profile module preferences:', error)
    }
  }, [user])

  // Toggle a module on/off
  const toggleModule = useCallback((moduleId: string) => {
    setState(prev => {
      const isCurrentlyEnabled = prev.enabledModules.some(m => m.id === moduleId)
      let newEnabledModules: ProfileModuleConfig[]

      if (isCurrentlyEnabled) {
        // Remove module
        newEnabledModules = prev.enabledModules.filter(m => m.id !== moduleId)
      } else {
        // Add module
        const moduleInfo = prev.availableModules.find(m => m.id === moduleId)
        if (!moduleInfo) return prev

        const newModule: ProfileModuleConfig = {
          id: moduleId,
          enabled: true,
          order: prev.enabledModules.length,
          config: { ...moduleInfo.defaultConfig }
        }

        newEnabledModules = [...prev.enabledModules, newModule]
      }

      // Save preferences
      saveUserPreferences(newEnabledModules)

      return {
        ...prev,
        enabledModules: newEnabledModules
      }
    })
  }, [saveUserPreferences])

  // Reorder modules
  const reorderModules = useCallback((newOrder: ProfileModuleConfig[]) => {
    setState(prev => ({
      ...prev,
      enabledModules: newOrder
    }))

    // Save preferences
    saveUserPreferences(newOrder)
  }, [saveUserPreferences])

  // Load preferences on mount and when user changes
  useEffect(() => {
    loadUserPreferences()
  }, [loadUserPreferences])

  return {
    enabledModules: state.enabledModules,
    availableModules: state.availableModules,
    isLoading: state.isLoading,
    error: state.error,
    toggleModule,
    reorderModules
  }
}
