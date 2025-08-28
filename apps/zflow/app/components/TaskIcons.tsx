'use client'

import React from 'react'
import { Flag, Play, Square } from 'lucide-react'

// 获取优先级图标
export const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Flag className="w-4 h-4 text-rose-400 fill-rose-400" />
    case 'high':
      return <Flag className="w-4 h-4 text-amber-400 fill-amber-400" />
    case 'medium':
      return <Flag className="w-4 h-4 text-emerald-400 fill-emerald-400" />
    case 'low':
      return <Flag className="w-4 h-4 text-slate-300 fill-slate-300" />
    default:
      return <Flag className="w-4 h-4 text-emerald-400 fill-emerald-400" />
  }
}

// 获取计时器图标
export const getTimerIcon = (
  isRunning: boolean, 
  isCurrentTask: boolean, 
  onClick: (e: React.MouseEvent) => void,
  className?: string
) => {
  const baseClasses = "w-4 h-4 transition-colors duration-200 cursor-pointer"
  const customClasses = className || ""
  
  if (isRunning && isCurrentTask) {
    return (
      <div title="停止计时">
        <Square 
          className={`${baseClasses} text-red-500 hover:text-red-600 ${customClasses}`}
          onClick={onClick}
        />
      </div>
    )
  } else {
    return (
      <div title="开始计时">
        <Play 
          className={`${baseClasses} text-green-500 hover:text-green-600 ${customClasses}`}
          onClick={onClick}
        />
      </div>
    )
  }
}
