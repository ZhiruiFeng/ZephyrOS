# AI Agents System Database Design

## Overview

This document describes the comprehensive database design for the AI Agents System, which provides extensible AI agent management, vendor integration, interaction tracking, cost analytics, and API key management. The system is designed to be highly scalable and easily extensible without requiring schema changes.

## Database Architecture

### 1. Core System Tables

#### `vendors` - AI Vendor Registry
Central registry of supported AI vendors and services.

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key (e.g., 'openai', 'anthropic') |
| `name` | TEXT | Display name (e.g., 'OpenAI', 'Anthropic') |
| `description` | TEXT | Vendor description |
| `auth_type` | TEXT | Authentication method (api_key, oauth, bearer_token) |
| `base_url` | TEXT | API base URL |
| `is_active` | BOOLEAN | Whether vendor is available |

#### `vendor_services` - Specific Services
Individual services within each vendor (e.g., GPT-4, Claude-3-Sonnet).

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key (e.g., 'openai_gpt4') |
| `vendor_id` | TEXT | References vendors(id) |
| `service_name` | TEXT | Service identifier (e.g., 'gpt-4') |
| `display_name` | TEXT | UI display name (e.g., 'GPT-4') |
| `description` | TEXT | Service description |
| `is_active` | BOOLEAN | Whether service is available |

#### `user_api_keys` - Encrypted API Key Storage
Secure storage of user's third-party API keys.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References auth.users(id) |
| `vendor_id` | TEXT | References vendors(id) |
| `service_id` | TEXT | Optional specific service |
| `encrypted_key` | TEXT | AES-256 encrypted API key |
| `key_preview` | TEXT | Last 4 characters for UI |
| `display_name` | TEXT | User-friendly name |
| `is_active` | BOOLEAN | Whether key is active |
| `last_used_at` | TIMESTAMPTZ | Last usage timestamp |

### 2. Extensible Configuration Tables

#### `agent_features` - Dynamic Feature Registry
Extensible feature definitions replacing hardcoded enums.

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key (e.g., 'brainstorming', 'coding') |
| `name` | TEXT | Display name |
| `description` | TEXT | Feature description |
| `category` | TEXT | Feature category (creative, technical, etc.) |
| `icon` | TEXT | UI icon identifier |
| `is_active` | BOOLEAN | Whether feature is available |
| `sort_order` | INTEGER | Display order |

#### `interaction_types` - Dynamic Interaction Types
Extensible interaction type definitions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key (e.g., 'conversation', 'coding') |
| `name` | TEXT | Display name |
| `description` | TEXT | Type description |
| `category` | TEXT | Type category |
| `icon` | TEXT | UI icon identifier |
| `color` | TEXT | UI color code |
| `is_active` | BOOLEAN | Whether type is available |
| `sort_order` | INTEGER | Display order |

### 3. AI Agents Core Tables

#### `ai_agents` - AI Agent Registry
Main table for AI agent management with vendor integration.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Agent display name |
| `description` | TEXT | Agent description |
| `vendor_id` | TEXT | References vendors(id) |
| `service_id` | TEXT | Optional specific service |
| `model_name` | TEXT | Specific model (e.g., 'gpt-4-turbo') |
| `system_prompt` | TEXT | Agent system prompt |
| `configuration` | JSONB | Flexible configuration data |
| `capabilities` | JSONB | Structured capabilities |
| `notes` | TEXT | User notes |
| `tags` | TEXT[] | Searchable tags |
| `activity_score` | REAL | Activity score (0.0-1.0) |
| `last_used_at` | TIMESTAMPTZ | Last usage time |
| `usage_count` | INTEGER | Total usage count |
| `is_active` | BOOLEAN | Whether agent is active |
| `is_favorite` | BOOLEAN | User favorite flag |
| `is_public` | BOOLEAN | Public sharing flag |
| `user_id` | UUID | Owner user ID |

#### `agent_feature_mappings` - Agent Feature Relationships
Many-to-many relationship between agents and features.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | References ai_agents(id) |
| `feature_id` | TEXT | References agent_features(id) |
| `is_primary` | BOOLEAN | Whether this is a primary feature |
| `user_id` | UUID | User ID for RLS |

#### `ai_interactions` - Interaction History
Comprehensive interaction tracking with cost analysis.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | References ai_agents(id) |
| `title` | TEXT | Interaction title |
| `description` | TEXT | Interaction description |
| `interaction_type_id` | TEXT | References interaction_types(id) |
| `external_link` | TEXT | Link to external service |
| `external_id` | TEXT | External service ID |
| `external_metadata` | JSONB | External service metadata |
| `content_preview` | TEXT | Content preview |
| `full_content` | TEXT | Complete interaction content |
| `input_tokens` | INTEGER | Input token count |
| `output_tokens` | INTEGER | Output token count |
| `total_cost` | DECIMAL(10,4) | Calculated cost |
| `tags` | TEXT[] | Searchable tags |
| `keywords` | TEXT[] | Extracted keywords |
| `satisfaction_rating` | INTEGER | User satisfaction (1-5) |
| `usefulness_rating` | INTEGER | Usefulness rating (1-5) |
| `feedback_notes` | TEXT | User feedback |
| `started_at` | TIMESTAMPTZ | Start time |
| `ended_at` | TIMESTAMPTZ | End time |
| `duration_minutes` | INTEGER | Duration |
| `status` | TEXT | Status (active, completed, archived, deleted) |
| `user_id` | UUID | User ID |

### 4. Analytics Tables

#### `ai_usage_stats` - Daily Usage Analytics
Aggregated daily usage statistics with cost tracking.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User ID |
| `date` | DATE | Statistics date |
| `total_interactions` | INTEGER | Total interactions |
| `unique_agents_used` | INTEGER | Number of unique agents |
| `total_duration_minutes` | INTEGER | Total duration |
| `feature_usage` | JSONB | Feature usage breakdown |
| `vendor_usage` | JSONB | Vendor usage breakdown |
| `total_cost` | DECIMAL(10,4) | Daily total cost |
| `total_input_tokens` | INTEGER | Total input tokens |
| `total_output_tokens` | INTEGER | Total output tokens |
| `avg_satisfaction` | REAL | Average satisfaction |
| `avg_usefulness` | REAL | Average usefulness |

#### `ai_agent_configs` - Agent Configuration Storage
Flexible agent-specific configuration storage.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | References ai_agents(id) |
| `config_key` | TEXT | Configuration key |
| `config_value` | JSONB | Configuration value |
| `config_type` | TEXT | Configuration type |
| `description` | TEXT | Configuration description |
| `is_encrypted` | BOOLEAN | Encryption flag |
| `user_id` | UUID | User ID |

### 5. Supported Vendors and Services

#### Pre-seeded Vendors
- OpenAI (GPT models, DALL-E, Whisper)
- Anthropic (Claude models)
- Google AI (Gemini models)
- Azure OpenAI
- Replicate (Open source models)
- Together AI (Open source LLMs)
- ElevenLabs (Voice synthesis)
- Stability AI (Image generation)
- Cohere (Command models)
- Hugging Face (Model hub)
- Perplexity (Search-powered AI)

#### Pre-seeded Features
- Brainstorming (Creative ideation)
- Daily Q&A (General assistance)
- Coding (Programming assistance)
- MCP (Model Context Protocol)
- News Search (Current events)
- TTS/STT (Voice processing)
- Image Generation (Visual content)
- Analysis (Data insights)
- Writing (Content creation)
- Research (Information gathering)
- Translation (Language services)

### 6. Performance Optimization

#### Key Indexes
- **User-based queries**: `idx_ai_agents_user_id`, `idx_ai_interactions_user_id`
- **Activity sorting**: `idx_ai_agents_activity_score`, `idx_ai_agents_last_used`
- **Feature search**: GIN indexes on `features`, `tags`, `keywords` arrays
- **Time-based queries**: `idx_ai_interactions_created_at`, `idx_ai_usage_stats_user_date`
- **Cost analysis**: `idx_ai_interactions_cost`
- **Vendor lookups**: `idx_ai_agents_vendor`, `idx_user_api_keys_vendor`

#### JSONB Optimization
- GIN indexes on JSONB columns for fast JSON queries
- Structured data in `configuration`, `capabilities`, `external_metadata`
- Usage statistics stored as JSON for flexible analytics

### 7. Key Functions

#### Agent Management
- `get_agent_with_features(UUID)` - Get agent with associated features
- `update_agent_activity_score(UUID)` - Calculate and update activity scores

#### API Key Management  
- `get_user_api_key(UUID, TEXT, TEXT)` - Retrieve user's API key for service
- `update_api_key_last_used(UUID, TEXT, TEXT)` - Update key usage timestamp
- `add_vendor(TEXT, TEXT, ...)` - Add new vendor (admin function)
- `add_vendor_service(TEXT, TEXT, ...)` - Add service to vendor

#### Analytics
- `update_daily_usage_stats(DATE)` - Calculate daily usage statistics
- `get_agent_usage_summary(UUID, INTEGER)` - Get agent usage summary

### 8. Security Features

#### Row Level Security (RLS)
All user data tables have RLS enabled with policies ensuring users can only access their own data:

- **ai_agents**: Users can view/modify only their own agents (+ public agents)
- **ai_interactions**: Users can only access interactions for their own agents
- **user_api_keys**: Complete isolation - users see only their own keys
- **ai_usage_stats**: Personal usage statistics only
- **ai_agent_configs**: Agent configurations scoped to user

#### Public Metadata
- `vendors` and `vendor_services`: Public read-only for all users
- `agent_features` and `interaction_types`: Public metadata for UI
- API keys always encrypted at rest

### 9. Extensibility Features

#### No Schema Changes Required
- **New Vendors**: Simple INSERT into `vendors` table
- **New Services**: INSERT into `vendor_services` table  
- **New Features**: INSERT into `agent_features` table
- **New Interaction Types**: INSERT into `interaction_types` table

#### Flexible Configuration
- JSONB fields for arbitrary configuration data
- Tag-based organization and search
- Extensible metadata storage

#### Future-Ready Architecture
- Public agent sharing support (`is_public` flag)
- Integration hooks via `external_metadata`
- Cost tracking for usage analytics
- Token usage monitoring

### 10. Views for Common Queries

#### `agent_summary`
Comprehensive agent view with usage statistics, features, and cost data.

#### `recent_interactions`
Recent interactions with agent and vendor information, optimized for dashboard display.

## Usage Examples

### 1. Create AI Agent with Features
```sql
-- Create agent
INSERT INTO ai_agents (name, vendor_id, service_id, model_name, user_id) 
VALUES ('Claude Sonnet', 'anthropic', 'anthropic_claude3_sonnet', 'claude-3-sonnet', auth.uid());

-- Add features
INSERT INTO agent_feature_mappings (agent_id, feature_id, is_primary, user_id)
VALUES 
  (agent_id, 'coding', true, auth.uid()),
  (agent_id, 'analysis', false, auth.uid());
```

### 2. Record Interaction with Cost Tracking
```sql
INSERT INTO ai_interactions (
  agent_id, title, interaction_type_id, input_tokens, output_tokens, 
  total_cost, external_link, user_id
) VALUES (
  'agent-uuid', 'Code Review Session', 'coding', 1500, 800,
  0.0425, 'https://claude.ai/chat/xyz', auth.uid()
);
```

### 3. Query Agent Summary
```sql
SELECT * FROM agent_summary 
WHERE user_id = auth.uid() 
  AND is_active = true 
ORDER BY activity_score DESC;
```

### 4. Get Usage Analytics
```sql
SELECT 
  date,
  total_interactions,
  total_cost,
  vendor_usage,
  feature_usage
FROM ai_usage_stats 
WHERE user_id = auth.uid() 
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

## Migration Path

### From Legacy Schema
The new consolidated schema includes automatic data migration from the old enum-based system:

1. **Vendor Mapping**: Old `agent_vendor` enum values mapped to new `vendors` table
2. **Feature Migration**: Array-based features converted to `agent_feature_mappings`
3. **Interaction Types**: Hardcoded values migrated to `interaction_types` table
4. **Data Preservation**: All existing agents, interactions, and configurations preserved

### Running the Migration
```bash
psql -d your_database -f supabase/agents_schema.sql
```

## Performance Considerations

1. **Index Strategy**: Comprehensive indexing for all query patterns
2. **JSONB Usage**: Efficient storage and querying of flexible data
3. **GIN Indexes**: Fast array and JSON searches
4. **Partitioning Ready**: Usage stats table ready for date partitioning
5. **Connection Pooling**: Optimized for connection pooling strategies

## Security Considerations

1. **Data Isolation**: Complete user data separation via RLS
2. **API Key Security**: Encryption at rest, preview-only display
3. **Input Validation**: Database constraints and application-level validation
4. **Audit Trail**: Complete interaction history and usage tracking
5. **Access Control**: Granular permissions with Supabase Auth integration

## Monitoring and Maintenance

### Key Metrics to Monitor
- Daily active agents per user
- Token usage and cost trends
- Feature adoption rates
- Vendor utilization patterns
- User satisfaction ratings

### Maintenance Tasks
- Run `update_daily_usage_stats()` daily via cron
- Monitor and optimize slow queries
- Archive old interaction data as needed
- Update vendor/service catalogs as new providers emerge

This comprehensive database design provides a solid foundation for AI agent management that can scale and evolve with changing requirements while maintaining performance and security.