import { z } from 'zod';

// =====================================================
// CORE STRATEGY DAILY TYPES
// =====================================================

export const StrategyTypeEnum = z.enum([
  'priority',
  'planning', 
  'reflection',
  'adventure',
  'learning',
  'milestone',
  'insight',
  'routine'
]);

export const ImportanceLevelEnum = z.enum(['low', 'medium', 'high', 'critical']);
export const StatusEnum = z.enum(['planned', 'in_progress', 'completed', 'deferred', 'cancelled']);
export const PlannedTimeOfDayEnum = z.enum(['morning', 'afternoon', 'evening', 'night', 'flexible']);
export const MoodImpactEnum = z.enum(['positive', 'neutral', 'negative']);

// Core daily strategy item interface
export interface DailyStrategyItem {
  id: string;
  user_id: string;
  local_date: string; // ISO date string (YYYY-MM-DD)
  tz: string;
  
  // Timeline item reference
  timeline_item_id: string;
  timeline_item_type: string;
  timeline_item_title?: string; // Populated from join
  
  // Strategy details
  strategy_type: z.infer<typeof StrategyTypeEnum>;
  importance_level: z.infer<typeof ImportanceLevelEnum>;
  priority_order: number;
  
  // Planning context
  planned_duration_minutes?: number;
  planned_time_of_day?: z.infer<typeof PlannedTimeOfDayEnum>;
  
  // Status tracking
  status: z.infer<typeof StatusEnum>;
  completion_notes?: string;
  
  // Energy and mood
  required_energy_level?: number;
  actual_energy_used?: number;
  mood_impact?: z.infer<typeof MoodImpactEnum>;
  
  // Strategy connections
  season_id?: string;
  initiative_id?: string;
  
  // Additional data
  tags: string[];
  metadata: Record<string, any>;
  
  // Reflection
  reflection_notes?: string;
  lessons_learned?: string;
  next_actions?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Enhanced daily strategy item with timeline item details
export interface DailyStrategyItemWithDetails extends DailyStrategyItem {
  timeline_item?: {
    id: string;
    type: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    category?: {
      id: string;
      name: string;
      color: string;
      icon?: string;
    };
    tags: string[];
    metadata: Record<string, any>;
  };
  season?: {
    id: string;
    title: string;
    theme: string;
  };
  initiative?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  };
}

// Daily strategy overview
export interface DailyStrategyOverview {
  date: string;
  timezone: string;
  priorities: DailyStrategyItemWithDetails[];
  planning_items: DailyStrategyItemWithDetails[];
  reflections: DailyStrategyItemWithDetails[];
  adventures: DailyStrategyItemWithDetails[];
  energy_summary: {
    total_planned_energy: number;
    total_used_energy: number;
    energy_efficiency?: number;
  };
  completion_stats: {
    total_items: number;
    completed_items: number;
    in_progress_items: number;
    deferred_items: number;
    completion_rate: number;
  };
}

// =====================================================
// ZOD SCHEMAS FOR VALIDATION
// =====================================================

// Query schema for daily strategy items
export const DailyStrategyQuerySchema = z.object({
  // Date filters
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Strategy filters
  strategy_type: StrategyTypeEnum.optional(),
  importance_level: ImportanceLevelEnum.optional(),
  status: StatusEnum.optional(),
  planned_time_of_day: PlannedTimeOfDayEnum.optional(),
  
  // Timeline item filters
  timeline_item_type: z.enum(['task', 'activity', 'memory', 'routine', 'habit']).optional(),
  timeline_item_id: z.string().uuid().optional(),
  
  // Strategy framework filters
  season_id: z.string().uuid().optional(),
  initiative_id: z.string().uuid().optional(),
  
  // Search and tags
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  
  // Pagination and sorting
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'local_date', 'priority_order', 'importance_level']).default('priority_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  
  // Include related data
  include_timeline_item: z.string().optional().transform(v => v === 'true'),
  include_season: z.string().optional().transform(v => v === 'true'),
  include_initiative: z.string().optional().transform(v => v === 'true'),
});

// Create schema for daily strategy items
export const CreateDailyStrategySchema = z.object({
  timeline_item_id: z.string().uuid(),
  strategy_type: StrategyTypeEnum,
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  tz: z.string().default('America/Los_Angeles'),
  
  // Optional fields
  importance_level: ImportanceLevelEnum.default('medium'),
  priority_order: z.number().min(0).optional(),
  
  // Planning context
  planned_duration_minutes: z.number().min(1).optional(),
  planned_time_of_day: PlannedTimeOfDayEnum.optional(),
  
  // Energy requirements
  required_energy_level: z.number().min(1).max(10).optional(),
  
  // Strategy connections
  season_id: z.string().uuid().optional(),
  initiative_id: z.string().uuid().optional(),
  
  // Additional data
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

// Update schema for daily strategy items
export const UpdateDailyStrategySchema = z.object({
  strategy_type: StrategyTypeEnum.optional(),
  importance_level: ImportanceLevelEnum.optional(),
  priority_order: z.number().min(0).optional(),
  
  // Planning context
  planned_duration_minutes: z.number().min(1).optional(),
  planned_time_of_day: PlannedTimeOfDayEnum.optional(),
  
  // Status tracking
  status: StatusEnum.optional(),
  completion_notes: z.string().optional(),
  
  // Energy and mood
  required_energy_level: z.number().min(1).max(10).optional(),
  actual_energy_used: z.number().min(1).max(10).optional(),
  mood_impact: MoodImpactEnum.optional(),
  
  // Strategy connections
  season_id: z.string().uuid().optional(),
  initiative_id: z.string().uuid().optional(),
  
  // Additional data
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  
  // Reflection
  reflection_notes: z.string().optional(),
  lessons_learned: z.string().optional(),
  next_actions: z.string().optional(),
});

// Status update schema (simpler version for quick status changes)
export const UpdateDailyStrategyStatusSchema = z.object({
  status: StatusEnum,
  completion_notes: z.string().optional(),
  actual_energy_used: z.number().min(1).max(10).optional(),
  mood_impact: MoodImpactEnum.optional(),
  reflection_notes: z.string().optional(),
  lessons_learned: z.string().optional(),
  next_actions: z.string().optional(),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type StrategyType = z.infer<typeof StrategyTypeEnum>;
export type ImportanceLevel = z.infer<typeof ImportanceLevelEnum>;
export type DailyStrategyStatus = z.infer<typeof StatusEnum>;
export type PlannedTimeOfDay = z.infer<typeof PlannedTimeOfDayEnum>;
export type MoodImpact = z.infer<typeof MoodImpactEnum>;

export type DailyStrategyQuery = z.infer<typeof DailyStrategyQuerySchema>;
export type CreateDailyStrategy = z.infer<typeof CreateDailyStrategySchema>;
export type UpdateDailyStrategy = z.infer<typeof UpdateDailyStrategySchema>;
export type UpdateDailyStrategyStatus = z.infer<typeof UpdateDailyStrategyStatusSchema>;
