'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useProfileModules } from '@/profile'
import { ProfileModuleRenderer } from '@/features/profile/components/ProfileModuleRenderer'
import type { ProfileModuleConfig } from '@/profile'
import { useTranslation } from '@/contexts/LanguageContext'

interface ModuleFullScreenViewProps {
  moduleId: string
}

export default function ModuleFullScreenView({ moduleId }: ModuleFullScreenViewProps) {
  const { t } = useTranslation()
  const { enabledModules, availableModules, isLoading } = useProfileModules()

  const moduleDefinition = React.useMemo(
    () => availableModules.find(module => module.id === moduleId),
    [availableModules, moduleId]
  )

  const enabledConfig = React.useMemo(
    () => enabledModules.find(module => module.id === moduleId),
    [enabledModules, moduleId]
  )

  const fallbackConfig = React.useMemo<ProfileModuleConfig | null>(() => {
    if (!moduleDefinition) return null

    return {
      id: moduleDefinition.id,
      enabled: true,
      order: 0,
      config: moduleDefinition.defaultConfig ?? {}
    }
  }, [moduleDefinition])

  const [moduleConfig, setModuleConfig] = React.useState<ProfileModuleConfig | null>(
    enabledConfig ?? fallbackConfig
  )

  React.useEffect(() => {
    if (enabledConfig) {
      setModuleConfig(enabledConfig)
      return
    }

    if (fallbackConfig) {
      setModuleConfig(fallbackConfig)
      return
    }

    setModuleConfig(null)
  }, [enabledConfig, fallbackConfig])

  const handleConfigChange = React.useCallback((newConfig: ProfileModuleConfig) => {
    setModuleConfig(newConfig)
  }, [])

  if ((isLoading && !moduleConfig) || (!moduleDefinition && isLoading)) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!moduleDefinition || !moduleConfig) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.common.back}
        </Link>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">{t.profile.moduleNotFound}</h1>
          <p className="text-gray-600">{t.profile.moduleNotFoundDescription}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.common.back}
      </Link>

      <div className="mt-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{moduleDefinition.name}</h1>
          {moduleDefinition.description && (
            <p className="text-gray-600 mt-2">{moduleDefinition.description}</p>
          )}
        </div>

        <ProfileModuleRenderer
          moduleConfig={moduleConfig}
          moduleDefinition={moduleDefinition}
          onConfigChange={handleConfigChange}
          showFullScreenButton={false}
        />
      </div>
    </div>
  )
}
