'use client'

import React from 'react'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from '../../../../contexts/LanguageContext'

interface ConversationButtonProps {
  onClick: () => void
  isActive: boolean
  messageCount?: number
  disabled?: boolean
}

const ConversationButton = ({
  onClick,
  isActive,
  messageCount = 0,
  disabled = false
}: ConversationButtonProps) => {
  const { t } = useTranslation()

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center px-2 py-2 rounded transition-colors text-xs min-w-[36px] relative ${
        isActive
          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title="AI Assistant"
    >
      <MessageSquare className="w-3 h-3 flex-shrink-0" />
      <span className="hidden sm:inline ml-1 truncate">
Chat
      </span>
      {messageCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {messageCount > 99 ? '99+' : messageCount}
        </span>
      )}
    </button>
  )
}

export default ConversationButton