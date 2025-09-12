'use client'

import React from 'react'
import { User, Settings, Plus } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useTranslation } from '../../../contexts/LanguageContext'
import { ModuleSelector } from './ModuleSelector'
import { EnergySpectrumModule } from './modules/EnergySpectrumModule'
import { StatsModule } from './modules/StatsModule'
import { ActivitySummaryModule } from './modules/ActivitySummaryModule'
import AgentDirectory from './modules/AgentDirectory'
import { MemoriesModule } from './modules/MemoriesModule'
import { ApiKeysModule } from './modules/ApiKeysModule'
import { STTConfigModule } from './modules/STTConfigModule'
import { useProfileModules } from './hooks/useProfileModules'
import type { ProfileModule, ProfileModuleConfig } from './types'

interface ProfileDashboardProps {
  className?: string
}

export default function ProfileDashboard({ className = '' }: ProfileDashboardProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { 
    enabledModules, 
    availableModules, 
    toggleModule, 
    reorderModules, 
    isLoading 
  } = useProfileModules()

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
  }, [user, t.profile.yourProfile])

  const renderModule = (moduleConfig: ProfileModuleConfig) => {
    const mod = availableModules.find(m => m.id === moduleConfig.id)
    if (!mod) return null

    switch (moduleConfig.id) {
      case 'energy-spectrum':
        return (
          <EnergySpectrumModule 
            key={moduleConfig.id}
            config={moduleConfig}
            onConfigChange={(newConfig) => {
              // Handle module-specific config changes
              console.log('Energy spectrum config changed:', newConfig)
            }}
          />
        )
      case 'stats':
        return (
          <StatsModule 
            key={moduleConfig.id}
            config={moduleConfig}
            onConfigChange={(newConfig) => {
              console.log('Stats config changed:', newConfig)
            }}
          />
        )
      case 'activity-summary':
        return (
          <ActivitySummaryModule 
            key={moduleConfig.id}
            config={moduleConfig}
            onConfigChange={(newConfig) => {
              console.log('Activity summary config changed:', newConfig)
            }}
          />
        )
      case 'agent-directory':
        return (
          <AgentDirectory 
            key={moduleConfig.id}
          />
        )
      case 'memories':
        return (
          <MemoriesModule 
            key={moduleConfig.id}
            config={moduleConfig}
            onConfigChange={(newConfig) => {
              console.log('Memories config changed:', newConfig)
            }}
          />
        )
      case 'api-keys':
        return (
          <ApiKeysModule 
            key={moduleConfig.id}
            config={moduleConfig}
            onConfigChange={(newConfig) => {
              console.log('API keys config changed:', newConfig)
            }}
          />
        )
      case 'stt-config':
        return (
          <STTConfigModule 
            key={moduleConfig.id}
            config={moduleConfig}
            onConfigChange={(newConfig) => {
              console.log('STT config changed:', newConfig)
            }}
          />
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
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
          
          {/* Module Selector */}
          <ModuleSelector
            enabledModules={enabledModules}
            availableModules={availableModules}
            onToggleModule={toggleModule}
            onReorderModules={reorderModules}
          />
        </div>
      </div>

      {/* Modules Grid */}
      <div className="space-y-6">
        {enabledModules.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t.profile.noModulesEnabled}
            </h3>
            <p className="text-gray-500 mb-4">
              {t.profile.addModulesToGetStarted}
            </p>
            <ModuleSelector
              enabledModules={enabledModules}
              availableModules={availableModules}
              onToggleModule={toggleModule}
              onReorderModules={reorderModules}
              showAsButton={true}
            />
          </div>
        ) : (
          enabledModules.map((moduleConfig) => (
            <div key={moduleConfig.id} className="module-container">
              {renderModule(moduleConfig)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
