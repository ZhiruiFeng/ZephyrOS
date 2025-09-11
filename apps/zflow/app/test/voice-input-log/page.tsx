"use client"

import React from 'react'

type TranscribeLog = {
  ok?: boolean
  source?: string | null
  preview?: string | null
  status?: number
  path?: string
  error?: string
  at: number
}

export default function VoiceInputLogTestPage() {
  const [logs, setLogs] = React.useState<TranscribeLog[]>([])

  React.useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent<TranscribeLog>
      const detail = evt.detail || { at: Date.now() }
      setLogs(prev => [{ ...detail }, ...prev].slice(0, 20))
    }
    window.addEventListener('zflow-transcribe-log', handler as EventListener)
    return () => {
      window.removeEventListener('zflow-transcribe-log', handler as EventListener)
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Voice Input + Transcribe Log</h1>
      <p className="text-gray-600">
        Focus the input below to reveal the voice input button (floating mic). Record, then complete to transcribe.
        Debug info emitted by the transcribe API appears in the log list.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Sample input</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Click here, then use the floating mic to dictate..."
        />
        <p className="text-xs text-gray-500">Transcribed text will be inserted at the cursor.</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md border border-gray-300 px-3 py-1 text-sm"
          onClick={() => setLogs([])}
        >
          Clear logs
        </button>
      </div>

      <div className="rounded-md border border-gray-200 bg-white">
        <div className="border-b px-4 py-2 text-sm font-medium">Transcribe Logs</div>
        <ul className="divide-y text-sm">
          {logs.length === 0 && (
            <li className="px-4 py-3 text-gray-500">No logs yet. Try a transcription.</li>
          )}
          {logs.map((l, idx) => (
            <li key={idx} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${l.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {l.ok ? 'OK' : 'FAIL'}
                </span>
                {l.status !== undefined && (
                  <span className="text-gray-600">status: {l.status}</span>
                )}
                {l.source && (
                  <span className="text-gray-600">source: {l.source}</span>
                )}
                {l.preview && (
                  <span className="text-gray-600">preview: {l.preview}</span>
                )}
                <span className="text-gray-400">{new Date(l.at).toLocaleTimeString()}</span>
              </div>
              {l.error && (
                <div className="mt-1 text-gray-700">{l.error}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

