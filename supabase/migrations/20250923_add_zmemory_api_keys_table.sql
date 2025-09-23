-- Create table for ZMemory API keys
-- This allows users to generate long-lived API keys for MCP and other integrations

CREATE TABLE IF NOT EXISTS zmemory_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Key metadata
  name TEXT NOT NULL, -- User-friendly name like "Claude MCP Key"
  api_key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the actual API key
  key_preview TEXT, -- Preview like "zm_***abc123" for UI display

  -- Permissions and scopes
  scopes TEXT[] DEFAULT ARRAY['tasks.read', 'tasks.write', 'memories.read', 'memories.write'],

  -- Status and lifecycle
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL means no expiration

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, name) -- Each user can have only one key with a given name
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_user_id ON zmemory_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_hash ON zmemory_api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_active ON zmemory_api_keys(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_zmemory_api_keys_expires ON zmemory_api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE zmemory_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own ZMemory API keys" ON zmemory_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ZMemory API keys" ON zmemory_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ZMemory API keys" ON zmemory_api_keys
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ZMemory API keys" ON zmemory_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_zmemory_api_keys_updated_at
  BEFORE UPDATE ON zmemory_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to authenticate API key and get user info
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

-- Function to update last_used_at for an API key
CREATE OR REPLACE FUNCTION update_zmemory_api_key_usage(api_key_hash TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE zmemory_api_keys
  SET last_used_at = NOW()
  WHERE api_key_hash = update_zmemory_api_key_usage.api_key_hash
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE zmemory_api_keys IS 'User-generated API keys for ZMemory/MCP access';
COMMENT ON COLUMN zmemory_api_keys.api_key_hash IS 'SHA-256 hash of the actual API key for secure storage';
COMMENT ON COLUMN zmemory_api_keys.key_preview IS 'Safe preview for UI display (e.g., "zm_***abc123")';
COMMENT ON COLUMN zmemory_api_keys.scopes IS 'Array of permissions for this API key';
COMMENT ON COLUMN zmemory_api_keys.expires_at IS 'NULL means no expiration, otherwise key expires at this time';