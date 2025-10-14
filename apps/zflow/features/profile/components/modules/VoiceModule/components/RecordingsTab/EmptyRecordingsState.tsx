import { History } from 'lucide-react'

export function EmptyRecordingsState() {
  return (
    <div className="text-center py-12">
      <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-600">No recordings found</p>
      <p className="text-sm text-gray-500 mt-1">Try adjusting your date filters or make a new recording</p>
    </div>
  )
}
