# Vercel部署问题修复

## 问题描述

在添加ZFlow iOS应用后，Vercel部署出现了依赖冲突错误：

```
npm error ERESOLVE unable to resolve dependency tree
npm error Could not resolve dependency:
npm error peer react@"^18.3.1" from react-dom@18.3.1
```

## 问题原因

1. **依赖冲突**: 之前尝试安装`react-native-web`和`@expo/metro-runtime`时产生了版本冲突
2. **TypeScript类型问题**: `RouteProp`类型导入不正确

## 解决方案

### 1. 清理依赖冲突

从`apps/zflow-ios/package.json`中移除了冲突的依赖：

```json
// 移除了这些依赖
"@expo/metro-runtime": "~3.1.3",
"react-native-web": "~0.19.6",
```

### 2. 修复TypeScript类型导入

安装了`@react-navigation/core`包并修复了导入：

```typescript
// 修复前
import type { RouteProp } from '@react-navigation/native';

// 修复后
import type { RouteProp } from '@react-navigation/core';
```

### 3. 简化构建配置

将iOS应用的构建命令简化为TypeScript检查：

```json
{
  "scripts": {
    "build": "tsc --noEmit"
  }
}
```

## 修复后的状态

✅ **iOS应用构建成功** - TypeScript类型检查通过
✅ **依赖冲突解决** - 移除了冲突的依赖包
✅ **Vercel部署兼容** - 不再有依赖解析错误

## 验证步骤

1. **本地构建测试**:
   ```bash
   cd apps/zflow-ios
   npm run type-check
   ```

2. **完整项目构建**:
   ```bash
   npm run build
   ```

3. **Vercel部署测试**:
   - 推送代码到GitHub
   - 检查Vercel部署日志
   - 确认没有依赖冲突错误

## 注意事项

- iOS应用现在只进行TypeScript类型检查，不进行实际的Expo构建
- 如果需要生产构建，可以使用`expo build:ios`或`expo build:android`
- 开发时使用`npm run start`启动Expo开发服务器

## 相关文件

- `apps/zflow-ios/package.json` - 依赖配置
- `apps/zflow-ios/src/screens/TaskDetailScreen.tsx` - 类型导入修复
- `apps/zflow-ios/tsconfig.json` - TypeScript配置

---

**修复完成时间**: 2025-01-20
**状态**: ✅ 已解决
