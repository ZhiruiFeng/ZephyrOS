import type { MindflowSTTInteraction } from '@/lib/api/mindflow-api'
import { TeacherNotesSection } from './TeacherNotesSection'
import { RecordingMetadata } from './RecordingMetadata'

interface RecordingDetailsProps {
  recording: MindflowSTTInteraction
  hasRefinement: boolean
  showTeacherNotes: boolean
  showMetadata: boolean
}

export function RecordingDetails({
  recording,
  hasRefinement,
  showTeacherNotes,
  showMetadata
}: RecordingDetailsProps) {
  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
      {hasRefinement && (
        <>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="text-xs font-medium text-green-800 mb-1">Refined Text</h5>
            <p className="text-sm text-gray-700">{recording.refined_text}</p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
            <h5 className="text-xs font-medium text-gray-600 mb-1">Original Text</h5>
            <p className="text-sm text-gray-600">{recording.original_transcription}</p>
          </div>
        </>
      )}

      {!hasRefinement && (
        <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">{recording.original_transcription}</p>
        </div>
      )}

      {showTeacherNotes && recording.teacher_explanation && (
        <TeacherNotesSection explanation={recording.teacher_explanation} />
      )}

      {showMetadata && (
        <RecordingMetadata recording={recording} />
      )}
    </div>
  )
}
