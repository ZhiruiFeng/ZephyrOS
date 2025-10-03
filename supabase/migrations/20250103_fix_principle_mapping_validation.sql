-- Fix principle mapping validation to allow default principles
-- Users should be able to map Ray Dalio's default principles to their own timeline items

-- Drop and recreate the validation function
DROP FUNCTION IF EXISTS validate_mapping_user_ownership() CASCADE;

CREATE OR REPLACE FUNCTION validate_mapping_user_ownership()
RETURNS TRIGGER AS $$
DECLARE
  principle_user_id UUID;
  principle_is_default BOOLEAN;
  timeline_user_id UUID;
BEGIN
  -- Get principle owner and default status
  SELECT user_id, is_default INTO principle_user_id, principle_is_default
  FROM core_principles
  WHERE id = NEW.principle_id;

  -- Get timeline item owner
  SELECT user_id INTO timeline_user_id
  FROM timeline_items
  WHERE id = NEW.timeline_item_id;

  -- Validate ownership
  -- Allow if: principle is default OR principle belongs to user
  -- AND timeline item belongs to user
  IF timeline_user_id != NEW.user_id THEN
    RAISE EXCEPTION 'User can only map principles to their own timeline items';
  END IF;

  IF NOT principle_is_default AND principle_user_id != NEW.user_id THEN
    RAISE EXCEPTION 'User can only map their own principles or default principles';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_validate_mapping_ownership ON core_principle_timeline_items_mapping;

CREATE TRIGGER trg_validate_mapping_ownership
  BEFORE INSERT OR UPDATE ON core_principle_timeline_items_mapping
  FOR EACH ROW
  EXECUTE FUNCTION validate_mapping_user_ownership();
