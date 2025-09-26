"use client"

import React from 'react'
import { TOKENS } from './Tokens'

export function NowMarker({ t }: { t?: any }) {
  return (
    <div className="relative ml-2 sm:ml-12 my-3">
      <div className="absolute left-[-14px] sm:left-[-2px] top-2 w-3 h-3 rounded-full" style={{ background: TOKENS.color.now, boxShadow: `0 0 0 4px ${TOKENS.color.canvas}` }} />
      <div className="flex items-center gap-2 pl-6">
        <div className="h-px flex-1" style={{ background: TOKENS.color.grid }} />
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: 'rgba(43,212,189,0.15)', color: '#0F766E' }}>
          {t?.ui?.now ?? 'Now'}
        </span>
        <div className="h-px flex-1" style={{ background: TOKENS.color.grid }} />
      </div>
    </div>
  )
}

