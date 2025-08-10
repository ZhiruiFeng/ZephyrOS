'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  CheckCircle, 
  ArrowLeft,
  Menu,
  Search,
  Filter,
  Plus,
  Settings,
  User,
  Bell
} from 'lucide-react'
import { useTranslation } from '../../contexts/LanguageContext'

export default function MobileTestPage() {
  const { t } = useTranslation()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const features = [
    {
      title: t.ui.responsiveLayout,
      description: t.ui.responsiveLayoutDesc,
      icon: Smartphone,
      status: 'completed'
    },
    {
      title: t.ui.touchFriendlyInteraction,
      description: t.ui.touchFriendlyInteractionDesc,
      icon: Tablet,
      status: 'completed'
    },
    {
      title: t.ui.mobileSidebarFeature,
      description: t.ui.mobileSidebarDesc,
      icon: Monitor,
      status: 'completed'
    },
    {
      title: t.ui.mobileToolbarFeature,
      description: t.ui.mobileToolbarDesc,
      icon: Settings,
      status: 'completed'
    },
    {
      title: t.ui.mobileSearchFeature,
      description: t.ui.mobileSearchDesc,
      icon: Search,
      status: 'completed'
    },
    {
      title: t.ui.mobileKanbanFeature,
      description: t.ui.mobileKanbanDesc,
      icon: CheckCircle,
      status: 'completed'
    }
  ]

  const tabs = [
    { id: 'overview', name: t.nav.overview, icon: Monitor },
    { id: 'focus', name: t.nav.focusMode, icon: CheckCircle },
    { id: 'kanban', name: t.nav.kanban, icon: Settings },
    { id: 'work', name: t.nav.workMode, icon: User }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{t.ui.mobileTest}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Mobile Tabs */}
        <div className="mt-3">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              {t.ui.backToHome}
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{t.ui.mobileOptimization}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t.ui.mobileOptimizationComplete}</h2>
                  <p className="text-white/90 text-sm sm:text-base">
                    {t.ui.testDescription}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">6</div>
                    <div className="text-sm text-white/80">{t.ui.optimizationFeatures}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-sm text-white/80">{t.ui.completionRate}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <feature.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
{t.ui.completed}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Test Links */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.ui.testLinks}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/focus"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{t.nav.focusMode}</div>
                    <div className="text-sm text-gray-600">{t.ui.testFocusModeDesc}</div>
                  </div>
                </Link>
                
                <Link
                  href="/focus?view=kanban"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{t.nav.kanban}</div>
                    <div className="text-sm text-gray-600">{t.ui.testKanbanModeDesc}</div>
                  </div>
                </Link>
                
                <Link
                  href="/focus?view=work"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{t.nav.workMode}</div>
                    <div className="text-sm text-gray-600">{t.ui.testWorkModeDesc}</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'focus' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.ui.focusModeOptimization}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.mobileHeader}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.responsiveModeSwitching}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.touchFriendlyButtons}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/focus"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {t.ui.testFocusMode}
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kanban' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.ui.kanbanModeOptimization}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.mobileLayout}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.mobileSearchFilter}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.touchDragSupport}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/focus?view=kanban"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {t.ui.testKanbanMode}
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'work' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.ui.workModeOptimization}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.mobileSidebar}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.responsiveEditor}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{t.ui.mobileToolbar}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/focus?view=work"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {t.ui.testWorkMode}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
