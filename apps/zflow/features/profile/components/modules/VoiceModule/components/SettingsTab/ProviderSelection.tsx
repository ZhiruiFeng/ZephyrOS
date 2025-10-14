import type { STTProvider } from '@/types/stt-config'
import { STT_PROVIDERS } from '../../constants/sttProviders'
import { ProviderCard } from './ProviderCard'

interface ProviderSelectionProps {
  selectedProvider: STTProvider
  onProviderChange: (provider: STTProvider) => void
}

export function ProviderSelection({ selectedProvider, onProviderChange }: ProviderSelectionProps) {
  return (
    <div>
      <h4 className="text-md font-medium text-gray-900 mb-3">Speech-to-Text Provider</h4>
      <p className="text-sm text-gray-600 mb-4">
        Choose which AI service to use for converting your voice to text
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(STT_PROVIDERS).map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isSelected={selectedProvider === provider.id}
            onSelect={() => onProviderChange(provider.id)}
          />
        ))}
      </div>
    </div>
  )
}
