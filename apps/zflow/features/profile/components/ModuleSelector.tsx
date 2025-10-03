'use client'

import React from 'react'
import {
  Settings,
  Plus,
  GripVertical,
  BarChart3,
  TrendingUp,
  Activity,
  Check,
  X,
  BookOpen,
  Bot,
  Key,
  Shield,
  Mic,
  Users,
  Server,
  BookMarked
} from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'
import type { ModuleSelectorProps } from '@/profile'

const moduleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'energy-spectrum': BarChart3,
  'stats': TrendingUp,
  'activity-summary': Activity,
  'memories': BookOpen,
  'agent-directory': Bot,
  'ai-task-grantor': Bot,
  'api-keys': Key,
  'zmemory-api-keys': Shield,
  'stt-config': Mic,
  'zrelations': Users,
  'executor-monitor': Server,
  'core-principles': BookMarked,
}

export function ModuleSelector({
  enabledModules,
  availableModules,
  onToggleModule,
  onReorderModules,
  showAsButton = false
}: ModuleSelectorProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)

  const enabledModuleIds = new Set(enabledModules.map(m => m.id))
  const availableToEnable = availableModules.filter(m => !enabledModuleIds.has(m.id))

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const newModules = [...enabledModules]
    const draggedModule = newModules[draggedIndex]
    newModules.splice(draggedIndex, 1)
    newModules.splice(dropIndex, 0, draggedModule)

    // Update order values
    const reorderedModules = newModules.map((module, index) => ({
      ...module,
      order: index
    }))

    onReorderModules(reorderedModules)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  if (showAsButton) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t.profile.addModules}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm font-medium">{t.profile.customizeModules}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t.profile.customizeModules}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Enabled Modules */}
              {enabledModules.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {t.profile.enabledModules} ({enabledModules.length})
                  </h4>
                  <div className="space-y-2">
                    {enabledModules.map((module, index) => {
                      const moduleInfo = availableModules.find(m => m.id === module.id)
                      if (!moduleInfo) return null

                      const IconComponent = moduleIcons[module.id] || BarChart3

                      return (
                        <div
                          key={module.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-move hover:bg-gray-100 transition-colors ${
                            draggedIndex === index ? 'opacity-50' : ''
                          }`}
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <IconComponent className="w-4 h-4 text-primary-600" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {moduleInfo.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {moduleInfo.description}
                            </div>
                          </div>
                          <button
                            onClick={() => onToggleModule(module.id)}
                            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Available Modules */}
              {availableToEnable.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {t.profile.availableModules} ({availableToEnable.length})
                  </h4>
                  <div className="space-y-2">
                    {availableToEnable.map((module) => {
                      const IconComponent = moduleIcons[module.id] || BarChart3

                      return (
                        <div
                          key={module.id}
                          className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <IconComponent className="w-4 h-4 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {module.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {module.description}
                            </div>
                          </div>
                          <button
                            onClick={() => onToggleModule(module.id)}
                            className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {availableToEnable.length === 0 && enabledModules.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">{t.profile.noModulesAvailable}</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
