import React from 'react'
import { ChevronRight } from 'lucide-react'

interface TreeNodeProps {
  label: React.ReactNode
  children?: React.ReactNode
  depth?: number
}

export const TreeNode = React.memo(function TreeNode({
  label,
  children,
  depth = 0,
}: TreeNodeProps) {
  return (
    <div className="relative pl-4">
      <div className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 mt-1 text-slate-400" />
        <div className="text-sm leading-5">{label}</div>
      </div>
      {children && (
        <div className="ml-5 border-l border-dashed border-slate-200 pl-4 mt-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
})
