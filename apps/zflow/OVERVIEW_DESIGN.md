# ZFlow Overview 页面设计更新

## 🎨 新设计特性

### 1. 简化导航栏
- **ZFlow Logo**: 简洁的"Z"图标设计
- **标题和副标题**: "简洁高效的任务工作台"
- **设置按钮**: 统一的设置入口，替换了分散的控制元素

### 2. 智能统计卡片区域
使用现代化的glass效果卡片，点击直接切换视图：
- **Current**: 进行中任务 + 24小时内完成的任务
  - 图标：时钟图标 (Clock)
  - 颜色：蓝色系
  - 包含：pending、in_progress、completed(24小时内)
- **Future**: 待办事项 (on_hold状态)
  - 图标：待办事项图标 (ListTodo)
  - 颜色：紫色系
  - 包含：on_hold状态的任务
- **Archive**: 已归档 + 已取消
  - 图标：归档图标 (Archive)
  - 颜色：灰色系
  - 包含：completed(24小时后)、cancelled状态

### 3. 优化的控制面板布局
- **左侧**: 搜索框和优先级筛选器
- **右侧**: 当前视图指示器、列表/网格切换、Focus按钮
- **响应式设计**: 在小屏幕上自动堆叠为垂直布局
- **统一风格**: 所有控制元素使用一致的glass效果设计

### 4. 交互式卡片设计
- **点击切换**: 点击统计卡片直接切换到对应视图
- **视觉反馈**: 当前选中的卡片有特殊的边框和阴影效果
- **悬停效果**: 卡片悬停时有微妙的动画效果
- **当前视图指示器**: 显示正在查看的视图类型

### 5. 简化的布局设计
- **移除冗余**: 去掉了顶部导航栏中的控制元素
- **统一展示**: 所有视图都使用相同的卡片布局
- **响应式网格**: 支持列表和网格两种展示模式
- **清晰层次**: 更好的视觉层次和信息组织

### 6. Glass效果设计
- **背景渐变**: 从蓝色到靛蓝色的渐变背景
- **半透明卡片**: 使用backdrop-blur效果的现代化卡片
- **圆角设计**: 统一的圆角设计语言
- **阴影效果**: 微妙的阴影和悬停效果

### 7. 改进的交互体验
- **平滑过渡**: 所有交互都有流畅的动画效果
- **悬停效果**: 卡片和按钮的悬停反馈
- **响应式设计**: 适配不同屏幕尺寸
- **无障碍设计**: 良好的键盘导航支持

## 🛠️ 技术实现

### 布局结构
```html
<!-- 顶部导航栏 -->
<nav>
  <logo> + <title> + <settings-button>
</nav>

<!-- 主要内容区域 -->
<main>
  <!-- 统计卡片区域 -->
  <statistics-cards>
    <current-card> + <future-card> + <archive-card>
  </statistics-cards>
  
  <!-- 控制面板 -->
  <control-panel>
    <left>
      <search> + <priority-filter>
    </left>
    <right>
      <view-indicator> + <display-toggle> + <focus-button>
    </right>
  </control-panel>
  
  <!-- 任务内容 -->
  <task-content>
    <current-view> | <future-view> | <archive-view>
  </task-content>
</main>
```

### 视图逻辑
```typescript
// Current: pending + in_progress + completed(24小时内)
const currentList = tasks.filter(t => {
  const c = t.content as TaskContent
  if (c.status === 'pending' || c.status === 'in_progress') return true
  if (c.status === 'completed') {
    const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
    return completedAt && now - completedAt <= 24 * 60 * 60 * 1000
  }
  return false
})

// Future: on_hold状态
const futureList = tasks.filter(t => (t.content as TaskContent).status === 'on_hold')

// Archive: completed(24小时后) + cancelled
const archiveList = tasks.filter(t => {
  const c = t.content as TaskContent
  if (c.status === 'cancelled') return true
  if (c.status === 'completed') {
    const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : 0
    return completedAt && now - completedAt > 24 * 60 * 60 * 1000
  }
  return false
})
```

### CSS类名
- `.glass`: 基础glass效果
- `.stat-card`: 统计卡片样式
- `.task-card`: 任务卡片样式
- `.form-input`: 表单输入样式
- `.nav-glass`: 导航栏样式
- `.control-panel`: 控制面板样式

### 颜色系统
- **Current**: 蓝色系 (#3B82F6)
- **Future**: 紫色系 (#8B5CF6)
- **Archive**: 灰色系 (#6B7280)
- **背景**: 渐变背景 (#f0f9ff 到 #e0f2fe)
- **卡片**: 半透明白色背景

### 响应式断点
- **移动端**: 单列布局，控制面板垂直堆叠
- **平板**: 双列布局
- **桌面**: 多列布局，控制面板水平排列

## 🎯 用户体验改进

1. **直观导航**: 点击统计卡片直接切换视图，无需额外操作
2. **清晰分类**: 三个明确的分类，符合用户思维模式
3. **视觉反馈**: 当前视图有明显的视觉指示
4. **操作便捷**: 减少点击步骤，提高操作效率
5. **信息密度**: 合理的信息密度，避免界面过于拥挤
6. **布局优化**: 控制元素集中管理，减少视觉干扰

## 📱 兼容性

- 支持现代浏览器
- 响应式设计
- 触摸设备友好
- 键盘导航支持

## 🔄 视图切换逻辑

### Current视图
- 显示进行中的任务 (pending, in_progress)
- 显示24小时内完成的任务
- 支持任务完成/取消完成操作
- 显示截止日期和逾期状态

### Future视图
- 显示待办事项 (on_hold状态)
- 支持激活任务到pending状态
- 显示任务优先级和分类信息

### Archive视图
- 显示已归档任务 (completed超过24小时)
- 显示已取消的任务
- 支持重新打开已完成的任务
- 区分完成和取消状态

## 🎨 布局优势

### 1. 视觉层次清晰
- 顶部导航栏简洁明了
- 统计卡片突出重要信息
- 控制面板功能分组合理
- 任务内容区域专注展示

### 2. 操作流程优化
- 统计卡片作为主要导航方式
- 控制元素就近放置，减少鼠标移动
- 响应式设计适配不同设备
- 统一的交互模式

### 3. 空间利用高效
- 移除冗余的导航元素
- 控制面板紧凑布局
- 充分利用屏幕空间
- 保持界面整洁
