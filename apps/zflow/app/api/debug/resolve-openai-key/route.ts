import { NextRequest, NextResponse } from 'next/server'
import { resolveUserOpenAIKey } from '../../../core/utils/openai-keys'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const service = searchParams.get('service') || 'openai_whisper'

    const key = await resolveUserOpenAIKey(req, service)

    if (!key) {
      return NextResponse.json({ ok: false, service, found: false })
    }

    // Mask the key for safety in any environment
    const last4 = key.slice(-4)
    return NextResponse.json({ ok: true, service, found: true, preview: `***${last4}` })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message || error) }, { status: 500 })
  }
}

