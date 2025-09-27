export interface ProfileModule {
  id: string
  name: string
  description: string
  icon: string
  category: 'analytics' | 'productivity' | 'insights' | 'tools'
  defaultEnabled: boolean
  defaultConfig?: Record<string, any>
  fullScreenPath: string
}

export interface ProfileModuleConfig {
  id: string
  enabled: boolean
  order: number
  config: Record<string, any>
}

export interface ProfileModuleProps {
  config: ProfileModuleConfig
  onConfigChange: (newConfig: ProfileModuleConfig) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  fullScreenPath?: string
}

export interface ModuleSelectorProps {
  enabledModules: ProfileModuleConfig[]
  availableModules: ProfileModule[]
  onToggleModule: (moduleId: string) => void
  onReorderModules: (modules: ProfileModuleConfig[]) => void
  showAsButton?: boolean
}

export interface ProfileModulesState {
  enabledModules: ProfileModuleConfig[]
  availableModules: ProfileModule[]
  isLoading: boolean
  error: string | null
}