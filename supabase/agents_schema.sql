-- =====================================================
-- AI Agents System - Consolidated Schema
-- Version: 2.0.0
-- Created: 2025-09-11
-- Description: Complete AI agents system with vendor integration,
--              extensible features, API key management, and analytics
-- =====================================================

-- =====================================================
-- 1. VENDORS & API KEYS SYSTEM
-- =====================================================

-- Vendors configuration table for extensible vendor support
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY, -- e.g., 'openai', 'anthropic'
  name TEXT NOT NULL, -- e.g., 'OpenAI', 'Anthropic'
  description TEXT,
  auth_type TEXT NOT NULL DEFAULT 'api_key' CHECK (auth_type IN ('api_key', 'oauth', 'bearer_token')),
  base_url TEXT, -- API base URL
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services within vendors (e.g., gpt-4, whisper for OpenAI)
CREATE TABLE IF NOT EXISTS vendor_services (
  id TEXT PRIMARY KEY, -- e.g., 'openai_gpt4', 'openai_whisper'
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL, -- e.g., 'gpt-4', 'whisper'
  display_name TEXT NOT NULL, -- e.g., 'GPT-4', 'Whisper'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vendor_id, service_name)
);

-- API Keys table for storing user's third-party service keys
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vendor and service references (extensible)
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  service_id TEXT REFERENCES vendor_services(id), -- NULL means vendor-wide key
  
  -- Encrypted key storage
  encrypted_key TEXT NOT NULL,
  key_preview TEXT, -- Last 4 characters for UI display
  
  -- Metadata
  display_name TEXT, -- User-friendly name
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, vendor_id, service_id)
);

-- =====================================================
-- 2. EXTENSIBLE FEATURES & INTERACTION TYPES
-- =====================================================

-- Agent Features table (replaces enum for extensibility)
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

-- =====================================================
-- 3. AI AGENTS SYSTEM
-- =====================================================

-- AI Agents table (refactored with vendor integration)
CREATE TABLE IF NOT EXISTS ai_agents (
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

-- Junction table for agent features (many-to-many)
CREATE TABLE IF NOT EXISTS agent_feature_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES agent_features(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Mark primary features
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  
  UNIQUE(agent_id, feature_id)
);

-- AI Interactions table (refactored with extensible types)
CREATE TABLE IF NOT EXISTS ai_interactions (
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
  
  -- Cost tracking
  total_cost DECIMAL(10,4) DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  
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
-- 4. SEED DATA
-- =====================================================

-- Insert initial vendors
INSERT INTO vendors (id, name, description, auth_type, base_url) VALUES
  ('openai', 'OpenAI', 'GPT models, DALL-E, Whisper', 'api_key', 'https://api.openai.com/v1'),
  ('anthropic', 'Anthropic', 'Claude models', 'api_key', 'https://api.anthropic.com'),
  ('google', 'Google AI', 'Gemini, PaLM models', 'api_key', 'https://generativelanguage.googleapis.com'),
  ('azure', 'Azure OpenAI', 'Azure-hosted OpenAI models', 'api_key', null),
  ('replicate', 'Replicate', 'Open source AI models', 'api_key', 'https://api.replicate.com'),
  ('together', 'Together AI', 'Open source LLMs', 'api_key', 'https://api.together.xyz'),
  ('elevenlabs', 'ElevenLabs', 'Voice synthesis and cloning', 'api_key', 'https://api.elevenlabs.io'),
  ('stability', 'Stability AI', 'Stable Diffusion models', 'api_key', 'https://api.stability.ai'),
  ('cohere', 'Cohere', 'Command models', 'api_key', 'https://api.cohere.ai'),
  ('huggingface', 'Hugging Face', 'Open source models hub', 'api_key', 'https://api-inference.huggingface.co'),
  ('perplexity', 'Perplexity', 'Search-powered AI models', 'api_key', 'https://api.perplexity.ai'),
  ('cursor', 'Cursor', 'AI-powered code editor with model integration', 'api_key', 'https://api.cursor.sh')
ON CONFLICT (id) DO NOTHING;

-- Insert initial services
INSERT INTO vendor_services (id, vendor_id, service_name, display_name, description) VALUES
  -- OpenAI services
  ('openai_gpt4', 'openai', 'gpt-4', 'GPT-4', 'Latest GPT-4 model'),
  ('openai_gpt4_turbo', 'openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'Faster GPT-4 variant'),
  ('openai_gpt35', 'openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient model'),
  ('openai_whisper', 'openai', 'whisper', 'Whisper', 'Speech-to-text model'),
  ('openai_dalle', 'openai', 'dall-e-3', 'DALL-E 3', 'Image generation model'),
  
  -- Anthropic services
  ('anthropic_claude3_opus', 'anthropic', 'claude-3-opus', 'Claude 3 Opus', 'Most capable Claude model'),
  ('anthropic_claude3_sonnet', 'anthropic', 'claude-3-sonnet', 'Claude 3 Sonnet', 'Balanced Claude model'),
  ('anthropic_claude3_haiku', 'anthropic', 'claude-3-haiku', 'Claude 3 Haiku', 'Fastest Claude model'),
  
  -- Google services
  ('google_gemini_pro', 'google', 'gemini-pro', 'Gemini Pro', 'Google multimodal AI'),
  ('google_gemini_ultra', 'google', 'gemini-ultra', 'Gemini Ultra', 'Most capable Gemini model'),
  
  -- ElevenLabs services
  ('elevenlabs_tts', 'elevenlabs', 'text-to-speech', 'Text-to-Speech', 'Voice synthesis'),
  ('elevenlabs_voice_clone', 'elevenlabs', 'voice-cloning', 'Voice Cloning', 'Custom voice creation'),
  
  -- Stability AI services
  ('stability_sd', 'stability', 'stable-diffusion', 'Stable Diffusion', 'Image generation'),
  
  -- Perplexity services
  ('perplexity_sonar', 'perplexity', 'sonar', 'Perplexity Sonar', 'Search-powered responses')
ON CONFLICT (id) DO NOTHING;

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
  ('speech', 'Speech', 'Voice interaction capabilities', 'audio', 10),
  ('image_gen', 'Image Generation', 'AI-powered image creation', 'creative', 11),
  ('analysis', 'Analysis', 'Data analysis and insights', 'analytical', 12),
  ('writing', 'Writing', 'Content creation and editing assistance', 'creative', 13),
  ('research', 'Research', 'Information gathering and synthesis', 'research', 14),
  ('translation', 'Translation', 'Language translation services', 'language', 15)
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
  ('review', 'Review', 'Code or content review sessions', 'technical', 10),
  ('consultation', 'Consultation', 'Expert advice and recommendations', 'professional', 11),
  ('other', 'Other', 'Other types of interactions', 'general', 99)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active) WHERE is_active = true;

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_vendor_services_vendor ON vendor_services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_services_active ON vendor_services(vendor_id, is_active) WHERE is_active = true;

-- User API keys indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_vendor ON user_api_keys(vendor_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_vendor ON user_api_keys(user_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_api_keys_last_used ON user_api_keys(user_id, last_used_at DESC) WHERE last_used_at IS NOT NULL;

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

-- AI Agents indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_vendor ON ai_agents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_service ON ai_agents(service_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_activity_score ON ai_agents(user_id, activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agents_last_used ON ai_agents(user_id, last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_favorite ON ai_agents(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_public ON ai_agents(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_tags ON ai_agents USING GIN(tags);

-- AI Interactions indexes  
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

-- AI Usage Stats indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_user_date ON ai_usage_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_date ON ai_usage_stats(date);

-- AI Agent Configs indexes
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_agent_id ON ai_agent_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_user_id ON ai_agent_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_key ON ai_agent_configs(config_key);

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

-- Function to add new vendor (admin only)
CREATE OR REPLACE FUNCTION add_vendor(
  p_id TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_auth_type TEXT DEFAULT 'api_key',
  p_base_url TEXT DEFAULT NULL
) RETURNS vendors AS $$
DECLARE
  new_vendor vendors;
BEGIN
  INSERT INTO vendors (id, name, description, auth_type, base_url)
  VALUES (p_id, p_name, p_description, p_auth_type, p_base_url)
  RETURNING * INTO new_vendor;
  
  RETURN new_vendor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add new service to vendor
CREATE OR REPLACE FUNCTION add_vendor_service(
  p_vendor_id TEXT,
  p_service_name TEXT,
  p_display_name TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS vendor_services AS $$
DECLARE
  new_service vendor_services;
  service_id TEXT;
BEGIN
  -- Generate service ID
  service_id := p_vendor_id || '_' || replace(lower(p_service_name), '-', '_');
  
  INSERT INTO vendor_services (id, vendor_id, service_name, display_name, description)
  VALUES (service_id, p_vendor_id, p_service_name, p_display_name, p_description)
  RETURNING * INTO new_service;
  
  RETURN new_service;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's API key for vendor/service
CREATE OR REPLACE FUNCTION get_user_api_key(
  p_user_id UUID,
  p_vendor_id TEXT,
  p_service_id TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  encrypted_key TEXT,
  display_name TEXT,
  vendor_name TEXT,
  service_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uak.id,
    uak.encrypted_key,
    uak.display_name,
    v.name as vendor_name,
    vs.display_name as service_name
  FROM user_api_keys uak
  JOIN vendors v ON v.id = uak.vendor_id
  LEFT JOIN vendor_services vs ON vs.id = uak.service_id
  WHERE uak.user_id = p_user_id 
    AND uak.vendor_id = p_vendor_id 
    AND (p_service_id IS NULL OR uak.service_id = p_service_id)
    AND uak.is_active = true
    AND v.is_active = true
    AND (vs.id IS NULL OR vs.is_active = true)
  ORDER BY uak.service_id NULLS LAST -- Prefer service-specific keys over vendor-wide
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_used_at when key is accessed
CREATE OR REPLACE FUNCTION update_api_key_last_used(
  p_user_id UUID,
  p_vendor_id TEXT,
  p_service_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE user_api_keys 
  SET last_used_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id 
    AND vendor_id = p_vendor_id 
    AND (p_service_id IS NULL OR service_id = p_service_id)
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate agent activity score based on recent usage (without updating)
CREATE OR REPLACE FUNCTION calculate_agent_activity_score(agent_uuid UUID)
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
  
  RETURN calculated_score;
END;
$$ LANGUAGE plpgsql;

-- Update agent activity score based on recent usage
CREATE OR REPLACE FUNCTION update_agent_activity_score(agent_uuid UUID)
RETURNS REAL AS $$
DECLARE
  calculated_score REAL;
BEGIN
  -- Use the new calculation function
  calculated_score := calculate_agent_activity_score(agent_uuid);
  
  -- Update the agent
  UPDATE ai_agents 
  SET activity_score = calculated_score,
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
  total_cost DECIMAL(10,4);
  total_input_tokens INTEGER;
  total_output_tokens INTEGER;
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
      COALESCE(SUM(total_cost), 0) as cost,
      COALESCE(SUM(input_tokens), 0) as input_tokens,
      COALESCE(SUM(output_tokens), 0) as output_tokens,
      AVG(satisfaction_rating) as satisfaction,
      AVG(usefulness_rating) as usefulness
    INTO total_interactions, total_duration, total_cost, total_input_tokens, total_output_tokens, avg_satisfaction, avg_usefulness
    FROM ai_interactions 
    WHERE user_id = user_record.user_id 
      AND DATE(created_at) = target_date;
    
    -- Build feature usage JSON
    feature_usage := '{}';
    FOR agent_record IN 
      SELECT af.id as feature_id, af.name as feature_name, COUNT(*) as usage_count
      FROM ai_agents a
      JOIN ai_interactions i ON a.id = i.agent_id
      JOIN agent_feature_mappings afm ON a.id = afm.agent_id
      JOIN agent_features af ON af.id = afm.feature_id
      WHERE i.user_id = user_record.user_id 
        AND DATE(i.created_at) = target_date
      GROUP BY af.id, af.name
    LOOP
      feature_usage := feature_usage || jsonb_build_object(
        agent_record.feature_id, 
        agent_record.usage_count
      );
    END LOOP;
    
    -- Build vendor usage JSON
    vendor_usage := '{}';
    FOR agent_record IN 
      SELECT a.vendor_id, COUNT(*) as usage_count
      FROM ai_agents a
      JOIN ai_interactions i ON a.id = i.agent_id
      WHERE i.user_id = user_record.user_id 
        AND DATE(i.created_at) = target_date
      GROUP BY a.vendor_id
    LOOP
      vendor_usage := vendor_usage || jsonb_build_object(
        agent_record.vendor_id, 
        agent_record.usage_count
      );
    END LOOP;
    
    -- Insert or update usage stats
    INSERT INTO ai_usage_stats (
      user_id, date, total_interactions, unique_agents_used, 
      total_duration_minutes, feature_usage, vendor_usage,
      total_cost, total_input_tokens, total_output_tokens,
      avg_satisfaction, avg_usefulness
    ) VALUES (
      user_record.user_id, target_date, total_interactions,
      (SELECT COUNT(DISTINCT agent_id) FROM ai_interactions 
       WHERE user_id = user_record.user_id AND DATE(created_at) = target_date),
      total_duration, feature_usage, vendor_usage,
      total_cost, total_input_tokens, total_output_tokens,
      avg_satisfaction, avg_usefulness
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
      total_interactions = EXCLUDED.total_interactions,
      unique_agents_used = EXCLUDED.unique_agents_used,
      total_duration_minutes = EXCLUDED.total_duration_minutes,
      feature_usage = EXCLUDED.feature_usage,
      vendor_usage = EXCLUDED.vendor_usage,
      total_cost = EXCLUDED.total_cost,
      total_input_tokens = EXCLUDED.total_input_tokens,
      total_output_tokens = EXCLUDED.total_output_tokens,
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
  total_cost DECIMAL(10,4),
  avg_satisfaction REAL,
  avg_usefulness REAL,
  features JSONB,
  recent_interactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_interactions,
    COALESCE(SUM(i.duration_minutes), 0) as total_duration_minutes,
    COALESCE(SUM(i.total_cost), 0) as total_cost,
    AVG(i.satisfaction_rating) as avg_satisfaction,
    AVG(i.usefulness_rating) as avg_usefulness,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', af.id,
          'name', af.name,
          'category', af.category
        )
      )
      FROM agent_feature_mappings afm
      JOIN agent_features af ON af.id = afm.feature_id
      WHERE afm.agent_id = a.id),
      '[]'::jsonb
    ) as features,
    COUNT(*) FILTER (WHERE i.created_at >= NOW() - (days_back || ' days')::INTERVAL) as recent_interactions
  FROM ai_agents a
  LEFT JOIN ai_interactions i ON a.id = i.agent_id
  WHERE a.id = agent_uuid
  GROUP BY a.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Create or update the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated timestamp triggers
CREATE TRIGGER update_vendors_updated_at 
  BEFORE UPDATE ON vendors 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_services_updated_at 
  BEFORE UPDATE ON vendor_services 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at 
  BEFORE UPDATE ON user_api_keys 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_ai_usage_stats_updated_at
  BEFORE UPDATE ON ai_usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_configs_updated_at
  BEFORE UPDATE ON ai_agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated trigger for agent interaction updates (fixed to avoid trigger conflicts)
CREATE OR REPLACE FUNCTION update_agent_on_interaction()
RETURNS TRIGGER AS $$
DECLARE
  new_activity_score REAL;
BEGIN
  -- Calculate the new activity score
  new_activity_score := calculate_agent_activity_score(NEW.agent_id);
  
  -- Update the agent with all necessary fields in a single operation
  UPDATE ai_agents 
  SET 
    last_used_at = NEW.created_at,
    usage_count = usage_count + 1,
    activity_score = new_activity_score
    -- Note: We don't manually set updated_at here to avoid trigger conflicts
    -- The BEFORE UPDATE trigger will handle updated_at automatically
  WHERE id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_on_interaction
  AFTER INSERT ON ai_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_on_interaction();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on user_api_keys only (vendors/services are public metadata)
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_api_keys
CREATE POLICY "Users can view their own API keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Public read access for vendors and services (metadata only)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vendors" ON vendors
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active services" ON vendor_services
  FOR SELECT USING (is_active = true);

-- Enable RLS on new tables
ALTER TABLE agent_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feature_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;

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
-- 9. VIEWS FOR COMMON QUERIES
-- =====================================================

-- Updated agent summary view
CREATE OR REPLACE VIEW agent_summary AS
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
CREATE OR REPLACE VIEW recent_interactions AS
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
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE vendors IS 'Supported third-party AI/API vendors';
COMMENT ON TABLE vendor_services IS 'Specific services within each vendor';
COMMENT ON TABLE user_api_keys IS 'User-owned encrypted API keys for third-party services';
COMMENT ON TABLE agent_features IS 'Extensible agent feature definitions (replaces enum)';
COMMENT ON TABLE interaction_types IS 'Extensible interaction type definitions (replaces hardcoded values)';
COMMENT ON TABLE agent_feature_mappings IS 'Many-to-many mapping between agents and features';
COMMENT ON TABLE ai_agents IS 'AI agents with vendor integration and extensible features';
COMMENT ON TABLE ai_interactions IS 'AI interactions with cost tracking and extensible types';
COMMENT ON TABLE ai_usage_stats IS 'Daily usage statistics with cost and token tracking';
COMMENT ON TABLE ai_agent_configs IS 'Agent-specific configurations and preferences';

COMMENT ON COLUMN vendors.auth_type IS 'Authentication method: api_key, oauth, bearer_token';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'AES-256 encrypted API key';
COMMENT ON COLUMN user_api_keys.key_preview IS 'Last 4 characters for UI identification';
COMMENT ON COLUMN user_api_keys.service_id IS 'NULL = vendor-wide key, otherwise service-specific';
COMMENT ON COLUMN ai_agents.vendor_id IS 'References vendors.id for extensible vendor support';
COMMENT ON COLUMN ai_agents.service_id IS 'Optional specific service within vendor';
COMMENT ON COLUMN ai_agents.model_name IS 'Specific model identifier (e.g., gpt-4, claude-3-sonnet)';
COMMENT ON COLUMN ai_agents.capabilities IS 'Structured JSON of agent capabilities and limits';
COMMENT ON COLUMN ai_interactions.interaction_type_id IS 'References interaction_types.id';
COMMENT ON COLUMN ai_interactions.input_tokens IS 'Token usage for cost tracking';
COMMENT ON COLUMN ai_interactions.total_cost IS 'Calculated cost for this interaction';

-- =====================================================
-- 11. AI TASKS SYSTEM
-- =====================================================

-- AI Tasks table for associating tasks with agents
CREATE TABLE IF NOT EXISTS ai_tasks (
  -- Core identification
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationships (foreign keys, non-null)
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE RESTRICT,
  
  -- Task assignment core information
  objective TEXT NOT NULL, -- Task objective
  deliverables TEXT, -- Deliverable outcomes
  context TEXT, -- Task context
  acceptance_criteria TEXT, -- Acceptance criteria
  
  -- Task type (foreign key to agent_features)
  task_type TEXT NOT NULL REFERENCES agent_features(id),
  
  -- Dependencies
  dependencies UUID[] DEFAULT '{}', -- Array of other task IDs
  
  -- Execution mode
  mode TEXT NOT NULL DEFAULT 'plan_only' CHECK (mode IN (
    'plan_only',      -- Plan only (no actions)
    'dry_run',        -- Dry-run (simulate actions, estimate cost/time)
    'execute'         -- Execute (actions gated by approvals)
  )),
  
  -- Guardrails settings (JSONB structure)
  guardrails JSONB DEFAULT '{
    "costCapUSD": null,
    "timeCapMin": null,
    "requiresHumanApproval": true,
    "dataScopes": []
  }' NOT NULL,
  
  -- Metadata (JSONB structure)
  metadata JSONB DEFAULT '{
    "priority": "medium",
    "tags": []
  }' NOT NULL,
  
  -- Status management
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',        -- Waiting to start
    'assigned',       -- Assigned to agent
    'in_progress',    -- In execution
    'paused',         -- Paused
    'completed',      -- Completed
    'failed',         -- Failed
    'cancelled'       -- Cancelled
  )),
  
  -- History records (JSONB array)
  history JSONB DEFAULT '[]' NOT NULL,
  
  -- Execution results and cost tracking
  execution_result JSONB DEFAULT '{}',
  estimated_cost_usd DECIMAL(10,4),
  actual_cost_usd DECIMAL(10,4),
  estimated_duration_min INTEGER,
  actual_duration_min INTEGER,

  -- Executor workspace association
  is_local_task BOOLEAN DEFAULT false,
  executor_workspace_id UUID REFERENCES executor_agent_workspaces(id) ON DELETE SET NULL,
  
  -- Timestamps
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_at TIMESTAMP WITH TIME ZONE,
  
  -- User ownership
  user_id UUID NOT NULL DEFAULT auth.uid(),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(task_id, agent_id) -- Prevent same task assigned to same agent multiple times
);

-- =====================================================
-- 12. AI TASKS INDEXES
-- =====================================================

-- Core query indexes
CREATE INDEX IF NOT EXISTS idx_ai_tasks_task_id ON ai_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_agent_id ON ai_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_id ON ai_tasks(user_id);

-- Status and time related indexes
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_assigned_at ON ai_tasks(user_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_due_at ON ai_tasks(user_id, due_at) WHERE due_at IS NOT NULL;

-- Composite query indexes
CREATE INDEX IF NOT EXISTS idx_ai_tasks_agent_status ON ai_tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_task_type ON ai_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_mode ON ai_tasks(mode);

-- JSONB field indexes
CREATE INDEX IF NOT EXISTS idx_ai_tasks_metadata_priority ON ai_tasks USING GIN((metadata->'priority'));
CREATE INDEX IF NOT EXISTS idx_ai_tasks_metadata_tags ON ai_tasks USING GIN((metadata->'tags'));
CREATE INDEX IF NOT EXISTS idx_ai_tasks_guardrails ON ai_tasks USING GIN(guardrails);

-- Executor workspace association indexes
CREATE INDEX IF NOT EXISTS idx_ai_tasks_executor_workspace ON ai_tasks(executor_workspace_id) WHERE executor_workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_tasks_is_local ON ai_tasks(is_local_task) WHERE is_local_task = true;

-- =====================================================
-- 13. AI TASKS FUNCTIONS
-- =====================================================

-- Get AI task details with related task and agent information
CREATE OR REPLACE FUNCTION get_ai_task_details(p_ai_task_id UUID)
RETURNS TABLE (
  ai_task_id UUID,
  task_title TEXT,
  task_status TEXT,
  agent_name TEXT,
  agent_vendor TEXT,
  objective TEXT,
  status TEXT,
  mode TEXT,
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    at.id,
    t.title,
    t.status,
    a.name,
    v.name,
    at.objective,
    at.status,
    at.mode,
    at.estimated_cost_usd,
    at.actual_cost_usd
  FROM ai_tasks at
  JOIN tasks t ON t.id = at.task_id
  JOIN ai_agents a ON a.id = at.agent_id
  JOIN vendors v ON v.id = a.vendor_id
  WHERE at.id = p_ai_task_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. AI TASKS TRIGGERS
-- =====================================================

-- Automatically set task.is_ai_task = true when creating ai_task
CREATE OR REPLACE FUNCTION set_task_as_ai_task()
RETURNS TRIGGER AS $$
BEGIN
  -- When creating ai_task, mark corresponding task as AI task
  UPDATE tasks 
  SET is_ai_task = true,
      updated_at = NOW()
  WHERE id = NEW.task_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_task_as_ai_task
  AFTER INSERT ON ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_as_ai_task();

-- History record management
CREATE OR REPLACE FUNCTION update_ai_task_history()
RETURNS TRIGGER AS $$
DECLARE
  history_entry JSONB;
BEGIN
  -- Only record history on status changes or important field changes
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.mode IS DISTINCT FROM NEW.mode OR
    OLD.agent_id IS DISTINCT FROM NEW.agent_id
  ) THEN
    history_entry := jsonb_build_object(
      'timestamp', NOW(),
      'action', CASE 
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change'
        WHEN OLD.mode IS DISTINCT FROM NEW.mode THEN 'mode_change'
        WHEN OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN 'agent_change'
        ELSE 'update'
      END,
      'old_values', jsonb_build_object(
        'status', OLD.status,
        'mode', OLD.mode,
        'agent_id', OLD.agent_id
      ),
      'new_values', jsonb_build_object(
        'status', NEW.status,
        'mode', NEW.mode,
        'agent_id', NEW.agent_id
      ),
      'user_id', NEW.user_id
    );
    
    NEW.history := COALESCE(NEW.history, '[]'::jsonb) || history_entry;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_ai_task_history
  BEFORE UPDATE ON ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_task_history();

-- Automatic timestamp management
CREATE OR REPLACE FUNCTION manage_ai_task_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set timestamps based on status changes
  IF TG_OP = 'UPDATE' THEN
    -- Set started_at when starting execution
    IF OLD.status != 'in_progress' AND NEW.status = 'in_progress' THEN
      NEW.started_at := NOW();
    END IF;
    
    -- Set completed_at when finished
    IF OLD.status NOT IN ('completed', 'failed', 'cancelled') 
       AND NEW.status IN ('completed', 'failed', 'cancelled') THEN
      NEW.completed_at := NOW();
      
      -- Calculate actual duration
      IF NEW.started_at IS NOT NULL THEN
        NEW.actual_duration_min := EXTRACT(EPOCH FROM (NOW() - NEW.started_at)) / 60;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_manage_ai_task_timestamps
  BEFORE UPDATE ON ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION manage_ai_task_timestamps();

-- Dependency relationship validation
CREATE OR REPLACE FUNCTION validate_ai_task_dependencies()
RETURNS TRIGGER AS $$
DECLARE
  dep_id UUID;
  invalid_deps UUID[] := '{}';
BEGIN
  -- Validate each task_id in dependencies array exists and belongs to same user
  IF NEW.dependencies IS NOT NULL AND array_length(NEW.dependencies, 1) > 0 THEN
    FOREACH dep_id IN ARRAY NEW.dependencies
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE id = dep_id 
        AND user_id = NEW.user_id
      ) THEN
        invalid_deps := invalid_deps || dep_id;
      END IF;
    END LOOP;
    
    IF array_length(invalid_deps, 1) > 0 THEN
      RAISE EXCEPTION 'Invalid task dependencies: %', invalid_deps;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_ai_task_dependencies
  BEFORE INSERT OR UPDATE ON ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_ai_task_dependencies();

-- Updated timestamp trigger for ai_tasks
CREATE TRIGGER update_ai_tasks_updated_at 
  BEFORE UPDATE ON ai_tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 15. AI TASKS ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only view their own AI tasks
CREATE POLICY "Users can view their own AI tasks" ON ai_tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create AI tasks for their own tasks and agents
CREATE POLICY "Users can insert their own AI tasks" ON ai_tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    AND agent_id IN (SELECT id FROM ai_agents WHERE user_id = auth.uid())
  );

-- Users can only update their own AI tasks
CREATE POLICY "Users can update their own AI tasks" ON ai_tasks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own AI tasks
CREATE POLICY "Users can delete their own AI tasks" ON ai_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 16. AI TASKS COMMENTS
-- =====================================================

COMMENT ON TABLE ai_tasks IS 'AI task assignments linking tasks to agents for execution';
COMMENT ON COLUMN ai_tasks.task_id IS 'Reference to the task being assigned to an agent';
COMMENT ON COLUMN ai_tasks.agent_id IS 'Reference to the AI agent assigned to execute the task';
COMMENT ON COLUMN ai_tasks.objective IS 'Clear objective description for the AI agent';
COMMENT ON COLUMN ai_tasks.deliverables IS 'Expected deliverable outcomes from task execution';
COMMENT ON COLUMN ai_tasks.context IS 'Additional context and background information';
COMMENT ON COLUMN ai_tasks.acceptance_criteria IS 'Criteria for determining task completion success';
COMMENT ON COLUMN ai_tasks.task_type IS 'Type of task referencing agent_features';
COMMENT ON COLUMN ai_tasks.dependencies IS 'Array of task IDs that must be completed first';
COMMENT ON COLUMN ai_tasks.mode IS 'Execution mode: plan_only, dry_run, or execute';
COMMENT ON COLUMN ai_tasks.guardrails IS 'Safety constraints and limits for AI execution';
COMMENT ON COLUMN ai_tasks.metadata IS 'Additional metadata including priority and tags';
COMMENT ON COLUMN ai_tasks.history IS 'Audit trail of all changes and status updates';
COMMENT ON COLUMN ai_tasks.execution_result IS 'Results and outputs from AI task execution';

-- =====================================================
-- CONSOLIDATED SCHEMA COMPLETE
-- =====================================================
-- This consolidated schema includes:
-- 1. Vendors and API keys system for extensible provider support
-- 2. Extensible agent features and interaction types (no more enums!)
-- 3. Refactored AI agents with vendor integration
-- 4. Enhanced interactions with cost/token tracking
-- 5. Comprehensive usage analytics
-- 6. Proper indexing for performance
-- 7. Row-level security for data isolation
-- 8. Helper functions and views
-- 9. Complete seed data for immediate use
-- =====================================================

-- =====================================================
-- ZMEMORY API KEYS (FROM MIGRATIONS 2025-09-23)
-- =====================================================

-- Table for ZMemory API keys
CREATE TABLE IF NOT EXISTS zmemory_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  key_preview TEXT,

  scopes TEXT[] DEFAULT ARRAY['tasks.read', 'tasks.write', 'memories.read', 'memories.write'],

  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_user_id ON zmemory_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_hash ON zmemory_api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_active ON zmemory_api_keys(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_expires ON zmemory_api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE zmemory_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ZMemory API keys" ON zmemory_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ZMemory API keys" ON zmemory_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ZMemory API keys" ON zmemory_api_keys
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ZMemory API keys" ON zmemory_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_zmemory_api_keys_updated_at
  BEFORE UPDATE ON zmemory_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auth helpers
CREATE OR REPLACE FUNCTION authenticate_zmemory_api_key(api_key_hash TEXT)
RETURNS TABLE(
  user_id UUID,
  scopes TEXT[],
  key_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    zak.user_id,
    zak.scopes,
    zak.id as key_id
  FROM zmemory_api_keys zak
  WHERE zak.api_key_hash = authenticate_zmemory_api_key.api_key_hash
    AND zak.is_active = true
    AND (zak.expires_at IS NULL OR zak.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_zmemory_api_key_usage(api_key_hash TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE zmemory_api_keys
  SET last_used_at = NOW()
  WHERE api_key_hash = update_zmemory_api_key_usage.api_key_hash
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE zmemory_api_keys IS 'User-generated API keys for ZMemory/MCP access';
COMMENT ON COLUMN zmemory_api_keys.api_key_hash IS 'SHA-256 hash of the actual API key for secure storage';
COMMENT ON COLUMN zmemory_api_keys.key_preview IS 'Safe preview for UI display (e.g., "zm_***abc123")';
COMMENT ON COLUMN zmemory_api_keys.scopes IS 'Array of permissions for this API key';
COMMENT ON COLUMN zmemory_api_keys.expires_at IS 'NULL means no expiration, otherwise key expires at this time';

-- =====================================================
-- ZMEMORY VENDOR & SERVICES SEED (FROM MIGRATIONS 2025-09-23)
-- =====================================================

INSERT INTO vendors (id, name, description, auth_type, base_url, is_active) VALUES
('zmemory', 'ZMemory', 'Personal AI memory and task management system', 'api_key', 'http://localhost:3001', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active;

INSERT INTO vendor_services (id, vendor_id, service_name, display_name, description, is_active) VALUES
('zmemory_api', 'zmemory', 'zmemory_api', 'ZMemory API', 'Full access to ZMemory API including tasks, memories, and AI agents', true),
('zmemory_mcp', 'zmemory', 'zmemory_mcp', 'ZMemory MCP', 'Model Context Protocol access for Claude Code integration', true)
ON CONFLICT (id) DO UPDATE SET
  vendor_id = EXCLUDED.vendor_id,
  service_name = EXCLUDED.service_name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
