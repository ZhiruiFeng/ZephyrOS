import { NextRequest, NextResponse } from 'next/server'
import { resolveUserElevenLabsKey } from '../../core/utils/elevenlabs-keys'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('file') as File
    
    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: 'No audio file provided'
      }, { status: 400 })
    }
    
    // Get user's ElevenLabs API key from zmemory backend, fallback to environment
    const userKey = await resolveUserElevenLabsKey(request, 'elevenlabs_stt')
    const apiKey = userKey || process.env.ELEVENLABS_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No ElevenLabs API key configured. Please add your API key to the profile settings or set the ELEVENLABS_API_KEY environment variable.'
      }, { status: 400 })
    }
    
    // Prepare form data for ElevenLabs API
    const elevenLabsFormData = new FormData()
    elevenLabsFormData.append('file', audioFile)
    elevenLabsFormData.append('model_id', formData.get('model_id') || 'scribe_v1')
    
    // Add optional parameters
    const language = formData.get('language_code')
    const diarize = formData.get('diarize')
    const tagAudioEvents = formData.get('tag_audio_events')
    
    if (language) elevenLabsFormData.append('language_code', language)
    if (diarize) elevenLabsFormData.append('diarize', diarize)
    if (tagAudioEvents) elevenLabsFormData.append('tag_audio_events', tagAudioEvents)
    
    // Note: ElevenLabs API doesn't use response_format or timestamp_granularities
    // It returns structured JSON with transcript data by default
    
    // Make request to ElevenLabs Speech-to-Text API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'Xi-Api-Key': apiKey,
      },
      body: elevenLabsFormData,
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('ElevenLabs API error:', response.status, errorText)
      
      return NextResponse.json({
        success: false,
        error: `ElevenLabs API error: ${response.status} ${response.statusText}. ${errorText}`
      }, { status: response.status })
    }
    
    const result = await response.json()
    
    // ElevenLabs API response format
    // The response contains: transcript, detected_language, speakers (if diarization enabled)
    let transcriptionText = ''
    let speakers = []
    
    if (typeof result === 'string') {
      // If result is a plain string
      transcriptionText = result
    } else if (result.transcript) {
      // ElevenLabs returns transcript property
      transcriptionText = result.transcript
    } else if (result.text) {
      // Fallback to text property
      transcriptionText = result.text
    }
    
    // Extract speaker information if available
    if (result.speakers && Array.isArray(result.speakers)) {
      speakers = result.speakers.map((speaker: any) => ({
        speaker: speaker.speaker || 'Unknown',
        text: speaker.text || '',
        start_time: speaker.start_time || 0,
        end_time: speaker.end_time || 0
      }))
    }
    
    return NextResponse.json({
      success: true,
      text: transcriptionText,
      language: result.detected_language || result.language,
      speakers: speakers,
      raw_result: result // Include raw result for debugging
    })
    
  } catch (error) {
    console.error('ElevenLabs transcription error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed'
    }, { status: 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}