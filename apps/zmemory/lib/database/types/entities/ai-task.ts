import { BaseEntity, FilterParams } from '../common';

// AI Task Entity shape aligned with ai_tasks table
export interface AITask extends BaseEntity {
  task_id: string;
  agent_id: string;

  objective: string;
  deliverables?: string | null;
  context?: string | null;
  acceptance_criteria?: string | null;
  prompt?: string | null;
  task_type: 'generation' | 'analysis' | 'summarization' | 'classification' | 'translation' | 'conversation' | 'coding' | 'reasoning' | 'other';

  dependencies: string[];
  mode: 'plan_only' | 'dry_run' | 'execute';
  guardrails: Record<string, any>;
  metadata: Record<string, any>;
  status: 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
  history: Array<Record<string, any>>;
  execution_result?: Record<string, any> | null;

  estimated_cost_usd?: number | null;
  actual_cost_usd?: number | null;
  estimated_duration_min?: number | null;
  actual_duration_min?: number | null;

  is_local_task?: boolean;
  executor_workspace_id?: string | null;

  assigned_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  due_at?: string | null;

  // Convenience accessors (derived from metadata)
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
}

export interface AITaskFilterParams extends FilterParams {
  task_type?: string;
  priority?: string;
  mode?: 'plan_only' | 'dry_run' | 'execute';
  agent_id?: string;
  task_id?: string;
  assigned_from?: string;
  assigned_to?: string;
  due_from?: string;
  due_to?: string;
  deadline_after?: string;
  deadline_before?: string;
  min_cost?: number;
  max_cost?: number;
  is_local_task?: boolean;
  executor_workspace_id?: string;
}
