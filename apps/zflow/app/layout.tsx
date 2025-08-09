'use client'

import { SWRConfig } from 'swr'
import './globals.css'
import React from 'react'
import { supabase } from '../lib/supabase'
import { AuthProvider } from '../contexts/AuthContext'
import NavBar from './components/NavBar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <title>ZFlow - 任务管理系统</title>
        <meta name="description" content="个人AI操作系统的任务管理模块" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  )
} 