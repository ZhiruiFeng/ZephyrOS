'use client'

import React, { useEffect } from 'react'
import { Plus } from 'lucide-react'

interface FloatingAddButtonProps {
  onClick: () => void
  className?: string
  showKeyboardHint?: boolean
}

export default function FloatingAddButton({ 
  onClick, 
  className = '', 
  showKeyboardHint = true 
}: FloatingAddButtonProps) {
  
  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N 快捷键
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        onClick()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClick])

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* 键盘快捷键提示 */}
      {showKeyboardHint && (
        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          Ctrl+N
        </div>
      )}
      
      {/* 浮动按钮 */}
      <button
        onClick={onClick}
        className={`
          w-14 h-14 
          bg-blue-600 hover:bg-blue-700 
          text-white 
          rounded-full 
          shadow-lg hover:shadow-xl
          transition-all duration-200 
          flex items-center justify-center
          group
          focus:outline-none focus:ring-4 focus:ring-blue-300
          ${className}
        `}
        aria-label="新建任务 (快捷键: Ctrl+N)"
        title="新建任务 (快捷键: Ctrl+N)"
      >
        <Plus className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
      </button>
    </div>
  )
}
