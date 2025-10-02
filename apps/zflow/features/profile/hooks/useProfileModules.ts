'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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
    },
    fullScreenPath: '/profile/modules/energy-spectrum'
  },
  {
    id: 'ai-task-grantor',
    name: 'AI Task Grantor',
    description: 'Assign your tasks to AI agents with guardrails',
    icon: 'Bot',
    category: 'tools',
    defaultEnabled: false,
    defaultConfig: {
      defaultView: 'list'
    },
    fullScreenPath: '/profile/modules/ai-task-grantor'
  },
  {
    id: 'agent-directory',
    name: 'External AI Panel',
    description: 'Catalog and manage your external AI agents',
    icon: 'Bot',
    category: 'tools',
    defaultEnabled: false,
    defaultConfig: {
      showOrbitView: false,
      defaultView: 'simple'
    },
    fullScreenPath: '/profile/modules/agent-directory'
  },
  {
    id: 'memories',
    name: 'Memories',
    description: 'Personal memory capture and timeline',
    icon: 'BookOpen',
    category: 'productivity',
    defaultEnabled: true,
    defaultConfig: {
      defaultView: 'timeline',
      maxDisplayItems: 5,
      showQuickActions: true,
      showCollectionsView: true
    },
    fullScreenPath: '/profile/modules/memories'
  },
  {
    id: 'api-keys',
    name: 'External API Keys',
    description: 'Manage your AI service API keys (OpenAI, Anthropic, etc.)',
    icon: 'Key',
    category: 'tools',
    defaultEnabled: false,
    defaultConfig: {
      showInactiveKeys: false,
      groupByVendor: true
    },
    fullScreenPath: '/profile/modules/api-keys'
  },
  {
    id: 'zmemory-api-keys',
    name: 'ZMemory API Keys',
    description: 'Generate API keys for MCP and integrations',
    icon: 'Shield',
    category: 'tools',
    defaultEnabled: false,
    defaultConfig: {
      showExpiredKeys: false,
      defaultScopes: ['tasks.read', 'tasks.write', 'memories.read', 'memories.write']
    },
    fullScreenPath: '/profile/modules/zmemory-api-keys'
  },
  {
    id: 'stt-config',
    name: 'Voice Input Settings',
    description: 'Configure speech-to-text preferences',
    icon: 'Mic',
    category: 'tools',
    defaultEnabled: true,
    defaultConfig: {
      provider: 'elevenlabs',
      autoSave: true,
      showProviderInUI: false
    },
    fullScreenPath: '/profile/modules/stt-config'
  },
  {
    id: 'zrelations',
    name: 'Z-Relations',
    description: 'Manage relationships and social connections',
    icon: 'Users',
    category: 'productivity',
    defaultEnabled: false,
    defaultConfig: {
      showCheckinQueue: true,
      showHealthScores: true,
      maxQueueItems: 5,
      enableNotifications: true
    },
    fullScreenPath: '/profile/modules/zrelations'
  },
  {
    id: 'executor-monitor',
    name: 'Executor Monitor',
    description: 'Monitor executor devices, workspaces, and AI task execution',
    icon: 'Server',
    category: 'tools',
    defaultEnabled: false,
    defaultConfig: {
      autoRefresh: true,
      showMetrics: true,
      showEvents: true
    },
    fullScreenPath: '/profile/modules/executor-monitor'
  },
  {
    id: 'core-principles',
    name: 'Core Principles',
    description: 'Ray Dalio\'s principles and your personal decision-making framework',
    icon: 'BookMarked',
    category: 'insights',
    defaultEnabled: false,
    defaultConfig: {
      maxDisplayItems: 10,
      showQuickActions: true,
      defaultCategory: 'all',
      showDefaultPrinciples: true
    },
    fullScreenPath: '/profile/modules/core-principles'
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
  },
  {
    id: 'memories',
    enabled: true,
    order: 1,
    config: {
      defaultView: 'timeline',
      maxDisplayItems: 5,
      showQuickActions: true,
      showCollectionsView: true
    }
  },
  {
    id: 'stt-config',
    enabled: true,
    order: 2,
    config: {
      provider: 'elevenlabs',
      autoSave: true,
      showProviderInUI: false
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

  console.log('[useProfileModules] Total available modules:', AVAILABLE_MODULES.length)
  console.log('[useProfileModules] Module IDs:', AVAILABLE_MODULES.map(m => m.id))

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