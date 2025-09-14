-- =====================================================
-- ZFlow Chat System - Complete Database Schema
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Create chat_sessions table for storing conversation metadata
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chat_messages table for storing individual messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- Your existing Redis message IDs
  type TEXT NOT NULL CHECK (type IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,
  agent_name TEXT,
  tool_calls JSONB,
  streaming BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  message_index INTEGER NOT NULL -- Order within session
);

-- =====================================================
-- 2. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Session queries by user (most common query pattern)
CREATE INDEX idx_chat_sessions_user_updated 
ON chat_sessions(user_id, updated_at DESC);

CREATE INDEX idx_chat_sessions_user_created 
ON chat_sessions(user_id, created_at DESC);

-- Message queries by session (for loading conversation history)
CREATE INDEX idx_chat_messages_session_index 
ON chat_messages(session_id, message_index);

-- Full-text search on message content (for search functionality)
CREATE INDEX idx_chat_messages_content_search 
ON chat_messages USING gin(to_tsvector('english', content));

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security for data protection
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can access own sessions" ON chat_sessions
FOR ALL USING (auth.uid() = user_id);

-- Users can only access messages from their own sessions
CREATE POLICY "Users can access own messages" ON chat_messages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
    AND chat_sessions.user_id = auth.uid()
  )
);

-- =====================================================
-- 4. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating chat_sessions.updated_at
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update message count when messages are added/removed
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_sessions 
        SET message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = NEW.session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_sessions 
        SET message_count = message_count - 1,
            updated_at = NOW()
        WHERE id = OLD.session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic message count updates
CREATE TRIGGER update_message_count_trigger
AFTER INSERT OR DELETE ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_session_message_count();

-- =====================================================
-- SCHEMA SETUP COMPLETE
-- =====================================================