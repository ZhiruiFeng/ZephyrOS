'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListTodo, KanbanSquare, Mic, LayoutDashboard } from 'lucide-react'
import AuthButton from './AuthButton'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm rounded-md transition-colors ${
        isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

export default function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-900 font-semibold">
              <LayoutDashboard className="w-5 h-5 text-primary-600" />
              ZFlow
            </Link>
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <NavLink href="/">
                <span className="inline-flex items-center gap-1">
                  <ListTodo className="w-4 h-4" /> Home
                </span>
              </NavLink>
              <NavLink href="/kanban">
                <span className="inline-flex items-center gap-1">
                  <KanbanSquare className="w-4 h-4" /> Kanban
                </span>
              </NavLink>
              <NavLink href="/speech">
                <span className="inline-flex items-center gap-1">
                  <Mic className="w-4 h-4" /> Speech
                </span>
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}


