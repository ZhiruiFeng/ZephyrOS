'use client'

import { SWRConfig } from 'swr'
import './globals.css'
// removed markdown editor styles
import React from 'react'
import { useEffect } from 'react'
import { authManager } from '../lib/auth-manager'
import { globalSWRConfig } from '../lib/swr-config'
import { AuthProvider } from '../contexts/AuthContext'
import { PrefsProvider } from '../contexts/PrefsContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import NavBar from './components/NavBar'
import MobileBottomNav from './components/MobileBottomNav'
import DynamicHead from './components/DynamicHead'
import AddTaskModal from './components/AddTaskModal'
import { useCategories } from '../hooks/useCategories'
import { useCreateTask } from '../hooks/useMemories'
import { useTimer } from '../hooks/useTimer'
import { usePrefs } from '../contexts/PrefsContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  function GlobalAddTaskMount() {
    const { categories } = useCategories()
    const { createTask } = useCreateTask()
    const timer = useTimer()
    const { selectedCategory } = usePrefs()
    const [open, setOpen] = React.useState(false)
    const [defaultCat, setDefaultCat] = React.useState<string | undefined>(undefined)

    useEffect(() => {
      const handler = (event: CustomEvent) => {
        // 如果事件包含分类信息，使用它；否则使用全局选中的分类
        const categoryId = event.detail?.categoryId || 
          (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined)
        setDefaultCat(categoryId)
        setOpen(true)
      }
      window.addEventListener('zflow:addTask', handler as EventListener)
      return () => window.removeEventListener('zflow:addTask', handler as EventListener)
    }, [selectedCategory])

    return (
      <AddTaskModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async (payload) => {
          try {
            await createTask(payload)
            setOpen(false)
          } catch (error) {
            console.error('Failed to create task:', error)
            // 错误情况下不关闭模态窗口，让用户决定是否重试
          }
        }}
        onSubmitAndStart={async (payload) => {
          try {
            const task = await createTask(payload)
            // Start timer for the created task
            if (task && task.id) {
              await timer.start(task.id, { autoSwitch: true })
            }
            setOpen(false)
          } catch (error) {
            console.error('Failed to create task:', error)
            // 错误情况下不关闭模态窗口，让用户决定是否重试
          }
        }}
        categories={categories}
        defaultCategoryId={defaultCat}
      />
    )
  }
  return (
    <html lang="en">
      <head>
        <title>ZFlow - Task Management System</title>
        <meta name="description" content="Personal AI operating system task management module" />
      </head>
      <body className="bg-gray-50 min-h-screen pb-14 sm:pb-0">
        <AuthProvider>
          <LanguageProvider>
            <PrefsProvider>
              <DynamicHead />
              <NavBar />
              <GlobalAddTaskMount />
            <SWRConfig
            value={{
              ...globalSWRConfig,
              fetcher: async (url: string) => {
                const authHeaders = await authManager.getAuthHeaders()
                const res = await fetch(url, {
                  credentials: 'include',
                  headers: authHeaders,
                })
                if (!res.ok) throw new Error(`Request failed: ${res.status}`)
                return res.json()
              },
            }}
            >
              {children}
              <MobileBottomNav />
            </SWRConfig>
            </PrefsProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 