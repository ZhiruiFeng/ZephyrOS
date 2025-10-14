import { memo } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { MindflowSTTInteraction } from '@/lib/api/mindflow-api'
import { formatDate } from '../../utils/formatDate'
import { RecordingDetails } from './RecordingDetails'

interface RecordingCardProps {
  recording: MindflowSTTInteraction
  isExpanded: boolean
  showTeacherNotes: boolean
  showMetadata: boolean
  onToggle: () => void
  onDelete: () => void
}

export const RecordingCard = memo(function RecordingCard({
  recording,
  isExpanded,
  showTeacherNotes,
  showMetadata,
  onToggle,
  onDelete
}: RecordingCardProps) {
  const hasRefinement = !!(recording.refined_text && recording.refined_text !== recording.original_transcription)

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      role="article"
      aria-label={`Recording from ${formatDate(recording.created_at || '')}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {formatDate(recording.created_at || '')}
              </span>
              {hasRefinement && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  Refined
                </span>
              )}
            </div>
            {showMetadata && (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{recording.transcription_api}</span>
                {recording.audio_duration && (
                  <span>{recording.audio_duration.toFixed(1)}s</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              aria-label="Delete recording"
              title="Delete recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-gray-600"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse recording" : "Expand recording"}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-700 line-clamp-2 cursor-pointer" onClick={onToggle}>
          {hasRefinement ? recording.refined_text : recording.original_transcription}
        </p>
      </div>

      {isExpanded && (
        <RecordingDetails
          recording={recording}
          hasRefinement={hasRefinement}
          showTeacherNotes={showTeacherNotes}
          showMetadata={showMetadata}
        />
      )}
    </div>
  )
})
