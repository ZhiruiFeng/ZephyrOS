'use client'

import React, { useState, useEffect } from 'react'
import { Mic, CheckCircle, AlertCircle, Settings2, Zap, Shield } from 'lucide-react'
import { useAuth } from '../../../../contexts/AuthContext'
import type { ProfileModuleProps } from '../types'

// STT Provider types
export type STTProvider = 'elevenlabs' | 'openai'

export interface STTConfig {
  provider: STTProvider
  autoSave: boolean
  showProviderInUI: boolean
}

// STT Provider definitions
const STT_PROVIDERS = {
  elevenlabs: {
    id: 'elevenlabs' as const,
    name: 'ElevenLabs Scribe',
    description: 'High-accuracy transcription with 99 languages support',
    icon: Shield,
    color: 'purple',
    features: [
      '99+ languages',
      '>98% accuracy',
      'Speaker diarization',
      'Audio event detection',
      'Character-level timestamps'
    ],
    limitations: [
      'Optimized for accuracy over speed',
      'Better for longer recordings'
    ]
  },
  openai: {
    id: 'openai' as const,
    name: 'OpenAI Whisper',
    description: 'Fast, real-time transcription for voice input',
    icon: Zap,
    color: 'green',
    features: [
      '99+ languages',
      'Real-time optimized',
      'Fast processing',
      'Interactive voice input'
    ],
    limitations: [
      'Slightly lower accuracy',
      'Less detailed timestamps'
    ]
  }
} as const

// Default configuration
const DEFAULT_STT_CONFIG: STTConfig = {
  provider: 'elevenlabs',
  autoSave: true,
  showProviderInUI: false
}

export function STTConfigModule({ config, onConfigChange }: ProfileModuleProps) {
  const { user } = useAuth()
  const [sttConfig, setSTTConfig] = useState<STTConfig>(
    { ...DEFAULT_STT_CONFIG, ...(config.config || {}) }
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Save configuration
  const saveConfig = async (newConfig: STTConfig) => {
    if (!user) return
    
    setIsSaving(true)
    setSaveStatus('saving')
    
    try {
      // Save to localStorage (could be replaced with API call)
      localStorage.setItem(`stt-config-${user.id}`, JSON.stringify(newConfig))
      
      // Update parent component
      onConfigChange({
        ...config,
        config: { ...config.config, ...newConfig }
      })
      
      setSTTConfig(newConfig)
      setSaveStatus('saved')
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save STT configuration:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Load configuration on mount
  useEffect(() => {
    if (!user) return
    
    try {
      const saved = localStorage.getItem(`stt-config-${user.id}`)
      if (saved) {
        const parsedConfig = JSON.parse(saved)
        setSTTConfig({ ...DEFAULT_STT_CONFIG, ...parsedConfig })
      }
    } catch (error) {
      console.error('Failed to load STT configuration:', error)
    }
  }, [user])

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

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <Mic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h4>
          <p className="text-gray-600">Please sign in to configure voice input settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mic className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Voice Input Settings</h3>
              <p className="text-sm text-gray-600">Configure your speech-to-text preferences</p>
            </div>
          </div>
          
          {/* Save Status */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Error</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Provider Selection */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Speech-to-Text Provider</h4>
          <p className="text-sm text-gray-600 mb-4">
            Choose which AI service to use for converting your voice to text
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(STT_PROVIDERS).map((provider) => {
              const Icon = provider.icon
              const isSelected = sttConfig.provider === provider.id
              const colorClasses = {
                purple: isSelected 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-300',
                green: isSelected 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-green-300'
              }
              
              return (
                <div
                  key={provider.id}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    colorClasses[provider.color]
                  }`}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  {isSelected && (
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                      provider.color === 'purple' ? 'bg-purple-500' : 'bg-green-500'
                    }`}>
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Icon className={`w-8 h-8 flex-shrink-0 ${
                      provider.color === 'purple' ? 'text-purple-600' : 'text-green-600'
                    }`} />
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-1">{provider.name}</h5>
                      <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
                      
                      {/* Features */}
                      <div className="mb-2">
                        <h6 className="text-xs font-medium text-gray-500 uppercase mb-1">Features</h6>
                        <ul className="text-xs text-gray-600 space-y-0.5">
                          {provider.features.map((feature, index) => (
                            <li key={index}>• {feature}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Limitations */}
                      <div>
                        <h6 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h6>
                        <ul className="text-xs text-gray-500 space-y-0.5">
                          {provider.limitations.map((limitation, index) => (
                            <li key={index}>• {limitation}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Additional Settings
          </h4>
          
          <div className="space-y-4">
            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto-save changes</label>
                <p className="text-xs text-gray-500">Automatically save configuration changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={sttConfig.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  sttConfig.autoSave ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    sttConfig.autoSave ? 'translate-x-5' : 'translate-x-0'
                  } mt-0.5 ml-0.5`} />
                </div>
              </label>
            </div>

            {/* Show Provider in UI */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Show provider in UI</label>
                <p className="text-xs text-gray-500">Display which STT provider is active in voice input</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={sttConfig.showProviderInUI}
                  onChange={(e) => handleSettingChange('showProviderInUI', e.target.checked)}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  sttConfig.showProviderInUI ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    sttConfig.showProviderInUI ? 'translate-x-5' : 'translate-x-0'
                  } mt-0.5 ml-0.5`} />
                </div>
              </label>
            </div>
          </div>

          {/* Manual Save Button */}
          {!sttConfig.autoSave && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          )}
        </div>

        {/* Current Status */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h5>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Active Provider:</span> {STT_PROVIDERS[sttConfig.provider].name}
            </p>
            <p>
              <span className="font-medium">Auto-save:</span> {sttConfig.autoSave ? 'Enabled' : 'Disabled'}
            </p>
            <p>
              <span className="font-medium">Show in UI:</span> {sttConfig.showProviderInUI ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get current STT configuration
export async function getSTTConfig(userId: string): Promise<STTConfig> {
  try {
    const saved = localStorage.getItem(`stt-config-${userId}`)
    if (saved) {
      return { ...DEFAULT_STT_CONFIG, ...JSON.parse(saved) }
    }
  } catch (error) {
    console.error('Failed to load STT configuration:', error)
  }
  return DEFAULT_STT_CONFIG
}

export default STTConfigModule