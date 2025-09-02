'use client'

import React from 'react'
import TimelineView from '../components/views/TimelineView'
import { TimelineItem } from '@/hooks/useTimeline'
import DateSelector from '../components/ui/DateSelector'
import TimelineStats from '../components/ui/TimelineStats'

export default function TestTimelinePage() {
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  
  // Mock data for testing
  const mockTimelineItems: TimelineItem[] = [
    {
      id: '1',
      type: 'time_entry',
      title: '工作会话',
      description: '专注于项目开发，完成了用户认证模块',
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T11:30:00Z',
      duration: 150,
      category: {
        id: 'work',
        name: '工作',
        color: '#3B82F6'
      },
      tags: ['开发', '项目'],
      location: '办公室',
      isHighlight: false,
      metadata: {
        source: 'timer',
        taskId: 'task-1'
      }
    },
    {
      id: '2',
      type: 'memory',
      title: '午餐时光',
      description: '和同事一起吃了美味的午餐，聊了很多有趣的话题',
      startTime: '2024-01-15T12:00:00Z',
      endTime: '2024-01-15T13:00:00Z',
      category: {
        id: 'social',
        name: '社交',
        color: '#10B981'
      },
      tags: ['午餐', '同事', '社交'],
      location: '公司餐厅',
      isHighlight: true,
      metadata: {
        memoryType: 'note',
        emotionValence: 4,
        mood: 8
      }
    },
    {
      id: '3',
      type: 'task',
      title: '代码审查',
      description: '审查团队成员的代码提交，提供反馈和建议',
      startTime: '2024-01-15T14:00:00Z',
      endTime: '2024-01-15T15:00:00Z',
      duration: 60,
      category: {
        id: 'work',
        name: '工作',
        color: '#3B82F6'
      },
      tags: ['代码审查', '团队协作'],
      status: 'completed',
      priority: 'high',
      metadata: {
        progress: 100,
        assignee: 'me'
      }
    },
    {
      id: '4',
      type: 'activity',
      title: '健身运动',
      description: '进行了30分钟的有氧运动和力量训练',
      startTime: '2024-01-15T18:00:00Z',
      endTime: '2024-01-15T18:30:00Z',
      duration: 30,
      category: {
        id: 'health',
        name: '健康',
        color: '#F59E0B'
      },
      tags: ['健身', '运动', '健康'],
      metadata: {
        activityType: 'exercise'
      }
    }
  ]

  const mockTimelineData = {
    items: mockTimelineItems,
    totalDuration: 240, // 4 hours
    categories: [
      { id: 'work', name: '工作', color: '#3B82F6', count: 2 },
      { id: 'social', name: '社交', color: '#10B981', count: 1 },
      { id: 'health', name: '健康', color: '#F59E0B', count: 1 }
    ],
    tags: [
      { name: '开发', count: 1 },
      { name: '项目', count: 1 },
      { name: '午餐', count: 1 },
      { name: '同事', count: 1 },
      { name: '社交', count: 1 },
      { name: '代码审查', count: 1 },
      { name: '团队协作', count: 1 },
      { name: '健身', count: 1 },
      { name: '运动', count: 1 },
      { name: '健康', count: 1 }
    ]
  }

  const handleItemClick = (item: TimelineItem) => {
    console.log('Timeline item clicked:', item)
  }

  const handleEditItem = (item: TimelineItem) => {
    console.log('Edit timeline item:', item)
  }

  const handleDeleteItem = (item: TimelineItem) => {
    console.log('Delete timeline item:', item)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">时间线测试页面</h1>
            </div>
          </div>

          {/* Date Selector */}
          <div className="mt-4">
            <DateSelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="mb-6">
          <TimelineStats timelineData={mockTimelineData} />
        </div>

        {/* Timeline View */}
        <TimelineView
          selectedDate={selectedDate}
          timelineItems={mockTimelineData.items}
          loading={false}
          onItemClick={handleItemClick}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          t={{}}
        />
      </div>
    </div>
  )
}
