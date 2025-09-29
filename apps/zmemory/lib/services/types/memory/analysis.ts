// Memory Analysis Types
export interface MemoryAnalysisInput {
  id?: string;
  title?: string;
  note?: string;
  context?: string;
  memory_type: string;
  emotion_valence?: number;
  emotion_arousal?: number;
  energy_delta?: number;
  place_name?: string;
  tags: string[];
  importance_level: string;
  captured_at: string;
  happened_range?: string;
}

export interface MemoryAnalysisResult {
  salience_score: number;
  is_highlight: boolean;
  suggested_tags: string[];
  enhancement_confidence: number;
  analysis_factors: string[];
  potential_relationships: AnchorSuggestion[];
}

export interface AnchorSuggestion {
  target_id: string;
  target_type: 'task' | 'activity' | 'memory';
  target_title: string;
  relation_type: string;
  confidence_score: number;
  reasoning: string;
}

export interface EnhancementParams {
  user_id: string;
  update_salience?: boolean;
  update_highlights?: boolean;
  update_tags?: boolean;
  memory_types?: string[];
  batch_size?: number;
  dry_run?: boolean;
}

export interface EnhancementResult {
  processed_count: number;
  updated_count: number;
  skipped_count: number;
  errors: Array<{
    memory_id: string;
    error: string;
  }>;
  batch_summary: {
    salience_updates: number;
    highlight_updates: number;
    tag_updates: number;
  };
}