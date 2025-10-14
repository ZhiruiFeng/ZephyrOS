'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSTTConfig } from '@/contexts/STTConfigContext'
import type { ProfileModuleProps } from '@/profile'
import type { STTProvider, STTConfig } from '@/types/stt-config'
import { SaveStatus } from './SaveStatus'
import { ProviderSelection } from './ProviderSelection'
import { AdditionalSettings } from './AdditionalSettings'
import { CurrentConfiguration } from './CurrentConfiguration'

export function SettingsTab({ config, onConfigChange }: Pick<ProfileModuleProps, 'config' | 'onConfigChange'>) {
  const { user } = useAuth()
  const { config: contextConfig, updateConfig: updateContextConfig } = useSTTConfig()
  const [sttConfig, setSTTConfig] = useState<STTConfig>(contextConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Sync local state with context
  useEffect(() => {
    setSTTConfig(contextConfig)
  }, [contextConfig])

  // Save configuration using context
  const saveConfig = async (newConfig: STTConfig) => {
    if (!user) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      await updateContextConfig(newConfig)
      onConfigChange({
        ...config,
        config: { ...config.config, ...newConfig }
      })
      setSTTConfig(newConfig)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save STT configuration:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleProviderChange = (provider: STTProvider) => {
    const newConfig = { ...sttConfig, provider }
    if (sttConfig.autoSave) {
      saveConfig(newConfig)
    } else {
      setSTTConfig(newConfig)
    }
  }

  const handleSettingChange = (key: keyof STTConfig, value: any) => {
    const newConfig = { ...sttConfig, [key]: value }
    if (sttConfig.autoSave) {
      saveConfig(newConfig)
    } else {
      setSTTConfig(newConfig)
    }
  }

  const handleManualSave = () => {
    saveConfig(sttConfig)
  }

  return (
    <div className="space-y-6">
      <SaveStatus status={saveStatus} />
      <ProviderSelection
        selectedProvider={sttConfig.provider}
        onProviderChange={handleProviderChange}
      />
      <AdditionalSettings
        config={sttConfig}
        onSettingChange={handleSettingChange}
        onManualSave={handleManualSave}
        isSaving={isSaving}
      />
      <CurrentConfiguration config={sttConfig} />
    </div>
  )
}
