'use client'

import React from 'react'
import { Monitor, Smartphone, Cloud, Zap, Users, Shield } from 'lucide-react'

export default function ZephyrOSPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">ZephyrOS</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            A modern, intelligent operating system designed for the future of personal computing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
              Get Started
            </button>
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all">
              Learn More
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Monitor className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Desktop First</h3>
            <p className="text-gray-600">
              Optimized for desktop productivity with seamless multi-tasking and workspace management.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Mobile Ready</h3>
            <p className="text-gray-600">
              Responsive design that adapts beautifully to any screen size and device.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Cloud className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Cloud Native</h3>
            <p className="text-gray-600">
              Built-in cloud synchronization keeps your data safe and accessible everywhere.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Optimized performance ensures smooth operation even with intensive workloads.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-pink-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Collaborative</h3>
            <p className="text-gray-600">
              Share workspaces and collaborate in real-time with built-in communication tools.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure by Design</h3>
            <p className="text-gray-600">
              Advanced security features protect your data with end-to-end encryption.
            </p>
          </div>
        </div>

        {/* Applications Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/20">
          <h2 className="text-2xl font-bold text-center mb-8">Integrated Applications</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ZFlow</h3>
              <p className="text-gray-600">
                Advanced task management and productivity suite with AI-powered insights.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ZMemory</h3>
              <p className="text-gray-600">
                Intelligent memory management system that learns from your usage patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}