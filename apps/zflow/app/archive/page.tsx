'use client'

import React from 'react'
import Link from 'next/link'
import { useTasks, useUpdateTask } from '../../hooks/useMemories'
import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/LoginPage'
import { TaskContent } from '../../lib/api'

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth()
  const { tasks, isLoading, error } = useTasks(user ? {} : null)
  const { updateTask } = useUpdateTask()

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return <LoginPage />
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">Failed to load</div>

  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000
  const archived = tasks.filter(t => {
    const c = t.content as TaskContent
    if (c.status !== 'completed') return false
    const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
    return completedAt && now - completedAt > windowMs
  })

  // group by month
  const byMonth: Record<string, typeof archived> = {}
  for (const t of archived) {
    const c = t.content as TaskContent
    const d = c.completion_date ? new Date(c.completion_date) : new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(t)
  }

  const reopen = async (id: string) => {
    // Backend will clear completion_date when status != completed
    await updateTask(id, { content: { status: 'pending', progress: 0 } })
  }

  const months = Object.keys(byMonth).sort().reverse()

  return (
    <div className="py-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Archive（超过24小时的已完成）</h1>
        <Link href="/" className="text-primary-700 hover:underline">返回首页</Link>
      </div>
      {months.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">暂无归档任务</div>
      ) : (
        <div className="space-y-6">
          {months.map((m) => (
            <section key={m} className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold">{m}</div>
              <ul className="divide-y divide-gray-100">
                {byMonth[m].map((t) => {
                  const c = t.content as TaskContent
                  return (
                    <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{c.title}</div>
                        {c.description && <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => reopen(t.id)}
                          className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                        >重新打开 → Pending</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}


