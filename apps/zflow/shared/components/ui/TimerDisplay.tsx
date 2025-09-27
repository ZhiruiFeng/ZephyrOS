'use client'

import React from 'react'
import { Play, Pause, Square } from 'lucide-react'

interface TimerDisplayProps {
  isRunning: boolean
  elapsedMs: number
  taskTitle?: string
  onStart?: () => void
  onStop?: () => void
  onPause?: () => void
  className?: string
  showControls?: boolean
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  isRunning,
  elapsedMs,
  taskTitle,
  onStart,
  onStop,
  onPause,
  className = '',
  showControls = true
}) => {
  const formatElapsedTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="font-mono text-sm font-medium">
          {formatElapsedTime(elapsedMs)}
        </span>
      </div>

      {taskTitle && (
        <span className="text-sm text-gray-600 truncate max-w-xs">
          {taskTitle}
        </span>
      )}

      {showControls && (
        <div className="flex items-center space-x-1">
          {!isRunning ? (
            <button
              onClick={onStart}
              className="p-1 rounded hover:bg-gray-100 text-green-600"
              title="Start timer"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={onPause}
                className="p-1 rounded hover:bg-gray-100 text-yellow-600"
                title="Pause timer"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                onClick={onStop}
                className="p-1 rounded hover:bg-gray-100 text-red-600"
                title="Stop timer"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}