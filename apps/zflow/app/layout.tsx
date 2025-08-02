'use client'

import { SWRConfig } from 'swr'
import './globals.css'
import React from 'react'

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SWRConfig
            value={{
              fetcher: (url: string) => fetch(url).then(res => res.json()),
              revalidateOnFocus: false,
              revalidateOnReconnect: true,
            }}
          >
            {children}
          </SWRConfig>
        </div>
      </body>
    </html>
  )
} 