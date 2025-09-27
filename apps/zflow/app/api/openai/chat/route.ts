import { NextRequest } from 'next/server'
import { resolveUserOpenAIKey } from '../../../core/utils/openai-keys'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Resolve user's OpenAI key
  const userKey = await resolveUserOpenAIKey(req, 'openai_chat')
  const apiKey = userKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No OpenAI API key available (user or environment)' }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    )
  }

  try {
    const body = await req.json()

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "Missing required field 'messages'" }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      )
    }

    // Default to gpt-4o-mini for cost efficiency
    const requestBody = {
      model: body.model || 'gpt-4o-mini',
      messages: body.messages,
      max_tokens: body.max_tokens || 4000,
      temperature: body.temperature ?? 0.7,
      ...body
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return new Response(
        JSON.stringify({
          error: 'OpenAI API request failed',
          detail: errorText,
          status: response.status,
          statusText: response.statusText
        }),
        {
          status: response.status,
          headers: { 'content-type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

  } catch (error: any) {
    console.error('OpenAI chat completion error:', error)
    return new Response(
      JSON.stringify({
        error: 'Chat completion error',
        detail: String(error?.message || error)
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    )
  }
}