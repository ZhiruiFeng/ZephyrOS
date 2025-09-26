"use client"

import React from 'react'
import type { TimelineEvent } from './types'
import type { TranslationKeys, Language } from '@/lib/i18n'
import { spanMinutes } from './utils'

export function Header({ day, events, onCreateEvent, t, lang }: { day: Date; events: TimelineEvent[]; onCreateEvent?: (start: string, end: string) => void; t?: TranslationKeys; lang?: Language }) {
  const totalMin = events.reduce((acc, ev) => acc + spanMinutes(new Date(ev.start), new Date(ev.end)), 0)

  return (
    <div className="sticky top-0 z-30 backdrop-blur bg-primary-50/80 border-b border-primary-100">
      <div className="max-w-3xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.2px]">
            {day.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="hidden sm:block">{t?.ui?.recorded ?? 'Recorded'}: <span className="text-slate-900 font-medium">{Math.round(totalMin/60*10)/10}h</span></div>
          <input placeholder={(t?.common?.search ?? 'Search') + '…'} className="hidden sm:block px-3 py-2 rounded-xl outline-none bg-black/5 border border-primary-100" />
          <button 
            onClick={() => {
              const now = new Date()
              const start = new Date(now)
              const end = new Date(now.getTime() + 30 * 60000)
              onCreateEvent?.(start.toISOString(), end.toISOString())
            }}
            className="px-3 py-2 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
          >
            + {(t?.common?.create ?? 'New')}
          </button>
        </div>
      </div>
    </div>
  )
}
