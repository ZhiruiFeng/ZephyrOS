'use client'

import React from 'react'
import { Bot, User } from 'lucide-react'

export interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  context?: {
    taskId?: string
    taskTitle?: string
    subtaskId?: string
  }
}

interface ChatMessageProps {
  message: Message
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.type === 'user'
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-primary-600" />
        </div>
      )}

      <div className={`max-w-[280px] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            isUser
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          {message.context && (
            <div className={`text-xs mb-1 opacity-75 ${
              isUser ? 'text-primary-100' : 'text-gray-500'
            }`}>
              📋 {message.context.taskTitle}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </div>
  )
}

export default ChatMessage