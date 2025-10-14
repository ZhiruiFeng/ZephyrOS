import { Lightbulb } from 'lucide-react'
import { parseTeacherNotes } from '../../utils/parseTeacherNotes'

interface TeacherNotesSectionProps {
  explanation: string
}

export function TeacherNotesSection({ explanation }: TeacherNotesSectionProps) {
  const parsed = parseTeacherNotes(explanation)

  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-medium text-yellow-800 flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          Teacher Notes
        </h5>
        {parsed.score && (
          <span className="text-sm font-semibold text-yellow-900">
            {parsed.score}
          </span>
        )}
      </div>
      {parsed.bulletPoints.length > 0 ? (
        <ul className="space-y-2">
          {parsed.bulletPoints.map((point, idx) => (
            <li key={idx} className="text-sm text-gray-700 flex gap-2">
              <span className="text-yellow-600 flex-shrink-0">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-700">{parsed.rawText}</p>
      )}
    </div>
  )
}
