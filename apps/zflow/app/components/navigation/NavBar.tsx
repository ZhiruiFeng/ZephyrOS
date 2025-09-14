'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, LayoutDashboard, Target, Bot, User, BookOpen } from 'lucide-react'
import AuthButton from '../auth/AuthButton'
import LanguageSelector from '../selectors/LanguageSelector'
import { useTranslation } from '../../../contexts/LanguageContext'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-base rounded-md transition-colors ${
        isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

export default function NavBar() {
  const { t } = useTranslation()

  return (
    <nav className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-900 font-semibold text-lg">
              <LayoutDashboard className="w-5 h-5 text-primary-600" />
              ZFlow
            </Link>
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <NavLink href="/focus?view=work">
                <span className="inline-flex items-center gap-1">
                  <Target className="w-4 h-4" /> {t.nav.focus}
                </span>
              </NavLink>
              <NavLink href="/narrative">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> Narrative
                </span>
              </NavLink>
              <NavLink href="/agents">
                <span className="inline-flex items-center gap-1">
                  <Bot className="w-4 h-4" /> Agents
                </span>
              </NavLink>
              {/* Speech nav removed per request */}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector compact className="hidden sm:block" />
            <NavLink href="/profile">
              <User className="w-4 h-4" />
            </NavLink>
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}

