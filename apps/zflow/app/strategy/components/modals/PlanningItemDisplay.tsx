'use client'

import React from 'react'
import { Edit3, Check, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../ui'
import type { DailyStrategyItemWithDetails, DailyStrategyStatus } from '../../../../lib/api/daily-strategy-api'

interface PlanningItemDisplayProps {
  title: string
  type: 'intention' | 'adventure' | 'priority'
  icon: React.ReactNode
  item?: DailyStrategyItemWithDetails | null
  index?: number
  placeholder?: string
  onEdit: () => void
  onMarkComplete?: (id: string) => void
}

const statusBadgeStyles: Record<DailyStrategyStatus, string> = {
  planned: 'border-blue-200 bg-blue-50 text-blue-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  completed: 'border-green-200 bg-green-50 text-green-700',
  deferred: 'border-purple-200 bg-purple-50 text-purple-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
}

const accentStyles: Record<'intention' | 'adventure' | 'priority', { card: string; aura: string; icon: string }> = {
  intention: {
    card: 'border-l-4 border-l-pink-300',
    aura: 'from-pink-50/70 via-white/90 to-white',
    icon: 'bg-pink-100 text-pink-600',
  },
  adventure: {
    card: 'border-l-4 border-l-orange-300',
    aura: 'from-orange-50/70 via-white/95 to-white',
    icon: 'bg-orange-100 text-orange-600',
  },
  priority: {
    card: 'border-l-4 border-l-blue-300',
    aura: 'from-sky-50/80 via-white/95 to-white',
    icon: 'bg-blue-100 text-blue-600',
  }
}

const microCopy: Record<'intention' | 'adventure' | 'priority', string> = {
  intention: 'Name the tone you want every moment to inherit.',
  adventure: 'Invite something delightful or courageous into the day.',
  priority: 'Shine a light on the work that moves your story forward.',
}

export function PlanningItemDisplay({
  title,
  type,
  icon,
  item,
  index,
  placeholder,
  onEdit,
  onMarkComplete
}: PlanningItemDisplayProps) {
  const formatLabel = (label?: string | null) => {
    if (!label) return ''
    return label
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const currentItem = item ?? null
  const itemTitle = currentItem?.timeline_item?.title?.trim() || currentItem?.title?.trim() || ''
  const itemDescription = currentItem?.timeline_item?.description?.trim() || currentItem?.description?.trim() || ''
  const hasContent = Boolean(itemTitle || itemDescription)
  const statusClass = currentItem?.status ? statusBadgeStyles[currentItem.status] : undefined
  const accent = accentStyles[type]
  const supportiveCopy = type === 'priority' && typeof index === 'number'
    ? `Give priority #${index + 1} the clarity it deserves.`
    : microCopy[type]

  const metadataBadges = [
    currentItem?.importance_level ? {
      key: 'importance',
      label: `${formatLabel(currentItem.importance_level)} importance`,
      className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    } : null,
    currentItem?.planned_time_of_day ? {
      key: 'timeOfDay',
      label: formatLabel(currentItem.planned_time_of_day),
      className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    } : null,
    typeof currentItem?.required_energy_level === 'number' ? {
      key: 'energy',
      label: `Energy ${currentItem.required_energy_level}/10`,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    } : null,
    typeof currentItem?.planned_duration_minutes === 'number' ? {
      key: 'duration',
      label: `${currentItem.planned_duration_minutes} min planned`,
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; className?: string }>

  return (
    <Card
      className={`relative overflow-hidden rounded-xl border shadow-sm transition-all ${accent.card} ${hasContent ? 'bg-white/95 hover:-translate-y-0.5 hover:shadow-md' : 'bg-slate-50/70 border-dashed border-slate-300 hover:border-slate-400'}`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.aura}`} aria-hidden />
      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${accent.icon}`}>
              {icon}
            </span>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {title}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {supportiveCopy}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-2 rounded-full border-slate-200 bg-white/60 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <Edit3 className="h-4 w-4" />
            <span className="text-xs font-medium">Edit</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {hasContent ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`flex-1 font-medium text-gray-900 ${currentItem?.timeline_item_id ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                onClick={() => {
                  if (currentItem?.timeline_item_id) {
                    window.open(`/focus/work-mode?taskId=${currentItem.timeline_item_id}&from=strategy`, '_blank')
                  }
                }}
                title={currentItem?.timeline_item_id ? 'Click to open task in focus mode' : ''}
              >
                {itemTitle}
              </h3>
              {currentItem?.status && (
                <Badge
                  variant="outline"
                  className={`whitespace-nowrap text-xs font-medium ${statusClass ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  {formatLabel(currentItem.status)}
                </Badge>
              )}
              {currentItem?.timeline_item_id && (
                <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-600 cursor-pointer" />
              )}
            </div>
            {itemDescription && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{itemDescription}</p>
            )}
            {metadataBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {metadataBadges.map(badge => (
                  <Badge
                    key={badge.key}
                    variant="outline"
                    className={`text-xs font-medium ${badge.className ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
            {currentItem?.status !== 'completed' && currentItem && onMarkComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkComplete(currentItem.id)}
                className="mt-3 rounded-full border-slate-300 text-slate-600 hover:border-green-400 hover:text-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
            )}
          </div>
        ) : (
          <div
            className="cursor-pointer text-sm font-medium text-slate-400 italic transition-colors hover:text-slate-600"
            onClick={onEdit}
          >
            {type === 'priority'
              ? (placeholder || `Spotlight the priority that earns your attention in slot #${(index ?? 0) + 1}.`)
              : (placeholder || `Tap to capture the intention already whispering for this day.`)
            }
          </div>
        )}
      </CardContent>
    </Card>
  )
}