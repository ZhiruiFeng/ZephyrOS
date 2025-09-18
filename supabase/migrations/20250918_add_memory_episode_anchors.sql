-- =====================================================
-- Memory ↔ Episode Anchors
-- Date: 2025-09-18
-- Description: Create table memory_episode_anchors to allow memories
-- to anchor directly to episodes (seasons narrative) without requiring
-- episodes to be modeled as timeline_items.
-- =====================================================

-- Table definition
CREATE TABLE IF NOT EXISTS memory_episode_anchors (
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,

  -- Relationship semantics (align with memory_anchors)
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'context_of',
    'result_of',
    'insight_from',
    'about',
    'co_occurred',
    'triggered_by',
    'reflects_on'
  )),

  -- Time slice within the episode (optional)
  local_time_range tstzrange,

  -- Relationship strength/importance (optional)
  weight REAL DEFAULT 1.0 CHECK (weight BETWEEN 0.0 AND 10.0),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,

  PRIMARY KEY (memory_id, episode_id, relation_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_me_anchors_memory_id ON memory_episode_anchors(memory_id);
CREATE INDEX IF NOT EXISTS idx_me_anchors_episode_id ON memory_episode_anchors(episode_id);
CREATE INDEX IF NOT EXISTS idx_me_anchors_relation_type ON memory_episode_anchors(relation_type);
CREATE INDEX IF NOT EXISTS idx_me_anchors_weight ON memory_episode_anchors(weight DESC) WHERE weight > 1.0;
CREATE INDEX IF NOT EXISTS idx_me_anchors_local_time_range ON memory_episode_anchors USING GIST(local_time_range);

-- Enable RLS
ALTER TABLE memory_episode_anchors ENABLE ROW LEVEL SECURITY;

-- Policies: mirror memory_anchors, but validate episode ownership
CREATE POLICY "Users can view their own memory episode anchors"
ON memory_episode_anchors FOR SELECT
USING (
  memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own memory episode anchors"
ON memory_episode_anchors FOR INSERT
WITH CHECK (
  memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
  AND episode_id IN (SELECT id FROM episodes WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own memory episode anchors"
ON memory_episode_anchors FOR UPDATE
USING (
  memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
)
WITH CHECK (
  memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
  AND episode_id IN (SELECT id FROM episodes WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own memory episode anchors"
ON memory_episode_anchors FOR DELETE
USING (
  memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
);

-- Grants (optional convenience; RLS still applies)
GRANT ALL ON memory_episode_anchors TO authenticated;

-- Comments
COMMENT ON TABLE memory_episode_anchors IS 'Anchors linking memories to episodes (seasons narrative)';
COMMENT ON COLUMN memory_episode_anchors.relation_type IS 'Semantics of the memory↔episode relationship';
COMMENT ON COLUMN memory_episode_anchors.local_time_range IS 'Optional time slice within the episode''s duration';

-- Migration complete
-- =====================================================

