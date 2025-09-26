// =====================================================
// Speech Feature - Public API
// =====================================================

// Speech Hooks
export { useBatchTranscription } from './hooks'

// Speech Types
export type {
  SpeechTranscriptionResult,
  SpeechTranscriptionConfig,
  SpeechRecognitionState,
  SpeechRecognitionConfig,
  BatchTranscriptionItem,
  BatchTranscriptionState,
  SpeechService,
  SpeechServiceConfig,
  UseSpeechRecognitionReturn,
  UseBatchTranscriptionReturn,
  UseSpeechServicesReturn,
  SpeechPageProps,
  BatchTranscriberProps,
  SpeechRecognitionButtonProps,
  SpeechError,
  AudioFileInfo,
  TranscriptionProgress
} from './types/speech'

// Speech Constants
export { 
  SUPPORTED_LANGUAGES, 
  SPEECH_SERVICES, 
  DEFAULT_SPEECH_CONFIG, 
  SPEECH_STORAGE_KEYS,
  SPEECH_ERROR_CODES
} from './types/speech'

// Speech Components
export { SpeechPage } from './SpeechPage'
