'use client'

import { useState } from 'react'
import { Mic } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import type { ProfileModuleProps } from '@/profile'
import type { TabType } from './types'
import { ModuleHeader } from './components/ModuleHeader'
import { TabNavigation } from './components/TabNavigation'
import { RecordingsTab } from './components/RecordingsTab'
import { SettingsTab } from './components/SettingsTab'

export function VoiceModule({ config, onConfigChange, fullScreenPath }: ProfileModuleProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('recordings')

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <Mic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h4>
          <p className="text-gray-600">Please sign in to access voice features.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="border-b border-gray-100">
        <div className="p-6 pb-0">
          <ModuleHeader fullScreenPath={fullScreenPath} t={t} />
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'recordings' ? (
          <RecordingsTab config={config} onConfigChange={onConfigChange} />
        ) : (
          <SettingsTab config={config} onConfigChange={onConfigChange} />
        )}
      </div>
    </div>
  )
}
