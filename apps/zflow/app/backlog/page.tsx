'use client'

import React from 'react'
import Link from 'next/link'
import { useTasks, useUpdateTask } from '../../hooks/useMemories'
import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/LoginPage'
import { categoriesApi, TaskMemory, TaskContent } from '../../lib/api'

export default function BacklogPage() {
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? {} : null)
  const { updateTask } = useUpdateTask()
  const [categories, setCategories] = React.useState<any[]>([])

  React.useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
  }, [])

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return <LoginPage />
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">Failed to load</div>

  const onHold = tasks.filter(t => (t.content as TaskContent).status === 'on_hold')
  const byCategory: Record<string, TaskMemory[]> = {}
  for (const t of onHold) {
    const catId = (t as any).category_id || (t as any).content?.category_id || 'uncategorized'
    if (!byCategory[catId]) byCategory[catId] = []
    byCategory[catId].push(t)
  }

  const activate = async (id: string) => {
    await updateTask(id, { content: { status: 'pending' } })
  }

  return (
    <div className="py-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backlog（On Hold）</h1>
        <Link href="/" className="text-primary-700 hover:underline">返回首页</Link>
      </div>
      <div className="space-y-6">
        {Object.entries(byCategory).map(([catId, list]) => {
          const cat = catId === 'uncategorized' ? { name: '未分类', color: '#9ca3af' } : categories.find((c) => c.id === catId)
          return (
            <section key={catId} className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="font-semibold" style={{ color: cat?.color || '#111827' }}>{cat?.name || '未分类'}</div>
                <div className="text-sm text-gray-500">{list.length} 项</div>
              </div>
              <ul className="divide-y divide-gray-100">
                {list.map((t) => {
                  const c = t.content as TaskContent
                  return (
                    <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{c.title}</div>
                        {c.description && <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          defaultValue={(t as any).category_id || c.category_id || ''}
                          onChange={async (e) => {
                            const newId = e.target.value
                            await updateTask(t.id, { content: { category_id: newId } })
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                          title="快速修改分类"
                        >
                          <option value="">未分类</option>
                          {categories.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => activate(t.id)}
                          className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white hover:bg-primary-700"
                        >激活 → Pending</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}


