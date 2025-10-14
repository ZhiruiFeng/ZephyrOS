import Link from 'next/link'
import { Mic, Maximize2 } from 'lucide-react'

interface ModuleHeaderProps {
  fullScreenPath?: string
  t: any
}

export function ModuleHeader({ fullScreenPath, t }: ModuleHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Mic className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Voice Features</h3>
          <p className="text-sm text-gray-600">Manage voice input settings and recordings</p>
        </div>
      </div>

      {fullScreenPath && (
        <Link
          href={fullScreenPath}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={t.profile.viewFullModule}
          aria-label={t.profile.viewFullModule}
        >
          <Maximize2 className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}
