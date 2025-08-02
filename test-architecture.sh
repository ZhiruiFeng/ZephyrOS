#!/bin/bash

echo "🧪 测试 ZephyrOS 架构..."
echo ""

# 测试 ZMemory API 健康检查
echo "1. 测试 ZMemory API 健康检查..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "✅ ZMemory API 健康检查通过"
else
    echo "❌ ZMemory API 健康检查失败"
    exit 1
fi

# 测试获取记忆列表
echo ""
echo "2. 测试获取记忆列表..."
MEMORIES_RESPONSE=$(curl -s http://localhost:3001/api/memories)
if [[ $MEMORIES_RESPONSE == *"示例任务"* ]]; then
    echo "✅ 获取记忆列表成功"
else
    echo "❌ 获取记忆列表失败"
    exit 1
fi

# 测试创建新任务
echo ""
echo "3. 测试创建新任务..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "content": {
      "title": "架构测试任务",
      "description": "验证前后端分离架构",
      "status": "pending",
      "priority": "high"
    },
    "tags": ["zflow", "test"]
  }')

if [[ $CREATE_RESPONSE == *"架构测试任务"* ]]; then
    echo "✅ 创建任务成功"
else
    echo "❌ 创建任务失败"
    exit 1
fi

# 测试 ZFlow 前端
echo ""
echo "4. 测试 ZFlow 前端..."
FRONTEND_RESPONSE=$(curl -s -I http://localhost:3000 | head -1)
if [[ $FRONTEND_RESPONSE == *"200 OK"* ]]; then
    echo "✅ ZFlow 前端正常运行"
else
    echo "❌ ZFlow 前端运行失败"
    exit 1
fi

echo ""
echo "🎉 所有测试通过！架构验证成功！"
echo ""
echo "📊 架构总结："
echo "   - ZMemory API (端口 3001): ✅ 运行正常"
echo "   - ZFlow 前端 (端口 3000): ✅ 运行正常"
echo "   - 前后端通信: ✅ 工作正常"
echo ""
echo "🌐 访问地址："
echo "   - 前端应用: http://localhost:3000"
echo "   - API 文档: http://localhost:3001/api/health" 