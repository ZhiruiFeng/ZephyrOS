import { BaseEntity, FilterParams } from '../common';

// Task relation types
export type TaskRelationType = 'subtask' | 'related' | 'dependency' | 'blocked_by';

// Embedded task info from join
export interface RelatedTaskInfo {
  id: string;
  title: string;
  status: string;
  priority: string;
}

// Task Relation Entity shape aligned with task_relations table
export interface TaskRelation extends BaseEntity {
  parent_task_id: string;
  child_task_id: string;
  relation_type: TaskRelationType;

  // Joined data (from select queries)
  parent_task?: RelatedTaskInfo;
  child_task?: RelatedTaskInfo;
}

export interface TaskRelationFilterParams extends FilterParams {
  task_id?: string; // Filter by either parent or child task
  relation_type?: TaskRelationType;
  parent_task_id?: string;
  child_task_id?: string;
}

// Create task relation input (what comes from POST request)
export interface CreateTaskRelationInput {
  parent_task_id: string;
  child_task_id: string;
  relation_type: TaskRelationType;
}
