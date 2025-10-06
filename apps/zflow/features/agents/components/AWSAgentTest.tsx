'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { awsAgentApi } from '../api/aws-agent-api'

export function AWSAgentTest() {
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(`test-${Date.now()}`)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await awsAgentApi.invoke({
        input: input.trim(),
        sessionId,
      })

      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setInput('')
    setSessionId(`test-${Date.now()}`)
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AWS Agent Test</h2>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Reset
        </button>
      </div>

      {/* Session ID */}
      <div>
        <label className="block text-sm font-medium mb-1">Session ID</label>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="test-session-001"
        />
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What should we do to live a better life?"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleTest()
            }
          }}
        />
        <p className="text-xs text-gray-500 mt-1">Press Cmd/Ctrl + Enter to send</p>
      </div>

      {/* Send Button */}
      <button
        onClick={handleTest}
        disabled={loading || !input.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Processing...
          </>
        ) : (
          <>
            <Send size={16} />
            Send to AWS Agent
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="font-semibold text-green-800">Success</span>
            {result.timestamp && (
              <span className="text-xs text-green-600 ml-auto">
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700 mb-1">Response:</p>
            <div className="p-3 bg-white rounded border border-green-100">
              <p className="text-gray-900 whitespace-pre-wrap">{result.message}</p>
            </div>
          </div>
          {result.actions?.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Actions ({result.actions.length}):
              </p>
              <pre className="text-xs bg-white p-2 rounded border border-green-100 overflow-auto max-h-40">
                {JSON.stringify(result.actions, null, 2)}
              </pre>
            </div>
          )}
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Metadata:</p>
              <pre className="text-xs bg-white p-2 rounded border border-green-100 overflow-auto max-h-40">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600" size={20} />
            <span className="font-semibold text-red-800">Error</span>
          </div>
          <p className="mt-2 text-red-700">{error}</p>
        </div>
      )}

      {/* Example Prompts */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-2">Example Prompts:</p>
        <div className="space-y-2">
          {[
            'What should we do to live a better life?',
            'Help me reflect on what I accomplished today',
            'Break down this task: Build a user authentication system',
            'Create a daily plan for tomorrow',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="w-full text-left px-3 py-2 text-sm bg-white border rounded hover:bg-gray-50 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
