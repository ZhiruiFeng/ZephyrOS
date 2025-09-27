'use client'

import React from 'react'
import { Bot } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { LoginPage } from '@/shared/components'

// Import the existing implementation temporarily
// This will be refactored as we complete the migration
import AgentsPageImpl from '@/app/agents/AgentsPageImpl'

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

  // For now, delegate to existing implementation
  // This allows us to maintain functionality while gradually migrating
  return <AgentsPageImpl />
}