'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, ListTodo, Mic, Plus, Bot } from 'lucide-react'
import { useTranslation } from '../../contexts/LanguageContext'

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href.split('?')[0]))
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 ${
        isActive ? 'text-primary-600' : 'text-gray-500'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[11px] leading-none">{label}</span>
    </Link>
  )
}

export default function MobileBottomNav() {
  const { t } = useTranslation()

  const openAddTask = () => {
    try {
      window.dispatchEvent(new CustomEvent('zflow:addTask'))
    } catch {}
  }

  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-2">
        <div className="relative flex items-center">
          <NavItem href="/" label={t.nav.overview} icon={ListTodo} />
          <NavItem href="/focus?view=work" label={t.nav.focus} icon={Target} />

          {/* Center Add Button */}
          <button
            onClick={openAddTask}
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 active:scale-95 transition-all"
            aria-label={t.ui.newTask}
            title={t.ui.newTask}
          >
            <Plus className="w-6 h-6 mx-auto" />
          </button>

          <div className="flex-1" />
          <NavItem href="/agents" label="Agents" icon={Bot} />
          <NavItem href="/speech" label={t.nav.speech} icon={Mic} />
        </div>
      </div>
    </div>
  )
}


