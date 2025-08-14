'use client'

import React from 'react'
import { AlertCircle, Clock, Circle } from 'lucide-react'

// 获取优先级图标
export const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    case 'urgent':
      return <AlertCircle className="w-4 h-4 text-red-600" />
    case 'medium':
      return <Clock className="w-4 h-4 text-yellow-500" />
    case 'low':
      return <Circle className="w-4 h-4 text-gray-400" />
    default:
      return <Clock className="w-4 h-4 text-yellow-500" />
  }
}
