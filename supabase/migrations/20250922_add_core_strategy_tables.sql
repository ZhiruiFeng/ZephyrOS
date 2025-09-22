-- =====================================================
-- Core Strategy Tables Migration
-- Date: 2025-09-22
-- Description: Create comprehensive strategy planning tables
-- including initiatives, strategic tasks, memories, and agent assignments
-- All table names start with "core_strategy_" prefix as requested
-- =====================================================

-- =====================================================
-- 1. CREATE CORE STRATEGY INITIATIVES TABLE
-- =====================================================

-- Strategic initiatives are high-level goals that break down into tasks
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
-- 2. CREATE STRATEGIC TASKS TABLE
-- =====================================================

-- Strategic tasks are specific actions that contribute to initiatives
-- These are separate from regular tasks to maintain strategic context
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

  -- Assignment
  assignee TEXT, -- 'me' or agent_id
  delegation_status TEXT DEFAULT 'not_delegated' CHECK (delegation_status IN ('not_delegated', 'delegated', 'in_progress', 'completed', 'failed')),
  delegation_briefing TEXT, -- Context provided when delegating to agent

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
-- 3. CREATE STRATEGIC MEMORIES TABLE
-- =====================================================

-- Strategic memories capture insights, reflections, and learnings
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
-- 4. CREATE AGENT ASSIGNMENTS TABLE
-- =====================================================

-- Track AI agent assignments and performance for strategic tasks
CREATE TABLE IF NOT EXISTS core_strategy_agent_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  strategic_task_id UUID NOT NULL REFERENCES core_strategy_tasks(id) ON DELETE CASCADE,

  -- Agent information
  agent_id TEXT NOT NULL, -- Agent identifier (e.g., 'claude-dev', 'research-assistant')
  agent_name TEXT NOT NULL,
  agent_provider TEXT, -- 'anthropic', 'openai', etc.

  -- Assignment details
  briefing TEXT NOT NULL, -- Full context and instructions provided to agent
  expected_outcome TEXT, -- What we expect the agent to deliver

  -- Status tracking
  assignment_status TEXT DEFAULT 'assigned' CHECK (assignment_status IN ('assigned', 'in_progress', 'completed', 'failed', 'cancelled')),

  -- Performance tracking
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5), -- 1-5 rating
  completion_time_minutes INTEGER,
  feedback TEXT, -- User feedback on agent performance

  -- Communication
  agent_updates JSONB DEFAULT '[]', -- Array of status updates from agent
  user_feedback_history JSONB DEFAULT '[]', -- History of user feedback

  -- Timeline
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT core_strategy_agent_assignments_completion_valid CHECK (
    (assignment_status = 'completed' AND completed_at IS NOT NULL) OR
    (assignment_status != 'completed')
  )
);

-- =====================================================
-- 5. CREATE STRATEGIC ANALYTICS TABLE
-- =====================================================

-- Store strategic analytics and metrics for dashboard insights
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
  metrics_data JSONB NOT NULL DEFAULT '{}', -- Flexible metrics storage

  -- Calculated insights
  velocity_score DECIMAL(5,2), -- Tasks completed per time period
  focus_score DECIMAL(5,2), -- Concentration on high-priority items
  alignment_score DECIMAL(5,2), -- How well tasks align with initiative goals

  -- Risk indicators
  risk_alerts JSONB DEFAULT '[]', -- Array of risk alerts
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
-- 6. CREATE STRATEGIC SCENARIOS TABLE
-- =====================================================

-- Store what-if scenarios and strategic planning alternatives
CREATE TABLE IF NOT EXISTS core_strategy_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,

  -- Scenario information
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('what_if', 'contingency', 'optimization', 'alternative')),

  -- Scenario parameters
  assumptions JSONB DEFAULT '{}', -- Key assumptions for this scenario
  variables JSONB DEFAULT '{}', -- Variable parameters (resource allocation, timelines, etc.)

  -- Projected outcomes
  projected_outcomes JSONB DEFAULT '{}', -- Expected results
  risk_assessment JSONB DEFAULT '{}', -- Risk analysis
  resource_requirements JSONB DEFAULT '{}', -- Required resources

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'implemented')),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
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

-- Agent assignments indexes
CREATE INDEX IF NOT EXISTS idx_core_strategy_agent_assignments_user_id ON core_strategy_agent_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_agent_assignments_task_id ON core_strategy_agent_assignments(strategic_task_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_agent_assignments_agent_id ON core_strategy_agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_core_strategy_agent_assignments_status ON core_strategy_agent_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_core_strategy_agent_assignments_assigned_at ON core_strategy_agent_assignments(assigned_at DESC);

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
-- 8. CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Triggers to automatically update updated_at timestamps
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
-- 9. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all strategy tables
ALTER TABLE core_strategy_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_strategy_scenarios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. CREATE RLS POLICIES
-- =====================================================

-- Initiatives policies - users can only access their own initiatives
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

-- Agent assignments policies
CREATE POLICY "Users can view their own agent assignments"
ON core_strategy_agent_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent assignments"
ON core_strategy_agent_assignments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent assignments"
ON core_strategy_agent_assignments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent assignments"
ON core_strategy_agent_assignments FOR DELETE
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
-- 11. CREATE HELPER FUNCTIONS
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
          'agent_id', agent_id,
          'agent_name', agent_name,
          'active_assignments', COUNT(*) FILTER (WHERE assignment_status IN ('assigned', 'in_progress')),
          'completed_assignments', COUNT(*) FILTER (WHERE assignment_status = 'completed'),
          'avg_quality_rating', AVG(quality_rating) FILTER (WHERE quality_rating IS NOT NULL)
        )
      )
      FROM core_strategy_agent_assignments
      WHERE user_id = user_uuid
      GROUP BY agent_id, agent_name
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

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON core_strategy_initiatives TO authenticated;
GRANT ALL ON core_strategy_tasks TO authenticated;
GRANT ALL ON core_strategy_memories TO authenticated;
GRANT ALL ON core_strategy_agent_assignments TO authenticated;
GRANT ALL ON core_strategy_analytics TO authenticated;
GRANT ALL ON core_strategy_scenarios TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_strategy_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_initiative_progress TO authenticated;

-- =====================================================
-- 13. ADD HELPFUL COMMENTS
-- =====================================================

-- Table comments
COMMENT ON TABLE core_strategy_initiatives IS 'High-level strategic initiatives that break down into tasks';
COMMENT ON TABLE core_strategy_tasks IS 'Specific strategic tasks that contribute to initiatives';
COMMENT ON TABLE core_strategy_memories IS 'Strategic insights, reflections, and lessons learned';
COMMENT ON TABLE core_strategy_agent_assignments IS 'AI agent task assignments and performance tracking';
COMMENT ON TABLE core_strategy_analytics IS 'Strategic metrics and analytics for dashboard insights';
COMMENT ON TABLE core_strategy_scenarios IS 'What-if scenarios and strategic planning alternatives';

-- Column comments for key fields
COMMENT ON COLUMN core_strategy_initiatives.anchor_goal IS 'Main goal/outcome this initiative aims to achieve';
COMMENT ON COLUMN core_strategy_initiatives.success_metric IS 'How success will be measured for this initiative';
COMMENT ON COLUMN core_strategy_initiatives.progress_calculation IS 'How progress is calculated: manual, task_based, or weighted_tasks';

COMMENT ON COLUMN core_strategy_tasks.strategic_importance IS 'Strategic importance level for prioritization';
COMMENT ON COLUMN core_strategy_tasks.initiative_contribution_weight IS 'Weight (1-10) for calculating initiative progress';
COMMENT ON COLUMN core_strategy_tasks.delegation_status IS 'Status of task delegation to AI agents';

COMMENT ON COLUMN core_strategy_memories.memory_type IS 'Type: insight, reflection, lesson_learned, milestone, retrospective, planning_note';
COMMENT ON COLUMN core_strategy_memories.context_data IS 'Additional context like metrics, decisions made, etc.';

COMMENT ON COLUMN core_strategy_agent_assignments.quality_rating IS '1-5 rating of agent performance on this task';
COMMENT ON COLUMN core_strategy_agent_assignments.agent_updates IS 'Array of status updates from the agent';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- This migration creates a comprehensive strategic planning system that integrates with
-- existing ZephyrOS tables (seasons, tasks, memories) while providing dedicated
-- strategic planning capabilities with AI agent integration.