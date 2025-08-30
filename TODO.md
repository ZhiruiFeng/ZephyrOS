# TODO List

## 当前任务

### 🔧 技术债务
- [x] 修复Next.js 15 params类型问题 - 所有API路由现在使用`Promise<{ id: string }>`
- [x] 修复TimeEntryCreateSchema支持timer source
- [x] 修复activities stats API的created_at字段查询
- [x] 修复测试文件中的params调用

### 🎯 功能开发
- [x] 实现Activities计时器功能
- [x] 修复计时器冲突问题 - 同一时间只能有一个运行中的time-entries
- [x] 扩展useTimer Hook支持activities
- [x] 集成activity计时器UI到主页和focus模式
- [x] 修复useTimer Hook中的认证问题

## 已完成

### ✅ 数据库重构
- [x] 创建timeline_items超级表
- [x] 迁移tasks作为子类型
- [x] 创建time_entries通用时间跟踪表
- [x] 实现数据同步触发器
- [x] 清理legacy task_time_entries

### ✅ Activities功能
- [x] 创建activities表和相关API
- [x] 实现Activities CRUD操作
- [x] 添加Activities到主页显示
- [x] 创建Activity Focus模式页面
- [x] 实现Activities计时器功能

### ✅ 前端集成
- [x] 扩展AddTaskModal支持Activities创建
- [x] 实现ActivityEditor组件
- [x] 创建ActivityFocusView组件
- [x] 集成全局计时器状态管理

## 下一步计划

### 🚀 新功能
- [ ] 实现Routines功能
- [ ] 实现Habits功能
- [ ] 实现Memories功能
- [ ] 添加数据分析和可视化

### 🔧 优化
- [ ] 性能优化和缓存策略
- [ ] 用户体验改进
- [ ] 移动端适配
- [ ] 国际化支持
