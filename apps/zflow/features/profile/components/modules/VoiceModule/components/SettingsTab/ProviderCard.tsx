import { memo } from 'react'
import { CheckCircle } from 'lucide-react'
import { STT_PROVIDERS } from '../../constants/sttProviders'

interface ProviderCardProps {
  provider: typeof STT_PROVIDERS[keyof typeof STT_PROVIDERS]
  isSelected: boolean
  onSelect: () => void
}

export const ProviderCard = memo(function ProviderCard({ provider, isSelected, onSelect }: ProviderCardProps) {
  const Icon = provider.icon
  const colorClasses = {
    purple: isSelected
      ? 'border-purple-500 bg-purple-50'
      : 'border-gray-200 hover:border-purple-300',
    green: isSelected
      ? 'border-green-500 bg-green-50'
      : 'border-gray-200 hover:border-green-300'
  }

  return (
    <div
      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
        colorClasses[provider.color]
      }`}
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {isSelected && (
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
          provider.color === 'purple' ? 'bg-purple-500' : 'bg-green-500'
        }`}>
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <Icon className={`w-8 h-8 flex-shrink-0 ${
          provider.color === 'purple' ? 'text-purple-600' : 'text-green-600'
        }`} />
        <div>
          <h5 className="font-semibold text-gray-900 mb-1">{provider.name}</h5>
          <p className="text-sm text-gray-600 mb-3">{provider.description}</p>

          <div className="mb-2">
            <h6 className="text-xs font-medium text-gray-500 uppercase mb-1">Features</h6>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {provider.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>

          <div>
            <h6 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h6>
            <ul className="text-xs text-gray-500 space-y-0.5">
              {provider.limitations.map((limitation, index) => (
                <li key={index}>• {limitation}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
})
