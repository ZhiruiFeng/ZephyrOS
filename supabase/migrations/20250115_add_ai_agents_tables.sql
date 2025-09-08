-- Migration: Add AI Agents and Interactions tables
-- Date: 2025-01-15
-- Description: Add database tables to support the External AI Panel module

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- AI Agent vendors enum type
DO $$ BEGIN
  CREATE TYPE agent_vendor AS ENUM (
    'ChatGPT',
    'Claude', 
    'Perplexity',
    'ElevenLabs',
    'Toland',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AI Agent features enum type
DO $$ BEGIN
  CREATE TYPE agent_feature AS ENUM (
    'Brainstorming',
    'Daily Q&A',
    'Coding',
    'MCP',
    'News Search',
    'Comet',
    'TTS',
    'STT',
    'Companion',
    'Speech'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
  -- Core identification
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic information
  name TEXT NOT NULL,
  vendor agent_vendor NOT NULL,
  features agent_feature[] DEFAULT '{}',
  notes TEXT,
  
  -- Activity tracking
  activity_score REAL DEFAULT 0.2 CHECK (activity_score >= 0.0 AND activity_score <= 1.0),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  
  -- Configuration and metadata
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User ownership
  user_id UUID NOT NULL DEFAULT auth.uid(),
  
  -- Constraints
  UNIQUE(name, user_id)
);

-- AI Interactions table
CREATE TABLE IF NOT EXISTS ai_interactions (
  -- Core identification
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationship to agent
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  
  -- Interaction details
  title TEXT NOT NULL,
  description TEXT,
  interaction_type TEXT DEFAULT 'conversation' CHECK (interaction_type IN (
    'conversation', 'brainstorming', 'coding', 'research', 'creative', 'analysis', 'other'
  )),
  
  -- External links and references
  external_link TEXT,
  external_id TEXT, -- ID from the external service
  external_metadata JSONB DEFAULT '{}',
  
  -- Content and context
  content_preview TEXT, -- First few lines or summary
  tags TEXT[] DEFAULT '{}',
  
  -- Quality and feedback
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
  feedback_notes TEXT,
  
  -- Time tracking
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User ownership
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Daily usage statistics
CREATE TABLE IF NOT EXISTS ai_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Time period
  user_id UUID NOT NULL DEFAULT auth.uid(),
  date DATE NOT NULL,
  
  -- Agent usage counts
  total_interactions INTEGER DEFAULT 0,
  unique_agents_used INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  
  -- Feature usage breakdown
  feature_usage JSONB DEFAULT '{}', -- {feature: count}
  vendor_usage JSONB DEFAULT '{}',  -- {vendor: count}
  
  -- Quality metrics
  avg_satisfaction REAL,
  avg_usefulness REAL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, date)
);

-- Agent-specific configurations and preferences
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationship to agent
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  
  -- Configuration details
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  config_type TEXT DEFAULT 'user_preference' CHECK (config_type IN (
    'user_preference', 'system_setting', 'integration_config', 'custom_prompt'
  )),
  
  -- Metadata
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User ownership
  user_id UUID NOT NULL DEFAULT auth.uid(),
  
  -- Constraints
  UNIQUE(agent_id, config_key, user_id)
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- AI Agents indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_vendor ON ai_agents(vendor);
CREATE INDEX IF NOT EXISTS idx_ai_agents_activity_score ON ai_agents(user_id, activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agents_last_used ON ai_agents(user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agents_features ON ai_agents USING GIN(features);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(user_id, is_active) WHERE is_active = true;

-- AI Interactions indexes
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_agent_id ON ai_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON ai_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_tags ON ai_interactions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_external_id ON ai_interactions(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_interactions_satisfaction ON ai_interactions(user_id, satisfaction_rating DESC) WHERE satisfaction_rating IS NOT NULL;

-- AI Usage Stats indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_user_date ON ai_usage_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_date ON ai_usage_stats(date);

-- AI Agent Configs indexes
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_agent_id ON ai_agent_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_user_id ON ai_agent_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_key ON ai_agent_configs(config_key);

-- =====================================================
-- 4. CREATE FUNCTIONS
-- =====================================================

-- Update agent activity score based on recent usage
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
      last_used_at = CASE WHEN recent_interactions > 0 THEN NOW() ELSE last_used_at END,
      usage_count = usage_count + recent_interactions
  WHERE id = agent_uuid;
  
  RETURN calculated_score;
END;
$$ LANGUAGE plpgsql;

-- Update daily usage statistics
CREATE OR REPLACE FUNCTION update_daily_usage_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  agent_record RECORD;
  feature_usage JSONB := '{}';
  vendor_usage JSONB := '{}';
  total_interactions INTEGER;
  total_duration INTEGER;
  avg_satisfaction REAL;
  avg_usefulness REAL;
BEGIN
  -- Process each user
  FOR user_record IN SELECT DISTINCT user_id FROM ai_interactions WHERE DATE(created_at) = target_date
  LOOP
    -- Calculate usage statistics for this user and date
    SELECT 
      COUNT(*) as interactions,
      COALESCE(SUM(duration_minutes), 0) as duration,
      AVG(satisfaction_rating) as satisfaction,
      AVG(usefulness_rating) as usefulness
    INTO total_interactions, total_duration, avg_satisfaction, avg_usefulness
    FROM ai_interactions 
    WHERE user_id = user_record.user_id 
      AND DATE(created_at) = target_date;
    
    -- Build feature usage JSON
    feature_usage := '{}';
    FOR agent_record IN 
      SELECT a.features, COUNT(*) as usage_count
      FROM ai_agents a
      JOIN ai_interactions i ON a.id = i.agent_id
      WHERE i.user_id = user_record.user_id 
        AND DATE(i.created_at) = target_date
      GROUP BY a.features
    LOOP
      -- Add each feature to the JSON
      FOR i IN 1..array_length(agent_record.features, 1)
      LOOP
        feature_usage := feature_usage || jsonb_build_object(
          agent_record.features[i]::text, 
          COALESCE((feature_usage->>agent_record.features[i]::text)::integer, 0) + agent_record.usage_count
        );
      END LOOP;
    END LOOP;
    
    -- Build vendor usage JSON
    vendor_usage := '{}';
    FOR agent_record IN 
      SELECT a.vendor, COUNT(*) as usage_count
      FROM ai_agents a
      JOIN ai_interactions i ON a.id = i.agent_id
      WHERE i.user_id = user_record.user_id 
        AND DATE(i.created_at) = target_date
      GROUP BY a.vendor
    LOOP
      vendor_usage := vendor_usage || jsonb_build_object(
        agent_record.vendor::text, 
        agent_record.usage_count
      );
    END LOOP;
    
    -- Insert or update usage stats
    INSERT INTO ai_usage_stats (
      user_id, date, total_interactions, unique_agents_used, 
      total_duration_minutes, feature_usage, vendor_usage,
      avg_satisfaction, avg_usefulness
    ) VALUES (
      user_record.user_id, target_date, total_interactions,
      (SELECT COUNT(DISTINCT agent_id) FROM ai_interactions 
       WHERE user_id = user_record.user_id AND DATE(created_at) = target_date),
      total_duration, feature_usage, vendor_usage,
      avg_satisfaction, avg_usefulness
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
      total_interactions = EXCLUDED.total_interactions,
      unique_agents_used = EXCLUDED.unique_agents_used,
      total_duration_minutes = EXCLUDED.total_duration_minutes,
      feature_usage = EXCLUDED.feature_usage,
      vendor_usage = EXCLUDED.vendor_usage,
      avg_satisfaction = EXCLUDED.avg_satisfaction,
      avg_usefulness = EXCLUDED.avg_usefulness,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Get agent usage summary
CREATE OR REPLACE FUNCTION get_agent_usage_summary(
  agent_uuid UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_interactions BIGINT,
  total_duration_minutes BIGINT,
  avg_satisfaction REAL,
  avg_usefulness REAL,
  most_used_features TEXT[],
  recent_interactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_interactions,
    COALESCE(SUM(i.duration_minutes), 0) as total_duration_minutes,
    AVG(i.satisfaction_rating) as avg_satisfaction,
    AVG(i.usefulness_rating) as avg_usefulness,
    (SELECT array_agg(DISTINCT feature ORDER BY feature) 
     FROM unnest(a.features) as feature) as most_used_features,
    COUNT(*) FILTER (WHERE i.created_at >= NOW() - (days_back || ' days')::INTERVAL) as recent_interactions
  FROM ai_agents a
  LEFT JOIN ai_interactions i ON a.id = i.agent_id
  WHERE a.id = agent_uuid
  GROUP BY a.id, a.features;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Update timestamps
CREATE TRIGGER update_ai_agents_updated_at 
  BEFORE UPDATE ON ai_agents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_interactions_updated_at 
  BEFORE UPDATE ON ai_interactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_usage_stats_updated_at
  BEFORE UPDATE ON ai_usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_configs_updated_at
  BEFORE UPDATE ON ai_agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update agent activity when interaction is created
CREATE OR REPLACE FUNCTION update_agent_on_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update agent's last_used_at and usage_count
  UPDATE ai_agents 
  SET 
    last_used_at = NEW.created_at,
    usage_count = usage_count + 1,
    activity_score = update_agent_activity_score(NEW.agent_id)
  WHERE id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_on_interaction
  AFTER INSERT ON ai_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_on_interaction();

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;

-- AI Agents policies
CREATE POLICY "Users can view their own AI agents" ON ai_agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI agents" ON ai_agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI agents" ON ai_agents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI agents" ON ai_agents
  FOR DELETE USING (auth.uid() = user_id);

-- AI Interactions policies
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

-- AI Usage Stats policies
CREATE POLICY "Users can view their own usage stats" ON ai_usage_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage stats" ON ai_usage_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage stats" ON ai_usage_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own usage stats" ON ai_usage_stats
  FOR DELETE USING (auth.uid() = user_id);

-- AI Agent Configs policies
CREATE POLICY "Users can view their own agent configs" ON ai_agent_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent configs" ON ai_agent_configs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND agent_id IN (SELECT id FROM ai_agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own agent configs" ON ai_agent_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent configs" ON ai_agent_configs
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. CREATE VIEWS
-- =====================================================

-- Agent summary view with usage statistics
CREATE OR REPLACE VIEW agent_summary AS
SELECT 
  a.id,
  a.name,
  a.vendor,
  a.features,
  a.notes,
  a.activity_score,
  a.last_used_at,
  a.usage_count,
  a.is_active,
  a.created_at,
  a.updated_at,
  a.user_id,
  -- Recent usage stats
  COUNT(i.id) FILTER (WHERE i.created_at >= NOW() - INTERVAL '7 days') as recent_interactions,
  COUNT(i.id) FILTER (WHERE i.created_at >= NOW() - INTERVAL '30 days') as monthly_interactions,
  AVG(i.satisfaction_rating) FILTER (WHERE i.satisfaction_rating IS NOT NULL) as avg_satisfaction,
  AVG(i.usefulness_rating) FILTER (WHERE i.usefulness_rating IS NOT NULL) as avg_usefulness
FROM ai_agents a
LEFT JOIN ai_interactions i ON a.id = i.agent_id
GROUP BY a.id, a.name, a.vendor, a.features, a.notes, a.activity_score, 
         a.last_used_at, a.usage_count, a.is_active, a.created_at, a.updated_at, a.user_id;

-- Recent interactions view
CREATE OR REPLACE VIEW recent_interactions AS
SELECT 
  i.id,
  i.title,
  i.description,
  i.interaction_type,
  i.external_link,
  i.tags,
  i.satisfaction_rating,
  i.usefulness_rating,
  i.created_at,
  i.duration_minutes,
  a.name as agent_name,
  a.vendor as agent_vendor,
  a.features as agent_features,
  i.user_id
FROM ai_interactions i
JOIN ai_agents a ON i.agent_id = a.id
ORDER BY i.created_at DESC;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
