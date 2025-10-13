'use client'

import React from 'react'
import { EnergySpectrumModule } from '@/features/profile/components/modules/EnergySpectrumModule'
import AgentDirectory from '@/features/profile/components/modules/AgentDirectory'
import { MemoriesModule } from '@/features/profile/components/modules/MemoriesModule'
import { ApiKeysModule } from '@/features/profile/components/modules/ApiKeysModule'
import { ZMemoryApiKeysModule } from '@/features/profile/components/modules/ZMemoryApiKeysModule'
import { VoiceModule } from '@/features/profile/components/modules/VoiceModule'
import { ZRelationsModule } from '@/features/profile/components/modules/ZRelationsModule'
import { ExecutorMonitor } from '@/features/profile/components/modules/ExecutorMonitor'
import { CorePrinciplesModule } from '@/features/profile/components/modules/CorePrinciplesModule'
import type { ProfileModule, ProfileModuleConfig } from '@/profile'

interface ProfileModuleRendererProps {
  moduleConfig: ProfileModuleConfig
  moduleDefinition?: ProfileModule
  onConfigChange: (newConfig: ProfileModuleConfig) => void
  showFullScreenButton?: boolean
}

export function ProfileModuleRenderer({
  moduleConfig,
  moduleDefinition,
  onConfigChange,
  showFullScreenButton = true
}: ProfileModuleRendererProps) {
  if (!moduleDefinition) {
    return null
  }

  const fullScreenPath = showFullScreenButton ? moduleDefinition.fullScreenPath : undefined
  const sharedProps = {
    config: moduleConfig,
    onConfigChange,
    fullScreenPath
  }

  switch (moduleDefinition.id) {
    case 'energy-spectrum':
      return <EnergySpectrumModule {...sharedProps} />
    case 'agent-directory':
      return <AgentDirectory fullScreenPath={fullScreenPath} />
    case 'memories':
      return <MemoriesModule {...sharedProps} />
    case 'api-keys':
      return <ApiKeysModule {...sharedProps} />
    case 'zmemory-api-keys':
      return <ZMemoryApiKeysModule {...sharedProps} />
    case 'voice':
      return <VoiceModule {...sharedProps} />
    case 'zrelations':
      return <ZRelationsModule {...sharedProps} />
    case 'executor-monitor':
      return <ExecutorMonitor {...sharedProps} />
    case 'core-principles':
      return <CorePrinciplesModule {...sharedProps} />
    default:
      return null
  }
}
