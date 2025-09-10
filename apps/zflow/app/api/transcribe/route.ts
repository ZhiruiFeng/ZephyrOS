import { NextRequest } from 'next/server'
import { transcribeAudio } from '../../core/services/transcribe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set on server' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data with 'file'" }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const form = await req.formData()
    const file = form.get('file')
    const language = (form.get('language') as string) || 'auto'
    const requestedModel = (form.get('model') as string) || 'whisper-1'

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing 'file' in form-data" }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }
    return transcribeAudio({ file, language, model: requestedModel, apiKey })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Transcription error', detail: String(error?.message || error) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}

