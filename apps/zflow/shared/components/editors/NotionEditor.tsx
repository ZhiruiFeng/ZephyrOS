'use client'

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Blockquote from '@tiptap/extension-blockquote'
import Typography from '@tiptap/extension-typography'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { marked } from 'marked'
import { Clock } from 'lucide-react'
import { TimeCell } from './TimeCell'

// 使用内置 common 语言集，不需要手动注册

interface NotionEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  // Controls emitted value format; default 'html'.
  output?: 'html' | 'text'
}

export default function NotionEditor({ value, onChange, placeholder, output = 'html' }: NotionEditorProps) {
  const lowlight = React.useMemo(() => createLowlight(common), [])
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const initialHTML = React.useMemo(() => {
    const v = value || ''
    if (output === 'text') {
      return v ? `<p>${escapeHtml(v).replace(/\n/g, '<br />')}</p>` : ''
    }
    // 如果 value 看起来像 Markdown，就转为 HTML；简单启发式判断
    const seemsMarkdown = /[#*_\-`\[\]]/.test(v) && !v.trim().startsWith('<')
    return seemsMarkdown ? (marked.parse(v) as string) : v
  }, [value, output])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
      Placeholder.configure({ placeholder: placeholder || 'Write your thoughts here...' }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      HorizontalRule,
      Blockquote,
      Typography,
      Dropcursor,
      Gapcursor,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TimeCell,
    ],
    content: initialHTML,
    onUpdate: ({ editor }) => {
      const out = output === 'text' ? editor.getText() : editor.getHTML()
      onChange(out)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose base-content focus:outline-none min-h-[300px] max-w-none w-full notion-editor',
      },
    },
  })

  React.useEffect(() => {
    if (!editor) return
    const currentOut = output === 'text' ? editor.getText() : editor.getHTML()

    // If external value matches current editor content (in the same representation), skip
    if ((value || '') === (currentOut || '')) return

    // When external value changes (e.g., switching item), set editor content without emitting update
    // Use scheduler to avoid flushSync issues
    setTimeout(() => {
      let html = ''
      const v = value || ''
      if (!v) {
        editor.commands.setContent('', { emitUpdate: false })
        return
      }

      if (output === 'text') {
        html = `<p>${escapeHtml(v).replace(/\n/g, '<br />')}</p>`
      } else {
        const seemsMarkdown = /[#*_\-`\[\]]/.test(v) && !v.trim().startsWith('<')
        html = seemsMarkdown ? (marked.parse(v) as string) : v
      }
      editor.commands.setContent(html, { emitUpdate: false })
    }, 0)
  }, [value, editor, output])

  const insertTimeCell = React.useCallback(() => {
    if (!editor) return

    // Insert TimeCell node using insertContent
    editor.chain().focus().insertContent({
      type: 'timeCell',
      attrs: {
        timestamp: new Date().toISOString(),
      },
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Enter your notes for this time session...'
            }
          ]
        }
      ]
    }).run()
  }, [editor])

  return (
    <div className="flex flex-col min-h-full">
      {/* 工具栏（简洁 Notion 风格） */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
        <button onClick={() => editor?.chain().focus().toggleBold().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">B</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded"><em>I</em></button>
        <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded"><span className="underline">U</span></button>
        <button onClick={() => editor?.chain().focus().toggleStrike().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded"><s>S</s></button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">H1</button>
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">H2</button>
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">H3</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">• List</button>
        <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">1. List</button>
        <button onClick={() => editor?.chain().focus().toggleTaskList().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">[ ] Task</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">❝ Quote</button>
        <button onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">— HR</button>
        <button onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className="px-2 py-1 text-sm hover:bg-gray-200 rounded">{'</>'} Code</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button onClick={insertTimeCell} className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-gray-200 rounded">
          <Clock className="w-3 h-3" />
          Time Cell
        </button>
      </div>
      <div className="flex-1 p-3 lg:p-4">
        <style jsx>{`
          .time-cell-wrapper {
            margin: 1rem 0;
          }
          .time-cell {
            border-left: 4px solid #1f75fe;
            background: #fafbfc;
            transition: all 0.2s ease;
          }
          .time-cell:hover {
            border-left-color: #0066cc;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .time-cell-header {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 12px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          }
          .time-cell-content {
            min-height: 60px;
            background: white;
          }
          .time-cell-content .ProseMirror {
            outline: none;
            border: none;
            padding: 0;
            margin: 0;
          }
          .time-cell-content .ProseMirror p:last-child {
            margin-bottom: 0;
          }
        `}</style>
        <EditorContent editor={editor} className="min-h-[300px] w-full" />
      </div>
    </div>
  )
}
