# 侧边栏视图改进

## 改进概述

将overview页面侧边栏的分类统计从显示已完成任务数量改为显示基于当前视图（current、future、archive）的分类任务数量，提供更直观的分类任务分布信息。

## 主要改进

### 1. 统计逻辑优化
- **原逻辑**：显示所有任务的已完成/未完成数量
- **新逻辑**：根据当前选择的视图，显示该视图下各个分类的任务总数

### 2. 界面简化
- **移除**：底部的"显示已完成数量"复选框
- **新增**：底部显示当前视图信息（当前任务/待办事项/归档任务）
- **简化**：每个分类只显示一个数字，表示该视图下的任务总数

### 3. 功能特性

#### 视图相关统计
- **Current视图**：显示进行中 + 24小时内完成的任务数量
- **Future视图**：显示待办事项（on_hold状态）的任务数量
- **Archive视图**：显示已归档 + 已取消的任务数量

#### 分类统计
- 全部：当前视图下的所有任务数量
- 未分类：当前视图下无分类的任务数量
- 各分类：当前视图下该分类的任务数量

## 技术实现

### 核心函数

#### `viewBasedCounts`
计算基于当前视图的分类统计：
```typescript
const viewBasedCounts = React.useMemo(() => {
  const getTasksForView = (viewType: ViewKey) => {
    switch (viewType) {
      case 'current':
        return tasks.filter(t => {
          const c = t.content as TaskContent
          if (c.status === 'pending' || c.status === 'in_progress') return true
          if (c.status === 'completed') {
            const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
            return completedAt && now - completedAt <= windowMs
          }
          return false
        })
      case 'future':
        return tasks.filter(t => {
          const c = t.content as TaskContent
          return c.status === 'on_hold'
        })
      case 'archive':
        return tasks.filter(t => {
          const c = t.content as TaskContent
          if (c.status === 'cancelled') return true
          if (c.status === 'completed') {
            const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
            return completedAt && now - completedAt > windowMs
          }
          return false
        })
      default:
        return []
    }
  }

  const viewTasks = getTasksForView(view)
  // 计算分类统计...
  return counts
}, [tasks, view, now])
```

### 组件修改

#### CategorySidebar组件
- 添加 `view` 参数来接收当前视图信息
- 移除 `showCompletedCounts` 相关逻辑
- 简化数量显示，只显示当前视图下的任务总数
- 底部显示当前视图信息

#### 数据传递
```tsx
<CategorySidebar
  categories={categories}
  selected={selectedCategory}
  counts={viewBasedCounts}  // 使用基于视图的统计数据
  view={view}               // 传递当前视图
  // ... 其他属性
/>
```

## 用户体验改进

### 1. 更直观的信息展示
- 用户可以快速了解当前视图下各个分类的任务分布
- 帮助用户识别需要重点关注的工作领域

### 2. 更简洁的界面
- 移除了复杂的已完成/未完成数量显示
- 每个分类只显示一个清晰的数字

### 3. 更好的上下文感知
- 侧边栏底部显示当前视图信息
- 用户可以清楚知道当前看到的是哪个视图的统计

## 使用场景

### 1. 工作优先级管理
- 查看当前任务中哪个分类占用最多时间
- 帮助调整工作重点和资源分配

### 2. 项目进度跟踪
- 了解不同项目/分类在特定视图下的任务分布
- 识别需要加强管理的领域

### 3. 时间管理优化
- 分析任务分类在不同视图下的分布
- 优化工作流程和任务安排

## 兼容性

- ✅ 保持所有原有功能
- ✅ 不影响任务创建和编辑
- ✅ 支持所有现有分类
- ✅ 响应式设计，适配各种设备

## 后续优化建议

1. **数据可视化**
   - 添加分类任务的进度条显示
   - 支持分类任务的优先级分布

2. **交互增强**
   - 点击分类直接筛选该分类的任务
   - 支持分类的快速编辑和删除

3. **性能优化**
   - 添加统计数据的缓存机制
   - 优化大量任务时的计算性能
