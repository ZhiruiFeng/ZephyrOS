'use client'

import React, { useState, useEffect } from 'react'
import { Plus, FileText, Link, File, Brain, Search } from 'lucide-react'
import { Memory } from '@zephyros/shared'

export default function ZMemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 从API获取记忆数据
    setLoading(false)
  }, [])

  const getTypeIcon = (type: Memory['type']) => {
    switch (type) {
      case 'note':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'link':
        return <Link className="w-4 h-4 text-green-500" />
      case 'file':
        return <File className="w-4 h-4 text-purple-500" />
      case 'thought':
        return <Brain className="w-4 h-4 text-orange-500" />
    }
  }

  const filteredMemories = memories.filter(memory =>
    memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memory.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ZMemory</h1>
        <p className="text-gray-600">你的个人数据中枢</p>
      </div>

      {/* 搜索栏 */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索记忆..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            添加记忆
          </button>
        </div>
      </div>

      {/* 记忆列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMemories.length === 0 ? (
          <div className="col-span-full card text-center text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>还没有记忆数据，开始添加你的第一条记忆吧！</p>
          </div>
        ) : (
          filteredMemories.map((memory) => (
            <div key={memory.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(memory.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {memory.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                    {memory.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-gray-500">
                      {new Date(memory.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    {memory.tags && memory.tags.length > 0 && (
                      <div className="flex gap-1">
                        {memory.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {memory.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{memory.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 