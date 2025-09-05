# Profile Dashboard 组件化系统

这个系统将profile页面重构为可配置的模块化设计，用户可以根据自己的需求选择要显示的模块。

## 主要特性

- **模块化设计**: 每个功能都是独立的模块，可以单独启用/禁用
- **用户自定义**: 用户可以通过界面选择要显示的模块
- **拖拽排序**: 支持拖拽重新排列模块顺序
- **配置保存**: 用户的模块配置会自动保存到本地存储
- **响应式设计**: 支持桌面和移动端
- **国际化支持**: 支持中英文切换

## 组件结构

```
components/profile/
├── ProfileDashboard.tsx          # 主仪表板组件
├── ModuleSelector.tsx            # 模块选择器
├── types.ts                      # 类型定义
├── hooks/
│   └── useProfileModules.ts      # 模块管理hook
├── modules/
│   ├── EnergySpectrumModule.tsx  # 能量图谱模块
│   ├── StatsModule.tsx           # 统计模块
│   └── ActivitySummaryModule.tsx # 活动摘要模块
└── index.ts                      # 导出文件
```

## 使用方法

### 基本使用

```tsx
import { ProfileDashboard } from '@/components/profile'

export default function ProfilePage() {
  return <ProfileDashboard />
}
```

### 添加新模块

1. 在 `modules/` 目录下创建新的模块组件
2. 在 `useProfileModules.ts` 中添加模块配置
3. 在 `ProfileDashboard.tsx` 中添加渲染逻辑

#### 示例：创建新模块

```tsx
// modules/NewModule.tsx
export function NewModule({ config, onConfigChange }: ProfileModuleProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2>新模块</h2>
      {/* 模块内容 */}
    </div>
  )
}
```

#### 在配置中添加模块

```tsx
// hooks/useProfileModules.ts
const AVAILABLE_MODULES: ProfileModule[] = [
  // ... 现有模块
  {
    id: 'new-module',
    name: '新模块',
    description: '这是一个新模块',
    icon: 'NewIcon',
    category: 'tools',
    defaultEnabled: false,
    defaultConfig: {
      // 默认配置
    }
  }
]
```

#### 在仪表板中添加渲染逻辑

```tsx
// ProfileDashboard.tsx
const renderModule = (moduleConfig: ProfileModuleConfig) => {
  // ... 现有逻辑
  case 'new-module':
    return (
      <NewModule 
        key={moduleConfig.id}
        config={moduleConfig}
        onConfigChange={(newConfig) => {
          // 处理配置变更
        }}
      />
    )
}
```

## 模块配置

每个模块都有自己的配置选项，用户可以通过设置面板进行调整：

```tsx
interface ProfileModuleConfig {
  id: string
  enabled: boolean
  order: number
  config: Record<string, any>  // 模块特定配置
}
```

## 数据持久化

目前使用localStorage保存用户配置，在生产环境中应该：

1. 将配置保存到后端数据库
2. 支持多设备同步
3. 添加配置备份/恢复功能

## 扩展性

这个系统设计为高度可扩展：

- **新模块类型**: 可以轻松添加新的模块类型
- **模块分类**: 支持按类别组织模块
- **主题支持**: 可以添加主题切换功能
- **布局选项**: 可以支持不同的布局模式（网格、列表等）

## 国际化

所有文本都通过i18n系统管理，支持中英文切换。添加新文本时需要在 `lib/i18n.ts` 中添加相应的翻译。

## 性能优化

- 使用React.memo优化重渲染
- 懒加载模块组件
- 虚拟滚动（对于大量模块）
- 配置缓存机制
