import { NextRequest } from 'next/server'
import { transcribeAudio } from '../../core/services/transcribe'

function getZmemoryBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

async function resolveUserOpenAIKey(req: NextRequest, service: string = 'openai_whisper'): Promise<string | null> {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!auth) return null
    const base = getZmemoryBase()
    const res = await fetch(`${base}/api/internal/resolve-openai-key?service=${encodeURIComponent(service)}`, {
      headers: { Authorization: auth },
      // Server-to-server; no credentials needed
      method: 'GET',
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return data?.key || null
  } catch {
    return null
  }
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Prefer user's stored key via zmemory; fallback to env
  const userKey = await resolveUserOpenAIKey(req, 'openai_whisper')
  const apiKey = userKey || process.env.OPENAI_API_KEY
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
    return transcribeAudio({ file, language, model: requestedModel, apiKey })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Transcription error', detail: String(error?.message || error) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
