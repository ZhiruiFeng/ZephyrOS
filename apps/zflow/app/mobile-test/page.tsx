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

export default function MobileTestPage() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const features = [
    {
      title: '响应式布局',
      description: '自适应不同屏幕尺寸，从手机到桌面',
      icon: Smartphone,
      status: 'completed'
    },
    {
      title: '触摸友好交互',
      description: '优化按钮大小和间距，适合手指操作',
      icon: Tablet,
      status: 'completed'
    },
    {
      title: '移动端侧边栏',
      description: '可滑动的侧边栏，支持手势操作',
      icon: Monitor,
      status: 'completed'
    },
    {
      title: '移动端工具栏',
      description: '紧凑的工具栏设计，节省屏幕空间',
      icon: Settings,
      status: 'completed'
    },
    {
      title: '移动端搜索',
      description: '优化的搜索界面和过滤器',
      icon: Search,
      status: 'completed'
    },
    {
      title: '移动端看板',
      description: '单列布局，适合垂直滚动',
      icon: CheckCircle,
      status: 'completed'
    }
  ]

  const tabs = [
    { id: 'overview', name: '概览', icon: Monitor },
    { id: 'focus', name: '专注模式', icon: CheckCircle },
    { id: 'kanban', name: '看板', icon: Settings },
    { id: 'work', name: '工作模式', icon: User }
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
            <h1 className="text-lg font-semibold text-gray-900">移动端测试</h1>
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
              返回
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">移动端优化测试</h1>
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
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">移动端优化完成</h2>
                  <p className="text-white/90 text-sm sm:text-base">
                    所有页面都已针对移动设备进行了优化，提供更好的用户体验
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">6</div>
                    <div className="text-sm text-white/80">优化功能</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-sm text-white/80">完成度</div>
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
                        已完成
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Test Links */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">测试链接</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/focus"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">专注模式</div>
                    <div className="text-sm text-gray-600">测试看板和工作模式</div>
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
                    <div className="font-medium text-gray-900">看板模式</div>
                    <div className="text-sm text-gray-600">测试拖拽和移动端布局</div>
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
                    <div className="font-medium text-gray-900">工作模式</div>
                    <div className="text-sm text-gray-600">测试侧边栏和编辑器</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'focus' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">专注模式优化</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>移动端头部导航</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>响应式模式切换</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>触摸友好的按钮</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/focus"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  测试专注模式
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kanban' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">看板模式优化</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>移动端单列布局</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>移动端搜索和过滤</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>触摸拖拽支持</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/focus?view=kanban"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  测试看板模式
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'work' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">工作模式优化</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>移动端侧边栏</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>响应式编辑器</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>移动端工具栏</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/focus?view=work"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  测试工作模式
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
