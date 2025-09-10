'use client'

import React from 'react'
import { Message } from './AgentChatWindow'
import { StreamingMessage } from './StreamingMessage'

interface ConversationHistoryProps {
  messages: Message[]
}

export function ConversationHistory({ messages }: ConversationHistoryProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        // Check if this is the last message and it's streaming
        const isStreaming = message.streaming && index === messages.length - 1
        
        return (
          <StreamingMessage
            key={message.id}
            message={message}
            isStreaming={isStreaming}
          />
        )
      })}
    </div>
  )
}