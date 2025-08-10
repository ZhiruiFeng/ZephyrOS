'use client'

import { SWRConfig } from 'swr'
import './globals.css'
import React from 'react'
import { authManager } from '../lib/auth-manager'
import { globalSWRConfig } from '../lib/swr-config'
import { AuthProvider } from '../contexts/AuthContext'
import { PrefsProvider } from '../contexts/PrefsContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import NavBar from './components/NavBar'
import DynamicHead from './components/DynamicHead'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>ZFlow - Task Management System</title>
        <meta name="description" content="Personal AI operating system task management module" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <LanguageProvider>
            <PrefsProvider>
              <DynamicHead />
              <NavBar />
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
            </SWRConfig>
            </PrefsProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 