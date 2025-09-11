'use client'

import React, { useState } from 'react'

/**
 * Demo page showcasing the global voice input functionality.
 * This page demonstrates how the VoiceInputController works with different input types.
 */
export default function VoiceDemoPage() {
  const [textValue, setTextValue] = useState('')
  const [textareaValue, setTextareaValue] = useState('')

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Voice Input Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Focus on any input field below to see the voice input button appear
          </p>
          
          <div className="inline-flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">
              Voice input is active globally - uses ZFlow&apos;s transcription API
            </span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Focus Switching Test */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200">
            <label className="block text-sm font-medium text-blue-700 mb-2">
              🔥 Focus Switching Test
            </label>
            <p className="text-sm text-blue-600 mb-4">
              Test rapid switching between these inputs to verify the mic button doesn&apos;t flash:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Input 1 - Click me first"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <input
                type="text"
                placeholder="Input 2 - Then click me"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <input
                type="email"
                placeholder="Input 3 - Email field"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <input
                type="search"
                placeholder="Input 4 - Search field"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Regular Text Input */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Input
            </label>
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Click here and try voice input..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <p className="mt-2 text-xs text-gray-500">
              Current value: {textValue || '(empty)'}
            </p>
          </div>

          {/* Textarea */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Textarea
            </label>
            <textarea
              rows={4}
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              placeholder="Click here to focus and see the voice input button..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
            />
            <p className="mt-2 text-xs text-gray-500">
              Character count: {textareaValue.length}
            </p>
          </div>

          {/* Search Input */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Input
            </label>
            <input
              type="search"
              placeholder="Search with voice input..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Contenteditable Div */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenteditable Div
            </label>
            <div
              contentEditable
              className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              style={{ whiteSpace: 'pre-wrap' }}
              data-placeholder="Click here to edit with voice input support..."
            />
          </div>

          {/* Email Input */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Input
            </label>
            <input
              type="email"
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            How to use:
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
            <li>Focus on any input field above</li>
            <li>Click the microphone button that appears on the right</li>
            <li>Grant microphone permission when prompted (HTTPS required)</li>
            <li>Click &quot;Start&quot; to begin recording</li>
            <li>Speak clearly into your microphone</li>
            <li>Watch the waveform visualization react to your voice</li>
            <li>Click the checkmark (✓) to complete and transcribe</li>
            <li>The transcribed text will be inserted at your cursor position</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> This implementation uses ZFlow&apos;s existing transcription API 
              which integrates with OpenAI Whisper for accurate speech-to-text conversion.
            </p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-green-50 rounded-xl border border-green-200">
          <h2 className="text-lg font-semibold text-green-900 mb-2">
            Features:
          </h2>
          <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
            <li>Global detection of focusable input elements</li>
            <li>Real-time waveform visualization based on microphone input</li>
            <li>Responsive design: bottom sheet on mobile, floating card on desktop</li>
            <li>Smart text insertion at cursor position (preserves selections)</li>
            <li>Supports input, textarea, search, email, and contenteditable elements</li>
            <li>Accessible with proper ARIA labels and keyboard navigation</li>
            <li>Graceful error handling and permission management</li>
            <li><strong>Dynamic positioning:</strong> Microphone button follows input field when scrolling</li>
            <li><strong>No flashing:</strong> Stable focus switching between input fields</li>
          </ul>
        </div>

        <div className="mt-8 p-6 bg-purple-50 rounded-xl border border-purple-200">
          <h2 className="text-lg font-semibold text-purple-900 mb-2">
            🌍 Global Coverage Across ZFlow:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-purple-800 mb-2">📄 Pages:</h3>
              <ul className="list-disc list-inside space-y-1 text-purple-700 text-xs">
                <li>Main Dashboard (task search, filters)</li>
                <li>Focus → Work Mode (task descriptions)</li>
                <li>Focus → Activity (activity descriptions)</li>
                <li>Focus → Memory (memory descriptions)</li>
                <li>Profile Page (all profile inputs)</li>
                <li>Speech Page (speech-related inputs)</li>
                <li>Agents Chat (message inputs)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-800 mb-2">🔧 Modals:</h3>
              <ul className="list-disc list-inside space-y-1 text-purple-700 text-xs">
                <li>✅ Add Task Modal (title, description, tags)</li>
                <li>✅ Activity Time Modal</li>
                <li>✅ Task Time Modal</li>
                <li>✅ Daily Time Modal</li>
                <li>✅ Create Timeline Item Modal</li>
                <li>✅ Task Editor (title, description, assignee)</li>
                <li>✅ Activity Editor (all text fields)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-800 mb-2">🎨 Editors:</h3>
              <ul className="list-disc list-inside space-y-1 text-purple-700 text-xs">
                <li>✅ TipTap Rich Text Editor (contenteditable)</li>
                <li>✅ Standard HTML inputs and textareas</li>
                <li>✅ Search inputs and filters</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-800 mb-2">📱 Components:</h3>
              <ul className="list-disc list-inside space-y-1 text-purple-700 text-xs">
                <li>✅ Category selectors with search</li>
                <li>✅ Filter controls and search bars</li>
                <li>✅ Navigation search inputs</li>
                <li>✅ Mobile responsive inputs</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-purple-100 rounded-lg">
            <p className="text-xs text-purple-700">
              <strong>✨ Result:</strong> Voice input is now available on <strong>every text input field</strong> throughout 
              the entire ZFlow application, including all pages, modals, editors, and complex components!
            </p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Test Scroll Positioning:
          </h2>
          <p className="text-yellow-800 text-sm mb-4">
            Focus on any input field above, then scroll up and down to see how the microphone button 
            stays positioned correctly relative to the input field. Also try opening modals (like the task creation modal)
            to test voice input in overlay components.
          </p>
          
          {/* Add some spacer content to enable scrolling */}
          <div className="space-y-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="p-4 bg-yellow-100 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Scroll test content #{i + 1} - Focus on an input field above and scroll to test positioning
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}