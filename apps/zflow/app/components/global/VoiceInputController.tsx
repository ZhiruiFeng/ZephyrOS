'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

// Types
interface RecorderState {
  isRecording: boolean
  isPaused: boolean
  audioBlob: Blob | null
  rmsLevel: number
  error: string | null
}

interface MicButtonPosition {
  top: number
  left: number
  width: number
  height: number
}

// Utility functions for text insertion
const insertTextAtCursor = (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement, text: string) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart || 0
    const end = element.selectionEnd || 0
    const value = element.value
    element.value = value.slice(0, start) + text + value.slice(end)
    element.selectionStart = element.selectionEnd = start + text.length
    element.focus()
  } else if (element.isContentEditable) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      element.textContent = (element.textContent || '') + text
    }
    element.focus()
  }
}

const isEditableElement = (element: Element): element is HTMLInputElement | HTMLTextAreaElement | HTMLElement => {
  if (element instanceof HTMLInputElement) {
    return ['text', 'search', 'url', 'tel', 'email', 'password'].includes(element.type)
  }
  return element instanceof HTMLTextAreaElement || (element instanceof HTMLElement && element.isContentEditable)
}

// Mock transcription service
const mockTranscribe = async (audioBlob: Blob): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1500))
  const phrases = [
    "Hello, this is a test transcription.",
    "Voice input is working correctly.",
    "This text was generated from audio.",
    "Speech recognition demo is active.",
    "Your voice has been converted to text."
  ]
  return phrases[Math.floor(Math.random() * phrases.length)]
}

// Real transcription service using ZFlow's existing API
const realTranscribe = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.wav')
  
  try {
    // Include auth header so the server can resolve user API key
    const { getAuthHeader } = await import('../../../lib/supabase')
    const authHeaders = await getAuthHeader()
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.text || ''
  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error('Failed to transcribe audio. Please try again.')
  }
}

// Custom hook for audio recording
const useRecorder = (): [RecorderState, {
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void
  stopAndGetBlob: () => Promise<Blob>
  reset: () => void
}] => {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    audioBlob: null,
    rmsLevel: 0,
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const calculateRMS = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current)
    
    let sum = 0
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i] * dataArrayRef.current[i]
    }
    
    const rms = Math.sqrt(sum / dataArrayRef.current.length)
    const normalizedRms = Math.min(rms / 128, 1)
    
    setState(prev => ({ ...prev, rmsLevel: normalizedRms }))
    
    if (state.isRecording && !state.isPaused) {
      animationRef.current = requestAnimationFrame(calculateRMS)
    }
  }, [state.isRecording, state.isPaused])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Set up audio context for RMS calculation
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setState(prev => ({ ...prev, audioBlob, isRecording: false, isPaused: false }))
        
        // Clean up
        stream.getTracks().forEach(track => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }
      
      mediaRecorderRef.current.start()
      setState(prev => ({ ...prev, isRecording: true, isPaused: false, error: null }))
      
      // Start RMS calculation
      calculateRMS()
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to access microphone. Please ensure you have granted permission and are using HTTPS.' 
      }))
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.pause()
      setState(prev => ({ ...prev, isPaused: true }))
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state.isPaused) {
      mediaRecorderRef.current.resume()
      setState(prev => ({ ...prev, isPaused: false }))
      calculateRMS()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  const stopAndGetBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (mediaRecorderRef.current && state.isRecording) {
        // Set up a one-time listener for the stop event
        const handleStop = () => {
          mediaRecorderRef.current?.removeEventListener('stop', handleStop)
          // The audioBlob will be set in the existing onstop handler
          // We need to wait for the next render cycle
          setTimeout(() => {
            if (state.audioBlob) {
              resolve(state.audioBlob)
            } else {
              // Create the blob manually if needed
              const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' })
              resolve(audioBlob)
            }
          }, 100)
        }
        
        mediaRecorderRef.current.addEventListener('stop', handleStop)
        mediaRecorderRef.current.stop()
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      } else if (state.audioBlob) {
        // If we already have a blob, return it
        resolve(state.audioBlob)
      } else {
        reject(new Error('No recording in progress'))
      }
    })
  }

  const reset = () => {
    setState({
      isRecording: false,
      isPaused: false,
      audioBlob: null,
      rmsLevel: 0,
      error: null,
    })
    chunksRef.current = []
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return [state, { startRecording, pauseRecording, resumeRecording, stopRecording, stopAndGetBlob, reset }]
}

// Waveform visualizer component
const WaveformVisualizer: React.FC<{ rmsLevel: number; isActive: boolean }> = ({ rmsLevel, isActive }) => {
  const bars = Array.from({ length: 5 }, (_, i) => {
    const height = isActive ? Math.max(0.1, rmsLevel + (Math.random() * 0.3 - 0.15)) : 0.1
    return (
      <div
        key={i}
        className="bg-blue-500 transition-all duration-150 ease-out"
        style={{
          width: '4px',
          height: `${height * 40 + 4}px`,
          borderRadius: '2px',
          opacity: isActive ? 1 : 0.3,
        }}
      />
    )
  })

  return (
    <div className="flex items-end justify-center space-x-1 h-12">
      {bars}
    </div>
  )
}

// Recording panel component
const RecordingPanel: React.FC<{
  isOpen: boolean
  isMobile: boolean
  position: MicButtonPosition
  recorderState: RecorderState
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onCancel: () => void
  onClose: () => void
}> = ({ isOpen, isMobile, position, recorderState, onStart, onPause, onResume, onComplete, onCancel, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const panelStyle = isMobile
    ? {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        transform: 'translateY(0)',
        borderRadius: '16px 16px 0 0',
      }
    : {
        position: 'absolute' as const,
        top: position.top + position.height + 8,
        left: position.left,
        transform: 'translateX(-50%)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Voice recording panel"
      className="bg-white border border-gray-200 p-6 z-[60]"
      style={panelStyle}
    >
      {recorderState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {recorderState.error}
        </div>
      )}
      
      <div className="text-center mb-4">
        <WaveformVisualizer 
          rmsLevel={recorderState.rmsLevel} 
          isActive={recorderState.isRecording && !recorderState.isPaused} 
        />
        
        <div className="mt-2 text-sm text-gray-600">
          {recorderState.isRecording 
            ? (recorderState.isPaused ? 'Recording paused' : 'Recording...') 
            : 'Ready to record'
          }
        </div>
      </div>

      <div className="flex justify-center space-x-3">
        {!recorderState.isRecording && (
          <button
            onClick={onStart}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            aria-label="Start recording"
          >
            Start
          </button>
        )}
        
        {recorderState.isRecording && !recorderState.isPaused && (
          <button
            onClick={onPause}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            aria-label="Pause recording"
          >
            Pause
          </button>
        )}
        
        {recorderState.isRecording && recorderState.isPaused && (
          <button
            onClick={onResume}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            aria-label="Resume recording"
          >
            Resume
          </button>
        )}
        
        {recorderState.isRecording && (
          <>
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              aria-label="Complete recording"
            >
              ✓
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              aria-label="Cancel recording"
            >
              ✕
            </button>
          </>
        )}
        
        {!recorderState.isRecording && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            aria-label="Close panel"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}

// Main floating mic controller component
const VoiceInputController: React.FC<{ useRealTranscription?: boolean }> = ({ useRealTranscription = true }) => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null)
  const [micPosition, setMicPosition] = useState<MicButtonPosition | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const [recorderState, recorderControls] = useRecorder()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Clear mic button when user navigates (comprehensive navigation detection)
  useEffect(() => {
    let currentUrl = window.location.href
    
    // Handle browser back/forward navigation
    const handlePopState = () => {
      setFocusedElement(null)
      setMicPosition(null)
      setIsPanelOpen(false)
    }
    
    // Handle all navigation by monitoring URL changes
    const checkForNavigation = () => {
      const newUrl = window.location.href
      if (newUrl !== currentUrl) {
        currentUrl = newUrl
        setFocusedElement(null)
        setMicPosition(null)
        setIsPanelOpen(false)
      }
    }
    
    // Handle click events on links and navigation elements
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element
      // Check if clicked element is a link or navigation element
      if (target.closest('a[href]') || 
          target.closest('[role="tab"]') || 
          target.closest('[data-navigate]') ||
          target.closest('button[onclick*="router"]') ||
          target.closest('button[onclick*="navigate"]')) {
        // Small delay to allow navigation to start
        setTimeout(() => {
          checkForNavigation()
        }, 100)
      }
    }
    
    // Monitor for URL changes using MutationObserver on document title (changes during navigation)
    const observer = new MutationObserver(() => {
      checkForNavigation()
    })
    
    // Poll for URL changes as backup (some SPA navigation might not trigger other events)
    const pollInterval = setInterval(checkForNavigation, 500)
    
    // Set up all listeners
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleClick, true) // Use capture to catch early
    observer.observe(document.querySelector('title') || document.head, {
      childList: true,
      subtree: true
    })
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleClick, true)
      observer.disconnect()
      clearInterval(pollInterval)
    }
  }, [])

  // Function to update microphone position based on focused element
  const updateMicPosition = useCallback(() => {
    if (focusedElement && document.contains(focusedElement)) {
      const rect = focusedElement.getBoundingClientRect()
      
      // Hide button if element is not visible (e.g., scrolled out of view)
      if (rect.width === 0 && rect.height === 0) {
        setMicPosition(null)
        return
      }
      
      setMicPosition({
        top: rect.top,
        left: rect.left + rect.width - 40,
        width: rect.width,
        height: rect.height,
      })
    } else if (focusedElement) {
      // Element was removed from DOM, clean up
      setFocusedElement(null)
      setMicPosition(null)
    }
  }, [focusedElement])

  useEffect(() => {
    let cleanupTimeoutId: NodeJS.Timeout | null = null

    const handleFocusIn = (event: Event) => {
      const target = event.target as Element
      
      // Cancel any pending cleanup when a new focus happens
      if (cleanupTimeoutId) {
        clearTimeout(cleanupTimeoutId)
        cleanupTimeoutId = null
      }
      
      if (isEditableElement(target)) {
        setFocusedElement(target)
        
        const rect = target.getBoundingClientRect()
        setMicPosition({
          top: rect.top,
          left: rect.left + rect.width - 40,
          width: rect.width,
          height: rect.height,
        })
      }
    }

    const handleFocusOut = (event: Event) => {
      const relatedTarget = (event as FocusEvent).relatedTarget as Element
      
      // Don't cleanup if focus moved to voice input components
      if (!relatedTarget || (!relatedTarget.closest('[data-voice-panel]') && !relatedTarget.closest('[data-mic-button]'))) {
        // Schedule cleanup with a short delay to handle rapid focus changes
        cleanupTimeoutId = setTimeout(() => {
          // Double-check that there's no newly focused editable element
          const activeElement = document.activeElement
          if (!isPanelOpen && (!activeElement || !isEditableElement(activeElement))) {
            setFocusedElement(null)
            setMicPosition(null)
          }
          cleanupTimeoutId = null
        }, 100)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      if (cleanupTimeoutId) {
        clearTimeout(cleanupTimeoutId)
      }
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [isPanelOpen])

  // Add scroll listener to update button position
  useEffect(() => {
    if (!focusedElement) return

    let rafId: number | null = null

    const handleScroll = () => {
      // Use requestAnimationFrame for smooth 60fps updates
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(updateMicPosition)
    }

    const handleResize = () => {
      updateMicPosition()
    }

    // Listen to scroll events on window and any scrollable parent elements
    window.addEventListener('scroll', handleScroll, true) // Use capture to catch all scroll events
    window.addEventListener('resize', handleResize)

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [focusedElement, updateMicPosition])

  const handleMicClick = () => {
    setIsPanelOpen(true)
  }

  const handlePanelClose = () => {
    setIsPanelOpen(false)
    recorderControls.reset()
  }

  const handleComplete = async () => {
    if (!focusedElement) return
    
    setIsTranscribing(true)
    
    try {
      let audioBlob: Blob
      
      if (recorderState.isRecording) {
        // Stop recording and get the blob
        audioBlob = await recorderControls.stopAndGetBlob()
      } else if (recorderState.audioBlob) {
        // Use existing blob if recording was already stopped
        audioBlob = recorderState.audioBlob
      } else {
        throw new Error('No audio recording available')
      }
      
      const transcribeFunction = useRealTranscription ? realTranscribe : mockTranscribe
      const text = await transcribeFunction(audioBlob)
      
      insertTextAtCursor(focusedElement, text)
    } catch (error) {
      console.error('Transcription failed:', error)
      alert('Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
      handlePanelClose()
    }
  }

  const handleCancel = () => {
    recorderControls.reset()
    handlePanelClose()
  }

  if (!focusedElement || !micPosition) return null

  return (
    <>
      <button
        data-mic-button
        onClick={handleMicClick}
        className="fixed z-[60] w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
        style={{
          top: micPosition.top + micPosition.height / 2 - 16,
          left: micPosition.left,
        }}
        aria-label="Voice input"
      >
        🎤
      </button>

      <div data-voice-panel>
        <RecordingPanel
          isOpen={isPanelOpen}
          isMobile={isMobile}
          position={micPosition}
          recorderState={recorderState}
          onStart={recorderControls.startRecording}
          onPause={recorderControls.pauseRecording}
          onResume={recorderControls.resumeRecording}
          onComplete={handleComplete}
          onCancel={handleCancel}
          onClose={handlePanelClose}
        />
      </div>

      {isTranscribing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span>Transcribing audio...</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default VoiceInputController
