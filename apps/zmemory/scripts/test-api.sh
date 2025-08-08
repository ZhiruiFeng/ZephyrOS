#!/bin/bash

# Comprehensive API testing script for ZMemory Task APIs
BASE_URL="http://localhost:3001"

echo "🚀 ZMemory Task API Demo"
echo "========================"
echo ""

# Function to make API calls with error handling
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "📋 $description"
    echo "   $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint")
    fi
    
    echo "   Response: $response"
    echo ""
    
    # Return the response for further processing
    echo "$response"
}

# Test 1: Health Check
echo "🏥 Health Check"
api_call "GET" "/api/health" "" "Check API health status"

# Test 2: Get All Tasks (should be empty initially)
echo "📝 Task Management Tests"
api_call "GET" "/api/tasks" "" "Get all tasks (initial)"

# Test 3: Create a new task
echo "➕ Creating Tasks"
task_data='{
  "type": "task",
  "content": {
    "title": "Implement ZFlow integration",
    "description": "Connect ZFlow frontend with ZMemory task APIs",
    "status": "pending",
    "priority": "high",
    "category": "work",
    "estimated_duration": 240,
    "progress": 0
  },
  "tags": ["zflow", "integration", "frontend"]
}'

task_response=$(api_call "POST" "/api/tasks" "$task_data" "Create high-priority task")

# Extract task ID from response (if successful)
task_id=$(echo "$task_response" | jq -r '.id // empty' 2>/dev/null)

if [ -n "$task_id" ] && [ "$task_id" != "null" ]; then
    echo "✅ Task created with ID: $task_id"
    
    # Test 4: Get specific task
    api_call "GET" "/api/tasks/$task_id" "" "Get specific task by ID"
    
    # Test 5: Update task status
    status_update='{
      "status": "in_progress",
      "progress": 25,
      "notes": "Started working on the integration"
    }'
    api_call "PUT" "/api/tasks/$task_id/status" "$status_update" "Update task status to in_progress"
    
    # Test 6: Update task content
    task_update='{
      "content": {
        "description": "Connect ZFlow frontend with ZMemory task APIs - Updated with more details",
        "estimated_duration": 300,
        "progress": 50
      }
    }'
    api_call "PUT" "/api/tasks/$task_id" "$task_update" "Update task details"
    
else
    echo "❌ Failed to create task, continuing with mock tests..."
    task_id="1"  # Use mock ID for remaining tests
fi

# Test 7: Create additional tasks for filtering tests
echo "➕ Creating additional test tasks"

task2_data='{
  "type": "task",
  "content": {
    "title": "Write API documentation",
    "description": "Document all task management endpoints",
    "status": "completed",
    "priority": "medium",
    "category": "work",
    "progress": 100,
    "completion_date": "2024-08-03T10:00:00Z"
  },
  "tags": ["documentation", "api"]
}'

task3_data='{
  "type": "task",
  "content": {
    "title": "Learn TypeScript advanced features",
    "description": "Study generics, decorators, and advanced types",
    "status": "pending",
    "priority": "low",
    "category": "learning",
    "progress": 0,
    "due_date": "2024-08-10T17:00:00Z"
  },
  "tags": ["typescript", "learning", "personal"]
}'

api_call "POST" "/api/tasks" "$task2_data" "Create completed documentation task"
api_call "POST" "/api/tasks" "$task3_data" "Create learning task with due date"

# Test 8: Filtering and search
echo "🔍 Filtering and Search Tests"
api_call "GET" "/api/tasks?status=pending" "" "Filter tasks by status: pending"
api_call "GET" "/api/tasks?priority=high" "" "Filter tasks by priority: high"
api_call "GET" "/api/tasks?category=work" "" "Filter tasks by category: work"
api_call "GET" "/api/tasks?search=API" "" "Search tasks containing 'API'"
api_call "GET" "/api/tasks?tags=zflow" "" "Filter tasks by tag: zflow"

# Test 9: Sorting
echo "📊 Sorting Tests"
api_call "GET" "/api/tasks?sort_by=title&sort_order=asc" "" "Sort tasks by title (ascending)"
api_call "GET" "/api/tasks?sort_by=priority&sort_order=desc" "" "Sort tasks by priority (descending)"

# Test 10: Pagination
echo "📄 Pagination Tests"
api_call "GET" "/api/tasks?limit=2&offset=0" "" "Get first 2 tasks"
api_call "GET" "/api/tasks?limit=2&offset=2" "" "Get next 2 tasks"

# Test 11: Task Statistics
echo "📈 Statistics Tests"
api_call "GET" "/api/tasks/stats" "" "Get task statistics"

# Test 12: Complete the task
echo "✅ Task Completion Tests"
completion_update='{
  "status": "completed",
  "progress": 100,
  "notes": "Integration successfully completed and tested"
}'
api_call "PUT" "/api/tasks/$task_id/status" "$completion_update" "Mark task as completed"

# Test 13: Get updated statistics
api_call "GET" "/api/tasks/stats" "" "Get updated statistics after completion"

# Test 14: Error handling tests
echo "⚠️  Error Handling Tests"
api_call "GET" "/api/tasks/nonexistent" "" "Try to get non-existent task (should return 404)"

invalid_task='{
  "type": "task",
  "content": {
    "status": "pending"
  }
}'
api_call "POST" "/api/tasks" "$invalid_task" "Try to create task without required fields"

# Test 15: API Documentation
echo "📚 API Documentation"
api_call "GET" "/api/docs" "" "Get Swagger UI (should return HTML)"

echo "🎉 API Demo Complete!"
echo ""
echo "📖 Available Endpoints:"
echo "   GET    /api/health              - Health check"
echo "   GET    /api/tasks               - List tasks (with filtering)"
echo "   POST   /api/tasks               - Create task"
echo "   GET    /api/tasks/{id}          - Get specific task"
echo "   PUT    /api/tasks/{id}          - Update task"
echo "   DELETE /api/tasks/{id}          - Delete task"
echo "   PUT    /api/tasks/{id}/status   - Update task status"
echo "   GET    /api/tasks/stats         - Get task statistics"
echo "   GET    /api/docs                - Swagger UI documentation"
echo ""
echo "🌐 Interactive API Documentation: http://localhost:3001/api/docs"