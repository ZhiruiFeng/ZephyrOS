'use client'

import React from 'react'
import { EnergySpectrumModule } from './modules/EnergySpectrumModule'
import AgentDirectory from './modules/AgentDirectory'
import { MemoriesModule } from './modules/MemoriesModule'
import { ApiKeysModule } from '@/features/profile/components/modules/ApiKeysModule'
import { ZMemoryApiKeysModule } from '@/features/profile/components/modules/ZMemoryApiKeysModule'
import { STTConfigModule } from '@/features/profile/components/modules/STTConfigModule'
import { ZRelationsModule } from './modules/ZRelationsModule'
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
    case 'stt-config':
      return <STTConfigModule {...sharedProps} />
    case 'zrelations':
      return <ZRelationsModule {...sharedProps} />
    default:
      return null
  }
}
