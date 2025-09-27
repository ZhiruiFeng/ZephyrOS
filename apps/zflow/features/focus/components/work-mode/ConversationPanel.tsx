'use client'

import React, { useRef, useEffect } from 'react'
import { X, Minimize2, Maximize2 } from 'lucide-react'
import { useTranslation } from '../../../../contexts/LanguageContext'
import ChatMessage, { Message } from './ChatMessage'
import ChatInput from './ChatInput'

interface ConversationPanelProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
  onSendMessage: (content: string) => void
  currentTask?: {
    id: string
    title: string
  }
  currentSubtask?: {
    id: string
    title: string
  }
  isMinimized?: boolean
  onToggleMinimize?: () => void
  className?: string
  style?: React.CSSProperties
}

const ConversationPanel = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentTask,
  currentSubtask,
  isMinimized = false,
  onToggleMinimize,
  className = '',
  style
}: ConversationPanelProps) => {
  const { t } = useTranslation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const activeTask = currentSubtask || currentTask

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMinimized])

  if (!isOpen) return null

  return (
    <div
      className={`flex flex-col bg-white border-l border-gray-200 ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          {!isMinimized && (
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm">
                AI Assistant
              </h3>
              {activeTask && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {activeTask.title}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-1">
            {onToggleMinimize && (
              <button
                onClick={onToggleMinimize}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3 min-h-0"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="mb-2 text-2xl">💬</div>
                  <p className="text-sm font-medium mb-1">
                    Chat with AI Assistant
                  </p>
                  <p className="text-xs opacity-75">
                    Get help with your current task
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0">
            <ChatInput
              onSendMessage={onSendMessage}
              currentTask={activeTask}
              placeholder="Ask about this task..."
            />
          </div>
        </>
      )}

      {isMinimized && (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-2xl">💬</div>
        </div>
      )}
    </div>
  )
}

export default ConversationPanel