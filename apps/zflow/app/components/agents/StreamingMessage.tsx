'use client'

import React, { useState, useEffect } from 'react'
import { Loader, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Message, ToolCall } from './AgentChatWindow'
import { ToolCallDisplay } from './ToolCallDisplay'

interface StreamingMessageProps {
  message: Message
  isStreaming?: boolean
}

export function StreamingMessage({ message, isStreaming = false }: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  // Simulate streaming effect for agent messages
  useEffect(() => {
    if (message.type === 'agent' && isStreaming && message.content) {
      const interval = setInterval(() => {
        if (currentIndex < message.content.length) {
          setDisplayedContent(message.content.slice(0, currentIndex + 1))
          setCurrentIndex(prev => prev + 1)
        } else {
          clearInterval(interval)
        }
      }, 20) // Adjust speed as needed

      return () => clearInterval(interval)
    } else {
      setDisplayedContent(message.content)
      setCurrentIndex(message.content.length)
    }
  }, [message.content, isStreaming, currentIndex, message.type])

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  }

  const getAgentIcon = (agent?: string) => {
    switch (agent) {
      case 'gpt-4':
        return '🧠'
      case 'claude':
        return '🎭'
      case 'bedrock':
        return '⛰️'
      default:
        return '🤖'
    }
  }

  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
          {message.content}
        </div>
      </div>
    )
  }

  const isUser = message.type === 'user'
  const isAgent = message.type === 'agent'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          {/* Agent header */}
          {isAgent && (
            <div className="flex items-center space-x-2 mb-2 text-sm text-gray-600">
              <span className="text-base">{getAgentIcon(message.agent)}</span>
              <span className="font-medium capitalize">{message.agent || 'Agent'}</span>
              {isStreaming && (
                <Loader size={14} className="animate-spin text-blue-500" />
              )}
            </div>
          )}

          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {displayedContent}
            {isStreaming && isAgent && currentIndex < message.content.length && (
              <span className="animate-pulse">▋</span>
            )}
          </div>

          {/* Tool calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.toolCalls.map((toolCall) => (
                <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTimestamp(message.timestamp)}
          {isAgent && message.agent && (
            <span className="ml-2">via {message.agent}</span>
          )}
        </div>
      </div>
    </div>
  )
}