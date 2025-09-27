'use client'

import React from 'react'
import Link from 'next/link'
import { Zap, Heart, Github, Twitter } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-gradient-to-t from-primary-50/60 to-white/90 dark:from-primary-900/15 dark:to-black/40 backdrop-blur-sm border-t border-primary-100 dark:border-primary-800 mt-auto mb-14 sm:mb-0">
      {/* Subtle top glow for cohesion with themed UI */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-24 -top-24 h-56 blur-3xl opacity-30 dark:opacity-25">
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(500px circle at 15% 0%, rgba(56,189,248,0.55) 0%, transparent 60%),\n' +
              'radial-gradient(600px circle at 85% -10%, rgba(2,132,199,0.45) 0%, transparent 65%)'
          }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile Layout - Simplified */}
        <div className="block sm:hidden">
          <div className="text-center space-y-4">
            <Link href="/zephyros" className="inline-flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">ZephyrOS</span>
            </Link>
            <Link 
              href="/zephyros"
              className="inline-block text-xs text-gray-600 hover:text-primary-600 transition-colors"
            >
              {t.footer?.learnMore || '了解我们的理念'}
            </Link>
            <div className="text-xs text-gray-500">
              © {currentYear} ZephyrOS
            </div>
          </div>
        </div>

        {/* Desktop Layout - Full Content */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* ZephyrOS Brand Section */}
            <div className="md:col-span-2">
              <Link href="/zephyros" className="inline-flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-gray-900">ZephyrOS</span>
              </Link>
              <p className="text-gray-600 mb-4 max-w-md text-sm">
                {t.footer?.zephyrDescription || '面向未来的个人智能操作系统，让您的工作流程更加高效和智能。'}
              </p>
              <Link 
                href="/zephyros"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all text-sm font-medium shadow-sm"
              >
                <Zap className="w-4 h-4" />
                {t.footer?.learnMore || '了解我们的理念'}
              </Link>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                {t.footer?.quickLinks || '快捷链接'}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/focus" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                    {t.nav?.focus || '专注模式'}
                  </Link>
                </li>
                <li>
                  <Link href="/agents" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                    {t.agents?.title || 'AI Agents'}
                  </Link>
                </li>
                <li>
                  <Link href="/timeline" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                    {t.ui?.timelineView || '时间线'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Applications */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                {t.footer?.applications || '应用模块'}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                    ZFlow - {t.footer?.taskManagement || '任务管理'}
                  </Link>
                </li>
                <li>
                  <Link href="/memories" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                    ZMemory - {t.footer?.memorySystem || '记忆系统'}
                  </Link>
                </li>
                <li>
                  <Link href="/zephyros" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                    ZephyrOS - {t.footer?.operatingSystem || '操作系统'}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section - Desktop Only */}
          <div className="mt-8 pt-8 border-t border-primary-100 dark:border-primary-800">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-4 sm:mb-0">
                <span>© {currentYear} ZephyrOS.</span>
                <span className="flex items-center gap-1">
                  {t.footer?.madeWith || '用'} <Heart className="w-4 h-4 text-red-500" /> {t.footer?.built || '构建'}
                </span>
              </div>
              
              {/* Social Links (placeholder for future use) */}
              <div className="flex items-center gap-4">
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
