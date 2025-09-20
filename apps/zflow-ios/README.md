# ZFlow iOS

ZFlow的iOS移动应用版本，基于React Native和Expo构建。

## 功能特性

- 📱 原生iOS体验
- 🔄 与ZMemory后端API完全集成
- 📋 任务管理（查看、创建、更新、删除）
- 🎨 现代化的UI设计
- 🔄 实时数据同步
- 📊 任务状态和优先级管理

## 技术栈

- **React Native** - 跨平台移动应用框架
- **Expo** - 开发工具链和部署平台
- **TypeScript** - 类型安全的JavaScript
- **React Navigation** - 导航库
- **SWR** - 数据获取和缓存

## 快速开始

### 环境要求

- Node.js 20.x
- npm 10.x
- Expo CLI
- iOS Simulator (macOS) 或 物理iOS设备

### 安装依赖

```bash
# 在项目根目录
npm install

# 或者单独安装iOS应用依赖
cd apps/zflow-ios
npm install
```

### 启动开发服务器

```bash
# 启动所有服务（包括后端）
npm run dev

# 或者单独启动iOS应用
npm run dev -w @zephyros/zflow-ios
```

### 运行应用

```bash
# 在iOS模拟器中运行
npm run ios

# 在Android模拟器中运行
npm run android

# 在Web浏览器中运行
npm run web
```

## 项目结构

```
apps/zflow-ios/
├── src/
│   ├── components/     # 可复用组件
│   ├── screens/        # 页面组件
│   ├── hooks/          # 自定义Hooks
│   ├── services/       # API服务
│   ├── types/          # TypeScript类型定义
│   └── utils/          # 工具函数
├── assets/             # 静态资源
├── App.tsx            # 应用入口
├── app.json           # Expo配置
└── package.json       # 依赖配置
```

## API集成

应用通过HTTP API与ZMemory后端通信：

- **开发环境**: `http://localhost:3001`
- **生产环境**: 配置生产API URL

### 主要API端点

- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks` - 创建新任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务

## 开发指南

### 添加新功能

1. 在 `src/types/` 中定义TypeScript类型
2. 在 `src/services/api.ts` 中添加API方法
3. 在 `src/hooks/` 中创建自定义Hook
4. 在 `src/screens/` 中创建页面组件
5. 更新导航配置

### 代码规范

- 使用TypeScript进行类型检查
- 遵循React Native最佳实践
- 使用函数组件和Hooks
- 保持组件简洁和可复用

## 构建和部署

### 开发构建

```bash
npm run build
```

### 生产构建

```bash
# iOS
expo build:ios

# Android
expo build:android
```

## 故障排除

### 常见问题

1. **Metro bundler错误**: 清除缓存 `npx expo start --clear`
2. **API连接失败**: 检查后端服务是否运行在正确端口
3. **iOS模拟器问题**: 重启模拟器或重新安装应用

### 调试

- 使用React Native Debugger
- 查看Expo开发工具日志
- 使用Flipper进行网络调试

## 贡献

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License
