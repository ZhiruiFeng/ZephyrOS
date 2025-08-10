'use client'

import { SWRConfig } from 'swr'
import './globals.css'
import React from 'react'
import { supabase } from '../lib/supabase'
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
              fetcher: async (url: string) => {
                const token = (await supabase?.auth.getSession())?.data.session?.access_token
                const res = await fetch(url, {
                  credentials: 'include',
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                })
                if (!res.ok) throw new Error(`Request failed: ${res.status}`)
                return res.json()
              },
              revalidateOnFocus: false,
              revalidateOnReconnect: true,
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