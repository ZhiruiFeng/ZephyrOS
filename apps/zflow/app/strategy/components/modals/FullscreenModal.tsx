'use client'

import React from 'react'
import { X, Minimize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FullscreenModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function FullscreenModal({
  isOpen,
  onClose,
  title,
  children,
  icon,
  className = ''
}: FullscreenModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative bg-white rounded-2xl shadow-2xl w-[98vw] h-[95vh] max-w-8xl mx-4 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white shrink-0">
            <div className="flex items-center gap-4">
              {icon && (
                <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
                title="Exit fullscreen"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-white ${className}`}>
            <div className="h-full p-8">
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Hook for managing fullscreen state
export function useFullscreenModal() {
  const [isOpen, setIsOpen] = React.useState(false)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])

  return {
    isOpen,
    open,
    close
  }
}