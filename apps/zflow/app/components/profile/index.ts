export { default as ProfileDashboard } from './ProfileDashboard'
export { ModuleSelector } from './ModuleSelector'
export { EnergySpectrumModule } from './modules/EnergySpectrumModule'
export { MemoriesModule } from './modules/MemoriesModule'
export { ProfileModuleRenderer } from './ProfileModuleRenderer'

// Export profile feature hooks and types
export { useProfileModules } from '@/profile'
export type * from '@/profile'

// Also export some profile modules that need to be accessible
export { default as AITaskEditor, type AITaskForm } from './modules/AITaskEditor'
export type { STTProvider, STTConfig } from './modules/STTConfigModule'
