"use client"

import React from 'react'
import { TOKENS } from './Tokens'
import { gapToSpace, fmtHM, spanMinutes } from './utils'
import type { TranslationKeys } from '../../../../lib/i18n'

export function Gap({ from, to, onCreateEvent, t }: { from: Date; to: Date; onCreateEvent?: (start: string, end: string) => void; t?: TranslationKeys }) {
  const mins = spanMinutes(from, to)
  const h = gapToSpace(mins)

  if (mins < 15) {
    return (
      <div style={{ height: h }} className="relative">
        <div className="absolute left-[1px] sm:left-[1px] top-1 bottom-1 w-2">
          <div className="w-px h-full border-l border-dashed opacity-30" style={{ borderColor: TOKENS.color.grid }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: h }} className="relative flex items-center">
      <div className="absolute left-[1px] sm:left-[1px] top-2 bottom-2 w-2">
        <div className="w-px h-full border-l border-dashed" style={{ borderColor: TOKENS.color.grid }} />
      </div>
      <div className="ml-2 sm:ml-12 flex-1">
        <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] shadow-sm"
             style={{ background: 'rgba(0,0,0,0.02)', border: `1px dashed ${TOKENS.color.border}`, backdropFilter: 'blur(4px)' }}>
          <span className="opacity-80">{fmtHM(from)} – {fmtHM(to)}</span>
          <span className="opacity-60">{t?.ui?.noData ?? 'No records'} · {mins}{t?.ui?.minutes ?? 'm'}</span>
          <button
            onClick={() => {
              const now = new Date()
              const start = from.toISOString()
              // Default end time: use now if within the gap, otherwise use end of interval
              const end = (now >= from && now <= to) ? now.toISOString() : to.toISOString()
              onCreateEvent?.(start, end)
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
            style={{ background: TOKENS.color.accentSubtle, color: TOKENS.color.accent }}
          >
            + {(t?.common?.create ?? 'New')}
          </button>
        </div>
      </div>
    </div>
  )
}
