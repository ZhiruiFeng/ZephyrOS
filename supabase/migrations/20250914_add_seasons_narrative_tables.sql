-- =====================================================
-- Hybrid Seasons Narrative Migration
-- Date: 2025-09-14
-- Description: Create tables for Seasons and Episodes narrative feature
-- allowing users to live their life as a story with chapters and highlights
-- =====================================================

-- =====================================================
-- 1. CREATE SEASONS TABLE
-- =====================================================

-- Seasons represent life chapters with themes and intentions
CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  intention TEXT, -- User's intention/goal for this season
  theme TEXT NOT NULL CHECK (theme IN ('spring', 'summer', 'autumn', 'winter')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  start_date DATE,
  end_date DATE,
  opening_ritual JSONB DEFAULT '{}', -- Opening ritual data/questions
  closing_ritual JSONB DEFAULT '{}', -- Closing ritual data/summary
  metadata JSONB DEFAULT '{}', -- Additional flexible data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT seasons_date_range_valid CHECK (end_date IS NULL OR start_date <= end_date)
);

-- =====================================================
-- 2. CREATE EPISODES TABLE
-- =====================================================

-- Episodes represent weekly/periodic highlights within a season
CREATE TABLE IF NOT EXISTS episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  mood_emoji TEXT, -- Single emoji representing mood
  reflection TEXT, -- User's reflection/notes for this episode
  metadata JSONB DEFAULT '{}', -- Additional flexible data (tags, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT episodes_date_range_valid CHECK (date_range_start <= date_range_end),
  CONSTRAINT episodes_mood_emoji_length CHECK (char_length(mood_emoji) <= 4)
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Seasons indexes
CREATE INDEX IF NOT EXISTS idx_seasons_user_id ON seasons(user_id);
CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_theme ON seasons(theme);
CREATE INDEX IF NOT EXISTS idx_seasons_created_at ON seasons(created_at DESC);

-- Episodes indexes
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_episodes_date_range ON episodes(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_episodes_season_date ON episodes(season_id, date_range_start DESC);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Create or replace the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at timestamps
CREATE TRIGGER trigger_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES
-- =====================================================

-- Seasons policies - users can only access their own seasons
CREATE POLICY "Users can view their own seasons"
ON seasons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seasons"
ON seasons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seasons"
ON seasons FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seasons"
ON seasons FOR DELETE
USING (auth.uid() = user_id);

-- Episodes policies - users can only access episodes in their seasons
CREATE POLICY "Users can view their own episodes"
ON episodes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create episodes in their own seasons"
ON episodes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM seasons
    WHERE seasons.id = episode.season_id
    AND seasons.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own episodes"
ON episodes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episodes"
ON episodes FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 7. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's active season
CREATE OR REPLACE FUNCTION get_current_season(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  title TEXT,
  intention TEXT,
  theme TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.intention,
    s.theme,
    s.start_date,
    s.end_date,
    s.created_at
  FROM seasons s
  WHERE s.user_id = user_uuid
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Function to get episode count for a season
CREATE OR REPLACE FUNCTION get_season_episode_count(season_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  episode_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO episode_count
  FROM episodes
  WHERE season_id = season_uuid;

  RETURN COALESCE(episode_count, 0);
END;
$$;

-- =====================================================
-- 8. INSERT SAMPLE DATA (OPTIONAL - FOR DEVELOPMENT)
-- =====================================================

-- Sample season themes data for reference
INSERT INTO seasons (title, intention, theme, status, start_date, metadata)
VALUES
  ('New Beginnings', 'Focus on personal growth and learning new skills', 'spring', 'active', CURRENT_DATE, '{"color": "emerald"}')
ON CONFLICT (id) DO NOTHING;

-- Note: In production, this sample data should be removed or made conditional

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Grant necessary permissions
GRANT ALL ON seasons TO authenticated;
GRANT ALL ON episodes TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_season TO authenticated;
GRANT EXECUTE ON FUNCTION get_season_episode_count TO authenticated;

-- Add helpful comments
COMMENT ON TABLE seasons IS 'Life seasons/chapters with themes and intentions';
COMMENT ON TABLE episodes IS 'Highlights/reflections within seasons';
COMMENT ON COLUMN seasons.theme IS 'Visual theme: spring, summer, autumn, winter';
COMMENT ON COLUMN seasons.status IS 'Season lifecycle: active, completed, paused';
COMMENT ON COLUMN episodes.mood_emoji IS 'Single emoji representing episode mood';