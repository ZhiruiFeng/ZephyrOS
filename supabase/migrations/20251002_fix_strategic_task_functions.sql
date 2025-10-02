-- =====================================================
-- Fix Strategic Task Functions for Service Role Support
-- Date: 2025-10-02
-- Description: Update delegate_strategic_task_to_ai and
-- get_strategic_task_with_ai_delegation functions to work
-- with both service role (API key auth) and regular auth
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS delegate_strategic_task_to_ai(UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS get_strategic_task_with_ai_delegation(UUID);

-- Recreate get_strategic_task_with_ai_delegation with user_id parameter
CREATE OR REPLACE FUNCTION get_strategic_task_with_ai_delegation(
  strategic_task_uuid UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

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
  WHERE st.id = strategic_task_uuid AND st.user_id = v_user_id;

  RETURN result;
END;
$$;

-- Recreate delegate_strategic_task_to_ai with user_id parameter
CREATE OR REPLACE FUNCTION delegate_strategic_task_to_ai(
  strategic_task_uuid UUID,
  agent_uuid UUID,
  objective TEXT,
  mode TEXT DEFAULT 'plan_only',
  guardrails JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID -- Returns ai_task_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_uuid UUID;
  ai_task_uuid UUID;
  strategic_task_rec RECORD;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  -- Get strategic task details
  SELECT * INTO strategic_task_rec
  FROM core_strategy_tasks
  WHERE id = strategic_task_uuid AND user_id = v_user_id;

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
      v_user_id
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
    v_user_id
  ) RETURNING id INTO ai_task_uuid;

  -- Update strategic task to indicate AI delegation
  UPDATE core_strategy_tasks
  SET assignee = 'ai_agent', updated_at = NOW()
  WHERE id = strategic_task_uuid;

  RETURN ai_task_uuid;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_strategic_task_with_ai_delegation TO authenticated;
GRANT EXECUTE ON FUNCTION delegate_strategic_task_to_ai TO authenticated;

-- Update function comments
COMMENT ON FUNCTION get_strategic_task_with_ai_delegation IS 'Returns strategic task with AI delegation info from ai_tasks table. Works with both service role and regular auth.';
COMMENT ON FUNCTION delegate_strategic_task_to_ai IS 'Delegates strategic task to AI agent using existing ai_tasks infrastructure. Works with both service role and regular auth.';
