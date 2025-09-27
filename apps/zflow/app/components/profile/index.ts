export { default as ProfileDashboard } from './ProfileDashboard'
export { ModuleSelector } from './ModuleSelector'
export { EnergySpectrumModule } from '@/features/profile/components/modules/EnergySpectrumModule'
export { MemoriesModule } from '@/features/profile/components/modules/MemoriesModule'
export { ProfileModuleRenderer } from './ProfileModuleRenderer'

// Export profile feature hooks and types
export { useProfileModules } from '@/profile'
export type * from '@/profile'

// Also export some profile modules that need to be accessible
export { default as AITaskEditor, type AITaskForm } from '@/features/profile/components/modules/AITaskEditor'
export type { STTProvider, STTConfig } from '@/features/profile/components/modules/STTConfigModule'
