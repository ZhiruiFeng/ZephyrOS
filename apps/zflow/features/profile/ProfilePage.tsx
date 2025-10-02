'use client'

import React, { Suspense } from 'react'
import { User, Settings, Plus, BarChart3, BookOpen, Bot, Users, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { ModuleSelector } from '@/features/profile/components/ModuleSelector'
import { useProfileModules } from './hooks'
import { FullscreenModal, useFullscreenModal } from '@/shared/components'
import type { ProfileModule, ProfileModuleConfig } from './types'

// Lazy load profile modules for better performance
const EnergySpectrumModule = React.lazy(() => import('@/features/profile/components/modules/EnergySpectrumModule').then(m => ({ default: m.EnergySpectrumModule })))
const AgentDirectory = React.lazy(() => import('@/features/profile/components/modules/AgentDirectory'))
const MemoriesModule = React.lazy(() => import('@/features/profile/components/modules/MemoriesModule').then(m => ({ default: m.MemoriesModule })))
const ApiKeysModule = React.lazy(() => import('@/features/profile/components/modules/ApiKeysModule').then(m => ({ default: m.ApiKeysModule })))
const ZMemoryApiKeysModule = React.lazy(() => import('@/features/profile/components/modules/ZMemoryApiKeysModule').then(m => ({ default: m.ZMemoryApiKeysModule })))
const STTConfigModule = React.lazy(() => import('@/features/profile/components/modules/STTConfigModule').then(m => ({ default: m.STTConfigModule })))
const ZRelationsModule = React.lazy(() => import('@/features/profile/components/modules/ZRelationsModule').then(m => ({ default: m.ZRelationsModule })))
const AITaskGrantorModule = React.lazy(() => import('@/features/profile/components/modules/AITaskGrantorModule'))
const ExecutorMonitor = React.lazy(() => import('@/features/profile/components/modules/ExecutorMonitor').then(m => ({ default: m.ExecutorMonitor })))

interface ProfilePageProps {
  className?: string
}

export function ProfilePage({ className = '' }: ProfilePageProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { 
    enabledModules, 
    availableModules, 
    toggleModule, 
    reorderModules, 
    isLoading 
  } = useProfileModules()


  // Fullscreen modal state
  const [fullscreenModule, setFullscreenModule] = React.useState<string | null>(null)
  const fullscreenModal = useFullscreenModal()

  // Handle fullscreen mode
  const handleToggleFullscreen = React.useCallback((moduleId: string) => {
    if (fullscreenModule === moduleId) {
      setFullscreenModule(null)
      fullscreenModal.close()
    } else {
      setFullscreenModule(moduleId)
      fullscreenModal.open()
    }
  }, [fullscreenModule, fullscreenModal])

  const handleCloseFullscreen = React.useCallback(() => {
    setFullscreenModule(null)
    fullscreenModal.close()
  }, [fullscreenModal])

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

  // Loading component for lazy-loaded modules
  const ModuleLoader = () => (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  )

  const renderModule = (moduleConfig: ProfileModuleConfig) => {
    const moduleDefinition = availableModules.find(m => m.id === moduleConfig.id)
    if (!moduleDefinition) return null

    const isFullscreen = fullscreenModule === moduleConfig.id
    const handleToggleFullscreenForModule = () => handleToggleFullscreen(moduleConfig.id)

    switch (moduleConfig.id) {
      case 'energy-spectrum':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <EnergySpectrumModule 
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                // Handle module-specific config changes
                console.log('Energy spectrum config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'memories':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <MemoriesModule 
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('Memories config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'api-keys':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <ApiKeysModule 
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('API keys config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'zmemory-api-keys':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <ZMemoryApiKeysModule 
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('ZMemory API keys config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'stt-config':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <STTConfigModule 
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('STT config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'zrelations':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <ZRelationsModule 
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('ZRelations config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'ai-task-grantor':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <AITaskGrantorModule 
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('AI Task Grantor config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'agent-directory':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <AgentDirectory
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('Agent Directory config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
        )
      case 'executor-monitor':
        return (
          <Suspense key={moduleConfig.id} fallback={<ModuleLoader />}>
            <ExecutorMonitor
              config={moduleConfig}
              onConfigChange={(newConfig) => {
                console.log('Executor Monitor config changed:', newConfig)
              }}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreenForModule}
            />
          </Suspense>
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

      {/* Fullscreen Modal */}
      {fullscreenModule && (
        <FullscreenModal
          isOpen={fullscreenModal.isOpen}
          onClose={handleCloseFullscreen}
          title={availableModules.find(m => m.id === fullscreenModule)?.name || 'Module'}
          contentPadding={false}
          exitTooltip="退出全屏"
          closeTooltip="关闭"
          icon={
            fullscreenModule === 'energy-spectrum' ? <BarChart3 className="w-6 h-6 text-blue-600" /> :
            fullscreenModule === 'memories' ? <BookOpen className="w-6 h-6 text-purple-600" /> :
            fullscreenModule === 'agent-directory' ? <Bot className="w-6 h-6 text-green-600" /> :
            fullscreenModule === 'zrelations' ? <Users className="w-6 h-6 text-blue-600" /> :
            fullscreenModule === 'stats' ? <TrendingUp className="w-6 h-6 text-green-600" /> :
            <Settings className="w-6 h-6 text-gray-600" />
          }
        >
          {renderModule(enabledModules.find(m => m.id === fullscreenModule)!)}
        </FullscreenModal>
      )}
    </div>
  )
}