-- Fix add_daily_strategy_item function to accept user_id parameter
-- This allows the function to work with service role clients

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
