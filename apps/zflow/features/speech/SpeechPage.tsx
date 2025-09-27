// =====================================================
// Speech Feature - Main Page Component
// =====================================================

'use client'

import React from 'react'
import { Mic } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { LoginPage } from '@/shared/components'
import BatchTranscriber from '@/app/speech/components/BatchTranscriber'

interface SpeechPageProps {
  className?: string
}

export function SpeechPage({ className = '' }: SpeechPageProps) {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()

  // Authentication/loading guards
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${className}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
        <div className="text-center">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-6">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t.speech.title}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.speech.description}
            </p>
          </div>

          {/* Speech to Text Card */}
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-8">
              <BatchTranscriber />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
