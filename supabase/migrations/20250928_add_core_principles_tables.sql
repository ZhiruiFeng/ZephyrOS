-- =====================================================
-- Ray Dalio Core Principles Feature Migration
-- Created: 2025-09-28
-- Purpose: Add core principles and timeline mapping tables
-- =====================================================

-- =====================================================
-- 1. CORE PRINCIPLES TABLE
-- =====================================================

-- Core principles table for Ray Dalio's principles and user customizations
CREATE TABLE IF NOT EXISTS core_principles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),

  -- Principle content
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'work_principles',
    'life_principles',
    'decision_making',
    'relationships',
    'learning',
    'leadership',
    'custom'
  )),

  -- Lifecycle status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'archived')),

  -- Ray Dalio's original vs user-customized
  is_default BOOLEAN DEFAULT true, -- Ray Dalio's original principles
  source TEXT DEFAULT 'ray_dalio' CHECK (source IN ('ray_dalio', 'user_custom')),

  -- Behavioral guidance
  trigger_questions TEXT[] DEFAULT '{}', -- Questions to ask when applying this principle
  application_examples TEXT[] DEFAULT '{}', -- Examples of how to apply

  -- User personalization
  personal_notes TEXT,
  importance_level INTEGER DEFAULT 1 CHECK (importance_level BETWEEN 1 AND 5),

  -- Usage tracking
  application_count INTEGER DEFAULT 0,
  last_applied_at TIMESTAMP WITH TIME ZONE,

  -- Deprecation tracking
  deprecated_at TIMESTAMP WITH TIME ZONE,
  deprecation_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(title, user_id), -- Users can't have duplicate principle titles

  -- Status validation
  CONSTRAINT status_deprecation_check CHECK (
    (status != 'deprecated' AND deprecated_at IS NULL) OR
    (status = 'deprecated' AND deprecated_at IS NOT NULL)
  )
);

-- =====================================================
-- 2. PRINCIPLES-TIMELINE MAPPING TABLE
-- =====================================================

-- Many-to-many mapping between principles and timeline items
CREATE TABLE IF NOT EXISTS core_principle_timeline_items_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- References
  principle_id UUID NOT NULL REFERENCES core_principles(id) ON DELETE CASCADE,
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,

  -- Relationship context
  application_type TEXT NOT NULL CHECK (application_type IN (
    'pre_decision', -- Applied before making a decision
    'post_reflection', -- Applied during reflection
    'learning', -- Applied during learning from outcome
    'validation' -- Applied to validate approach
  )),

  -- Reflection details
  reflection_notes TEXT,
  effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
  lessons_learned TEXT,

  -- Application context
  decision_context TEXT, -- What decision was being made?
  outcome_observed TEXT, -- What was the outcome?
  would_apply_again BOOLEAN,

  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- User ownership (derived from principle and timeline_item)
  user_id UUID NOT NULL DEFAULT auth.uid(),

  -- Constraints
  UNIQUE(principle_id, timeline_item_id, application_type) -- Prevent duplicate applications of same type
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Core principles indexes
CREATE INDEX IF NOT EXISTS idx_core_principles_user_id ON core_principles(user_id);
CREATE INDEX IF NOT EXISTS idx_core_principles_status ON core_principles(status);
CREATE INDEX IF NOT EXISTS idx_core_principles_category ON core_principles(category);
CREATE INDEX IF NOT EXISTS idx_core_principles_source ON core_principles(source);
CREATE INDEX IF NOT EXISTS idx_core_principles_is_default ON core_principles(is_default);
CREATE INDEX IF NOT EXISTS idx_core_principles_importance ON core_principles(importance_level DESC);
CREATE INDEX IF NOT EXISTS idx_core_principles_last_applied ON core_principles(last_applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_principles_created_at ON core_principles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_principles_user_status ON core_principles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_core_principles_user_category ON core_principles(user_id, category);

-- Mapping table indexes
CREATE INDEX IF NOT EXISTS idx_cp_mapping_principle_id ON core_principle_timeline_items_mapping(principle_id);
CREATE INDEX IF NOT EXISTS idx_cp_mapping_timeline_item_id ON core_principle_timeline_items_mapping(timeline_item_id);
CREATE INDEX IF NOT EXISTS idx_cp_mapping_user_id ON core_principle_timeline_items_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_mapping_application_type ON core_principle_timeline_items_mapping(application_type);
CREATE INDEX IF NOT EXISTS idx_cp_mapping_applied_at ON core_principle_timeline_items_mapping(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_mapping_effectiveness ON core_principle_timeline_items_mapping(effectiveness_rating DESC) WHERE effectiveness_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_mapping_user_principle ON core_principle_timeline_items_mapping(user_id, principle_id);
CREATE INDEX IF NOT EXISTS idx_cp_mapping_user_timeline ON core_principle_timeline_items_mapping(user_id, timeline_item_id);

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Function to update application count when mapping is created
CREATE OR REPLACE FUNCTION update_principle_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE core_principles
    SET
      application_count = application_count + 1,
      last_applied_at = NEW.applied_at
    WHERE id = NEW.principle_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE core_principles
    SET application_count = GREATEST(0, application_count - 1)
    WHERE id = OLD.principle_id;

    -- Update last_applied_at to the most recent remaining application
    UPDATE core_principles
    SET last_applied_at = (
      SELECT MAX(applied_at)
      FROM core_principle_timeline_items_mapping
      WHERE principle_id = OLD.principle_id
    )
    WHERE id = OLD.principle_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user owns both principle and timeline item
CREATE OR REPLACE FUNCTION validate_mapping_user_ownership()
RETURNS TRIGGER AS $$
DECLARE
  principle_user_id UUID;
  timeline_user_id UUID;
BEGIN
  -- Get principle owner
  SELECT user_id INTO principle_user_id
  FROM core_principles
  WHERE id = NEW.principle_id;

  -- Get timeline item owner
  SELECT user_id INTO timeline_user_id
  FROM timeline_items
  WHERE id = NEW.timeline_item_id;

  -- Validate ownership
  IF principle_user_id != NEW.user_id OR timeline_user_id != NEW.user_id THEN
    RAISE EXCEPTION 'User can only map their own principles to their own timeline items';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Updated timestamp triggers
CREATE TRIGGER update_core_principles_updated_at
  BEFORE UPDATE ON core_principles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cp_mapping_updated_at
  BEFORE UPDATE ON core_principle_timeline_items_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Application count tracking
CREATE TRIGGER trg_update_principle_application_count
  AFTER INSERT OR DELETE ON core_principle_timeline_items_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_principle_application_count();

-- User ownership validation
CREATE TRIGGER trg_validate_mapping_ownership
  BEFORE INSERT OR UPDATE ON core_principle_timeline_items_mapping
  FOR EACH ROW
  EXECUTE FUNCTION validate_mapping_user_ownership();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE core_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_principle_timeline_items_mapping ENABLE ROW LEVEL SECURITY;

-- Core principles policies
CREATE POLICY "Users can view their own principles and defaults" ON core_principles
  FOR SELECT USING (auth.uid() = user_id OR is_default = true);

CREATE POLICY "Users can insert their own principles" ON core_principles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own principles" ON core_principles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own non-default principles" ON core_principles
  FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Mapping table policies
CREATE POLICY "Users can view their own mappings" ON core_principle_timeline_items_mapping
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mappings" ON core_principle_timeline_items_mapping
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND principle_id IN (SELECT id FROM core_principles WHERE user_id = auth.uid() OR is_default = true)
    AND timeline_item_id IN (SELECT id FROM timeline_items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own mappings" ON core_principle_timeline_items_mapping
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mappings" ON core_principle_timeline_items_mapping
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. SEED DATA - RAY DALIO'S CORE PRINCIPLES
-- =====================================================

-- Insert Ray Dalio's key principles as defaults (visible to all users)
INSERT INTO core_principles (
  id, user_id, title, description, category, is_default, source,
  trigger_questions, application_examples, importance_level
) VALUES
  -- Work Principles
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', -- System user for defaults
    'Be radically transparent',
    'Share your thoughts and encourage others to do the same. This creates an environment where the best ideas can emerge.',
    'work_principles',
    true,
    'ray_dalio',
    ARRAY['What am I not saying that could be helpful?', 'Am I being completely honest about this situation?', 'What would radical transparency look like here?'],
    ARRAY['Share concerns openly in meetings', 'Give direct feedback without sugar-coating', 'Admit mistakes immediately'],
    5
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'Embrace reality and deal with it',
    'See things as they are, not as you wish they were. Accept the truth and work with it rather than against it.',
    'life_principles',
    true,
    'ray_dalio',
    ARRAY['What is really happening here?', 'Am I seeing this situation clearly?', 'What facts am I avoiding?'],
    ARRAY['Face difficult conversations directly', 'Acknowledge failed strategies', 'Accept market realities'],
    5
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'Make decisions based on principles, not emotions',
    'Establish clear principles for decision-making and stick to them, especially when emotions run high.',
    'decision_making',
    true,
    'ray_dalio',
    ARRAY['What principle applies here?', 'Am I deciding based on emotion or logic?', 'What would my principles tell me to do?'],
    ARRAY['Use checklists for important decisions', 'Sleep on emotional decisions', 'Consult your written principles'],
    4
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'Seek out and embrace criticism',
    'Your biggest weakness is your biggest opportunity for growth. Actively seek feedback and criticism.',
    'learning',
    true,
    'ray_dalio',
    ARRAY['Who can give me honest feedback about this?', 'What am I not seeing?', 'Where might I be wrong?'],
    ARRAY['Ask for specific feedback after presentations', 'Create anonymous feedback channels', 'Thank people for criticism'],
    4
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'Get the right people in the right roles',
    'Success depends on having the right people doing what they do best. Hire for character and capability.',
    'leadership',
    true,
    'ray_dalio',
    ARRAY['Is this person in the right role?', 'What are their natural strengths?', 'Does their character align with our values?'],
    ARRAY['Match tasks to natural abilities', 'Hire for cultural fit first', 'Move people to better-suited roles'],
    4
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'Create a culture of meaningful work and meaningful relationships',
    'People need to feel their work matters and that they have genuine connections with colleagues.',
    'relationships',
    true,
    'ray_dalio',
    ARRAY['How does this work contribute to something bigger?', 'Am I building real relationships?', 'Do people feel valued?'],
    ARRAY['Connect daily tasks to company mission', 'Have regular one-on-one check-ins', 'Celebrate team achievements'],
    3
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'Learn from mistakes and failures',
    'Mistakes are inevitable and valuable. The key is to learn from them quickly and avoid repeating them.',
    'learning',
    true,
    'ray_dalio',
    ARRAY['What can I learn from this failure?', 'How can I avoid this mistake in the future?', 'What systems can prevent this?'],
    ARRAY['Conduct post-mortem analyses', 'Document lessons learned', 'Create processes to prevent repetition'],
    4
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'Think for yourself while being open-minded',
    'Develop your own views based on reasoning, but remain open to changing them when presented with better logic.',
    'decision_making',
    true,
    'ray_dalio',
    ARRAY['Have I thought this through independently?', 'What evidence contradicts my view?', 'Who disagrees and why?'],
    ARRAY['Research before forming opinions', 'Seek out opposing viewpoints', 'Change positions when logic demands it'],
    4
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to get user's active principles
CREATE OR REPLACE FUNCTION get_user_active_principles(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  importance_level INTEGER,
  application_count INTEGER,
  is_default BOOLEAN,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.title,
    cp.description,
    cp.category,
    cp.importance_level,
    cp.application_count,
    cp.is_default,
    cp.source
  FROM core_principles cp
  WHERE (cp.user_id = user_uuid OR cp.is_default = true)
    AND cp.status = 'active'
  ORDER BY cp.importance_level DESC, cp.application_count DESC, cp.title;
END;
$$;

-- Function to get principle application history for a timeline item
CREATE OR REPLACE FUNCTION get_timeline_item_principles(item_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  principle_title TEXT,
  application_type TEXT,
  reflection_notes TEXT,
  effectiveness_rating INTEGER,
  applied_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.title,
    cpm.application_type,
    cpm.reflection_notes,
    cpm.effectiveness_rating,
    cpm.applied_at
  FROM core_principle_timeline_items_mapping cpm
  JOIN core_principles cp ON cp.id = cpm.principle_id
  WHERE cpm.timeline_item_id = item_id
    AND cpm.user_id = user_uuid
  ORDER BY cpm.applied_at DESC;
END;
$$;

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE core_principles IS 'Ray Dalio principles and user customizations for decision-making guidance';
COMMENT ON TABLE core_principle_timeline_items_mapping IS 'Many-to-many mapping linking principles to timeline items for reflection';

COMMENT ON COLUMN core_principles.status IS 'Principle lifecycle: active, deprecated, archived';
COMMENT ON COLUMN core_principles.is_default IS 'True for Ray Dalios original principles, false for user customizations';
COMMENT ON COLUMN core_principles.trigger_questions IS 'Questions to ask when applying this principle';
COMMENT ON COLUMN core_principles.application_examples IS 'Examples of how to apply this principle';
COMMENT ON COLUMN core_principles.importance_level IS 'User-defined importance rating (1-5)';

COMMENT ON COLUMN core_principle_timeline_items_mapping.application_type IS 'When the principle was applied: pre_decision, post_reflection, learning, validation';
COMMENT ON COLUMN core_principle_timeline_items_mapping.effectiveness_rating IS 'How effective was applying this principle (1-5)';
COMMENT ON COLUMN core_principle_timeline_items_mapping.would_apply_again IS 'Whether user would apply this principle again in similar situations';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================