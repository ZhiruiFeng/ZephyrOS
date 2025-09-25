import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import React from 'react'

// Time Cell component to render the cell UI
const TimeCellComponent = ({ node, deleteNode }: any) => {
  const { timestamp } = node.attrs

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'Invalid time'
    }
  }

  return (
    <NodeViewWrapper className="time-cell-wrapper">
      <div className="time-cell border border-gray-300 rounded-lg overflow-hidden mb-4 bg-white shadow-sm">
        {/* Header */}
        <div className="time-cell-header flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>{formatTimestamp(timestamp)}</span>
          </div>
          <button
            onClick={deleteNode}
            className="text-gray-400 hover:text-red-500 text-xs px-2 py-1 hover:bg-gray-100 rounded"
          >
            ×
          </button>
        </div>
        {/* Content area */}
        <div className="time-cell-content p-3">
          <NodeViewContent className="prose prose-sm max-w-none focus:outline-none" />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// TipTap extension
export const TimeCell = Node.create({
  name: 'timeCell',

  group: 'block',

  content: 'block+',

  parseHTML() {
    return [
      {
        tag: 'div[data-type="time-cell"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'time-cell' }), 0]
  },

  addAttributes() {
    return {
      timestamp: {
        default: new Date().toISOString(),
        parseHTML: element => element.getAttribute('data-timestamp'),
        renderHTML: attributes => {
          return {
            'data-timestamp': attributes.timestamp,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(TimeCellComponent)
  },
})