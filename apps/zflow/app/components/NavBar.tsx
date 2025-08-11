'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListTodo, KanbanSquare, Mic, LayoutDashboard, SlidersHorizontal, Target } from 'lucide-react'
import AuthButton from './AuthButton'
import LanguageSelector from './LanguageSelector'
import { usePrefs } from '../../contexts/PrefsContext'
import { useTranslation } from '../../contexts/LanguageContext'

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
  const { hideCompleted, setHideCompleted, showCompletedCounts, setShowCompletedCounts, filterPriority, setFilterPriority, sortMode, setSortMode } = usePrefs()
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <nav className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-900 font-semibold">
              <LayoutDashboard className="w-5 h-5 text-primary-600" />
              ZFlow
            </Link>
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <NavLink href="/focus?view=work">
                <span className="inline-flex items-center gap-1">
                  <Target className="w-4 h-4" /> {t.nav.focus}
                </span>
              </NavLink>
              <NavLink href="/overview">
                <span className="inline-flex items-center gap-1">
                  <ListTodo className="w-4 h-4" /> {t.nav.overview}
                </span>
              </NavLink>
              <NavLink href="/speech">
                <span className="inline-flex items-center gap-1">
                  <Mic className="w-4 h-4" /> {t.nav.speech}
                </span>
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-3 relative" ref={menuRef}>
            <LanguageSelector compact className="hidden sm:block" />
            <button
              onClick={() => setOpen((v) => !v)}
              className="px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100 inline-flex items-center gap-2"
              title={t.common.settings}
            >
              <SlidersHorizontal className="w-4 h-4" /> {t.common.settings}
            </button>
            {open && (
              <>
                {/* Desktop dropdown */}
                <div className="hidden sm:block absolute right-0 top-10 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Display</div>
                  <label className="flex items-center justify-between text-sm py-1">
                    <span>{t.ui.hideCompleted}</span>
                    <input type="checkbox" className="h-4 w-4" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between text-sm py-1">
                    <span>{t.ui.showCompletedCounts}</span>
                    <input type="checkbox" className="h-4 w-4" checked={showCompletedCounts} onChange={(e) => setShowCompletedCounts(e.target.checked)} />
                  </label>
                  <div className="h-px bg-gray-200 my-2" />
                  <div className="text-xs font-semibold text-gray-600 mb-2">{t.common.filter}</div>
                  <div className="flex items-center justify-between text-sm py-1">
                    <span>{t.task.priority}</span>
                    <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="all">{t.ui.allPriority}</option>
                      <option value="urgent">{t.task.priorityUrgent}</option>
                      <option value="high">{t.task.priorityHigh}</option>
                      <option value="medium">{t.task.priorityMedium}</option>
                      <option value="low">{t.task.priorityLow}</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between text-sm py-1">
                    <span>{t.ui.taskSorting}</span>
                    <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="none">{t.ui.sortNone}</option>
                      <option value="priority">{t.ui.sortByPriority}</option>
                      <option value="due_date">{t.ui.sortByDueDate}</option>
                    </select>
                  </div>
                </div>
                {/* Mobile bottom sheet */}
                <div className="sm:hidden fixed inset-0 z-50">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                  <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 border-t border-gray-200">
                    <div className="mx-auto w-10 h-1.5 bg-gray-300 rounded-full mb-3" />
                    <div className="text-xs font-semibold text-gray-600 mb-2">Display</div>
                    <label className="flex items-center justify-between text-sm py-2">
                      <span>{t.ui.hideCompleted}</span>
                      <input type="checkbox" className="h-4 w-4" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between text-sm py-2">
                      <span>{t.ui.showCompletedCounts}</span>
                      <input type="checkbox" className="h-4 w-4" checked={showCompletedCounts} onChange={(e) => setShowCompletedCounts(e.target.checked)} />
                    </label>
                    <div className="h-px bg-gray-200 my-2" />
                    <div className="text-xs font-semibold text-gray-600 mb-2">{t.common.filter}</div>
                    <div className="flex items-center justify-between text-sm py-2">
                      <span>{t.task.priority}</span>
                      <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="all">{t.ui.allPriority}</option>
                        <option value="urgent">{t.task.priorityUrgent}</option>
                        <option value="high">{t.task.priorityHigh}</option>
                        <option value="medium">{t.task.priorityMedium}</option>
                        <option value="low">{t.task.priorityLow}</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2">
                      <span>{t.ui.taskSorting}</span>
                      <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="none">{t.ui.sortNone}</option>
                        <option value="priority">{t.ui.sortByPriority}</option>
                        <option value="due_date">{t.ui.sortByDueDate}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}


