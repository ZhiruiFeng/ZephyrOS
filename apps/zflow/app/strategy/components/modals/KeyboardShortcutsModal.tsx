import React from 'react'
import { X } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const KeyboardShortcutsModal = ({ isOpen, onClose }: KeyboardShortcutsModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
            <div className="space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Switch to Vision lens</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">1</kbd>
              </div>
              <div className="flex justify-between">
                <span>Switch to Execution lens</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">2</kbd>
              </div>
              <div className="flex justify-between">
                <span>Switch to Delegation lens</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">3</kbd>
              </div>
              <div className="flex justify-between">
                <span>Switch to Reflection lens</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">4</kbd>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Search & Filters</h4>
            <div className="space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Focus search</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">/</kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle filters</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">F</kbd>
              </div>
              <div className="flex justify-between">
                <span>Clear search/close modals</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
            <div className="space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Refresh dashboard</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">R</kbd>
              </div>
              <div className="flex justify-between">
                <span>Show this help</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">?</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to close this dialog
        </div>
      </div>
    </div>
  )
}
