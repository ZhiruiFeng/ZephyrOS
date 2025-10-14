import type { STTConfig } from '@/types/stt-config'
import { STT_PROVIDERS } from '../../constants/sttProviders'

interface CurrentConfigurationProps {
  config: STTConfig
}

export function CurrentConfiguration({ config }: CurrentConfigurationProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h5 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h5>
      <div className="text-sm text-gray-600 space-y-1">
        <p>
          <span className="font-medium">Active Provider:</span> {STT_PROVIDERS[config.provider].name}
        </p>
        <p>
          <span className="font-medium">Auto-save:</span> {config.autoSave ? 'Enabled' : 'Disabled'}
        </p>
        <p>
          <span className="font-medium">Show in UI:</span> {config.showProviderInUI ? 'Yes' : 'No'}
        </p>
        <p>
          <span className="font-medium">Transcription Type:</span> {config.useRefinedTranscription ? 'Refined (AI-enhanced)' : 'Raw'}
        </p>
        <p>
          <span className="font-medium">Auto-sync Threshold:</span> {config.autoSyncThreshold}s
        </p>
      </div>
    </div>
  )
}
