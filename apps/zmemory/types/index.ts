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