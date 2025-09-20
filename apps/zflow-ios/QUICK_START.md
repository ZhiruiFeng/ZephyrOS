# ZFlow iOS 快速开始指南

## 🎉 恭喜！ZFlow iOS应用已成功创建

你的iOS版本ZFlow应用已经配置完成，可以直接连接到现有的ZMemory后端。

## 📱 应用特性

- ✅ **完整的任务管理功能** - 查看、创建、更新、删除任务
- ✅ **现代化UI设计** - 原生iOS体验
- ✅ **实时数据同步** - 与ZMemory后端完全集成
- ✅ **TypeScript支持** - 类型安全的开发体验
- ✅ **响应式设计** - 适配不同屏幕尺寸

## 🚀 立即开始

### 1. 安装Expo CLI（如果未安装）
```bash
npm install -g @expo/cli
```

### 2. 启动后端服务
```bash
# 在项目根目录
npm run dev -w @zephyros/zmemory-api
```

### 3. 启动iOS应用
```bash
# 在 apps/zflow-ios 目录
npm run start
# 或使用启动脚本
./start.sh
```

### 4. 在设备上运行
- **iOS模拟器**: 按 `i` 键
- **Android模拟器**: 按 `a` 键  
- **真机**: 扫描二维码

## 📁 项目结构

```
apps/zflow-ios/
├── src/
│   ├── screens/          # 页面组件
│   │   ├── HomeScreen.tsx      # 主页
│   │   ├── TaskListScreen.tsx  # 任务列表
│   │   └── TaskDetailScreen.tsx # 任务详情
│   ├── hooks/            # 自定义Hooks
│   │   ├── useTasks.ts         # 任务列表Hook
│   │   └── useTask.ts          # 单个任务Hook
│   ├── services/         # API服务
│   │   └── api.ts              # API客户端
│   ├── types/            # 类型定义
│   │   └── Task.ts             # 任务类型
│   └── utils/            # 工具函数
├── App.tsx               # 应用入口
├── app.json              # Expo配置
└── package.json          # 依赖配置
```

## 🔧 开发命令

```bash
# 启动开发服务器
npm run start

# 在iOS模拟器中运行
npm run ios

# 在Android模拟器中运行
npm run android

# 在Web浏览器中运行
npm run web

# TypeScript类型检查
npm run type-check

# 代码检查
npm run lint
```

## 🌐 API集成

应用自动连接到ZMemory后端API：

- **开发环境**: `http://localhost:3001`
- **生产环境**: 通过环境变量配置

### 主要功能
- 📋 获取任务列表
- 📝 创建新任务
- ✏️ 更新任务状态
- 🗑️ 删除任务
- 📊 任务统计

## 🎨 UI特性

- **现代化设计** - 遵循iOS设计规范
- **状态指示器** - 清晰的任务状态显示
- **优先级标识** - 颜色编码的优先级系统
- **下拉刷新** - 实时数据更新
- **错误处理** - 友好的错误提示

## 🔄 与Web版本同步

iOS应用与现有的ZFlow Web版本共享：
- ✅ 相同的API接口
- ✅ 相同的数据结构
- ✅ 相同的业务逻辑
- ✅ 实时数据同步

## 🛠️ 自定义开发

### 添加新功能
1. 在 `src/types/` 中定义类型
2. 在 `src/services/api.ts` 中添加API方法
3. 在 `src/hooks/` 中创建自定义Hook
4. 在 `src/screens/` 中创建页面组件

### 修改UI样式
- 编辑各Screen组件中的StyleSheet
- 使用React Native的样式系统
- 支持iOS和Android平台适配

## 📱 部署

### 开发构建
```bash
expo build:development
```

### 生产构建
```bash
expo build:ios
expo build:android
```

## 🆘 故障排除

### 常见问题
1. **Metro bundler错误**: `npx expo start --clear`
2. **API连接失败**: 检查后端服务是否运行
3. **iOS模拟器问题**: 重启模拟器

### 获取帮助
- 查看 `README.md` 获取详细文档
- 运行 `./verify.sh` 检查配置
- 检查控制台日志获取错误信息

## 🎯 下一步

1. **测试基础功能** - 确保任务管理正常工作
2. **添加新功能** - 根据需求扩展应用
3. **优化UI** - 改进用户体验
4. **部署到App Store** - 发布到应用商店

---

**🎉 你的ZFlow iOS应用已经准备就绪！开始探索移动端的生产力体验吧！**
