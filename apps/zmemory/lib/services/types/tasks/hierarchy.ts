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