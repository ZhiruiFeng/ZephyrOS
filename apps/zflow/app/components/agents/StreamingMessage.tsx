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
        <div className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 text-sm rounded-xl shadow-sm">
          {message.content}
        </div>
      </div>
    )
  }

  const isUser = message.type === 'user'
  const isAgent = message.type === 'agent'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-2xl px-5 py-4 shadow-sm ${
          isUser 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
            : 'bg-white border border-gray-200/50 text-gray-900 shadow-md'
        }`}>
          {/* Agent header */}
          {isAgent && (
            <div className="flex items-center space-x-3 mb-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getAgentIcon(message.agent)}</span>
                <span className="font-semibold text-gray-700 capitalize">{message.agent || 'Agent'}</span>
              </div>
              {isStreaming && (
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          )}

          {/* Message content */}
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {displayedContent}
            {isStreaming && isAgent && currentIndex < message.content.length && (
              <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse"></span>
            )}
          </div>

          {/* Tool calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.toolCalls.map((toolCall) => (
                <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTimestamp(message.timestamp)}
          {isAgent && message.agent && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-md">via {message.agent}</span>
          )}
        </div>
      </div>
    </div>
  )
}