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
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  calculated_priority_order INTEGER;
BEGIN
  -- Calculate priority order if not provided
  IF p_priority_order IS NULL THEN
    SELECT COALESCE(MAX(priority_order), 0) + 1 
    INTO calculated_priority_order
    FROM core_strategy_daily
    WHERE user_id = auth.uid() 
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
    auth.uid(),
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
