// Server-side transcribe service to keep route thin
export async function transcribeAudio({ file, language, model, apiKey }: { file: File; language?: string; model?: string; apiKey: string }) {
  const callOpenAI = async (useModel: string): Promise<Response> => {
    const upstream = new FormData()
    upstream.append('file', file as File, (file as File).name || 'audio.webm')
    upstream.append('model', useModel)
    if (language && language !== 'auto') upstream.append('language', language)
    upstream.append('response_format', 'json')

    return fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream as any,
    })
  }

  const requestedModel = model || 'whisper-1'
  let resp = await callOpenAI(requestedModel)

  if (!resp.ok && requestedModel !== 'whisper-1') {
    const firstErrorText = await resp.text().catch(() => '')
    console.error('Transcription with model', requestedModel, 'failed:', firstErrorText)
    resp = await callOpenAI('whisper-1')
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      console.error('Fallback to whisper-1 also failed:', errText)
      return new Response(
        JSON.stringify({ error: 'OpenAI transcription failed', detail: errText || firstErrorText }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: 'OpenAI transcription failed', detail: errText }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    )
  }

  const data = await resp.json()
  return new Response(JSON.stringify({ text: data.text || '', raw: data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

