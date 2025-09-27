'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Sparkles } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  placeholder?: string
  currentTask?: {
    id: string
    title: string
  }
}

const ChatInput = ({
  onSendMessage,
  disabled = false,
  placeholder,
  currentTask
}: ChatInputProps) => {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const defaultPlaceholder = 'Ask AI assistant about your task...'

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled && !isTyping) {
      onSendMessage(message.trim())
      setMessage('')
      setIsTyping(true)
      // Simulate AI response delay
      setTimeout(() => setIsTyping(false), 2000)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickActions = [
    {
      id: 'help',
      label: 'Help with this task',
      icon: Sparkles,
      message: currentTask ? `Help me with my task: "${currentTask.title}"` : 'Help me with my current task'
    },
    {
      id: 'analyze',
      label: 'Analyze my notes',
      icon: Paperclip,
      message: 'Please analyze my notes and provide insights'
    }
  ]

  const handleQuickAction = (actionMessage: string) => {
    if (!disabled && !isTyping) {
      onSendMessage(actionMessage)
      setIsTyping(true)
      setTimeout(() => setIsTyping(false), 2000)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      {/* Quick Actions */}
      <div className="flex gap-1 mb-2 overflow-x-auto">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action.message)}
            disabled={disabled || isTyping}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <action.icon className="w-3 h-3" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled || isTyping}
            className="w-full px-2 py-2 border border-gray-300 rounded resize-none min-h-[36px] max-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
            rows={1}
          />
          {isTyping && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-gray-400">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              AI is typing...
            </div>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isTyping}
          className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[36px]"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Context Indicator */}
      {currentTask && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          Context: {currentTask.title}
        </div>
      )}
    </div>
  )
}

export default ChatInput