import { Settings2 } from 'lucide-react'
import type { STTConfig } from '@/types/stt-config'
import { ToggleSetting } from './ToggleSetting'
import { ThresholdSetting } from './ThresholdSetting'

interface AdditionalSettingsProps {
  config: STTConfig
  onSettingChange: (key: keyof STTConfig, value: any) => void
  onManualSave: () => void
  isSaving: boolean
}

export function AdditionalSettings({ config, onSettingChange, onManualSave, isSaving }: AdditionalSettingsProps) {
  const settings = [
    {
      key: 'autoSave' as keyof STTConfig,
      label: 'Auto-save changes',
      description: 'Automatically save configuration changes'
    },
    {
      key: 'showProviderInUI' as keyof STTConfig,
      label: 'Show provider in UI',
      description: 'Display which STT provider is active in voice input'
    },
    {
      key: 'useRefinedTranscription' as keyof STTConfig,
      label: 'Refined transcription',
      description: 'Remove filler words and improve readability using AI'
    }
  ]

  return (
    <div className="border-t border-gray-100 pt-6">
      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        Additional Settings
      </h4>

      <div className="space-y-4">
        {settings.map((setting) => (
          <ToggleSetting
            key={setting.key}
            label={setting.label}
            description={setting.description}
            checked={config[setting.key] as boolean}
            onChange={(checked) => onSettingChange(setting.key, checked)}
          />
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <ThresholdSetting
          label="Auto-sync threshold"
          description="Minimum recording duration to automatically sync to zmemory"
          value={config.autoSyncThreshold}
          onChange={(value) => onSettingChange('autoSyncThreshold', value)}
          min={0}
          max={300}
          step={5}
          unit="s"
        />
      </div>

      {!config.autoSave && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onManualSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Save configuration"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  )
}
