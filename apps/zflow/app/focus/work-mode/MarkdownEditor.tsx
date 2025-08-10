'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link, 
  Image, 
  Eye, 
  EyeOff,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Minus,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [showMobileToolbar, setShowMobileToolbar] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState({ start: 0, end: 0 })

  // Save cursor position
  const saveSelection = () => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      })
    }
  }

  // Restore cursor position
  const restoreSelection = () => {
    if (textareaRef.current) {
      textareaRef.current.setSelectionRange(selection.start, selection.end)
      textareaRef.current.focus()
    }
  }

  // Insert text at cursor position
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end)
    onChange(newValue)
    
    // Set cursor position after inserted text
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + before.length + selectedText.length + after.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }
    }, 0)
  }

  // Toolbar actions grouped by category
  const toolbarGroups = [
    {
      name: 'formatting',
      actions: [
        {
          icon: Bold,
          title: '粗体',
          action: () => insertText('**', '**')
        },
        {
          icon: Italic,
          title: '斜体',
          action: () => insertText('*', '*')
        },
        {
          icon: Code,
          title: '代码',
          action: () => insertText('`', '`')
        }
      ]
    },
    {
      name: 'headings',
      actions: [
        {
          icon: Heading1,
          title: '一级标题',
          action: () => insertText('# ')
        },
        {
          icon: Heading2,
          title: '二级标题',
          action: () => insertText('## ')
        },
        {
          icon: Heading3,
          title: '三级标题',
          action: () => insertText('### ')
        }
      ]
    },
    {
      name: 'lists',
      actions: [
        {
          icon: List,
          title: '无序列表',
          action: () => insertText('- ')
        },
        {
          icon: ListOrdered,
          title: '有序列表',
          action: () => insertText('1. ')
        },
        {
          icon: CheckSquare,
          title: '任务列表',
          action: () => insertText('- [ ] ')
        }
      ]
    },
    {
      name: 'other',
      actions: [
        {
          icon: Quote,
          title: '引用',
          action: () => insertText('> ')
        },
        {
          icon: Link,
          title: '链接',
          action: () => insertText('[', '](url)')
        },
        {
          icon: Image,
          title: '图片',
          action: () => insertText('![alt](', ')')
        },
        {
          icon: Minus,
          title: '分割线',
          action: () => insertText('\n---\n')
        }
      ]
    }
  ]

  // Flatten all actions for desktop toolbar
  const allActions = toolbarGroups.flatMap(group => group.actions)

  // Convert markdown to HTML for preview
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return ''
    
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Task lists
      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" disabled class="w-4 h-4" /><span>$1</span></div>')
      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" disabled checked class="w-4 h-4" /><span class="line-through">$1</span></div>')
      // Unordered lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/g, '<ol>$1</ol>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Horizontal rules
      .replace(/^---$/gim, '<hr />')
      // Line breaks
      .replace(/\n/g, '<br />')
    
    return html
  }

  return (
    <div className="h-full flex flex-col">
      {/* Desktop Toolbar */}
      <div className="hidden sm:block border-b border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {allActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  saveSelection()
                  action.action()
                }}
                title={action.title}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              >
                <action.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? '编辑' : '预览'}
          </button>
        </div>
      </div>

      {/* Mobile Toolbar */}
      <div className="sm:hidden border-b border-gray-200 p-2 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Most common actions always visible */}
            {toolbarGroups[0].actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  saveSelection()
                  action.action()
                }}
                title={action.title}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              >
                <action.icon className="w-4 h-4" />
              </button>
            ))}
            
            {/* More actions dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMobileToolbar(!showMobileToolbar)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showMobileToolbar && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                  <div className="p-2">
                    {toolbarGroups.slice(1).map((group, groupIndex) => (
                      <div key={groupIndex} className="mb-3 last:mb-0">
                        <div className="text-xs font-medium text-gray-500 mb-2 px-2">
                          {group.name === 'headings' ? '标题' : 
                           group.name === 'lists' ? '列表' : '其他'}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {group.actions.map((action, actionIndex) => (
                            <button
                              key={actionIndex}
                              onClick={() => {
                                saveSelection()
                                action.action()
                                setShowMobileToolbar(false)
                              }}
                              title={action.title}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-xs"
                            >
                              <action.icon className="w-4 h-4 mx-auto mb-1" />
                              <div className="text-center">{action.title}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
          >
            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="hidden xs:inline">{showPreview ? '编辑' : '预览'}</span>
          </button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-1 flex">
        {!showPreview && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 p-3 sm:p-4 resize-none border-none outline-none markdown-editor text-sm sm:text-base"
          />
        )}
        
        {showPreview && (
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
            <div 
              className="markdown-preview text-sm sm:text-base"
              dangerouslySetInnerHTML={{ 
                __html: markdownToHtml(value || '') 
              }}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-200 p-2 bg-gray-50 text-xs text-gray-500">
        {showPreview ? (
          <span>预览模式</span>
        ) : (
          <span>
            字符数: {value.length} | 
            行数: {value.split('\n').length}
          </span>
        )}
      </div>
    </div>
  )
}
