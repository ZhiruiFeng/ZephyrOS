'use client'

import React, { Suspense } from 'react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'

const Lazy = (Comp: React.LazyExoticComponent<React.ComponentType<any>>) => (props: any) => (
  <Suspense fallback={null}>
    <Comp {...props} />
  </Suspense>
)

const AlertCircle = Lazy(React.lazy(dynamicIconImports['alert-circle'] as any))
const Clock = Lazy(React.lazy(dynamicIconImports['clock'] as any))
const Circle = Lazy(React.lazy(dynamicIconImports['circle'] as any))

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
