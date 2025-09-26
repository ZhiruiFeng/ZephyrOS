// =====================================================
// Speech Feature Types
// =====================================================

// =====================================================
// Speech-to-Text Types
// =====================================================

export interface SpeechTranscriptionResult {
  text: string
  confidence: number
  language: string
  duration: number
  timestamp: string
}

export interface SpeechTranscriptionConfig {
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  service: 'browser' | 'elevenlabs' | 'openai'
}

// =====================================================
// Speech Recognition Types
// =====================================================

export interface SpeechRecognitionState {
  isListening: boolean
  isSupported: boolean
  isProcessing: boolean
  error: string | null
  transcript: string
  interimTranscript: string
  confidence: number
}

export interface SpeechRecognitionConfig {
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
}

// =====================================================
// Batch Transcription Types
// =====================================================

export interface BatchTranscriptionItem {
  id: string
  text: string
  confidence: number
  language: string
  duration: number
  timestamp: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface BatchTranscriptionState {
  items: BatchTranscriptionItem[]
  isProcessing: boolean
  currentItem: string | null
  totalDuration: number
  error: string | null
}

// =====================================================
// Speech Service Types
// =====================================================

export interface SpeechService {
  name: string
  displayName: string
  supportedLanguages: string[]
  maxFileSize: number
  supportedFormats: string[]
  isAvailable: boolean
}

export interface SpeechServiceConfig {
  apiKey?: string
  endpoint?: string
  timeout: number
  retryAttempts: number
}

// =====================================================
// Speech Hook Types
// =====================================================

export interface UseSpeechRecognitionReturn {
  state: SpeechRecognitionState
  startListening: () => void
  stopListening: () => void
  reset: () => void
  updateConfig: (config: Partial<SpeechRecognitionConfig>) => void
}

export interface UseBatchTranscriptionReturn {
  state: BatchTranscriptionState
  addItem: (item: Omit<BatchTranscriptionItem, 'id' | 'timestamp' | 'status'>) => void
  removeItem: (id: string) => void
  processItems: () => Promise<void>
  clearAll: () => void
  updateItem: (id: string, updates: Partial<BatchTranscriptionItem>) => void
}

export interface UseSpeechServicesReturn {
  services: SpeechService[]
  activeService: SpeechService | null
  setActiveService: (service: SpeechService) => void
  checkAvailability: () => Promise<void>
}

// =====================================================
// Speech Component Props
// =====================================================

export interface SpeechPageProps {
  className?: string
}

export interface BatchTranscriberProps {
  className?: string
  onTranscriptionComplete?: (result: SpeechTranscriptionResult) => void
  onError?: (error: string) => void
}

export interface SpeechRecognitionButtonProps {
  isListening: boolean
  isSupported: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  className?: string
}

// =====================================================
// Speech Constants
// =====================================================

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'zh-CN', name: '中文 (简体)' },
  { code: 'zh-TW', name: '中文 (繁體)' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'ru-RU', name: 'Русский' }
] as const

export const SPEECH_SERVICES: SpeechService[] = [
  {
    name: 'browser',
    displayName: 'Browser Speech Recognition',
    supportedLanguages: SUPPORTED_LANGUAGES.map(lang => lang.code),
    maxFileSize: 0, // Not applicable for browser
    supportedFormats: [],
    isAvailable: typeof window !== 'undefined' && 'webkitSpeechRecognition' in window
  },
  {
    name: 'elevenlabs',
    displayName: 'ElevenLabs',
    supportedLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR'],
    maxFileSize: 25 * 1024 * 1024, // 25MB
    supportedFormats: ['mp3', 'wav', 'flac', 'm4a'],
    isAvailable: true
  },
  {
    name: 'openai',
    displayName: 'OpenAI Whisper',
    supportedLanguages: SUPPORTED_LANGUAGES.map(lang => lang.code),
    maxFileSize: 25 * 1024 * 1024, // 25MB
    supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'webm', 'mpga'],
    isAvailable: true
  }
]

export const DEFAULT_SPEECH_CONFIG: SpeechTranscriptionConfig = {
  language: 'en-US',
  continuous: false,
  interimResults: true,
  maxAlternatives: 1,
  service: 'browser'
}

export const SPEECH_STORAGE_KEYS = {
  TRANSCRIPTION_CONFIG: 'speech-transcription-config',
  BATCH_ITEMS: 'speech-batch-items',
  ACTIVE_SERVICE: 'speech-active-service'
} as const

// =====================================================
// Speech Error Types
// =====================================================

export interface SpeechError {
  code: string
  message: string
  details?: any
}

export const SPEECH_ERROR_CODES = {
  NOT_SUPPORTED: 'not_supported',
  NO_MICROPHONE: 'no_microphone',
  MICROPHONE_BLOCKED: 'microphone_blocked',
  NETWORK_ERROR: 'network_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  INVALID_AUDIO: 'invalid_audio',
  FILE_TOO_LARGE: 'file_too_large',
  UNSUPPORTED_FORMAT: 'unsupported_format',
  QUOTA_EXCEEDED: 'quota_exceeded',
  AUTHENTICATION_ERROR: 'authentication_error'
} as const

// =====================================================
// Speech Utility Types
// =====================================================

export interface AudioFileInfo {
  name: string
  size: number
  type: string
  duration?: number
  lastModified: number
}

export interface TranscriptionProgress {
  current: number
  total: number
  percentage: number
  estimatedTimeRemaining?: number
}
