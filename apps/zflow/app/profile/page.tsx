'use client'

import React from 'react'
import useSWR from 'swr'
import { 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  BarChart3,
  Calendar,
  Target
} from 'lucide-react'
// Local TaskStats interface to avoid zod dependency
interface TaskStats {
  total: number
  by_status: {
    pending: number
    in_progress: number
    completed: number
    cancelled: number
    on_hold: number
  }
  by_priority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  by_category: {
    work: number
    personal: number
    project: number
    meeting: number
    learning: number
    maintenance: number
    other: number
  }
  overdue: number
  due_today: number
  due_this_week: number
  completion_rate: number
  average_completion_time: number
}
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import { statsApi } from '../../lib/api'
import EnergySpectrum from '../components/EnergySpectrum'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-primary-50 rounded-lg">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} />
            {trend.value}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}

interface PriorityBarProps {
  label: string
  value: number
  total: number
  color: string
}

function PriorityBar({ label, value, total, color }: PriorityBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-sm font-medium text-gray-700 w-16">{label}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
      <span className="text-sm text-gray-600 w-8 text-right">{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().slice(0,10))
  
  // Extract display name from user data
  const displayName = React.useMemo(() => {
    if (!user) return 'Your Profile'
    
    // Try to get name from user metadata first
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name
    if (fullName) return fullName
    
    // Fall back to extracting username from email
    if (user.email) {
      const username = user.email.split('@')[0]
      return username.charAt(0).toUpperCase() + username.slice(1)
    }
    
    return 'Your Profile'
  }, [user])
  
  const { data: stats, error, isLoading } = useSWR<TaskStats>(
    'task-stats',
    () => statsApi.getTaskStats(),
    { refreshInterval: 30000 }
  )

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-red-600">
          Failed to load profile statistics
        </div>
      </div>
    )
  }

  const completionRate = stats?.completion_rate || 0
  const averageTime = stats?.average_completion_time || 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-full">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {displayName}
            </h1>
            <p className="text-gray-600">Personal productivity insights and statistics</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Tasks"
          value={stats?.total || 0}
          icon={<BarChart3 className="w-5 h-5 text-primary-600" />}
          description="All time tasks created"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          description="Percentage of completed tasks"
          trend={{
            value: completionRate > 50 ? 12 : -5,
            isPositive: completionRate > 50
          }}
        />
        <StatCard
          title="Due Today"
          value={stats?.due_today || 0}
          icon={<Calendar className="w-5 h-5 text-orange-600" />}
          description="Tasks due today"
        />
        <StatCard
          title="Avg Completion"
          value={averageTime > 0 ? `${averageTime}d` : 'N/A'}
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          description="Average days to complete"
        />
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Task Status
          </h2>
          <div className="space-y-4">
            <PriorityBar
              label="Completed"
              value={stats?.by_status.completed || 0}
              total={stats?.total || 0}
              color="#10b981"
            />
            <PriorityBar
              label="In Progress"
              value={stats?.by_status.in_progress || 0}
              total={stats?.total || 0}
              color="#3b82f6"
            />
            <PriorityBar
              label="Pending"
              value={stats?.by_status.pending || 0}
              total={stats?.total || 0}
              color="#f59e0b"
            />
            <PriorityBar
              label="On Hold"
              value={stats?.by_status.on_hold || 0}
              total={stats?.total || 0}
              color="#6b7280"
            />
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Priority Distribution
          </h2>
          <div className="space-y-4">
            <PriorityBar
              label="Urgent"
              value={stats?.by_priority.urgent || 0}
              total={stats?.total || 0}
              color="#ef4444"
            />
            <PriorityBar
              label="High"
              value={stats?.by_priority.high || 0}
              total={stats?.total || 0}
              color="#f97316"
            />
            <PriorityBar
              label="Medium"
              value={stats?.by_priority.medium || 0}
              total={stats?.total || 0}
              color="#eab308"
            />
            <PriorityBar
              label="Low"
              value={stats?.by_priority.low || 0}
              total={stats?.total || 0}
              color="#22c55e"
            />
          </div>
        </div>
      </div>

      {/* Time-based Insights */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Time-based Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {stats?.overdue || 0}
            </div>
            <div className="text-sm text-gray-600">Overdue Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {stats?.due_today || 0}
            </div>
            <div className="text-sm text-gray-600">Due Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {stats?.due_this_week || 0}
            </div>
            <div className="text-sm text-gray-600">Due This Week</div>
          </div>
        </div>
      </div>

      {/* Energy Spectrum */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Energy Spectrum
        </h2>
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
        <EnergySpectrum date={selectedDate} onSaved={() => { /* no-op */ }} />
      </div>
    </div>
  )
}

// Minimal date picker inline for this page
function DatePicker() {
  const [value, setValue] = React.useState<string>(new Date().toISOString().slice(0,10))
  ;(globalThis as any).setProfileSelectedDate = setValue
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          const setter = (globalThis as any).setSelectedDateInternal
          if (setter) setter(e.target.value)
        }}
      />
    </div>
  )
}
