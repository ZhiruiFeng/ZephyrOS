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
    const nextValue = value.slice(0, start) + text + value.slice(end)

    // Use native setter to ensure React value tracker updates
    const proto = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
    const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (valueSetter) {
      valueSetter.call(element, nextValue)
    } else {
      element.value = nextValue
    }
    element.selectionStart = element.selectionEnd = start + text.length
    element.focus()
    // Ensure React controlled inputs receive change
    try {
      const inputEvent = new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText', composed: true })
      element.dispatchEvent(inputEvent)
    } catch {
      const fallbackEvent = new Event('input', { bubbles: true })
      element.dispatchEvent(fallbackEvent)
    }
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
    // Dispatch input for contentEditable to notify React listeners
    try {
      const inputEvent = new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText', composed: true })
      element.dispatchEvent(inputEvent)
    } catch {
      const fallbackEvent = new Event('input', { bubbles: true })
      element.dispatchEvent(fallbackEvent)
    }
  }
}

const isEditableElement = (element: Element): element is HTMLInputElement | HTMLTextAreaElement | HTMLElement => {
  if (element instanceof HTMLInputElement) {
    return ['text', 'search', 'url', 'tel', 'email', 'password'].includes(element.type)
  }
  return element instanceof HTMLTextAreaElement || (element instanceof HTMLElement && element.isContentEditable)
}

// ElevenLabs transcription service
const elevenLabsTranscribe = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  formData.append('model_id', 'scribe_v1')
  formData.append('diarize', 'false')
  formData.append('tag_audio_events', 'true')
  
  try {
    // Include auth header so the server can resolve user API key
    const { getAuthHeader } = await import('../../../lib/supabase')
    const authHeaders = await getAuthHeader()
    const response = await fetch('/api/elevenlabs-transcribe', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }
    
    const result = await response.json()
    return result.text || 'No transcription available'
  } catch (error) {
    console.error('ElevenLabs transcription error:', error)
    throw new Error(error instanceof Error ? error.message : 'ElevenLabs transcription failed')
  }
}

// OpenAI transcription service (fallback)
const openaiTranscribe = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.wav')
  
  try {
    const { getAuthHeader } = await import('../../../lib/supabase')
    const authHeaders = await getAuthHeader()
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })
    
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Transcription failed: ${response.status} ${response.statusText} ${errText}`)
    }

    const result = await response.json()
    return result.text || ''
  } catch (error) {
    console.error('OpenAI Transcription error:', error)
    throw new Error('Failed to transcribe audio with OpenAI. Please try again.')
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
      
      // Set up media recorder with webm format for better ElevenLabs compatibility
      mediaRecorderRef.current = new MediaRecorder(stream, { 
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      })
      chunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
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
        const handleStop = () => {
          mediaRecorderRef.current?.removeEventListener('stop', handleStop)
          setTimeout(() => {
            if (state.audioBlob) {
              resolve(state.audioBlob)
            } else {
              const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
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
        className="bg-purple-500 transition-all duration-150 ease-out"
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
      aria-label="ElevenLabs voice recording panel"
      className="bg-white border border-purple-200 p-6 z-[60]"
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
            ? (recorderState.isPaused ? 'Recording paused' : 'Recording with ElevenLabs...') 
            : 'Ready to record with ElevenLabs'
          }
        </div>
      </div>

      <div className="flex justify-center space-x-3">
        {!recorderState.isRecording && (
          <button
            onClick={onStart}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            aria-label="Start recording with ElevenLabs"
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
              aria-label="Complete recording and transcribe with ElevenLabs"
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

// Main ElevenLabs voice controller component
const ElevenLabsVoiceController: React.FC<{ fallbackToOpenAI?: boolean }> = ({ fallbackToOpenAI = true }) => {
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

  // Update microphone position based on focused element
  const updateMicPosition = useCallback(() => {
    if (focusedElement && document.contains(focusedElement)) {
      const rect = focusedElement.getBoundingClientRect()
      
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
      setFocusedElement(null)
      setMicPosition(null)
    }
  }, [focusedElement])

  useEffect(() => {
    let cleanupTimeoutId: NodeJS.Timeout | null = null

    const handleFocusIn = (event: Event) => {
      const target = event.target as Element
      
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
      
      if (!relatedTarget || (!relatedTarget.closest('[data-voice-panel]') && !relatedTarget.closest('[data-mic-button]'))) {
        cleanupTimeoutId = setTimeout(() => {
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
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(updateMicPosition)
    }

    const handleResize = () => {
      updateMicPosition()
    }

    window.addEventListener('scroll', handleScroll, true)
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
        audioBlob = await recorderControls.stopAndGetBlob()
      } else if (recorderState.audioBlob) {
        audioBlob = recorderState.audioBlob
      } else {
        throw new Error('No audio recording available')
      }
      
      let text = ''
      
      try {
        // Try ElevenLabs first
        text = await elevenLabsTranscribe(audioBlob)
      } catch (error) {
        console.error('ElevenLabs transcription failed:', error)
        
        if (fallbackToOpenAI) {
          console.log('Falling back to OpenAI transcription...')
          text = await openaiTranscribe(audioBlob)
        } else {
          throw error
        }
      }
      
      insertTextAtCursor(focusedElement, text)
    } catch (error) {
      console.error('Transcription failed:', error)
      alert(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        className="fixed z-[60] w-8 h-8 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
        style={{
          top: micPosition.top + micPosition.height / 2 - 16,
          left: micPosition.left,
        }}
        aria-label="ElevenLabs voice input"
        title="ElevenLabs Voice Input"
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span>Transcribing with ElevenLabs...</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ElevenLabsVoiceController