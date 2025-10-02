-- =====================================================
-- Core Strategy Schema
-- Date: 2025-09-22
-- Description: Comprehensive strategy planning schema
-- integrating with existing ZephyrOS infrastructure
-- =====================================================

-- =====================================================
-- 1. CORE STRATEGY INITIATIVES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core_strategy_initiatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,

  -- Core initiative information
  title TEXT NOT NULL,
  description TEXT,
  anchor_goal TEXT, -- Main goal/outcome for this initiative
  success_metric TEXT, -- How success is measured

  -- Status and priority
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'paused', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_calculation TEXT DEFAULT 'manual' CHECK (progress_calculation IN ('manual', 'task_based', 'weighted_tasks')),

  -- Timeline
  start_date DATE,
  due_date DATE,
  completion_date DATE,

  -- Organization
  tags TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Metadata and flexibility
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT core_strategy_initiatives_date_range_valid CHECK (due_date IS NULL OR start_date IS NULL OR start_date <= due_date),
  CONSTRAINT core_strategy_initiatives_completion_date_valid CHECK (completion_date IS NULL OR (status = 'completed' AND (due_date IS NULL OR completion_date <= due_date + INTERVAL '30 days')))
);

-- =====================================================
-- 2. STRATEGIC TASKS TABLE
-- =====================================================

-- Strategic tasks are specific actions that contribute to initiatives
-- Enhanced to work with existing ai_tasks table instead of separate agent assignments
CREATE TABLE IF NOT EXISTS core_strategy_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  initiative_id UUID REFERENCES core_strategy_initiatives(id) ON DELETE CASCADE,

  -- Link to existing task if this strategic task corresponds to a regular task
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Core task information
  title TEXT NOT NULL,
  description TEXT,

  -- Status and priority
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Progress and effort
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes

  -- Assignment (enhanced to work with ai_tasks)
  assignee TEXT, -- 'me' or 'ai_agent' (if delegated to AI)

  -- AI Delegation Support (uses existing ai_tasks table)
  -- When a strategic task is delegated to AI:
  -- 1. assignee = 'ai_agent'
  -- 2. An ai_tasks record is created linking task_id to the chosen agent
  -- 3. We can query ai_tasks to get delegation status, progress, and results

  -- Timeline
  due_date DATE,
  completion_date DATE,

  -- Organization
  tags TEXT[] DEFAULT '{}',

  -- Strategic context
  strategic_importance TEXT DEFAULT 'medium' CHECK (strategic_importance IN ('low', 'medium', 'high', 'critical')),
  initiative_contribution_weight INTEGER DEFAULT 1 CHECK (initiative_contribution_weight >= 1 AND initiative_contribution_weight <= 10),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT core_strategy_tasks_completion_status_valid CHECK (
    (status = 'completed' AND completion_date IS NOT NULL) OR
    (status != 'completed' AND completion_date IS NULL)
  )
);

-- =====================================================
-- 3. STRATEGIC MEMORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core_strategy_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  initiative_id UUID REFERENCES core_strategy_initiatives(id) ON DELETE SET NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,

  -- Link to existing memory if this corresponds to a regular memory
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,

  -- Core memory information
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Memory classification
  memory_type TEXT NOT NULL CHECK (memory_type IN ('insight', 'reflection', 'lesson_learned', 'milestone', 'retrospective', 'planning_note')),
  importance_level TEXT DEFAULT 'medium' CHECK (importance_level IN ('low', 'medium', 'high', 'critical')),

  -- Visibility and highlighting
  is_highlight BOOLEAN DEFAULT false,
  is_shareable BOOLEAN DEFAULT false,

  -- Organization
  tags TEXT[] DEFAULT '{}',

  -- Context
  context_data JSONB DEFAULT '{}', -- Additional context like metrics, decisions made, etc.

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. STRATEGIC ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core_strategy_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  initiative_id UUID REFERENCES core_strategy_initiatives(id) ON DELETE CASCADE,

  -- Analytics period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'seasonal')),

  -- Core metrics
  metrics_data JSONB NOT NULL DEFAULT '{}',

  -- Calculated insights
  velocity_score DECIMAL(5,2),
  focus_score DECIMAL(5,2),
  alignment_score DECIMAL(5,2),

  -- Risk indicators
  risk_alerts JSONB DEFAULT '[]',
  blockers_count INTEGER DEFAULT 0,
  overdue_tasks_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT core_strategy_analytics_period_valid CHECK (period_start <= period_end),
  UNIQUE(user_id, season_id, initiative_id, period_start, period_type)
);

-- =====================================================
-- 5. STRATEGIC SCENARIOS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core_strategy_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,

  -- Scenario information
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('what_if', 'contingency', 'optimization', 'alternative')),

  -- Scenario parameters
  assumptions JSONB DEFAULT '{}',
  variables JSONB DEFAULT '{}',

  -- Projected outcomes
  projected_outcomes JSONB DEFAULT '{}',
  risk_assessment JSONB DEFAULT '{}',
  resource_requirements JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'implemented')),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Initiatives indexes
CREATE INDEX IF NOT EXISTS idx_core_strategy_initiatives_user_id ON core_strategy_initiatives(user_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_initiatives_season_id ON core_strategy_initiatives(season_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_initiatives_status ON core_strategy_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_core_strategy_initiatives_priority ON core_strategy_initiatives(priority);
CREATE INDEX IF NOT EXISTS idx_core_strategy_initiatives_due_date ON core_strategy_initiatives(due_date);
CREATE INDEX IF NOT EXISTS idx_core_strategy_initiatives_created_at ON core_strategy_initiatives(created_at DESC);

-- Strategic tasks indexes
CREATE INDEX IF NOT EXISTS idx_core_strategy_tasks_user_id ON core_strategy_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_tasks_initiative_id ON core_strategy_tasks(initiative_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_tasks_status ON core_strategy_tasks(status);
CREATE INDEX IF NOT EXISTS idx_core_strategy_tasks_assignee ON core_strategy_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_core_strategy_tasks_due_date ON core_strategy_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_core_strategy_tasks_task_id ON core_strategy_tasks(task_id);

-- Strategic memories indexes
CREATE INDEX IF NOT EXISTS idx_core_strategy_memories_user_id ON core_strategy_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_memories_initiative_id ON core_strategy_memories(initiative_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_memories_season_id ON core_strategy_memories(season_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_memories_type ON core_strategy_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_core_strategy_memories_importance ON core_strategy_memories(importance_level);
CREATE INDEX IF NOT EXISTS idx_core_strategy_memories_highlight ON core_strategy_memories(is_highlight);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_core_strategy_analytics_user_id ON core_strategy_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_analytics_season_id ON core_strategy_analytics(season_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_analytics_initiative_id ON core_strategy_analytics(initiative_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_analytics_period ON core_strategy_analytics(period_start, period_end);

-- Scenarios indexes
CREATE INDEX IF NOT EXISTS idx_core_strategy_scenarios_user_id ON core_strategy_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_scenarios_season_id ON core_strategy_scenarios(season_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_scenarios_status ON core_strategy_scenarios(status);

-- =====================================================
-- 7. UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_core_strategy_initiatives_updated_at
  BEFORE UPDATE ON core_strategy_initiatives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_core_strategy_tasks_updated_at
  BEFORE UPDATE ON core_strategy_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_core_strategy_memories_updated_at
  BEFORE UPDATE ON core_strategy_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_core_strategy_analytics_updated_at
  BEFORE UPDATE ON core_strategy_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_core_strategy_scenarios_updated_at
  BEFORE UPDATE ON core_strategy_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE core_strategy_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_scenarios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Initiatives policies
CREATE POLICY "Users can view their own initiatives"
ON core_strategy_initiatives FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own initiatives"
ON core_strategy_initiatives FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own initiatives"
ON core_strategy_initiatives FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own initiatives"
ON core_strategy_initiatives FOR DELETE
USING (auth.uid() = user_id);

-- Strategic tasks policies
CREATE POLICY "Users can view their own strategic tasks"
ON core_strategy_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategic tasks"
ON core_strategy_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategic tasks"
ON core_strategy_tasks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategic tasks"
ON core_strategy_tasks FOR DELETE
USING (auth.uid() = user_id);

-- Strategic memories policies
CREATE POLICY "Users can view their own strategic memories"
ON core_strategy_memories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategic memories"
ON core_strategy_memories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategic memories"
ON core_strategy_memories FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategic memories"
ON core_strategy_memories FOR DELETE
USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view their own strategy analytics"
ON core_strategy_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategy analytics"
ON core_strategy_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategy analytics"
ON core_strategy_analytics FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategy analytics"
ON core_strategy_analytics FOR DELETE
USING (auth.uid() = user_id);

-- Scenarios policies
CREATE POLICY "Users can view their own strategy scenarios"
ON core_strategy_scenarios FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategy scenarios"
ON core_strategy_scenarios FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategy scenarios"
ON core_strategy_scenarios FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategy scenarios"
ON core_strategy_scenarios FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to get user's current strategic dashboard data
CREATE OR REPLACE FUNCTION get_strategy_dashboard(user_uuid UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_season', (
      SELECT json_build_object(
        'id', s.id,
        'title', s.title,
        'intention', s.intention,
        'theme', s.theme,
        'progress', COALESCE(
          (SELECT AVG(progress) FROM core_strategy_initiatives WHERE season_id = s.id AND user_id = user_uuid),
          0
        )
      )
      FROM seasons s
      WHERE s.user_id = user_uuid AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    'active_initiatives', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'description', description,
          'status', status,
          'priority', priority,
          'progress', progress,
          'due_date', due_date,
          'task_count', (
            SELECT COUNT(*) FROM core_strategy_tasks
            WHERE initiative_id = i.id
          ),
          'completed_task_count', (
            SELECT COUNT(*) FROM core_strategy_tasks
            WHERE initiative_id = i.id AND status = 'completed'
          )
        )
      )
      FROM core_strategy_initiatives i
      WHERE user_id = user_uuid AND status IN ('planning', 'active')
      ORDER BY priority DESC, created_at DESC
      LIMIT 10
    ),
    'recent_memories', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'content', content,
          'memory_type', memory_type,
          'importance_level', importance_level,
          'is_highlight', is_highlight,
          'created_at', created_at
        )
      )
      FROM core_strategy_memories
      WHERE user_id = user_uuid
      ORDER BY created_at DESC
      LIMIT 5
    ),
    'agent_workload', (
      SELECT json_agg(
        json_build_object(
          'agent_id', a.id,
          'agent_name', a.name,
          'active_assignments', COUNT(*) FILTER (WHERE at.status IN ('assigned', 'in_progress')),
          'completed_assignments', COUNT(*) FILTER (WHERE at.status = 'completed'),
          'avg_satisfaction', AVG(i.satisfaction_rating) FILTER (WHERE i.satisfaction_rating IS NOT NULL)
        )
      )
      FROM ai_agents a
      LEFT JOIN ai_tasks at ON a.id = at.agent_id AND at.user_id = user_uuid
      LEFT JOIN ai_interactions i ON a.id = i.agent_id AND i.user_id = user_uuid
      WHERE a.user_id = user_uuid
      GROUP BY a.id, a.name
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to calculate initiative progress based on tasks
CREATE OR REPLACE FUNCTION calculate_initiative_progress(initiative_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  weighted_progress DECIMAL;
  result INTEGER;
BEGIN
  -- Get total and completed task counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM core_strategy_tasks
  WHERE initiative_id = initiative_uuid;

  -- If no tasks, return current manual progress
  IF total_tasks = 0 THEN
    SELECT progress INTO result
    FROM core_strategy_initiatives
    WHERE id = initiative_uuid;
    RETURN COALESCE(result, 0);
  END IF;

  -- Calculate weighted progress based on task completion
  SELECT
    (SUM(progress * initiative_contribution_weight) / SUM(initiative_contribution_weight))::INTEGER
  INTO result
  FROM core_strategy_tasks
  WHERE initiative_id = initiative_uuid;

  RETURN COALESCE(result, 0);
END;
$$;

-- Function to update initiative progress automatically
CREATE OR REPLACE FUNCTION update_initiative_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the initiative's progress when a strategic task changes
  UPDATE core_strategy_initiatives
  SET progress = calculate_initiative_progress(NEW.initiative_id)
  WHERE id = NEW.initiative_id
    AND progress_calculation = 'task_based';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update initiative progress when tasks change
CREATE TRIGGER trigger_update_initiative_progress
  AFTER INSERT OR UPDATE OR DELETE ON core_strategy_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_initiative_progress();

-- Function to get strategic task with AI delegation info
CREATE OR REPLACE FUNCTION get_strategic_task_with_ai_delegation(strategic_task_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'strategic_task', json_build_object(
      'id', st.id,
      'title', st.title,
      'description', st.description,
      'status', st.status,
      'assignee', st.assignee,
      'progress', st.progress
    ),
    'regular_task', CASE
      WHEN st.task_id IS NOT NULL THEN json_build_object(
        'id', t.id,
        'title', t.title,
        'status', t.status
      )
      ELSE NULL
    END,
    'ai_delegation', CASE
      WHEN st.assignee = 'ai_agent' AND st.task_id IS NOT NULL THEN (
        SELECT json_build_object(
          'ai_task_id', at.id,
          'agent_name', ag.name,
          'agent_vendor', v.name,
          'status', at.status,
          'mode', at.mode,
          'objective', at.objective,
          'estimated_cost_usd', at.estimated_cost_usd,
          'actual_cost_usd', at.actual_cost_usd,
          'estimated_duration_min', at.estimated_duration_min,
          'actual_duration_min', at.actual_duration_min,
          'assigned_at', at.assigned_at,
          'started_at', at.started_at,
          'completed_at', at.completed_at
        )
        FROM ai_tasks at
        JOIN ai_agents ag ON ag.id = at.agent_id
        JOIN vendors v ON v.id = ag.vendor_id
        WHERE at.task_id = st.task_id
        ORDER BY at.created_at DESC
        LIMIT 1
      )
      ELSE NULL
    END
  ) INTO result
  FROM core_strategy_tasks st
  LEFT JOIN tasks t ON t.id = st.task_id
  WHERE st.id = strategic_task_uuid AND st.user_id = auth.uid();

  RETURN result;
END;
$$;

-- Function to delegate strategic task to AI agent
CREATE OR REPLACE FUNCTION delegate_strategic_task_to_ai(
  strategic_task_uuid UUID,
  agent_uuid UUID,
  objective TEXT,
  mode TEXT DEFAULT 'plan_only',
  guardrails JSONB DEFAULT NULL
)
RETURNS UUID -- Returns ai_task_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_uuid UUID;
  ai_task_uuid UUID;
  strategic_task_rec RECORD;
BEGIN
  -- Get strategic task details
  SELECT * INTO strategic_task_rec
  FROM core_strategy_tasks
  WHERE id = strategic_task_uuid AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Strategic task not found or access denied';
  END IF;

  -- Create regular task if it doesn't exist
  IF strategic_task_rec.task_id IS NULL THEN
    INSERT INTO tasks (
      title,
      description,
      status,
      priority,
      user_id
    ) VALUES (
      strategic_task_rec.title,
      strategic_task_rec.description,
      'pending',
      strategic_task_rec.priority,
      auth.uid()
    ) RETURNING id INTO task_uuid;

    -- Link the strategic task to the regular task
    UPDATE core_strategy_tasks
    SET task_id = task_uuid, updated_at = NOW()
    WHERE id = strategic_task_uuid;
  ELSE
    task_uuid := strategic_task_rec.task_id;
  END IF;

  -- Create AI task assignment
  INSERT INTO ai_tasks (
    task_id,
    agent_id,
    objective,
    mode,
    guardrails,
    task_type,
    user_id
  ) VALUES (
    task_uuid,
    agent_uuid,
    objective,
    mode,
    COALESCE(guardrails, '{"requiresHumanApproval": true}'::jsonb),
    'analysis', -- Default task type, could be parameterized
    auth.uid()
  ) RETURNING id INTO ai_task_uuid;

  -- Update strategic task to indicate AI delegation
  UPDATE core_strategy_tasks
  SET assignee = 'ai_agent', updated_at = NOW()
  WHERE id = strategic_task_uuid;

  RETURN ai_task_uuid;
END;
$$;

-- =====================================================
-- 11. PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON core_strategy_initiatives TO authenticated;
GRANT ALL ON core_strategy_tasks TO authenticated;
GRANT ALL ON core_strategy_memories TO authenticated;
GRANT ALL ON core_strategy_analytics TO authenticated;
GRANT ALL ON core_strategy_scenarios TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_strategy_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_initiative_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_strategic_task_with_ai_delegation TO authenticated;
GRANT EXECUTE ON FUNCTION delegate_strategic_task_to_ai TO authenticated;

-- =====================================================
-- 12. COMMENTS
-- =====================================================

-- Table comments
COMMENT ON TABLE core_strategy_initiatives IS 'High-level strategic initiatives that break down into tasks';
COMMENT ON TABLE core_strategy_tasks IS 'Strategic tasks that contribute to initiatives, with AI delegation support via existing ai_tasks table';
COMMENT ON TABLE core_strategy_memories IS 'Strategic insights, reflections, and lessons learned';
COMMENT ON TABLE core_strategy_analytics IS 'Strategic metrics and analytics for dashboard insights';
COMMENT ON TABLE core_strategy_scenarios IS 'What-if scenarios and strategic planning alternatives';

-- Column comments for key fields
COMMENT ON COLUMN core_strategy_initiatives.anchor_goal IS 'Main goal/outcome this initiative aims to achieve';
COMMENT ON COLUMN core_strategy_initiatives.success_metric IS 'How success will be measured for this initiative';
COMMENT ON COLUMN core_strategy_initiatives.progress_calculation IS 'How progress is calculated: manual, task_based, or weighted_tasks';

COMMENT ON COLUMN core_strategy_tasks.strategic_importance IS 'Strategic importance level for prioritization';
COMMENT ON COLUMN core_strategy_tasks.initiative_contribution_weight IS 'Weight (1-10) for calculating initiative progress';
COMMENT ON COLUMN core_strategy_tasks.assignee IS 'Assignment: "me" for self-assigned, "ai_agent" for AI delegation (uses ai_tasks table)';
COMMENT ON COLUMN core_strategy_tasks.task_id IS 'Link to regular task - required for AI delegation via ai_tasks table';

COMMENT ON COLUMN core_strategy_memories.memory_type IS 'Type: insight, reflection, lesson_learned, milestone, retrospective, planning_note';
COMMENT ON COLUMN core_strategy_memories.context_data IS 'Additional context like metrics, decisions made, etc.';

-- Function comments
COMMENT ON FUNCTION get_strategic_task_with_ai_delegation IS 'Returns strategic task with AI delegation info from ai_tasks table';
COMMENT ON FUNCTION delegate_strategic_task_to_ai IS 'Delegates strategic task to AI agent using existing ai_tasks infrastructure';

-- =====================================================
-- CORE STRATEGY SCHEMA COMPLETE
-- =====================================================
-- This schema provides comprehensive strategic planning capabilities
-- while seamlessly integrating with existing ZephyrOS infrastructure
-- including seasons, tasks, memories, and ai_tasks tables.
-- =====================================================

-- =====================================================
-- Core Strategy Daily Table Migration
-- Date: 2025-09-24
-- Description: Table for daily special marked timeline items
-- for planning, reflection, priorities, and adventures
-- =====================================================

-- =====================================================
-- 1. CORE STRATEGY DAILY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS core_strategy_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  
  -- Date context
  local_date DATE NOT NULL,
  tz TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  
  -- Timeline item reference
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  timeline_item_type TEXT NOT NULL, -- snapshot for query performance
  
  -- Daily strategy type
  strategy_type TEXT NOT NULL CHECK (strategy_type IN (
    'priority',      -- 每日的首要任务
    'planning',      -- 每日计划
    'reflection',    -- 每日反思
    'adventure',     -- 每日冒险/体验 (connect to memories)
    'learning',      -- 每日学习
    'milestone',     -- 里程碑记录
    'insight',       -- 洞察记录
    'routine'        -- 日常例行事项
  )),
  
  -- Strategy context and metadata
  importance_level TEXT DEFAULT 'medium' CHECK (importance_level IN ('low', 'medium', 'high', 'critical')),
  priority_order INTEGER DEFAULT 0, -- 用于同类型项目的排序
  
  -- Daily planning context
  planned_duration_minutes INTEGER, -- 计划花费时间
  planned_time_of_day TEXT CHECK (planned_time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'flexible')),
  
  -- Status tracking
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'deferred', 'cancelled')),
  completion_notes TEXT, -- 完成时的记录
  
  -- Energy and mood context
  required_energy_level INTEGER CHECK (required_energy_level BETWEEN 1 AND 10),
  actual_energy_used INTEGER CHECK (actual_energy_used BETWEEN 1 AND 10),
  mood_impact TEXT CHECK (mood_impact IN ('positive', 'neutral', 'negative')),
  
  -- Connections to strategy framework
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES core_strategy_initiatives(id) ON DELETE SET NULL,
  
  -- Flexible metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}' NOT NULL,
  
  -- Reflection and insights
  reflection_notes TEXT,
  lessons_learned TEXT,
  next_actions TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, local_date, timeline_item_id, strategy_type),
  CONSTRAINT valid_priority_order CHECK (priority_order >= 0),
  CONSTRAINT valid_duration CHECK (planned_duration_minutes IS NULL OR planned_duration_minutes > 0)
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Core access patterns
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_user_id ON core_strategy_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_user_date ON core_strategy_daily(user_id, local_date DESC);
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_timeline_item ON core_strategy_daily(timeline_item_id);

-- Strategy type queries
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_user_type ON core_strategy_daily(user_id, strategy_type);
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_user_date_type ON core_strategy_daily(user_id, local_date DESC, strategy_type);

-- Status and importance
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_status ON core_strategy_daily(user_id, status);
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_importance ON core_strategy_daily(user_id, importance_level);

-- Priority ordering
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_priority_order ON core_strategy_daily(user_id, local_date, strategy_type, priority_order);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_time_of_day ON core_strategy_daily(user_id, planned_time_of_day) WHERE planned_time_of_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_created_at ON core_strategy_daily(created_at DESC);

-- Strategy framework connections
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_season ON core_strategy_daily(season_id) WHERE season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_initiative ON core_strategy_daily(initiative_id) WHERE initiative_id IS NOT NULL;

-- Energy and mood patterns
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_energy ON core_strategy_daily(user_id, required_energy_level) WHERE required_energy_level IS NOT NULL;

-- Tags
CREATE INDEX IF NOT EXISTS idx_core_strategy_daily_tags ON core_strategy_daily USING GIN(tags);

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

-- Updated_at trigger
CREATE TRIGGER trigger_core_strategy_daily_updated_at
  BEFORE UPDATE ON core_strategy_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Timeline item type snapshot trigger
CREATE OR REPLACE FUNCTION set_core_strategy_daily_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Set timeline item type snapshot on INSERT
  IF TG_OP = 'INSERT' THEN
    SELECT type INTO NEW.timeline_item_type
    FROM timeline_items 
    WHERE id = NEW.timeline_item_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Timeline item with id % not found', NEW.timeline_item_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_core_strategy_daily_snapshot
  BEFORE INSERT ON core_strategy_daily
  FOR EACH ROW
  EXECUTE FUNCTION set_core_strategy_daily_snapshot();

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE core_strategy_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily strategy items"
ON core_strategy_daily FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily strategy items"
ON core_strategy_daily FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  timeline_item_id IN (SELECT id FROM timeline_items WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own daily strategy items"
ON core_strategy_daily FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  timeline_item_id IN (SELECT id FROM timeline_items WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own daily strategy items"
ON core_strategy_daily FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get daily strategy overview
CREATE OR REPLACE FUNCTION get_daily_strategy_overview(
  user_uuid UUID DEFAULT auth.uid(),
  target_date DATE DEFAULT CURRENT_DATE,
  target_tz TEXT DEFAULT 'America/Los_Angeles'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'date', target_date,
    'timezone', target_tz,
    'priorities', (
      SELECT json_agg(
        json_build_object(
          'id', csd.id,
          'timeline_item_id', csd.timeline_item_id,
          'timeline_item_type', csd.timeline_item_type,
          'timeline_item_title', ti.title,
          'importance_level', csd.importance_level,
          'priority_order', csd.priority_order,
          'status', csd.status,
          'planned_duration_minutes', csd.planned_duration_minutes,
          'planned_time_of_day', csd.planned_time_of_day,
          'required_energy_level', csd.required_energy_level
        ) ORDER BY csd.priority_order, csd.importance_level DESC
      )
      FROM core_strategy_daily csd
      JOIN timeline_items ti ON ti.id = csd.timeline_item_id
      WHERE csd.user_id = user_uuid 
        AND csd.local_date = target_date
        AND csd.strategy_type = 'priority'
    ),
    'planning_items', (
      SELECT json_agg(
        json_build_object(
          'id', csd.id,
          'timeline_item_id', csd.timeline_item_id,
          'timeline_item_type', csd.timeline_item_type,
          'timeline_item_title', ti.title,
          'planned_time_of_day', csd.planned_time_of_day,
          'planned_duration_minutes', csd.planned_duration_minutes,
          'status', csd.status
        ) ORDER BY csd.priority_order
      )
      FROM core_strategy_daily csd
      JOIN timeline_items ti ON ti.id = csd.timeline_item_id
      WHERE csd.user_id = user_uuid 
        AND csd.local_date = target_date
        AND csd.strategy_type = 'planning'
    ),
    'reflections', (
      SELECT json_agg(
        json_build_object(
          'id', csd.id,
          'timeline_item_id', csd.timeline_item_id,
          'timeline_item_type', csd.timeline_item_type,
          'timeline_item_title', ti.title,
          'reflection_notes', csd.reflection_notes,
          'lessons_learned', csd.lessons_learned,
          'mood_impact', csd.mood_impact
        ) ORDER BY csd.created_at DESC
      )
      FROM core_strategy_daily csd
      JOIN timeline_items ti ON ti.id = csd.timeline_item_id
      WHERE csd.user_id = user_uuid 
        AND csd.local_date = target_date
        AND csd.strategy_type = 'reflection'
    ),
    'adventures', (
      SELECT json_agg(
        json_build_object(
          'id', csd.id,
          'timeline_item_id', csd.timeline_item_id,
          'timeline_item_type', csd.timeline_item_type,
          'timeline_item_title', ti.title,
          'status', csd.status,
          'actual_energy_used', csd.actual_energy_used,
          'mood_impact', csd.mood_impact,
          'insights', csd.reflection_notes
        ) ORDER BY csd.priority_order, csd.created_at
      )
      FROM core_strategy_daily csd
      JOIN timeline_items ti ON ti.id = csd.timeline_item_id
      WHERE csd.user_id = user_uuid 
        AND csd.local_date = target_date
        AND csd.strategy_type = 'adventure'
    ),
    'energy_summary', (
      SELECT json_build_object(
        'total_planned_energy', COALESCE(SUM(csd.required_energy_level), 0),
        'total_used_energy', COALESCE(SUM(csd.actual_energy_used), 0),
        'energy_efficiency', CASE 
          WHEN SUM(csd.required_energy_level) > 0 THEN 
            ROUND((SUM(csd.actual_energy_used)::DECIMAL / SUM(csd.required_energy_level)) * 100, 2)
          ELSE NULL
        END
      )
      FROM core_strategy_daily csd
      WHERE csd.user_id = user_uuid 
        AND csd.local_date = target_date
        AND csd.required_energy_level IS NOT NULL
    ),
    'completion_stats', (
      SELECT json_build_object(
        'total_items', COUNT(*),
        'completed_items', COUNT(*) FILTER (WHERE status = 'completed'),
        'in_progress_items', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'deferred_items', COUNT(*) FILTER (WHERE status = 'deferred'),
        'completion_rate', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 2)
          ELSE 0
        END
      )
      FROM core_strategy_daily csd
      WHERE csd.user_id = user_uuid 
        AND csd.local_date = target_date
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to add daily strategy item
CREATE OR REPLACE FUNCTION add_daily_strategy_item(
  p_timeline_item_id UUID,
  p_strategy_type TEXT,
  p_local_date DATE DEFAULT CURRENT_DATE,
  p_importance_level TEXT DEFAULT 'medium',
  p_priority_order INTEGER DEFAULT NULL,
  p_planned_duration_minutes INTEGER DEFAULT NULL,
  p_planned_time_of_day TEXT DEFAULT NULL,
  p_required_energy_level INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  calculated_priority_order INTEGER;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  -- Calculate priority order if not provided
  IF p_priority_order IS NULL THEN
    SELECT COALESCE(MAX(priority_order), 0) + 1
    INTO calculated_priority_order
    FROM core_strategy_daily
    WHERE user_id = v_user_id
      AND local_date = p_local_date
      AND strategy_type = p_strategy_type;
  ELSE
    calculated_priority_order := p_priority_order;
  END IF;

  -- Insert the new daily strategy item
  INSERT INTO core_strategy_daily (
    user_id,
    timeline_item_id,
    strategy_type,
    local_date,
    importance_level,
    priority_order,
    planned_duration_minutes,
    planned_time_of_day,
    required_energy_level,
    tags,
    metadata
  ) VALUES (
    v_user_id,
    p_timeline_item_id,
    p_strategy_type,
    p_local_date,
    p_importance_level,
    calculated_priority_order,
    p_planned_duration_minutes,
    p_planned_time_of_day,
    p_required_energy_level,
    p_tags,
    p_metadata
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Function to update daily strategy item status
CREATE OR REPLACE FUNCTION update_daily_strategy_status(
  p_id UUID,
  p_status TEXT,
  p_completion_notes TEXT DEFAULT NULL,
  p_actual_energy_used INTEGER DEFAULT NULL,
  p_mood_impact TEXT DEFAULT NULL,
  p_reflection_notes TEXT DEFAULT NULL,
  p_lessons_learned TEXT DEFAULT NULL,
  p_next_actions TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, item_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows INTEGER;
  v_item_id UUID;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  UPDATE core_strategy_daily
  SET
    status = p_status,
    completion_notes = COALESCE(p_completion_notes, completion_notes),
    actual_energy_used = COALESCE(p_actual_energy_used, actual_energy_used),
    mood_impact = COALESCE(p_mood_impact, mood_impact),
    reflection_notes = COALESCE(p_reflection_notes, reflection_notes),
    lessons_learned = COALESCE(p_lessons_learned, lessons_learned),
    next_actions = COALESCE(p_next_actions, next_actions),
    updated_at = NOW()
  WHERE id = p_id AND user_id = v_user_id
  RETURNING id INTO v_item_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  RETURN QUERY SELECT (updated_rows > 0), v_item_id;
END;
$$;

-- =====================================================
-- 6. PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON core_strategy_daily TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_daily_strategy_overview TO authenticated;
GRANT EXECUTE ON FUNCTION add_daily_strategy_item TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_strategy_status TO authenticated;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

-- Table comments
COMMENT ON TABLE core_strategy_daily IS 'Daily special marked timeline items for planning, reflection, priorities, and adventures';

-- Key column comments
COMMENT ON COLUMN core_strategy_daily.strategy_type IS 'Type of daily strategy: priority, planning, reflection, adventure, learning, milestone, insight, routine';
COMMENT ON COLUMN core_strategy_daily.importance_level IS 'Importance level for prioritization and review';
COMMENT ON COLUMN core_strategy_daily.priority_order IS 'Order within the same strategy type and date (0-based)';
COMMENT ON COLUMN core_strategy_daily.planned_time_of_day IS 'When this item is planned to be executed: morning, afternoon, evening, night, flexible';
COMMENT ON COLUMN core_strategy_daily.required_energy_level IS 'Energy level required (1-10 scale)';
COMMENT ON COLUMN core_strategy_daily.actual_energy_used IS 'Actual energy used after completion (1-10 scale)';
COMMENT ON COLUMN core_strategy_daily.mood_impact IS 'Impact on mood: positive, neutral, negative';
COMMENT ON COLUMN core_strategy_daily.timeline_item_type IS 'Snapshot of timeline item type for query performance';

-- Function comments
COMMENT ON FUNCTION get_daily_strategy_overview IS 'Returns comprehensive daily strategy overview including priorities, planning, reflections, and adventures';
COMMENT ON FUNCTION add_daily_strategy_item IS 'Adds a new daily strategy item with automatic priority ordering';
COMMENT ON FUNCTION update_daily_strategy_status IS 'Updates daily strategy item status and related completion information';

-- =====================================================
-- CORE STRATEGY DAILY TABLE MIGRATION COMPLETE
-- =====================================================
