'use client'

import React, { memo, useRef, useState } from 'react'
import { FileText, X, Bot, User, Sparkles, Send, MessageSquare } from 'lucide-react'
import { NotionEditor } from '@/shared/components/editors'
import { TaskMemory } from '@/lib/api'
import { useTranslation } from '@/contexts/LanguageContext'
import { TaskWithCategory } from './TaskSidebar'
import WorkModeEditorHeader from './WorkModeEditorHeader'
import ConversationPanel from './ConversationPanel'
import ResizeHandle from './ResizeHandle'
import { Task } from 'types'
import { Message } from './ChatMessage'

interface WorkModeEditorProps {
  selectedTask: TaskWithCategory | null
  selectedSubtask: TaskMemory | null
  notes: string
  setNotes: (notes: string) => void
  onStatusChange?: (newStatus: Task['status']) => void
  // Conversation props
  conversationOpen: boolean
  onConversationClose: () => void
  onConversationOpen: () => void
  conversationMessages: Message[]
  onSendMessage: (content: string) => void
  conversationMinimized: boolean
  onToggleConversationMinimize: () => void
  conversationWidth: number
  onConversationWidthChange: (width: number) => void
}

const WorkModeEditor = memo(function WorkModeEditor({
  selectedTask,
  selectedSubtask,
  notes,
  setNotes,
  onStatusChange,
  conversationOpen,
  onConversationClose,
  onConversationOpen,
  conversationMessages,
  onSendMessage,
  conversationMinimized,
  onToggleConversationMinimize,
  conversationWidth,
  onConversationWidthChange
}: WorkModeEditorProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [conversationInput, setConversationInput] = useState('')

  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.ui.selectTaskToStart}</h3>
          <p className="text-gray-600">{t.ui.selectTaskFromLeft}</p>
        </div>
      </div>
    )
  }

  const actualConversationWidth = conversationMinimized ? 64 : conversationWidth

  return (
    <>
      {/* Desktop Layout */}
      <div ref={containerRef} className="hidden lg:flex flex-1 min-h-0 relative">
        {/* Main Editor Area */}
        <div
          className="flex flex-col min-h-0 p-6 transition-all duration-300"
          style={{
            width: conversationOpen
              ? `calc(100% - ${actualConversationWidth}px)`
              : '100%',
            paddingRight: conversationOpen ? '8px' : '24px'
          }}
        >
          <WorkModeEditorHeader
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            onStatusChange={onStatusChange}
          />
          <div className="flex-1 min-h-0">
            <NotionEditor
              value={notes}
              onChange={setNotes}
              placeholder={t.ui.writeNotesHere}
            />
          </div>
        </div>

        {/* Desktop Conversation Panel */}
        <ConversationPanel
          isOpen={conversationOpen}
          onClose={onConversationClose}
          messages={conversationMessages}
          onSendMessage={onSendMessage}
          currentTask={selectedTask ? {
            id: selectedTask.id,
            title: selectedTask.content.title
          } : undefined}
          currentSubtask={selectedSubtask ? {
            id: selectedSubtask.id,
            title: selectedSubtask.content.title || ''
          } : undefined}
          isMinimized={conversationMinimized}
          onToggleMinimize={onToggleConversationMinimize}
          className="relative"
          style={{
            width: conversationOpen ? `${actualConversationWidth}px` : '0px'
          }}
        />

        {/* Desktop Resize Handle */}
        {conversationOpen && !conversationMinimized && (
          <ResizeHandle
            onResize={onConversationWidthChange}
            minWidth={300}
            maxWidth={800}
            containerRef={containerRef}
          />
        )}
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col relative">
        {/* Main Editor Area */}
        <div className="flex-1 min-h-0 flex flex-col p-4">
          <WorkModeEditorHeader
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            onStatusChange={onStatusChange}
          />
          <div className="flex-1 min-h-0">
            <NotionEditor
              value={notes}
              onChange={setNotes}
              placeholder={t.ui.writeNotesHere}
            />
          </div>
        </div>

        {/* Mobile Floating Chat Button */}
        {!conversationOpen && selectedTask && (
          <button
            onClick={onConversationOpen}
            className="fixed bottom-6 right-6 z-40 p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
            aria-label="Open AI Assistant"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}

        {/* Mobile Conversation Overlay */}
        {conversationOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
            {/* Mobile Conversation Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-base">
                    AI Assistant
                  </h3>
                  {(selectedSubtask || selectedTask) && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {selectedSubtask?.content.title || selectedTask?.content.title}
                    </p>
                  )}
                </div>
                <button
                  onClick={onConversationClose}
                  className="ml-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
              {conversationMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 max-w-sm">
                    <div className="mb-4 text-4xl">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Chat with AI Assistant
                    </h3>
                    <p className="text-sm opacity-75">
                      Get help with your current task, ask questions, or brainstorm ideas
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {conversationMessages.map((message) => (
                    <div key={message.id} className="mb-4">
                      <div className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.type === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-primary-600" />
                          </div>
                        )}

                        <div className={`max-w-[280px] ${message.type === 'user' ? 'order-first' : ''}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl text-sm ${
                              message.type === 'user'
                                ? 'bg-primary-600 text-white rounded-br-md'
                                : 'bg-gray-100 text-gray-900 rounded-bl-md'
                            }`}
                          >
                            {message.context && (
                              <div className={`text-xs mb-2 opacity-75 ${
                                message.type === 'user' ? 'text-primary-100' : 'text-gray-500'
                              }`}>
                                📋 {message.context.taskTitle}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                          </div>
                          <div className={`text-xs text-gray-400 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {message.type === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Mobile Input Area - Fixed at bottom */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 pb-safe-bottom">
              {/* Quick Actions */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                <button
                  onClick={() => onSendMessage(selectedTask ? `Help me with my task: "${selectedTask.content.title}"` : 'Help me with my current task')}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  Help with this task
                </button>
                <button
                  onClick={() => onSendMessage('Please analyze my notes and provide insights')}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  Analyze notes
                </button>
              </div>

              {/* Input */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <textarea
                    value={conversationInput}
                    onChange={(e) => setConversationInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (conversationInput.trim()) {
                          onSendMessage(conversationInput.trim())
                          setConversationInput('')
                        }
                      }
                    }}
                    placeholder="Ask about this task..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none min-h-[48px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                    rows={1}
                    style={{
                      height: 'auto',
                      minHeight: '48px'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    if (conversationInput.trim()) {
                      onSendMessage(conversationInput.trim())
                      setConversationInput('')
                    }
                  }}
                  disabled={!conversationInput.trim()}
                  className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px] min-h-[48px]"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Context indicator */}
              {(selectedSubtask || selectedTask) && (
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Context: {selectedSubtask?.content.title || selectedTask?.content.title}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
})

export default WorkModeEditor
