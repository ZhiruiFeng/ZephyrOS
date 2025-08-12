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

// 使用内置 common 语言集，不需要手动注册

interface NotionEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function NotionEditor({ value, onChange, placeholder }: NotionEditorProps) {
  const lowlight = React.useMemo(() => createLowlight(common), [])
  const initialHTML = React.useMemo(() => {
    // 如果 value 看起来像 Markdown，就转为 HTML；简单启发式判断
    const seemsMarkdown = /[#*_\-`\[\]]/.test(value || '') && !(value || '').trim().startsWith('<')
    return seemsMarkdown ? marked.parse(value || '') as string : (value || '')
  }, [value])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
      Placeholder.configure({ placeholder: placeholder || '记录你的想法...' }),
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
    ],
    content: initialHTML,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose base-content focus:outline-none min-h-[300px] max-w-none',
      },
    },
  })

  React.useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value && value !== current) {
      // 如果外部值改变（例如切换任务），同步到编辑器
      // 判断 value 是 HTML 还是 Markdown
      const seemsMarkdown = /[#*_\-`\[\]]/.test(value || '') && !(value || '').trim().startsWith('<')
      const html = seemsMarkdown ? (marked.parse(value || '') as string) : (value || '')
      editor.commands.setContent(html, { emitUpdate: false })
    }
    if (!value && current !== '<p></p>') {
      editor.commands.setContent('', { emitUpdate: false })
    }
  }, [value, editor])

  return (
    <div className="h-full flex flex-col">
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
      </div>
      <div className="flex-1 p-3 lg:p-4 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-[50vh]" />
      </div>
    </div>
  )
}


