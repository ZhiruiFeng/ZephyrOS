/**
 * Speech-to-Text Configuration Types
 *
 * Shared types for STT provider configuration used across the application
 */

export type STTProvider = 'elevenlabs' | 'openai'

export interface STTConfig {
  provider: STTProvider
  autoSave: boolean
  showProviderInUI: boolean
  useRefinedTranscription: boolean
}
