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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  function GlobalAddTaskMount() {
    const { categories } = useCategories()
    const { createTask } = useCreateTask()
    const [open, setOpen] = React.useState(false)
    const [defaultCat, setDefaultCat] = React.useState<string | undefined>(undefined)

    useEffect(() => {
      const handler = () => {
        setDefaultCat(undefined)
        setOpen(true)
      }
      window.addEventListener('zflow:addTask', handler)
      return () => window.removeEventListener('zflow:addTask', handler)
    }, [])

    return (
      <AddTaskModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async (payload) => {
          await createTask(payload)
          setOpen(false)
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