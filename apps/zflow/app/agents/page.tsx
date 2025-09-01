'use client'

import React from 'react'
import { Bot, Clock, Sparkles } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import LoginPage from '../components/auth/LoginPage'

export default function AgentsPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
        <div className="text-center">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mb-6">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI Agents
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Intelligent automation for your workflow management
            </p>
          </div>

          {/* Coming Soon Card */}
          <div className="max-w-md mx-auto">
            <div className="glass rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Coming Soon
              </h2>
              
              <p className="text-gray-600 mb-6">
                We're building intelligent agents that will help you automate and optimize your task management workflow.
              </p>
              
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Smart task prioritization</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Automated scheduling</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Intelligent notifications</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  Stay tuned for updates
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}