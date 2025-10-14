import { Zap, Shield } from 'lucide-react'

export const STT_PROVIDERS = {
  elevenlabs: {
    id: 'elevenlabs' as const,
    name: 'ElevenLabs Scribe',
    description: 'High-accuracy transcription with 99 languages support',
    icon: Shield,
    color: 'purple' as const,
    features: [
      '99+ languages',
      '>98% accuracy',
      'Speaker diarization',
      'Audio event detection',
      'Character-level timestamps'
    ],
    limitations: [
      'Optimized for accuracy over speed',
      'Better for longer recordings'
    ]
  },
  openai: {
    id: 'openai' as const,
    name: 'OpenAI Whisper',
    description: 'Fast, real-time transcription for voice input',
    icon: Zap,
    color: 'green' as const,
    features: [
      '99+ languages',
      'Real-time optimized',
      'Fast processing',
      'Interactive voice input'
    ],
    limitations: [
      'Slightly lower accuracy',
      'Less detailed timestamps'
    ]
  }
} as const
