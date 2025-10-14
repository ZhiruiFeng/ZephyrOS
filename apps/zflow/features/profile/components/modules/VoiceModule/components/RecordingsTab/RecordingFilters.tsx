import { Calendar } from 'lucide-react'

interface RecordingFiltersProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onClear: () => void
}

export function RecordingFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear
}: RecordingFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
          <Calendar className="w-4 h-4 inline mr-1" />
          From Date
        </label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Start date filter"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
          <Calendar className="w-4 h-4 inline mr-1" />
          To Date
        </label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="End date filter"
        />
      </div>
      {(startDate || endDate) && (
        <div className="flex items-end">
          <button
            onClick={onClear}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Clear date filters"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
