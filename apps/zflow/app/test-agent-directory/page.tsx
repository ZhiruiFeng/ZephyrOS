'use client'

import React from 'react'
import AgentDirectory from '../components/profile/modules/AgentDirectory'

export default function TestAgentDirectoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agent Directory Integration Test</h1>
          <p className="mt-2 text-gray-600">
            This page tests the AgentDirectory component with backend API integration.
          </p>
        </div>
        
        <AgentDirectory />
      </div>
    </div>
  )
}
