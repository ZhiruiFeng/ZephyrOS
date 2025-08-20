'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, Filter, Tag, CheckCircle, AlertCircle, Play, Pause, Archive, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { tasksApi, TaskMemory, TaskContent } from '../../../lib/api';
import { useCategories } from '../../../hooks/useCategories';
import LoginPage from '../../components/LoginPage';

interface TasksResponse {
  tasks: TaskMemory[];
  total: number;
  date_range: {
    start: string;
    end: string;
  };
}

interface FilterState {
  status: string;
  priority: string;
  category: string;
}

interface DateTimeFilter {
  date: string;
  timezone: string;
}

// 状态图标和样式映射
const statusConfig = {
  pending: { icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-600', label: '待处理' },
  in_progress: { icon: Play, bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: '进行中' },
  completed: { icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-600', label: '已完成' },
  cancelled: { icon: Archive, bgColor: 'bg-red-100', textColor: 'text-red-600', label: '已取消' },
  on_hold: { icon: Pause, bgColor: 'bg-yellow-100', textColor: 'text-yellow-600', label: '暂停' },
};

// 优先级配置
const priorityConfig = {
  low: { bgColor: 'bg-gray-100', textColor: 'text-gray-600', label: '低' },
  medium: { bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: '中' },
  high: { bgColor: 'bg-orange-100', textColor: 'text-orange-600', label: '高' },
  urgent: { bgColor: 'bg-red-100', textColor: 'text-red-600', label: '紧急' },
};

// 常用时区列表
const commonTimezones = [
  { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
  { value: 'America/New_York', label: '纽约时间 (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: '洛杉矶时间 (UTC-8/-7)' },
  { value: 'Europe/London', label: '伦敦时间 (UTC+0/+1)' },
  { value: 'Europe/Paris', label: '巴黎时间 (UTC+1/+2)' },
  { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)' },
  { value: 'Asia/Seoul', label: '首尔时间 (UTC+9)' },
  { value: 'Australia/Sydney', label: '悉尼时间 (UTC+10/+11)' },
  { value: 'UTC', label: '协调世界时 (UTC)' },
];

export default function UpdatedTodayPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { categories } = useCategories();
  
  const [tasks, setTasks] = useState<TaskMemory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiDateRange, setApiDateRange] = useState<{ start: string; end: string } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    priority: '',
    category: '',
  });

  // 获取今天的日期字符串 (YYYY-MM-DD format)
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // 获取当前时区
  const getCurrentTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const [dateTimeFilter, setDateTimeFilter] = useState<DateTimeFilter>({
    date: getTodayDateString(),
    timezone: getCurrentTimezone(),
  });

  // 根据日期和时区计算开始和结束时间
  const getDateRangeFromFilter = (filter: DateTimeFilter) => {
    try {
      // 创建指定日期在指定时区的开始和结束时间
      const dateStr = filter.date;
      
      // 在指定时区创建该日期的开始时间 (00:00:00)
      const startOfDayInTimezone = new Date(`${dateStr}T00:00:00`);
      
      // 计算结束时间：24小时后或当前时间（取较小的）
      const endOfDayInTimezone = new Date(startOfDayInTimezone.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const actualEndTime = endOfDayInTimezone > now ? now : endOfDayInTimezone;
      
      // 返回完整的ISO日期时间字符串
      return {
        start_date: startOfDayInTimezone.toISOString(),
        end_date: actualEndTime.toISOString()
      };
    } catch (error) {
      console.error('Error processing date range:', error);
      // 降级到当前日期
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      const actualEnd = endOfToday > today ? today : endOfToday;
      return {
        start_date: startOfToday.toISOString(),
        end_date: actualEnd.toISOString()
      };
    }
  };

  // 获取任务数据
  const fetchTasks = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      
      // 根据选择的日期和时区计算日期范围
      const dateRange = getDateRangeFromFilter(dateTimeFilter);
      params.start_date = dateRange.start_date;
      params.end_date = dateRange.end_date;
      
      const data = await tasksApi.getUpdatedToday(params);
      setTasks(data.tasks);
      setTotal(data.total);
      setApiDateRange(data.date_range);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取任务失败');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters, dateTimeFilter, user]);

  // 重置过滤器
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category: '',
    });
    setDateTimeFilter({
      date: getTodayDateString(),
      timezone: getCurrentTimezone(),
    });
  };

  // 格式化时间
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化日期
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 获取任务分类信息
  const getTaskCategory = (task: TaskMemory) => {
    const categoryId = (task as any).category_id || (task.content as TaskContent).category_id;
    return categories.find(cat => cat.id === categoryId);
  };

  // 渲染任务卡片
  const renderTaskCard = (task: TaskMemory) => {
    const content = task.content as TaskContent;
    const statusInfo = statusConfig[content.status] || statusConfig.pending;
    const priorityInfo = priorityConfig[content.priority] || priorityConfig.medium;
    const category = getTaskCategory(task);
    const StatusIcon = statusInfo.icon;

    return (
      <div key={task.id} className="glass rounded-xl p-6 hover:shadow-lg transition-all duration-200 border border-white/20">
        {/* 头部：状态和优先级标签 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`w-4 h-4 ${statusInfo.textColor}`} />
              <span className={`text-sm font-medium ${statusInfo.textColor}`}>
                {statusInfo.label}
              </span>
            </div>
            <div className={`px-3 py-1.5 rounded-full ${priorityInfo.bgColor}`}>
              <span className={`text-sm font-medium ${priorityInfo.textColor}`}>
                {priorityInfo.label}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {formatTime(task.updated_at)}
          </div>
        </div>

        {/* 任务标题 */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {content.title}
        </h3>

        {/* 任务描述 */}
        {content.description && (
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            {content.description}
          </p>
        )}

        {/* 元数据区域 */}
        <div className="space-y-3">
          {/* 进度和时间信息 */}
          {(content.progress !== undefined && content.progress > 0) || content.estimated_duration && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {content.progress !== undefined && content.progress > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${content.progress}%` }}
                    ></div>
                  </div>
                  <span>{content.progress}%</span>
                </div>
              )}
              {content.estimated_duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{content.estimated_duration}分钟</span>
                </div>
              )}
            </div>
          )}

          {/* 分类和标签 */}
          <div className="flex flex-wrap gap-2">
            {category && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <Tag className="w-3 h-3" />
                <span>{category.name}</span>
              </div>
            )}
            {content.assignee && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                <User className="w-3 h-3" />
                <span>{content.assignee}</span>
              </div>
            )}
            {task.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm">
                #{tag}
              </span>
            ))}
          </div>

          {/* 备注 */}
          {content.notes && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <span className="font-medium text-gray-700">备注：</span>
              <span className="text-gray-600 ml-1">{content.notes}</span>
            </div>
          )}

          {/* 日期信息 */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>创建时间: {formatDate(task.created_at)}</span>
            {content.due_date && (
              <span className={new Date(content.due_date) < new Date() ? 'text-red-500' : ''}>
                截止时间: {formatDate(content.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 身份验证和加载守卫
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {dateTimeFilter.date === getTodayDateString() 
                  ? '今日更新任务' 
                  : `${formatDate(dateTimeFilter.date)} 更新任务`}
              </h1>
              <p className="text-gray-600">
                查看指定日期内更新的所有任务，用于总结工作内容和检查进度
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  时区: {commonTimezones.find(tz => tz.value === dateTimeFilter.timezone)?.label || dateTimeFilter.timezone}
                </span>
              </div>
            </div>
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
          
          {apiDateRange && (
            <div className="glass rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  时间范围: {formatTime(apiDateRange.start)} - {formatTime(apiDateRange.end)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 过滤器控制 */}
        <div className="glass rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">筛选条件</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择日期</label>
              <input
                type="date"
                value={dateTimeFilter.date}
                onChange={(e) => setDateTimeFilter(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">时区</label>
              <select
                value={dateTimeFilter.timezone}
                onChange={(e) => setDateTimeFilter(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {commonTimezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
                <option value="on_hold">暂停</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">全部优先级</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">全部分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                重置过滤器
              </button>
            </div>
          </div>
          
          {/* 快捷时间选择 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">快捷选择:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setDateTimeFilter(prev => ({ 
                    ...prev, 
                    date: getTodayDateString() 
                  }));
                }}
                className="px-3 py-1 text-xs bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                今天
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setDateTimeFilter(prev => ({ 
                    ...prev, 
                    date: yesterday.toISOString().split('T')[0] 
                  }));
                }}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                昨天
              </button>
              <button
                onClick={() => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  setDateTimeFilter(prev => ({ 
                    ...prev, 
                    date: weekAgo.toISOString().split('T')[0] 
                  }));
                }}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                7天前
              </button>
              <button
                onClick={() => {
                  const monthAgo = new Date();
                  monthAgo.setDate(monthAgo.getDate() - 30);
                  setDateTimeFilter(prev => ({ 
                    ...prev, 
                    date: monthAgo.toISOString().split('T')[0] 
                  }));
                }}
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                30天前
              </button>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="glass rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary-600" />
              <span className="text-lg font-semibold text-gray-900">
                共找到 {total} 个在 {dateTimeFilter.date === getTodayDateString() ? '今天' : formatDate(dateTimeFilter.date)} 更新的任务
              </span>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span>加载中...</span>
              </div>
            )}
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">错误：</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* 任务列表 */}
        {!loading && !error && (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {dateTimeFilter.date === getTodayDateString() 
                    ? '今天还没有更新任何任务' 
                    : '当天没有更新任何任务'}
                </h3>
                <p className="text-gray-500">
                  当你在 {dateTimeFilter.date === getTodayDateString() ? '今天' : formatDate(dateTimeFilter.date)} 
                  ({commonTimezones.find(tz => tz.value === dateTimeFilter.timezone)?.label || dateTimeFilter.timezone}) 
                  更新任务时，它们会出现在这里
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {tasks.map(renderTaskCard)}
              </div>
            )}
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="glass rounded-xl p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-500">
                正在加载 {dateTimeFilter.date === getTodayDateString() ? '今天' : formatDate(dateTimeFilter.date)} 更新的任务...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
