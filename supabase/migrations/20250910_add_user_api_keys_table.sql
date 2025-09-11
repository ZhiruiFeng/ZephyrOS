-- =====================================================
-- User API Keys Table Migration (Extensible Version)
-- Created: 2025-09-10
-- Purpose: Store encrypted user API keys for third-party services
-- Design: Extensible vendor support without schema changes
-- =====================================================

-- =====================================================
-- 1. CREATE VENDORS TABLE
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

-- =====================================================
-- 2. CREATE SERVICES TABLE
-- =====================================================

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

-- =====================================================
-- 3. CREATE USER API KEYS TABLE
-- =====================================================

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
-- 4. SEED DATA - INITIAL VENDORS
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
  ('huggingface', 'Hugging Face', 'Open source models hub', 'api_key', 'https://api-inference.huggingface.co')
ON CONFLICT (id) DO NOTHING;

-- Insert initial services
INSERT INTO vendor_services (id, vendor_id, service_name, display_name, description) VALUES
  -- OpenAI services
  ('openai_gpt4', 'openai', 'gpt-4', 'GPT-4', 'Latest GPT-4 model'),
  ('openai_gpt35', 'openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient model'),
  ('openai_whisper', 'openai', 'whisper', 'Whisper', 'Speech-to-text model'),
  ('openai_dalle', 'openai', 'dall-e-3', 'DALL-E 3', 'Image generation model'),
  
  -- Anthropic services
  ('anthropic_claude3', 'anthropic', 'claude-3', 'Claude 3', 'Latest Claude model'),
  ('anthropic_claude3_sonnet', 'anthropic', 'claude-3-sonnet', 'Claude 3 Sonnet', 'Balanced Claude model'),
  
  -- Google services
  ('google_gemini', 'google', 'gemini-pro', 'Gemini Pro', 'Google\'s multimodal AI'),
  
  -- ElevenLabs services
  ('elevenlabs_tts', 'elevenlabs', 'text-to-speech', 'Text-to-Speech', 'Voice synthesis'),
  
  -- Stability AI services
  ('stability_sd', 'stability', 'stable-diffusion', 'Stable Diffusion', 'Image generation')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. INDEXES
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

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

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

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE vendors IS 'Supported third-party AI/API vendors';
COMMENT ON TABLE vendor_services IS 'Specific services within each vendor';
COMMENT ON TABLE user_api_keys IS 'User-owned encrypted API keys for third-party services';

COMMENT ON COLUMN vendors.auth_type IS 'Authentication method: api_key, oauth, bearer_token';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'AES-256 encrypted API key';
COMMENT ON COLUMN user_api_keys.key_preview IS 'Last 4 characters for UI identification';
COMMENT ON COLUMN user_api_keys.service_id IS 'NULL = vendor-wide key, otherwise service-specific';

-- =====================================================
-- MIGRATION COMPLETE
-- Now adding new vendors only requires INSERT statements!
-- =====================================================