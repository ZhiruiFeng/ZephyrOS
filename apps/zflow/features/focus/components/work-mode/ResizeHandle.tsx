'use client'

import React, { useRef, useEffect, useState } from 'react'
import { GripVertical } from 'lucide-react'

interface ResizeHandleProps {
  onResize: (width: number) => void
  minWidth?: number
  maxWidth?: number
  containerRef?: React.RefObject<HTMLDivElement | null>
}

const ResizeHandle = ({
  onResize,
  minWidth = 300,
  maxWidth = 800,
  containerRef
}: ResizeHandleProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const handleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef?.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width
      const mouseX = e.clientX - containerRect.left

      // Calculate conversation panel width (from right edge)
      const conversationWidth = containerWidth - mouseX

      // Apply constraints
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, conversationWidth))

      onResize(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onResize, minWidth, maxWidth, containerRef])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  return (
    <div
      ref={handleRef}
      className={`
        absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize group
        flex items-center justify-center
        transition-colors duration-150
        ${isDragging ? 'bg-primary-400' : isHovering ? 'bg-gray-300' : 'bg-transparent hover:bg-gray-200'}
      `}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Visual indicator */}
      <div className={`
        absolute inset-y-0 left-0 w-1
        transition-all duration-150
        ${isDragging ? 'bg-primary-500 w-2 -translate-x-0.5' : ''}
      `} />

      {/* Grip icon - shows on hover */}
      <div className={`
        absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
        bg-gray-400 text-white rounded px-0.5 py-1 text-xs
        transition-all duration-150
        ${isHovering || isDragging ? 'opacity-80 scale-100' : 'opacity-0 scale-75'}
      `}>
        <GripVertical className="w-3 h-3" />
      </div>
    </div>
  )
}

export default ResizeHandle