# AI Agents System API Documentation

This document describes the updated API endpoints for the AI Agents System with the new consolidated schema that supports vendor integration, extensible features, and cost tracking.

## Overview

The AI Agents System API has been completely refactored to support:

- ✅ **Vendor Integration**: Work with any AI vendor (OpenAI, Anthropic, Google, etc.)
- ✅ **Extensible Features**: Add new agent features without schema changes
- ✅ **Cost Tracking**: Monitor token usage and costs across interactions
- ✅ **Enhanced Analytics**: Comprehensive usage statistics and insights
- ✅ **Flexible Configuration**: JSONB-based configuration storage

## Base URL

All endpoints are relative to your zmemory API base URL:
```
https://your-domain.com/api/
```

## Authentication

All endpoints require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Vendors Management

#### GET /api/vendors
Get all available AI vendors and their services.

**Query Parameters:**
- `include_services` (boolean): Include vendor services in response
- `vendor_id` (string): Get specific vendor details

**Example Request:**
```bash
GET /api/vendors?include_services=true
```

**Example Response:**
```json
{
  "vendors": [
    {
      "id": "openai",
      "name": "OpenAI",
      "description": "GPT models, DALL-E, Whisper",
      "auth_type": "api_key",
      "base_url": "https://api.openai.com/v1",
      "is_active": true,
      "vendor_services": [
        {
          "id": "openai_gpt4",
          "vendor_id": "openai",
          "service_name": "gpt-4",
          "display_name": "GPT-4",
          "description": "Latest GPT-4 model",
          "is_active": true
        }
      ]
    }
  ]
}
```

### 2. Agent Features Management

#### GET /api/agent-features
Get all available agent features.

**Query Parameters:**
- `category` (string): Filter by feature category
- `is_active` (boolean): Filter by active status (default: true)
- `group_by_category` (boolean): Group features by category

**Example Request:**
```bash
GET /api/agent-features?group_by_category=true
```

**Example Response:**
```json
{
  "features": {
    "development": [
      {
        "id": "coding",
        "name": "Coding",
        "description": "Programming assistance and code generation",
        "category": "development",
        "icon": "code",
        "is_active": true,
        "sort_order": 3
      }
    ],
    "creative": [
      {
        "id": "brainstorming",
        "name": "Brainstorming",
        "description": "Creative ideation and concept development",
        "category": "creative",
        "icon": "lightbulb",
        "is_active": true,
        "sort_order": 1
      }
    ]
  },
  "categories": ["development", "creative"]
}
```

### 3. Interaction Types Management

#### GET /api/interaction-types
Get all available interaction types.

**Query Parameters:**
- `category` (string): Filter by interaction category
- `is_active` (boolean): Filter by active status (default: true)
- `group_by_category` (boolean): Group types by category

**Example Response:**
```json
{
  "types": [
    {
      "id": "conversation",
      "name": "Conversation",
      "description": "General back-and-forth dialogue",
      "category": "general",
      "icon": "message",
      "color": "#3B82F6",
      "is_active": true,
      "sort_order": 1
    }
  ]
}
```

### 4. AI Agents Management

#### GET /api/ai-agents
Get user's AI agents with enhanced filtering and sorting.

**Query Parameters:**
- `vendor_id` (string): Filter by vendor
- `service_id` (string): Filter by specific service
- `feature_id` (string): Filter by agent feature
- `is_active` (boolean): Filter by active status
- `is_favorite` (boolean): Filter by favorite status
- `tags` (string): Comma-separated tags to search
- `search` (string): Search in name, description, notes
- `sort_by` (string): Sort field (activity_score, name, last_used_at, created_at)
- `sort_order` (string): asc or desc (default: desc)
- `limit` (number): Results limit (default: 50)
- `offset` (number): Results offset (default: 0)

**Example Request:**
```bash
GET /api/ai-agents?vendor_id=openai&is_active=true&sort_by=activity_score&limit=10
```

**Example Response:**
```json
{
  "agents": [
    {
      "id": "agent-uuid",
      "name": "GPT-4 Coding Assistant",
      "description": "Advanced coding helper",
      "vendor_id": "openai",
      "vendor_name": "OpenAI",
      "service_id": "openai_gpt4",
      "service_name": "GPT-4",
      "model_name": "gpt-4-turbo",
      "system_prompt": "You are a helpful coding assistant...",
      "configuration": {},
      "capabilities": {},
      "notes": "Great for complex coding tasks",
      "tags": ["coding", "assistant"],
      "activity_score": 0.85,
      "last_used_at": "2025-09-11T10:30:00Z",
      "usage_count": 42,
      "is_active": true,
      "is_favorite": true,
      "is_public": false,
      "features": [
        {
          "id": "coding",
          "name": "Coding",
          "category": "development",
          "is_primary": true
        }
      ],
      "recent_interactions": 5,
      "monthly_interactions": 23,
      "avg_satisfaction": 4.2,
      "avg_usefulness": 4.5,
      "monthly_cost": 12.45,
      "created_at": "2025-08-15T09:00:00Z",
      "updated_at": "2025-09-11T10:30:00Z"
    }
  ]
}
```

#### POST /api/ai-agents
Create a new AI agent.

**Request Body:**
```json
{
  "name": "Claude Sonnet Assistant",
  "description": "Balanced AI assistant",
  "vendor_id": "anthropic",
  "service_id": "anthropic_claude3_sonnet",
  "model_name": "claude-3-sonnet-20240229",
  "system_prompt": "You are a helpful assistant...",
  "configuration": {
    "temperature": 0.7,
    "max_tokens": 4000
  },
  "capabilities": {
    "supports_images": true,
    "supports_functions": false
  },
  "notes": "Good for general tasks",
  "tags": ["assistant", "general"],
  "feature_ids": ["daily_qa", "analysis"],
  "is_favorite": false
}
```

**Response:** Returns created agent with full details.

#### PUT /api/ai-agents
Update an existing AI agent.

**Request Body:**
```json
{
  "id": "agent-uuid",
  "name": "Updated Agent Name",
  "notes": "Updated notes",
  "feature_ids": ["coding", "analysis", "research"],
  "is_favorite": true
}
```

#### DELETE /api/ai-agents?id={agent-uuid}
Delete an AI agent and all related data.

### 5. AI Interactions Management

#### GET /api/ai-interactions
Get AI interactions with advanced filtering.

**Query Parameters:**
- `agent_id` (string): Filter by specific agent
- `interaction_type_id` (string): Filter by interaction type
- `status` (string): active, completed, archived, deleted
- `tags` (string): Comma-separated tags
- `keywords` (string): Comma-separated keywords
- `min_satisfaction` (number): Minimum satisfaction rating
- `min_usefulness` (number): Minimum usefulness rating
- `min_cost` (number): Minimum cost filter
- `max_cost` (number): Maximum cost filter
- `date_from` (string): Start date filter
- `date_to` (string): End date filter
- `search` (string): Search in title, description, content
- `sort_by` (string): created_at, total_cost, satisfaction_rating, duration_minutes
- `sort_order` (string): asc or desc
- `limit` (number): Results limit
- `offset` (number): Results offset

**Example Request:**
```bash
GET /api/ai-interactions?agent_id=agent-uuid&min_satisfaction=4&limit=20
```

**Example Response:**
```json
{
  "interactions": [
    {
      "id": "interaction-uuid",
      "agent_id": "agent-uuid",
      "title": "Code Review Session",
      "description": "Reviewed React component",
      "interaction_type_id": "coding",
      "interaction_type_name": "Coding",
      "external_link": "https://chat.openai.com/share/abc123",
      "external_id": "conv_abc123",
      "external_metadata": {},
      "content_preview": "Can you review this React component...",
      "full_content": "Full conversation content...",
      "input_tokens": 1200,
      "output_tokens": 800,
      "total_cost": 0.042,
      "tags": ["react", "review"],
      "keywords": ["component", "hooks", "state"],
      "satisfaction_rating": 5,
      "usefulness_rating": 4,
      "feedback_notes": "Very helpful",
      "started_at": "2025-09-11T10:00:00Z",
      "ended_at": "2025-09-11T10:15:00Z",
      "duration_minutes": 15,
      "status": "completed",
      "agent_name": "GPT-4 Coding Assistant",
      "agent_vendor_name": "OpenAI",
      "created_at": "2025-09-11T10:15:00Z",
      "updated_at": "2025-09-11T10:15:00Z"
    }
  ]
}
```

#### POST /api/ai-interactions
Create a new AI interaction.

**Request Body:**
```json
{
  "agent_id": "agent-uuid",
  "title": "Brainstorming Session",
  "description": "Product feature ideas",
  "interaction_type_id": "brainstorming",
  "external_link": "https://claude.ai/chat/xyz789",
  "external_id": "conv_xyz789",
  "content_preview": "Let's brainstorm new features...",
  "full_content": "Complete conversation...",
  "input_tokens": 500,
  "output_tokens": 1200,
  "total_cost": 0.0325,
  "tags": ["product", "features"],
  "keywords": ["mobile", "users", "engagement"],
  "satisfaction_rating": 4,
  "usefulness_rating": 5,
  "started_at": "2025-09-11T14:00:00Z",
  "ended_at": "2025-09-11T14:30:00Z",
  "duration_minutes": 30,
  "status": "completed"
}
```

#### PUT /api/ai-interactions
Update an existing interaction.

#### DELETE /api/ai-interactions?id={interaction-uuid}
Delete an interaction.

### 6. AI Usage Statistics

#### GET /api/ai-usage-stats
Get comprehensive usage analytics.

**Query Parameters:**
- `days` (number): Number of days to include (default: 30)
- `start_date` (string): Custom start date (YYYY-MM-DD)
- `end_date` (string): Custom end date (YYYY-MM-DD)

**Example Response:**
```json
{
  "summary": {
    "total_interactions": 150,
    "total_duration_minutes": 2400,
    "total_cost": 45.67,
    "total_input_tokens": 125000,
    "total_output_tokens": 98000,
    "unique_agents": 8,
    "active_agents": 6,
    "avg_satisfaction": 4.2,
    "avg_usefulness": 4.1
  },
  "daily_stats": [
    {
      "date": "2025-09-11",
      "total_interactions": 12,
      "total_duration_minutes": 180,
      "total_cost": 3.24,
      "total_input_tokens": 8500,
      "total_output_tokens": 6200,
      "unique_agents_used": 3,
      "feature_usage": {
        "coding": 8,
        "analysis": 4
      },
      "vendor_usage": {
        "openai": 10,
        "anthropic": 2
      },
      "avg_satisfaction": 4.3,
      "avg_usefulness": 4.5
    }
  ],
  "agent_stats": [
    {
      "id": "agent-uuid",
      "name": "GPT-4 Assistant",
      "activity_score": 0.85,
      "recent_interactions": 5,
      "monthly_interactions": 23,
      "monthly_cost": 12.45
    }
  ],
  "feature_usage": {
    "coding": 45,
    "analysis": 30,
    "brainstorming": 25
  },
  "vendor_usage": {
    "openai": 85,
    "anthropic": 35,
    "google": 15
  }
}
```

#### POST /api/ai-usage-stats
Trigger daily usage statistics calculation.

**Request Body:**
```json
{
  "date": "2025-09-11"  // Optional, defaults to today
}
```

---

## Data Models

### Agent
```typescript
interface AIAgent {
  id: string
  name: string
  description?: string
  vendor_id: string
  service_id?: string
  model_name?: string
  system_prompt?: string
  configuration: Record<string, any>
  capabilities: Record<string, any>
  notes?: string
  tags: string[]
  activity_score: number
  last_used_at?: string
  usage_count: number
  is_active: boolean
  is_favorite: boolean
  is_public: boolean
  user_id: string
  created_at: string
  updated_at: string
}
```

### Interaction
```typescript
interface AIInteraction {
  id: string
  agent_id: string
  title: string
  description?: string
  interaction_type_id: string
  external_link?: string
  external_id?: string
  external_metadata: Record<string, any>
  content_preview?: string
  full_content?: string
  input_tokens?: number
  output_tokens?: number
  total_cost?: number
  tags: string[]
  keywords: string[]
  satisfaction_rating?: number
  usefulness_rating?: number
  feedback_notes?: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  status: 'active' | 'completed' | 'archived' | 'deleted'
  user_id: string
  created_at: string
  updated_at: string
}
```

---

## Migration Guide

### From Old Schema

The API automatically handles migration from the old enum-based schema:

**Old Format (deprecated):**
```json
{
  "vendor": "ChatGPT",
  "features": ["Coding", "Daily Q&A"]
}
```

**New Format:**
```json
{
  "vendor_id": "openai",
  "feature_ids": ["coding", "daily_qa"]
}
```

### Breaking Changes

1. **Vendor Field**: `vendor` enum → `vendor_id` string reference
2. **Features Field**: `features` array → `feature_ids` array + separate mappings
3. **Interaction Types**: Hardcoded values → `interaction_type_id` reference
4. **New Fields**: Added `total_cost`, `input_tokens`, `output_tokens`, `keywords`

### Backward Compatibility

The API maintains backward compatibility for:
- Query parameter `type` (maps to `interaction_type_id`)
- Legacy vendor enum values (auto-converted)

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": ["Validation error details"] // For validation errors
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- **Standard endpoints**: 100 requests/minute
- **Stats endpoints**: 20 requests/minute
- **Bulk operations**: 10 requests/minute

---

## Examples

### Create Agent with Features
```bash
curl -X POST /api/ai-agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Assistant",
    "vendor_id": "openai",
    "service_id": "openai_gpt4",
    "feature_ids": ["coding", "analysis"],
    "configuration": {"temperature": 0.7}
  }'
```

### Record Interaction with Cost
```bash
curl -X POST /api/ai-interactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-uuid",
    "title": "Code Review",
    "interaction_type_id": "coding",
    "input_tokens": 1500,
    "output_tokens": 800,
    "total_cost": 0.045,
    "satisfaction_rating": 5
  }'
```

### Get Usage Analytics
```bash
curl -X GET "/api/ai-usage-stats?days=7" \
  -H "Authorization: Bearer $TOKEN"
```

This comprehensive API provides all the functionality needed for advanced AI agent management with vendor integration, cost tracking, and extensible features.