-- =====================================================
-- AI Agents Schema Refactor Migration
-- Date: 2025-09-11
-- Description: Refactor AI agents schema to integrate with vendors system
-- and make features/interaction types extensible
-- =====================================================

-- =====================================================
-- 1. CREATE NEW EXTENSIBLE TABLES
-- =====================================================

-- Agent Features table (replaces enum)
CREATE TABLE IF NOT EXISTS agent_features (
  id TEXT PRIMARY KEY, -- e.g., 'brainstorming', 'coding'
  name TEXT NOT NULL, -- Display name e.g., 'Brainstorming', 'Coding Assistant'
  description TEXT,
  category TEXT, -- e.g., 'communication', 'development', 'analysis'
  icon TEXT, -- Icon identifier for UI
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interaction Types table (replaces hardcoded values)
CREATE TABLE IF NOT EXISTS interaction_types (
  id TEXT PRIMARY KEY, -- e.g., 'conversation', 'brainstorming'
  name TEXT NOT NULL, -- Display name
  description TEXT,
  category TEXT, -- e.g., 'general', 'creative', 'technical'
  icon TEXT,
  color TEXT, -- UI color identifier
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for agent features (many-to-many)
CREATE TABLE IF NOT EXISTS agent_feature_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL, -- Will reference new ai_agents table
  feature_id TEXT NOT NULL REFERENCES agent_features(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Mark primary features
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  
  UNIQUE(agent_id, feature_id)
);

-- =====================================================
-- 2. SEED INITIAL DATA
-- =====================================================

-- Insert agent features (migrating from enum)
INSERT INTO agent_features (id, name, description, category, sort_order) VALUES
  ('brainstorming', 'Brainstorming', 'Creative ideation and concept development', 'creative', 1),
  ('daily_qa', 'Daily Q&A', 'General question answering and assistance', 'general', 2),
  ('coding', 'Coding', 'Programming assistance and code generation', 'development', 3),
  ('mcp', 'MCP', 'Model Context Protocol integration', 'technical', 4),
  ('news_search', 'News Search', 'Current events and news research', 'research', 5),
  ('comet', 'Comet', 'Comet-specific functionality', 'specialized', 6),
  ('tts', 'Text-to-Speech', 'Voice synthesis and audio generation', 'audio', 7),
  ('stt', 'Speech-to-Text', 'Audio transcription and processing', 'audio', 8),
  ('companion', 'Companion', 'Personal assistant and companion features', 'personal', 9),
  ('speech', 'Speech', 'Voice interaction capabilities', 'audio', 10)
ON CONFLICT (id) DO NOTHING;

-- Insert interaction types (replacing hardcoded check constraint)
INSERT INTO interaction_types (id, name, description, category, sort_order) VALUES
  ('conversation', 'Conversation', 'General back-and-forth dialogue', 'general', 1),
  ('brainstorming', 'Brainstorming', 'Creative ideation sessions', 'creative', 2),
  ('coding', 'Coding', 'Programming and development work', 'technical', 3),
  ('research', 'Research', 'Information gathering and analysis', 'analytical', 4),
  ('creative', 'Creative', 'Creative writing and content generation', 'creative', 5),
  ('analysis', 'Analysis', 'Data analysis and interpretation', 'analytical', 6),
  ('planning', 'Planning', 'Project planning and organization', 'productivity', 7),
  ('learning', 'Learning', 'Educational and tutorial sessions', 'educational', 8),
  ('debugging', 'Debugging', 'Problem-solving and troubleshooting', 'technical', 9),
  ('other', 'Other', 'Other types of interactions', 'general', 99)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. CREATE NEW AI AGENTS TABLE (REFACTORED)
-- =====================================================

-- Rename existing table to backup
ALTER TABLE IF EXISTS ai_agents RENAME TO ai_agents_backup;

-- Create new refactored ai_agents table
CREATE TABLE ai_agents (
  -- Core identification
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  
  -- Vendor integration (replaces enum)
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  service_id TEXT REFERENCES vendor_services(id), -- Optional: specific service
  
  -- Configuration and capabilities
  model_name TEXT, -- e.g., 'gpt-4', 'claude-3-sonnet'
  system_prompt TEXT,
  configuration JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '{}', -- Structured capabilities data
  
  -- Agent metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Activity tracking
  activity_score REAL DEFAULT 0.2 CHECK (activity_score >= 0.0 AND activity_score <= 1.0),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  
  -- Status and lifecycle
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  
  -- User ownership and sharing
  user_id UUID NOT NULL DEFAULT auth.uid(),
  is_public BOOLEAN DEFAULT false, -- For future agent sharing
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(name, user_id)
);

-- =====================================================
-- 4. CREATE NEW AI INTERACTIONS TABLE (REFACTORED)
-- =====================================================

-- Rename existing table to backup
ALTER TABLE IF EXISTS ai_interactions RENAME TO ai_interactions_backup;

-- Create new refactored ai_interactions table
CREATE TABLE ai_interactions (
  -- Core identification
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationship to agent
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  
  -- Interaction details
  title TEXT NOT NULL,
  description TEXT,
  interaction_type_id TEXT NOT NULL REFERENCES interaction_types(id),
  
  -- External integration
  external_link TEXT,
  external_id TEXT, -- ID from the external service
  external_metadata JSONB DEFAULT '{}',
  
  -- Content and context
  content_preview TEXT, -- First few lines or summary
  full_content TEXT, -- Optional: store full conversation
  input_tokens INTEGER, -- Token usage tracking
  output_tokens INTEGER,
  total_cost DECIMAL(10,4), -- Cost tracking
  
  -- Organization and discovery
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}', -- Extracted keywords for search
  
  -- Quality and feedback
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
  feedback_notes TEXT,
  
  -- Time tracking
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('active', 'completed', 'archived', 'deleted')),
  
  -- User ownership
  user_id UUID NOT NULL DEFAULT auth.uid(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE INDEXES FOR NEW TABLES
-- =====================================================

-- Agent Features indexes
CREATE INDEX IF NOT EXISTS idx_agent_features_category ON agent_features(category);
CREATE INDEX IF NOT EXISTS idx_agent_features_active ON agent_features(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_features_sort ON agent_features(sort_order);

-- Interaction Types indexes
CREATE INDEX IF NOT EXISTS idx_interaction_types_category ON interaction_types(category);
CREATE INDEX IF NOT EXISTS idx_interaction_types_active ON interaction_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_interaction_types_sort ON interaction_types(sort_order);

-- Agent Feature Mappings indexes
CREATE INDEX IF NOT EXISTS idx_agent_feature_mappings_agent_id ON agent_feature_mappings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_feature_mappings_feature_id ON agent_feature_mappings(feature_id);
CREATE INDEX IF NOT EXISTS idx_agent_feature_mappings_primary ON agent_feature_mappings(agent_id, is_primary) WHERE is_primary = true;

-- New AI Agents indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_vendor ON ai_agents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_service ON ai_agents(service_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_activity_score ON ai_agents(user_id, activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agents_last_used ON ai_agents(user_id, last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_favorite ON ai_agents(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_public ON ai_agents(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_tags ON ai_agents USING GIN(tags);

-- New AI Interactions indexes  
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_agent_id ON ai_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON ai_interactions(interaction_type_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_tags ON ai_interactions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_keywords ON ai_interactions USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_external_id ON ai_interactions(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_interactions_satisfaction ON ai_interactions(user_id, satisfaction_rating DESC) WHERE satisfaction_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_interactions_status ON ai_interactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_cost ON ai_interactions(user_id, total_cost DESC) WHERE total_cost IS NOT NULL;

-- =====================================================
-- 6. DATA MIGRATION FROM OLD TABLES
-- =====================================================

-- Migrate agents data if backup tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_agents_backup') THEN
    -- Insert migrated agent data
    INSERT INTO ai_agents (
      id, name, vendor_id, notes, activity_score, last_used_at, usage_count,
      is_active, user_id, created_at, updated_at, configuration
    )
    SELECT 
      ab.id,
      ab.name,
      CASE ab.vendor::text
        WHEN 'ChatGPT' THEN 'openai'
        WHEN 'Claude' THEN 'anthropic' 
        WHEN 'Perplexity' THEN 'perplexity'
        WHEN 'ElevenLabs' THEN 'elevenlabs'
        WHEN 'Toland' THEN 'together' -- Assuming Toland maps to Together AI
        ELSE 'openai' -- Default fallback
      END as vendor_id,
      ab.notes,
      ab.activity_score,
      ab.last_used_at,
      ab.usage_count,
      ab.is_active,
      ab.user_id,
      ab.created_at,
      ab.updated_at,
      ab.configuration
    FROM ai_agents_backup ab;

    -- Migrate feature mappings from old features array
    INSERT INTO agent_feature_mappings (agent_id, feature_id, user_id)
    SELECT 
      ab.id,
      CASE feat::text
        WHEN 'Brainstorming' THEN 'brainstorming'
        WHEN 'Daily Q&A' THEN 'daily_qa'
        WHEN 'Coding' THEN 'coding'
        WHEN 'MCP' THEN 'mcp'
        WHEN 'News Search' THEN 'news_search'
        WHEN 'Comet' THEN 'comet'
        WHEN 'TTS' THEN 'tts'
        WHEN 'STT' THEN 'stt'
        WHEN 'Companion' THEN 'companion'
        WHEN 'Speech' THEN 'speech'
        ELSE 'daily_qa' -- Default fallback
      END as feature_id,
      ab.user_id
    FROM ai_agents_backup ab,
    UNNEST(ab.features) as feat
    WHERE ab.features IS NOT NULL;
  END IF;
END
$$;

-- Migrate interactions data if backup table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_interactions_backup') THEN
    INSERT INTO ai_interactions (
      id, agent_id, title, description, interaction_type_id, external_link,
      external_id, external_metadata, content_preview, tags, satisfaction_rating,
      usefulness_rating, feedback_notes, started_at, ended_at, duration_minutes,
      user_id, created_at, updated_at
    )
    SELECT 
      ib.id,
      ib.agent_id,
      ib.title,
      ib.description,
      COALESCE(ib.interaction_type, 'conversation') as interaction_type_id, -- Use existing or default
      ib.external_link,
      ib.external_id,
      ib.external_metadata,
      ib.content_preview,
      ib.tags,
      ib.satisfaction_rating,
      ib.usefulness_rating,
      ib.feedback_notes,
      ib.started_at,
      ib.ended_at,
      ib.duration_minutes,
      ib.user_id,
      ib.created_at,
      ib.updated_at
    FROM ai_interactions_backup ib
    WHERE EXISTS (SELECT 1 FROM ai_agents WHERE id = ib.agent_id); -- Only migrate if agent exists
  END IF;
END
$$;

-- =====================================================
-- 7. UPDATE FUNCTIONS FOR NEW SCHEMA
-- =====================================================

-- Updated agent activity score function
CREATE OR REPLACE FUNCTION update_agent_activity_score(agent_uuid UUID)
RETURNS REAL AS $$
DECLARE
  recent_interactions INTEGER;
  days_since_last_use INTEGER;
  calculated_score REAL;
BEGIN
  -- Count interactions in last 7 days
  SELECT COUNT(*) INTO recent_interactions
  FROM ai_interactions 
  WHERE agent_id = agent_uuid 
    AND created_at >= NOW() - INTERVAL '7 days';
  
  -- Calculate days since last use
  SELECT EXTRACT(DAYS FROM (NOW() - last_used_at)) INTO days_since_last_use
  FROM ai_agents 
  WHERE id = agent_uuid;
  
  -- Calculate activity score (0.0 to 1.0)
  calculated_score := LEAST(1.0, GREATEST(0.0, 
    (recent_interactions * 0.1) + 
    (CASE WHEN days_since_last_use IS NULL THEN 0.5
          WHEN days_since_last_use <= 1 THEN 0.8
          WHEN days_since_last_use <= 3 THEN 0.6
          WHEN days_since_last_use <= 7 THEN 0.4
          WHEN days_since_last_use <= 14 THEN 0.2
          ELSE 0.1 END)
  ));
  
  -- Update the agent
  UPDATE ai_agents 
  SET activity_score = calculated_score,
      usage_count = usage_count + recent_interactions,
      updated_at = NOW()
  WHERE id = agent_uuid;
  
  RETURN calculated_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent with features
CREATE OR REPLACE FUNCTION get_agent_with_features(agent_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  service_id TEXT,
  service_name TEXT,
  features JSONB,
  activity_score REAL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.vendor_id,
    v.name as vendor_name,
    a.service_id,
    vs.display_name as service_name,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', af.id,
          'name', af.name,
          'category', af.category,
          'is_primary', afm.is_primary
        )
      )
      FROM agent_feature_mappings afm
      JOIN agent_features af ON af.id = afm.feature_id
      WHERE afm.agent_id = a.id),
      '[]'::jsonb
    ) as features,
    a.activity_score,
    a.last_used_at,
    a.usage_count
  FROM ai_agents a
  JOIN vendors v ON v.id = a.vendor_id
  LEFT JOIN vendor_services vs ON vs.id = a.service_id
  WHERE a.id = agent_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREATE UPDATED TRIGGERS
-- =====================================================

-- Update timestamps for new tables
CREATE TRIGGER update_agent_features_updated_at 
  BEFORE UPDATE ON agent_features 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interaction_types_updated_at 
  BEFORE UPDATE ON interaction_types 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at 
  BEFORE UPDATE ON ai_agents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_interactions_updated_at 
  BEFORE UPDATE ON ai_interactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Updated trigger for agent interaction updates
CREATE OR REPLACE FUNCTION update_agent_on_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agents 
  SET 
    last_used_at = NEW.created_at,
    usage_count = usage_count + 1,
    activity_score = update_agent_activity_score(NEW.agent_id),
    updated_at = NOW()
  WHERE id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_agent_on_interaction ON ai_interactions;
CREATE TRIGGER trg_update_agent_on_interaction
  AFTER INSERT ON ai_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_on_interaction();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE agent_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feature_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Public read access for agent_features and interaction_types (metadata)
CREATE POLICY "Anyone can view active agent features" ON agent_features
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active interaction types" ON interaction_types
  FOR SELECT USING (is_active = true);

-- Agent feature mappings policies
CREATE POLICY "Users can view their own agent feature mappings" ON agent_feature_mappings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent feature mappings" ON agent_feature_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent feature mappings" ON agent_feature_mappings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent feature mappings" ON agent_feature_mappings
  FOR DELETE USING (auth.uid() = user_id);

-- AI Agents policies (updated)
CREATE POLICY "Users can view their own AI agents" ON ai_agents
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own AI agents" ON ai_agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI agents" ON ai_agents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI agents" ON ai_agents
  FOR DELETE USING (auth.uid() = user_id);

-- AI Interactions policies (updated)
CREATE POLICY "Users can view their own AI interactions" ON ai_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI interactions" ON ai_interactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND agent_id IN (SELECT id FROM ai_agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own AI interactions" ON ai_interactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI interactions" ON ai_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 10. UPDATED VIEWS
-- =====================================================

-- Drop old views if they exist
DROP VIEW IF EXISTS agent_summary;
DROP VIEW IF EXISTS recent_interactions;

-- Updated agent summary view
CREATE VIEW agent_summary AS
SELECT 
  a.id,
  a.name,
  a.description,
  a.vendor_id,
  v.name as vendor_name,
  a.service_id,
  vs.display_name as service_name,
  a.model_name,
  a.notes,
  a.activity_score,
  a.last_used_at,
  a.usage_count,
  a.is_active,
  a.is_favorite,
  a.created_at,
  a.updated_at,
  a.user_id,
  -- Aggregated features
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', af.id,
        'name', af.name,
        'category', af.category,
        'is_primary', afm.is_primary
      )
    )
    FROM agent_feature_mappings afm
    JOIN agent_features af ON af.id = afm.feature_id
    WHERE afm.agent_id = a.id),
    '[]'::jsonb
  ) as features,
  -- Recent usage stats
  COUNT(i.id) FILTER (WHERE i.created_at >= NOW() - INTERVAL '7 days') as recent_interactions,
  COUNT(i.id) FILTER (WHERE i.created_at >= NOW() - INTERVAL '30 days') as monthly_interactions,
  AVG(i.satisfaction_rating) FILTER (WHERE i.satisfaction_rating IS NOT NULL) as avg_satisfaction,
  AVG(i.usefulness_rating) FILTER (WHERE i.usefulness_rating IS NOT NULL) as avg_usefulness,
  SUM(i.total_cost) FILTER (WHERE i.created_at >= NOW() - INTERVAL '30 days') as monthly_cost
FROM ai_agents a
JOIN vendors v ON v.id = a.vendor_id
LEFT JOIN vendor_services vs ON vs.id = a.service_id
LEFT JOIN ai_interactions i ON a.id = i.agent_id
GROUP BY a.id, a.name, a.description, a.vendor_id, v.name, a.service_id, 
         vs.display_name, a.model_name, a.notes, a.activity_score, 
         a.last_used_at, a.usage_count, a.is_active, a.is_favorite,
         a.created_at, a.updated_at, a.user_id;

-- Updated recent interactions view
CREATE VIEW recent_interactions AS
SELECT 
  i.id,
  i.title,
  i.description,
  i.interaction_type_id,
  it.name as interaction_type_name,
  it.category as interaction_category,
  i.external_link,
  i.tags,
  i.satisfaction_rating,
  i.usefulness_rating,
  i.total_cost,
  i.input_tokens,
  i.output_tokens,
  i.created_at,
  i.duration_minutes,
  i.status,
  a.name as agent_name,
  a.vendor_id as agent_vendor_id,
  v.name as agent_vendor_name,
  a.service_id as agent_service_id,
  vs.display_name as agent_service_name,
  i.user_id
FROM ai_interactions i
JOIN ai_agents a ON i.agent_id = a.id
JOIN vendors v ON a.vendor_id = v.id
LEFT JOIN vendor_services vs ON a.service_id = vs.id
JOIN interaction_types it ON i.interaction_type_id = it.id
ORDER BY i.created_at DESC;

-- =====================================================
-- 11. COMMENTS
-- =====================================================

COMMENT ON TABLE agent_features IS 'Extensible agent feature definitions (replaces enum)';
COMMENT ON TABLE interaction_types IS 'Extensible interaction type definitions (replaces hardcoded values)';
COMMENT ON TABLE agent_feature_mappings IS 'Many-to-many mapping between agents and features';
COMMENT ON TABLE ai_agents IS 'Refactored AI agents table with vendor integration';
COMMENT ON TABLE ai_interactions IS 'Refactored AI interactions with extensible types';

COMMENT ON COLUMN ai_agents.vendor_id IS 'References vendors.id for extensible vendor support';
COMMENT ON COLUMN ai_agents.service_id IS 'Optional specific service within vendor';
COMMENT ON COLUMN ai_agents.model_name IS 'Specific model identifier (e.g., gpt-4, claude-3-sonnet)';
COMMENT ON COLUMN ai_agents.capabilities IS 'Structured JSON of agent capabilities and limits';
COMMENT ON COLUMN ai_interactions.interaction_type_id IS 'References interaction_types.id';
COMMENT ON COLUMN ai_interactions.input_tokens IS 'Token usage for cost tracking';
COMMENT ON COLUMN ai_interactions.total_cost IS 'Calculated cost for this interaction';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The schema is now refactored to use:
-- 1. vendors table instead of agent_vendor enum
-- 2. agent_features table instead of agent_feature enum  
-- 3. interaction_types table instead of hardcoded values
-- 4. Proper integration with user_api_keys system
-- 5. Enhanced tracking for costs, tokens, and capabilities
-- =====================================================