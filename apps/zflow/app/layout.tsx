'use client'

import { SWRConfig } from 'swr'
import './globals.css'
// removed markdown editor styles
import React from 'react'
import { AuthProvider } from '../contexts/AuthContext'
import { PrefsProvider } from '../contexts/PrefsContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import { STTConfigProvider } from '../contexts/STTConfigContext'
import NavBar from './components/navigation/NavBar'
import MobileBottomNav from './components/navigation/MobileBottomNav'
import DynamicHead from './components/utils/DynamicHead'
import AddTaskPortal from './components/global/AddTaskPortal'
import VoiceInputController from './components/global/VoiceInputController'
import { authManager } from '../lib/auth-manager'
import { globalSWRConfig } from '../lib/swr-config'
import { authJsonFetcher } from './core/config/swr'

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
      <body className="bg-gray-50 min-h-screen pb-14 sm:pb-0">
        <AuthProvider>
          <LanguageProvider>
            <PrefsProvider>
              <STTConfigProvider>
                <DynamicHead />
                <NavBar />
                <AddTaskPortal />
                <VoiceInputController />
                <SWRConfig value={{ ...globalSWRConfig, fetcher: authJsonFetcher }}>
                  {children}
                  <MobileBottomNav />
                </SWRConfig>
              </STTConfigProvider>
            </PrefsProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
