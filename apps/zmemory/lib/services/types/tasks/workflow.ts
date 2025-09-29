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