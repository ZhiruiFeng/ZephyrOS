-- =====================================================
-- Fix update_daily_strategy_status Function (v2)
-- Date: 2025-10-02
-- Description: Update the function to work with both
-- service role (API key auth) and regular auth
-- =====================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS update_daily_strategy_status(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT);

-- Recreate function with user_id parameter for service role support
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_daily_strategy_status TO authenticated;

-- Update function comment
COMMENT ON FUNCTION update_daily_strategy_status IS 'Updates daily strategy item status and related completion information, returns success status and item_id. Works with both service role and regular auth.';
