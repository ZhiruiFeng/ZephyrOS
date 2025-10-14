import type { MindflowSTTInteraction } from '@/lib/api/mindflow-api'

interface RecordingMetadataProps {
  recording: MindflowSTTInteraction
}

export function RecordingMetadata({ recording }: RecordingMetadataProps) {
  return (
    <div className="text-xs text-gray-500 space-y-1">
      {recording.transcription_model && (
        <p>Transcription Model: {recording.transcription_model}</p>
      )}
      {recording.optimization_model && (
        <p>Optimization Model: {recording.optimization_model}</p>
      )}
    </div>
  )
}
