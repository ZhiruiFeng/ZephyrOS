'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { mindflowApi, type MindflowSTTInteraction } from '@/lib/api/mindflow-api'
import type { ProfileModuleProps } from '@/profile'
import { RecordingFilters } from './RecordingFilters'
import { EmptyRecordingsState } from './EmptyRecordingsState'
import { RecordingCard } from './RecordingCard'

export function RecordingsTab({ config, onConfigChange }: Pick<ProfileModuleProps, 'config' | 'onConfigChange'>) {
  const [recordings, setRecordings] = useState<MindflowSTTInteraction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [expandedRecordings, setExpandedRecordings] = useState<Set<string>>(new Set())

  // Filter states
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Settings from config
  const pageSize = config.config.pageSize || 20
  const showTeacherNotes = config.config.showTeacherNotes !== false
  const showMetadata = config.config.showMetadata !== false

  const loadRecordings = async (offset = 0, isLoadingMore = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await mindflowApi.list({
        limit: pageSize,
        offset,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      })

      if (isLoadingMore) {
        setRecordings(prev => [...prev, ...result.interactions])
      } else {
        setRecordings(result.interactions)
      }

      setHasMore(result.has_more || false)
      setCurrentOffset(offset)
    } catch (err) {
      console.error('Failed to load recordings:', err)
      setError('Failed to load recordings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecordings()
  }, [startDate, endDate, pageSize])

  const handleLoadMore = () => {
    loadRecordings(currentOffset + pageSize, true)
  }

  const toggleRecording = (id: string) => {
    setExpandedRecordings(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return
    }

    try {
      await mindflowApi.delete(id)
      setRecordings(prev => prev.filter(r => r.id !== id))
      setExpandedRecordings(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      console.error('Failed to delete recording:', err)
      alert('Failed to delete recording. Please try again.')
    }
  }

  if (isLoading && recordings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" aria-label="Loading recordings"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => loadRecordings()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Retry loading recordings"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <RecordingFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={() => {
          setStartDate('')
          setEndDate('')
        }}
      />

      {recordings.length === 0 ? (
        <EmptyRecordingsState />
      ) : (
        <div className="space-y-4">
          {recordings.map((recording) => (
            <RecordingCard
              key={recording.id}
              recording={recording}
              isExpanded={expandedRecordings.has(recording.id)}
              showTeacherNotes={showTeacherNotes}
              showMetadata={showMetadata}
              onToggle={() => toggleRecording(recording.id)}
              onDelete={() => handleDelete(recording.id)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Load more recordings"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
