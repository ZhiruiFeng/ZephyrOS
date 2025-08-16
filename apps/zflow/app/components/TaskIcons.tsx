'use client'

import React from 'react'
import { Flag } from 'lucide-react'

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
