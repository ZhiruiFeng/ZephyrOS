import { NextRequest } from 'next/server'
import { transcribeAudio } from '../../core/services/transcribe'
import { resolveUserOpenAIKey } from '../../core/utils/openai-keys'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Prefer user's stored key via zmemory; fallback to env
  const userKey = await resolveUserOpenAIKey(req, 'openai_whisper')
  const apiKey = userKey || process.env.OPENAI_API_KEY
  // Log source and masked preview for diagnostics (never log full secrets)
  if (apiKey) {
    const source = userKey ? 'user' : 'environment'
    const preview = `***${apiKey.slice(-4)}`
    console.log('[transcribe] Resolved OpenAI API key:', { source, preview })
  }
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No OpenAI API key available (user or environment)' }), {
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
    // Call upstream and attach debug headers for frontend logging
    const upstreamResp = await transcribeAudio({ file, language, model: requestedModel, apiKey })
    const headers = new Headers(upstreamResp.headers)
    const source = userKey ? 'user' : 'environment'
    const preview = `***${apiKey.slice(-4)}`
    headers.set('x-openai-key-source', source)
    headers.set('x-openai-key-preview', preview)
    return new Response(upstreamResp.body, { status: upstreamResp.status, headers })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Transcription error', detail: String(error?.message || error) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
