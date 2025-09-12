// API 响应类型
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Enhanced Memory types for new schema
export interface Memory {
  id: string;
  
  // Core content
  title_override?: string;
  note: string;
  memory_type: 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight';
  
  // Time semantics
  captured_at: string;
  happened_range?: {
    start: string;
    end?: string;
  };
  
  // Emotional/energy metadata
  emotion_valence?: number; // -5 to 5
  emotion_arousal?: number;  // 0 to 5
  energy_delta?: number;     // -5 to 5
  
  // Location
  place_name?: string;
  latitude?: number;
  longitude?: number;
  
  // Highlight/salience
  is_highlight: boolean;
  salience_score: number; // 0.0 to 1.0
  
  // Context and relationships
  source?: string;
  context?: string;
  mood?: number; // 1 to 10
  importance_level: 'low' | 'medium' | 'high';
  related_to: string[];
  
  // Organization
  category_id?: string;
  tags: string[];
  status: 'active' | 'archived' | 'deleted';
  
  // Metadata
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Type for timeline_items integration
  type: 'memory';
}

// Memory creation request
export interface CreateMemoryRequest {
  title?: string;
  note: string;
  memory_type?: 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight';
  
  captured_at?: string;
  happened_range?: {
    start: string;
    end?: string;
  };
  
  emotion_valence?: number;
  emotion_arousal?: number;
  energy_delta?: number;
  
  place_name?: string;
  latitude?: number;
  longitude?: number;
  
  is_highlight?: boolean;
  salience_score?: number;
  
  source?: string;
  context?: string;
  mood?: number;
  importance_level?: 'low' | 'medium' | 'high';
  related_to?: string[];
  
  category_id?: string;
  tags?: string[];
  status?: 'active' | 'archived' | 'deleted';
}

// Memory update request
export interface UpdateMemoryRequest extends Partial<CreateMemoryRequest> {}

// Memory Anchor types
export interface MemoryAnchor {
  memory_id: string;
  anchor_item_id: string;
  relation_type: 'context_of' | 'result_of' | 'insight_from' | 'about' | 'co_occurred' | 'triggered_by' | 'reflects_on';
  local_time_range?: {
    start: string;
    end?: string;
  };
  weight: number; // 0.0 to 10.0
  notes?: string;
  created_at: string;
}

export interface CreateMemoryAnchorRequest {
  anchor_item_id: string;
  relation_type: 'context_of' | 'result_of' | 'insight_from' | 'about' | 'co_occurred' | 'triggered_by' | 'reflects_on';
  local_time_range?: {
    start: string;
    end?: string;
  };
  weight?: number;
  notes?: string;
}

export interface UpdateMemoryAnchorRequest {
  relation_type?: 'context_of' | 'result_of' | 'insight_from' | 'about' | 'co_occurred' | 'triggered_by' | 'reflects_on';
  local_time_range?: {
    start: string;
    end?: string;
  };
  weight?: number;
  notes?: string;
}

// Asset types
export interface Asset {
  id: string;
  url: string;
  mime_type: string;
  kind: 'image' | 'audio' | 'video' | 'document' | 'link';
  duration_seconds?: number;
  file_size_bytes?: number;
  hash_sha256?: string;
  user_id: string;
  created_at: string;
}

export interface CreateAssetRequest {
  url: string;
  mime_type: string;
  kind: 'image' | 'audio' | 'video' | 'document' | 'link';
  duration_seconds?: number;
  file_size_bytes?: number;
  hash_sha256?: string;
}

export interface UpdateAssetRequest extends Partial<Omit<CreateAssetRequest, 'hash_sha256'>> {}

// Memory Asset relationship types
export interface MemoryAsset {
  memory_id: string;
  asset_id: string;
  order_index: number;
  caption?: string;
  created_at: string;
  
  // Populated asset data
  asset?: Asset;
}

export interface CreateMemoryAssetRequest {
  asset_id: string;
  order_index?: number;
  caption?: string;
}

export interface UpdateMemoryAssetRequest {
  order_index?: number;
  caption?: string;
}

// Enhanced query parameters for memories
export interface MemoryQueryParams {
  memory_type?: 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight';
  status?: 'active' | 'archived' | 'deleted';
  importance_level?: 'low' | 'medium' | 'high';
  is_highlight?: boolean;
  
  // Date ranges
  captured_from?: string;
  captured_to?: string;
  happened_from?: string;
  happened_to?: string;
  
  // Location filters
  place_name?: string;
  near_lat?: number;
  near_lng?: number;
  distance_km?: number;
  
  // Emotional/rating filters
  min_emotion_valence?: number;
  max_emotion_valence?: number;
  min_salience?: number;
  min_mood?: number;
  
  // Category and tags
  category_id?: string;
  tags?: string;
  related_to?: string;
  
  // Search
  search?: string;
  search_fields?: 'note' | 'context' | 'place_name' | 'all';
  
  // Pagination
  limit?: number;
  offset?: number;
  sort_by?: 'captured_at' | 'happened_at' | 'salience_score' | 'emotion_valence' | 'mood' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

// AI Agents System Types (updated for new schema)

// Vendor and Services
export interface Vendor {
  id: string;
  name: string;
  description?: string;
  auth_type: 'api_key' | 'oauth' | 'bearer_token';
  base_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorService {
  id: string;
  vendor_id: string;
  service_name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User API Keys
export interface UserApiKey {
  id: string;
  user_id: string;
  vendor_id: string;
  service_id?: string;
  encrypted_key: string;
  key_preview?: string;
  display_name?: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserApiKeyRequest {
  vendor_id: string;
  service_id?: string;
  api_key: string; // Will be encrypted server-side
  display_name?: string;
}

export interface UpdateUserApiKeyRequest {
  display_name?: string;
  is_active?: boolean;
}

// Agent Features and Interaction Types
export interface AgentFeature {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InteractionType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// AI Agents (updated schema)
export interface AIAgent {
  id: string;
  name: string;
  description?: string;
  
  // Vendor integration
  vendor_id: string;
  service_id?: string;
  
  // Configuration
  model_name?: string;
  system_prompt?: string;
  configuration: Record<string, any>;
  capabilities: Record<string, any>;
  
  // Metadata
  notes?: string;
  tags: string[];
  
  // Activity tracking
  activity_score: number;
  last_used_at?: string;
  usage_count: number;
  
  // Status
  is_active: boolean;
  is_favorite: boolean;
  is_public: boolean;
  
  // User ownership
  user_id: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated relationships
  vendor?: Vendor;
  service?: VendorService;
  features?: AgentFeature[];
}

export interface CreateAIAgentRequest {
  name: string;
  description?: string;
  vendor_id: string;
  service_id?: string;
  model_name?: string;
  system_prompt?: string;
  configuration?: Record<string, any>;
  capabilities?: Record<string, any>;
  notes?: string;
  tags?: string[];
  activity_score?: number;
  is_active?: boolean;
  is_favorite?: boolean;
  feature_ids?: string[]; // For creating feature mappings
}

export interface UpdateAIAgentRequest extends Partial<CreateAIAgentRequest> {}

// Agent Feature Mappings
export interface AgentFeatureMapping {
  id: string;
  agent_id: string;
  feature_id: string;
  is_primary: boolean;
  created_at: string;
  user_id: string;
}

export interface CreateAgentFeatureMappingRequest {
  feature_id: string;
  is_primary?: boolean;
}

// AI Interactions (updated schema)
export interface AIInteraction {
  id: string;
  agent_id: string;
  
  // Interaction details
  title: string;
  description?: string;
  interaction_type_id: string;
  
  // External integration
  external_link?: string;
  external_id?: string;
  external_metadata: Record<string, any>;
  
  // Content
  content_preview?: string;
  full_content?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_cost?: number;
  
  // Organization
  tags: string[];
  keywords: string[];
  
  // Quality feedback
  satisfaction_rating?: number;
  usefulness_rating?: number;
  feedback_notes?: string;
  
  // Time tracking
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  
  // Status
  status: 'active' | 'completed' | 'archived' | 'deleted';
  
  // User ownership
  user_id: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated relationships
  agent?: AIAgent;
  interaction_type?: InteractionType;
}

export interface CreateAIInteractionRequest {
  agent_id: string;
  title: string;
  description?: string;
  interaction_type_id?: string; // Defaults to 'conversation'
  external_link?: string;
  external_id?: string;
  external_metadata?: Record<string, any>;
  content_preview?: string;
  full_content?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_cost?: number;
  tags?: string[];
  keywords?: string[];
  satisfaction_rating?: number;
  usefulness_rating?: number;
  feedback_notes?: string;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  status?: 'active' | 'completed' | 'archived' | 'deleted';
}

export interface UpdateAIInteractionRequest extends Partial<Omit<CreateAIInteractionRequest, 'agent_id'>> {}

// AI Usage Stats
export interface AIUsageStats {
  id: string;
  user_id: string;
  date: string; // DATE format
  
  // Usage counts
  total_interactions: number;
  unique_agents_used: number;
  total_duration_minutes: number;
  
  // Usage breakdowns
  feature_usage: Record<string, number>;
  vendor_usage: Record<string, number>;
  
  // Cost tracking
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  
  // Quality metrics
  avg_satisfaction?: number;
  avg_usefulness?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Query parameters for AI endpoints
export interface AIAgentQueryParams {
  vendor_id?: string;
  service_id?: string;
  feature_id?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  is_public?: boolean;
  tags?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'activity_score' | 'last_used_at' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface AIInteractionQueryParams {
  agent_id?: string;
  interaction_type_id?: string;
  status?: 'active' | 'completed' | 'archived' | 'deleted';
  tags?: string;
  keywords?: string;
  min_satisfaction?: number;
  min_usefulness?: number;
  min_cost?: number;
  max_cost?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'total_cost' | 'satisfaction_rating' | 'duration_minutes';
  sort_order?: 'asc' | 'desc';
}

export interface AIUsageStatsQueryParams {
  date_from?: string;
  date_to?: string;
  days?: number; // Get last N days
  include_cost_breakdown?: boolean;
  include_feature_breakdown?: boolean;
  include_vendor_breakdown?: boolean;
}

// Legacy 查询参数
export interface QueryParams {
  type?: string;
  limit?: number;
  offset?: number;
}

// 健康检查响应
export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
} 