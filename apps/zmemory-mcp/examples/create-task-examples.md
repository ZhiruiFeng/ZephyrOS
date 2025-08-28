# Create Task 使用示例

## 基本用法

### 1. 最小参数创建任务
```json
{
  "title": "完成项目报告"
}
```
**结果**: 创建一个状态为 `pending`，优先级为 `medium` 的任务

### 2. 带描述的任务
```json
{
  "title": "学习React Hooks",
  "description": "深入学习React Hooks的使用方法和最佳实践，包括useState、useEffect、useContext等核心Hook"
}
```

### 3. 使用分类名称
```json
{
  "title": "准备团队会议",
  "description": "准备下周团队会议的材料和议程",
  "category": "工作",
  "priority": "high"
}
```

## 高级用法

### 4. 完整参数任务
```json
{
  "title": "系统架构设计评审",
  "description": "对新的微服务架构设计进行技术评审，确保设计符合最佳实践",
  "category": "工作",
  "priority": "urgent",
  "status": "pending",
  "due_date": "2024-01-15T18:00:00Z",
  "timezone": "Asia/Shanghai",
  "estimated_duration": 240,
  "assignee": "张三",
  "tags": ["架构", "评审", "技术"],
  "notes": "需要准备评审清单和检查点"
}
```

### 5. 学习任务
```json
{
  "title": "学习TypeScript高级特性",
  "description": "学习TypeScript的高级类型、泛型、装饰器等特性",
  "category": "学习",
  "priority": "medium",
  "due_date": "2024-01-20",
  "estimated_duration": 180,
  "tags": ["TypeScript", "学习", "编程"]
}
```

### 6. 个人任务
```json
{
  "title": "整理书房",
  "description": "整理书房，分类书籍，清理不需要的物品",
  "category": "个人",
  "priority": "low",
  "estimated_duration": 120,
  "tags": ["整理", "个人"]
}
```

## 工作流程示例

### 步骤1: 查看可用分类
首先调用 `get_categories` 工具查看可用的分类：
```json
{}
```

### 步骤2: 创建任务
根据可用分类创建任务：
```json
{
  "title": "代码审查",
  "description": "对团队提交的代码进行审查，确保代码质量和规范",
  "category": "工作",
  "priority": "high",
  "due_date": "2024-01-12T17:00:00Z"
}
```

## 常见场景

### 项目管理
```json
{
  "title": "项目里程碑评审",
  "description": "评审项目当前里程碑的完成情况，识别风险和问题",
  "category": "项目",
  "priority": "urgent",
  "status": "pending",
  "due_date": "2024-01-18T14:00:00Z",
  "estimated_duration": 90,
  "assignee": "项目经理",
  "tags": ["里程碑", "评审", "项目管理"]
}
```

### 会议准备
```json
{
  "title": "准备季度汇报",
  "description": "准备季度工作汇报的PPT和材料",
  "category": "会议",
  "priority": "high",
  "due_date": "2024-01-25T10:00:00Z",
  "estimated_duration": 300,
  "tags": ["汇报", "季度", "准备"]
}
```

### 学习计划
```json
{
  "title": "学习Docker容器化",
  "description": "学习Docker的基本概念、命令和最佳实践",
  "category": "学习",
  "priority": "medium",
  "estimated_duration": 240,
  "tags": ["Docker", "容器化", "学习"]
}
```

## 注意事项

1. **分类名称**: 使用中文分类名称，系统会自动映射到对应的category_id
2. **日期格式**: 支持 `YYYY-MM-DD` 或 ISO 8601 格式
3. **时区**: 建议指定时区以确保日期时间正确解释
4. **优先级**: 可选值包括 `low`、`medium`、`high`、`urgent`
5. **状态**: 可选值包括 `pending`、`in_progress`、`completed`、`on_hold`、`cancelled`

## 错误处理

如果提供的分类名称不存在，系统会：
1. 记录警告信息
2. 继续创建任务
3. 任务将不关联任何分类

这确保了即使分类映射失败，任务创建仍然能够成功完成。
