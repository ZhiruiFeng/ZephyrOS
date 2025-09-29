// AI Task Service Types
export interface AITaskExecutionContext {
  user_context?: Record<string, any>;
  environment?: 'development' | 'production' | 'test';
  cost_constraints?: {
    max_cost_per_task?: number;
    max_total_cost?: number;
  };
  timeout_settings?: {
    execution_timeout_ms?: number;
    retry_delay_ms?: number;
  };
}

export interface AITaskCreateRequest {
  task_id: string;
  agent_id: string;
  task_type: string;

  title?: string;
  description?: string;
  objective?: string;
  deliverables?: string;
  context?: string;
  acceptance_criteria?: string;
  dependencies?: string[];
  mode?: 'plan_only' | 'dry_run' | 'execute';
  guardrails?: Record<string, any>;
  priority?: string;
  status?: string;
  category?: string;
  model?: string;
  provider?: string;
  prompt?: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  input_data?: Record<string, any>;
  expected_output_format?: string;
  deadline?: string;
  due_at?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  estimated_cost?: number;
  estimated_cost_usd?: number;
  estimated_duration_seconds?: number;
  estimated_duration_min?: number;
  max_retries?: number;
  retry_count?: number;
  history?: Array<Record<string, any>>;
  execution_result?: Record<string, any>;
}

export interface AITaskExecutionResult {
  task_id: string;
  success: boolean;
  output_data?: Record<string, any>;
  error_message?: string;
  tokens_used?: number;
  actual_cost?: number;
  execution_time_seconds?: number;
  model_used?: string;
  provider_used?: string;
  metadata?: Record<string, any>;
}

export interface AITaskBatchRequest {
  tasks: AITaskCreateRequest[];
  execution_options?: {
    parallel_execution?: boolean;
    max_concurrent_tasks?: number;
    fail_fast?: boolean;
    cost_limit?: number;
  };
}

export interface AITaskBatchResult {
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  total_cost: number;
  total_execution_time: number;
  results: AITaskExecutionResult[];
  errors: Array<{
    task_index: number;
    error: string;
  }>;
}
