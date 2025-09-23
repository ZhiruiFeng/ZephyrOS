'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ZMemoryApiKeysModule } from '../../../components/profile/modules/ZMemoryApiKeysModule'

export default function ZMemoryApiKeysPage() {
  const handleConfigChange = (newConfig: any) => {
    // In full-screen mode, we don't need to persist config changes
    // since this is primarily for viewing/managing API keys
    console.log('Config changed:', newConfig)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">ZMemory API Keys</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Your ZMemory API Keys</h2>
          <p className="text-gray-600">
            Generate and manage API keys for MCP access, Claude Code integration, and other automated workflows.
            These keys provide long-lived authentication without requiring OAuth flows.
          </p>
        </div>

        <ZMemoryApiKeysModule
          config={{
            id: 'zmemory-api-keys',
            enabled: true,
            order: 0,
            config: {
              showExpiredKeys: true,
              defaultScopes: ['tasks.read', 'tasks.write', 'memories.read', 'memories.write']
            }
          }}
          onConfigChange={handleConfigChange}
        />
      </div>
    </div>
  )
}