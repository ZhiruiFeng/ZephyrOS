'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListTodo, KanbanSquare, Mic, LayoutDashboard, SlidersHorizontal, Target } from 'lucide-react'
import AuthButton from './AuthButton'
import { usePrefs } from '../../contexts/PrefsContext'

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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-900 font-semibold">
              <LayoutDashboard className="w-5 h-5 text-primary-600" />
              ZFlow
            </Link>
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <NavLink href="/focus">
                <span className="inline-flex items-center gap-1">
                  <Target className="w-4 h-4" /> Focus
                </span>
              </NavLink>
              <NavLink href="/overview">
                <span className="inline-flex items-center gap-1">
                  <ListTodo className="w-4 h-4" /> Overview
                </span>
              </NavLink>
              <NavLink href="/speech">
                <span className="inline-flex items-center gap-1">
                  <Mic className="w-4 h-4" /> Speech
                </span>
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-3 relative" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100 inline-flex items-center gap-2"
              title="偏好设置"
            >
              <SlidersHorizontal className="w-4 h-4" /> 设置
            </button>
            {open && (
              <div className="absolute right-20 top-10 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                <div className="text-xs font-semibold text-gray-600 mb-2">显示</div>
                <label className="flex items-center justify-between text-sm py-1">
                  <span>隐藏已完成</span>
                  <input type="checkbox" className="h-4 w-4" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between text-sm py-1">
                  <span>侧边栏显示完成数</span>
                  <input type="checkbox" className="h-4 w-4" checked={showCompletedCounts} onChange={(e) => setShowCompletedCounts(e.target.checked)} />
                </label>
                <div className="h-px bg-gray-200 my-2" />
                <div className="text-xs font-semibold text-gray-600 mb-2">筛选</div>
                <div className="flex items-center justify-between text-sm py-1">
                  <span>优先级</span>
                  <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="all">全部</option>
                    <option value="urgent">紧急</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-sm py-1">
                  <span>任务排序</span>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="none">不排序</option>
                    <option value="priority">按优先级</option>
                    <option value="due_date">按截止时间</option>
                  </select>
                </div>
              </div>
            )}
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}


