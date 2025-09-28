// ===== Service Layer Types and Interfaces =====

import type { MemoryRepository, TaskRepository, ActivityRepository } from '@/database';

// Service result types
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
  warnings?: string[];
}

export interface ServiceListResult<T> {
  data: T[] | null;
  error: Error | null;
  total?: number;
  warnings?: string[];
}

// Base service context
export interface ServiceContext {
  userId: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

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

// Task Workflow Types
export interface StatusChangeContext {
  progress?: number;
  notes?: string;
  completion_reason?: string;
  cascade_to_subtasks?: boolean;
  trigger_source?: 'user' | 'system' | 'ai';
}

export interface CompletionResult {
  completed_task: any;
  cascaded_tasks: string[];
  parent_updates: string[];
  notifications: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Task Hierarchy Types
export interface TreeOptions {
  max_depth?: number;
  include_completed?: boolean;
  include_archived?: boolean;
  format?: 'nested' | 'flat';
  sort_by?: string;
}

export interface TaskTree {
  root: TaskTreeNode;
  total_nodes: number;
  max_depth_reached: number;
  completion_stats: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
}

export interface TaskTreeNode {
  id: string;
  title: string;
  status: string;
  progress: number;
  hierarchy_level: number;
  subtask_order: number;
  parent_id?: string;
  children: TaskTreeNode[];
  metadata: {
    subtask_count: number;
    completion_percentage: number;
    estimated_duration?: number;
  };
}

// Timeline Types
export interface TimelineFilters {
  from_date?: string;
  to_date?: string;
  item_types?: string[];
  categories?: string[];
  importance_levels?: string[];
  include_archived?: boolean;
  relevance_threshold?: number;
}

export interface TimelineItem {
  id: string;
  type: 'memory' | 'task' | 'activity';
  title: string;
  description?: string;
  timestamp: string;
  relevance_score: number;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  metadata: Record<string, any>;
  relationships: {
    anchored_items: Array<{
      id: string;
      type: string;
      relation_type: string;
    }>;
  };
}

// Activity Analytics Types
export interface ActivityStats {
  total_activities: number;
  completion_rate: number;
  average_satisfaction: number;
  mood_improvement: {
    average_change: number;
    positive_sessions: number;
    negative_sessions: number;
  };
  energy_analysis: {
    average_before: number;
    average_after: number;
    energy_gain: number;
  };
  by_type: Record<string, {
    count: number;
    avg_satisfaction: number;
    avg_duration: number;
    completion_rate: number;
  }>;
  trends: {
    satisfaction_trend: number; // positive = improving
    frequency_trend: number;
    duration_trend: number;
  };
}

export interface MoodAnalysis {
  overall_improvement: number;
  best_activities: Array<{
    activity_type: string;
    improvement_score: number;
    session_count: number;
  }>;
  mood_patterns: Array<{
    time_period: string;
    average_before: number;
    average_after: number;
    activity_count: number;
  }>;
}

export interface ActivityInsight {
  type: 'positive' | 'negative' | 'neutral' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  supporting_data: Record<string, any>;
  action_suggestions?: string[];
}

// AI Task Delegation Types
export interface DelegationParams {
  agent_id: string;
  objective: string;
  mode: 'plan_only' | 'execute_with_approval' | 'fully_autonomous';
  guardrails?: Guardrails;
  deadline?: string;
  context?: Record<string, any>;
}

export interface Guardrails {
  max_cost?: number;
  allowed_actions?: string[];
  forbidden_actions?: string[];
  approval_required_for?: string[];
  escalation_rules?: Array<{
    condition: string;
    action: string;
    threshold: number;
  }>;
}

export interface TaskMonitoringResult {
  status: 'active' | 'completed' | 'failed' | 'requires_attention';
  progress_percentage: number;
  current_action: string;
  estimated_completion?: string;
  cost_consumed: number;
  guardrail_violations: Array<{
    rule: string;
    severity: 'warning' | 'error';
    action_taken: string;
  }>;
  next_human_review?: string;
}

// Service dependency injection
export interface ServiceDependencies {
  memoryRepository: MemoryRepository;
  taskRepository: TaskRepository;
  activityRepository: ActivityRepository;
  // Add other repositories as needed
}

// Common service interfaces
export interface BaseService {
  readonly context: ServiceContext;
  readonly dependencies: ServiceDependencies;
}

// Service factory types
export type ServiceFactory<T extends BaseService> = (
  context: ServiceContext,
  dependencies: ServiceDependencies
) => T;

// Error types specific to services
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class BusinessRuleError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_RULE_VIOLATION', 400, details);
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class InsufficientPermissionsError extends ServiceError {
  constructor(action: string) {
    super(`Insufficient permissions for action: ${action}`, 'FORBIDDEN', 403);
  }
}