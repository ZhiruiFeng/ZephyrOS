'use client'

import React, { useState, useRef } from 'react'
import { Mic, MicOff, Upload, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { ElevenLabsVoiceController } from '@/shared/intelligence/speech'

interface TranscriptionResult {
  text: string
  duration?: number
  language?: string
  speakers?: Array<{
    speaker: string
    text: string
    start_time: number
    end_time: number
  }>
}


export default function ElevenLabsSTTTestPage() {
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)


  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      setError('Failed to access microphone. Please ensure you have granted permission.')
    }
  }

  // Stop recording and transcribe
  const stopRecordingAndTranscribe = async () => {
    if (!mediaRecorderRef.current) return

    setIsRecording(false)
    mediaRecorderRef.current.stop()

    // Wait for the recording to finish
    await new Promise(resolve => setTimeout(resolve, 100))

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    await transcribeAudio(audioBlob)
  }

  // Transcribe audio using ElevenLabs API
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('model_id', 'scribe_v1')
      formData.append('diarize', 'true')
      formData.append('tag_audio_events', 'true')
      formData.append('language_code', 'en')
      
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
      setTranscriptionResult({
        text: result.text || 'No transcription available',
        duration: result.duration,
        language: result.language,
        speakers: result.speakers
      })
      
      // Auto-insert into the text input if transcription is successful
      if (result.text) {
        setInputText(prev => prev + (prev ? ' ' : '') + result.text)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 3 * 1024 * 1024 * 1024) { // 3GB limit
        setError('File size exceeds 3GB limit')
        return
      }
      
      setAudioFile(file)
      transcribeAudio(file)
    }
  }

  return (
    <>
      <ElevenLabsVoiceController fallbackToOpenAI={true} />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ElevenLabs STT Test Page
          </h1>
          <p className="text-gray-600 mb-4">
            Test ElevenLabs Speech-to-Text API integration with voice input transcription
          </p>
          <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-700">
              <strong>✨ Global Voice Input:</strong> Focus on any text input field to see the purple microphone button 
              appear - it will use ElevenLabs for transcription with OpenAI fallback!
            </p>
          </div>
          
          <div className="inline-flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-700">
              Testing ElevenLabs Scribe v1 model for high-accuracy transcription
            </span>
          </div>
        </div>


        {/* Main Test Input */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 mb-6">
          <label className="block text-sm font-medium text-blue-700 mb-2">
            🎯 Main Test Input Field
          </label>
          <p className="text-sm text-blue-600 mb-4">
            Use the recording controls below to transcribe speech directly into this field:
          </p>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Transcribed text will appear here... You can also type directly or use voice input."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
          />
          
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Character count: {inputText.length}
            </p>
            <button
              onClick={() => setInputText('')}
              className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-xs"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Recording</h2>
          
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isTranscribing}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="w-5 h-5" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                onClick={stopRecordingAndTranscribe}
                className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors animate-pulse"
              >
                <MicOff className="w-5 h-5" />
                <span>Stop & Transcribe</span>
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">or</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTranscribing}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </button>
            </div>
          </div>
          
          {audioFile && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
              Uploaded: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* Transcription Status */}
        {isTranscribing && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-200 mb-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Transcribing with ElevenLabs...</h3>
                <p className="text-sm text-yellow-600">Processing audio with Scribe v1 model</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Transcription Error</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transcription Results */}
        {transcriptionResult && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200 mb-6">
            <h2 className="text-lg font-semibold text-green-900 mb-4">Transcription Result</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  Transcribed Text:
                </label>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800">{transcriptionResult.text}</p>
                </div>
              </div>
              
              {transcriptionResult.duration && (
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Duration:
                  </label>
                  <p className="text-sm text-green-600">{transcriptionResult.duration.toFixed(2)} seconds</p>
                </div>
              )}
              
              {transcriptionResult.language && (
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Detected Language:
                  </label>
                  <p className="text-sm text-green-600">{transcriptionResult.language}</p>
                </div>
              )}
              
              {transcriptionResult.speakers && transcriptionResult.speakers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-2">
                    Speaker Diarization:
                  </label>
                  <div className="space-y-2">
                    {transcriptionResult.speakers.map((speaker, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-green-800">{speaker.speaker}</span>
                          <span className="text-xs text-green-600">
                            {speaker.start_time.toFixed(1)}s - {speaker.end_time.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-green-700">{speaker.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 bg-purple-50 rounded-xl border border-purple-200">
          <h2 className="text-lg font-semibold text-purple-900 mb-2">
            How to test:
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-purple-800 text-sm">
            <li>Click &quot;Start Recording&quot; and grant microphone permission</li>
            <li>Speak clearly into your microphone</li>
            <li>Click &quot;Stop &amp; Transcribe&quot; to process with ElevenLabs</li>
            <li>The transcribed text will automatically appear in the input field above</li>
            <li>Alternatively, upload an audio/video file (up to 3GB)</li>
          </ol>
          
          <div className="mt-4 p-3 bg-purple-100 rounded-lg">
            <p className="text-sm text-purple-700">
              <strong>Note:</strong> This implementation uses ElevenLabs Scribe v1 model 
              which supports 99 languages with over 98% accuracy. It also supports speaker 
              diarization, timestamps, and audio event detection.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 p-6 bg-indigo-50 rounded-xl border border-indigo-200">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2">
            ElevenLabs STT Features:
          </h2>
          <ul className="list-disc list-inside space-y-1 text-indigo-800 text-sm">
            <li>Support for 99 languages with &gt;98% accuracy</li>
            <li>Scribe v1 model optimized for high-accuracy transcription</li>
            <li>Speaker diarization (up to 32 speakers)</li>
            <li>Character-level and word-level timestamps</li>
            <li>Audio event detection (laughter, applause, etc.)</li>
            <li>Multi-channel support (up to 5 channels)</li>
            <li>File support: up to 3GB, up to 10 hours duration</li>
            <li>Supports both audio and video files</li>
          </ul>
        </div>
      </div>
    </div>
    </>
  )
}