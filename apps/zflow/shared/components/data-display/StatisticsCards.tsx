'use client'

import React from 'react'
import { Clock, ListTodo, Archive } from 'lucide-react'

export type ViewKey = 'current' | 'future' | 'archive'

interface StatisticsCardsProps {
  stats: {
    current: number
    future: number
    archive: number
  }
  activeView: ViewKey
  onViewChange: (view: ViewKey) => void
  t: any // translations
}

export default function StatisticsCards({ stats, activeView, onViewChange, t }: StatisticsCardsProps) {
  const cards: Array<{
    key: ViewKey
    icon: any
    title: string
    description: any
    count: number
    iconBgColor: string
    iconColor: string
    countColor: string
    borderColor?: string
  }> = [
    {
      key: 'current' as ViewKey,
      icon: Clock,
      title: 'Current',
      description: `${t.ui?.inProgress || 'In Progress'} + Completed within 24h`,
      count: stats.current,
      iconBgColor: 'bg-primary-100',
      iconColor: 'text-primary-600',
      countColor: 'text-primary-600',
      borderColor: 'border-primary-300'
    },
    {
      key: 'future' as ViewKey,
      icon: ListTodo,
      title: 'Future',
      description: t.ui?.backlogItems || 'Backlog Items',
      count: stats.future,
      iconBgColor: 'bg-primary-200',
      iconColor: 'text-primary-700',
      countColor: 'text-primary-700',
      borderColor: 'border-primary-300'
    },
    {
      key: 'archive' as ViewKey,
      icon: Archive,
      title: 'Archive',
      description: 'Archived + Cancelled',
      count: stats.archive,
      iconBgColor: 'bg-primary-300',
      iconColor: 'text-primary-800',
      countColor: 'text-primary-800',
      borderColor: 'border-primary-300'
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
      {cards.map((card) => {
        const Icon = card.icon
        const isActive = activeView === card.key
        const borderColor = card.borderColor || 'border-primary-300'
        
        return (
          <button
            key={card.key}
            onClick={() => onViewChange(card.key)}
            className={`glass rounded-lg md:rounded-xl p-3 md:p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
              isActive 
                ? `${borderColor} shadow-md -translate-y-0.5` 
                : ''
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 ${card.iconBgColor} rounded-lg flex items-center justify-center mx-auto md:mx-0`}>
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${card.iconColor}`} />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xs md:text-sm font-medium text-gray-600">{card.title}</h3>
                <p className="text-xs text-gray-500 hidden md:block">{card.description}</p>
              </div>
            </div>
            <p className={`text-xl md:text-3xl font-bold ${card.countColor} text-center md:text-left`}>
              {card.count}
            </p>
          </button>
        )
      })}
    </div>
  )
}
