'use client'

import React from 'react'
import Link from 'next/link'
import { useSTTConfig } from '../../../contexts/STTConfigContext'

export default function STTConfigTestPage() {
  const { config, isLoading, error, updateConfig } = useSTTConfig()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading STT configuration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <p className="text-red-600 mb-4">Error loading STT configuration:</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">STT Configuration Test</h1>
          
          {/* Current Configuration */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Configuration</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Provider:</span>
                  <span className="ml-2 text-gray-900">
                    {config.provider === 'elevenlabs' ? 'ElevenLabs Scribe' : 'OpenAI Whisper'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Auto-save:</span>
                  <span className="ml-2 text-gray-900">{config.autoSave ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Show Provider in UI:</span>
                  <span className="ml-2 text-gray-900">{config.showProviderInUI ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Update Configuration</h2>
            
            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">STT Provider</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="provider"
                    value="elevenlabs"
                    checked={config.provider === 'elevenlabs'}
                    onChange={(e) => updateConfig({ provider: e.target.value as 'elevenlabs' | 'openai' })}
                    className="mr-2"
                  />
                  ElevenLabs Scribe
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="provider"
                    value="openai"
                    checked={config.provider === 'openai'}
                    onChange={(e) => updateConfig({ provider: e.target.value as 'elevenlabs' | 'openai' })}
                    className="mr-2"
                  />
                  OpenAI Whisper
                </label>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto-save changes</label>
                  <p className="text-xs text-gray-500">Automatically save configuration changes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={config.autoSave}
                    onChange={(e) => updateConfig({ autoSave: e.target.checked })}
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${
                    config.autoSave ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      config.autoSave ? 'translate-x-5' : 'translate-x-0'
                    } mt-0.5 ml-0.5`} />
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Show provider in UI</label>
                  <p className="text-xs text-gray-500">Display which STT provider is active in voice input</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={config.showProviderInUI}
                    onChange={(e) => updateConfig({ showProviderInUI: e.target.checked })}
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${
                    config.showProviderInUI ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      config.showProviderInUI ? 'translate-x-5' : 'translate-x-0'
                    } mt-0.5 ml-0.5`} />
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Test Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Go to the <Link href="/profile" className="underline">Profile page</Link> to see the STT configuration module</li>
              <li>Try the voice input functionality in different parts of the app:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><Link href="/" className="underline">Main page</Link> - Look for the floating microphone button</li>
                  <li><Link href="/memories" className="underline">Memories page</Link> - Try creating a new memory with voice input</li>
                  <li><Link href="/speech" className="underline">Speech page</Link> - Test the batch transcriber</li>
                </ul>
              </li>
              <li>Toggle the &quot;Show provider in UI&quot; setting to see the provider displayed during voice input</li>
              <li>Switch between ElevenLabs and OpenAI providers to test different transcription services</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
