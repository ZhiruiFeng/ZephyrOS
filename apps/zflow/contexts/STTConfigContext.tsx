'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import type { STTProvider, STTConfig } from '@/types/stt-config'

// Default configuration with ElevenLabs as default
const DEFAULT_STT_CONFIG: STTConfig = {
  provider: 'elevenlabs',
  autoSave: true,
  showProviderInUI: false,
  useRefinedTranscription: false,
  autoSyncThreshold: 30 // Default: 30 seconds
}

interface STTConfigContextType {
  config: STTConfig
  isLoading: boolean
  error: string | null
  updateConfig: (newConfig: Partial<STTConfig>) => Promise<void>
  refreshConfig: () => Promise<void>
}

const STTConfigContext = createContext<STTConfigContextType | undefined>(undefined)

export function STTConfigProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [config, setConfig] = useState<STTConfig>(DEFAULT_STT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshConfig = useCallback(async () => {
    if (!user) {
      setConfig(DEFAULT_STT_CONFIG)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Load configuration from localStorage (could be replaced with API call)
      const saved = localStorage.getItem(`stt-config-${user.id}`)
      if (saved) {
        const parsedConfig = JSON.parse(saved)
        setConfig({ ...DEFAULT_STT_CONFIG, ...parsedConfig })
      } else {
        setConfig(DEFAULT_STT_CONFIG)
      }
    } catch (err) {
      console.error('Failed to load STT configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
      setConfig(DEFAULT_STT_CONFIG)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const updateConfig = useCallback(async (newConfig: Partial<STTConfig>) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const updatedConfig = { ...config, ...newConfig }
      
      // Save to localStorage (could be replaced with API call)
      localStorage.setItem(`stt-config-${user.id}`, JSON.stringify(updatedConfig))
      setConfig(updatedConfig)
      setError(null)
    } catch (err) {
      console.error('Failed to update STT configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
      throw err
    }
  }, [user, config])

  // Load configuration when user changes
  useEffect(() => {
    refreshConfig()
  }, [refreshConfig])

  const value: STTConfigContextType = {
    config,
    isLoading,
    error,
    updateConfig,
    refreshConfig
  }

  return (
    <STTConfigContext.Provider value={value}>
      {children}
    </STTConfigContext.Provider>
  )
}

export function useSTTConfig() {
  const context = useContext(STTConfigContext)
  if (context === undefined) {
    throw new Error('useSTTConfig must be used within a STTConfigProvider')
  }
  return context
}