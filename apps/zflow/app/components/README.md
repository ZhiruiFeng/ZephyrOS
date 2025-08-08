# ZFlow 组件模块化结构

## 概述

本项目采用了模块化的架构设计，将任务编辑功能提取为可复用的组件，提高了代码的复用率和维护性。

## 文件结构

```
apps/zflow/app/
├── components/
│   ├── TaskEditor.tsx          # 任务编辑组件
│   ├── TaskIcons.tsx           # 任务图标组件
│   └── README.md               # 组件说明文档
├── utils/
│   └── taskUtils.ts            # 任务相关工具函数
├── types/
│   └── task.ts                 # 任务类型定义
├── page.tsx                    # 主页面（列表/网格视图）
└── kanban/
    └── page.tsx                # 看板页面
```

## 组件说明

### TaskEditor 组件

**位置**: `components/TaskEditor.tsx`

**功能**: 
- 提供统一的任务编辑界面
- 支持编辑任务的所有属性（标题、描述、状态、优先级、截止时间、标签）
- 可复用于主页面和看板页面

**Props**:
- `isOpen`: 控制弹窗显示/隐藏
- `onClose`: 关闭弹窗的回调函数
- `task`: 要编辑的任务对象
- `onSave`: 保存任务的回调函数
- `title`: 弹窗标题（可选）

**使用示例**:
```tsx
<TaskEditor
  isOpen={editorOpen}
  onClose={closeEditor}
  task={selectedTask}
  onSave={handleSaveTask}
  title="编辑任务"
/>
```

### TaskIcons 组件

**位置**: `components/TaskIcons.tsx`

**功能**: 
- 提供任务相关的图标组件
- 处理动态图标导入
- 返回React元素，可在JSX中使用

**主要函数**:
- `getPriorityIcon()`: 获取优先级图标

**使用示例**:
```tsx
import { getPriorityIcon } from './components/TaskIcons'

{getPriorityIcon(task.priority)}
```

## 工具函数

### taskUtils.ts

**位置**: `utils/taskUtils.ts`

**功能**: 提供任务相关的纯工具函数（不包含JSX）

**主要函数**:
- `getStatusColor()`: 获取状态颜色样式
- `getPriorityColor()`: 获取优先级颜色样式
- `isOverdue()`: 检查任务是否逾期
- `formatDate()`: 格式化日期
- `formatTagsString()`: 格式化标签字符串
- `parseTagsString()`: 解析标签字符串
- `getStatusLabel()`: 获取状态中文名称
- `getPriorityLabel()`: 获取优先级中文名称

## 类型定义

### task.ts

**位置**: `types/task.ts`

**功能**: 定义任务相关的TypeScript类型

**主要类型**:
- `Task`: 任务对象接口
- `TaskForm`: 任务表单接口
- `TaskEditorProps`: 任务编辑器属性接口
- `FilterStatus`: 筛选状态类型
- `FilterPriority`: 筛选优先级类型
- `ViewMode`: 视图模式类型

## 模块化优势

### 1. 代码复用
- 任务编辑功能在主页面和看板页面中共享
- 工具函数可在多个组件中使用
- 类型定义统一管理，避免重复

### 2. 维护性
- 修改编辑功能只需更新一个组件
- 工具函数集中管理，便于维护
- 类型定义统一，减少类型错误

### 3. 可扩展性
- 新增页面可以轻松复用现有组件
- 工具函数可以方便地添加新功能
- 类型系统支持良好的扩展性

### 4. 一致性
- 所有页面的任务编辑体验保持一致
- 工具函数确保样式和逻辑的一致性
- 类型定义确保数据结构的一致性

### 5. 架构清晰
- 图标组件与工具函数分离，避免JSX语法错误
- 纯工具函数与React组件分离
- 类型定义独立管理

## 使用指南

### 添加新的任务相关页面

1. 导入共享组件和工具函数：
```tsx
import TaskEditor from '../components/TaskEditor'
import { getPriorityIcon } from '../components/TaskIcons'
import { getStatusColor, formatDate } from '../utils/taskUtils'
import { Task } from '../types/task'
```

2. 使用TaskEditor组件：
```tsx
const [editorOpen, setEditorOpen] = useState(false)
const [selectedTask, setSelectedTask] = useState<any>(null)

const handleSaveTask = async (taskId: string, data: any) => {
  await updateTask(taskId, data)
}

<TaskEditor
  isOpen={editorOpen}
  onClose={() => setEditorOpen(false)}
  task={selectedTask}
  onSave={handleSaveTask}
/>
```

3. 使用图标和工具函数：
```tsx
{getPriorityIcon(task.priority)}
<span className={getStatusColor(task.status)}>
  {task.status}
</span>
```

### 扩展功能

1. 添加新的工具函数到 `taskUtils.ts`
2. 添加新的图标到 `TaskIcons.tsx`
3. 添加新的类型定义到 `types/task.ts`
4. 在需要的地方导入并使用

## 技术细节

### 图标处理
- 使用动态导入避免打包体积过大
- 图标组件独立管理，避免JSX语法错误
- 支持懒加载和错误处理

### 类型安全
- 完整的TypeScript类型定义
- 接口统一管理，确保类型一致性
- 编译时类型检查，减少运行时错误

### 性能优化
- 组件懒加载
- 工具函数纯函数化
- 避免不必要的重新渲染

这种模块化的设计使得代码更加清晰、可维护，并且为未来的功能扩展提供了良好的基础。
