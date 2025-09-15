-- Z-Relations Module Database Schema
-- ZephyrOS Relationship Management System
--
-- This schema implements research-backed relationship management based on:
-- - Dunbar's social layers (5, 15, 50, 150)
-- - Weak tie theory and brokerage principles
-- - Active-constructive responding
-- - Dormant tie revival strategies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core People/Contacts table
-- Stores basic contact information for all people in the user's network
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  notes TEXT,
  -- Additional contact fields
  company VARCHAR(255),
  job_title VARCHAR(255),
  location VARCHAR(255),
  social_linkedin VARCHAR(255),
  social_twitter VARCHAR(255),
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Indexes
  CONSTRAINT people_user_id_name_unique UNIQUE(user_id, name)
);

-- Create indexes for efficient querying
CREATE INDEX idx_people_user_id ON people(user_id);
CREATE INDEX idx_people_email ON people(email) WHERE email IS NOT NULL;
CREATE INDEX idx_people_created_at ON people(created_at);

-- Relationship profiles with Dunbar tiers
-- Core relationship management with tier assignments and health tracking
CREATE TABLE relationship_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  -- Dunbar tier system: 5 (intimate), 15 (close), 50 (meaningful), 150 (stable)
  tier INTEGER NOT NULL CHECK (tier IN (5, 15, 50, 150)),
  -- How often to check in (days)
  cadence_days INTEGER NOT NULL DEFAULT 30,
  -- Last meaningful interaction timestamp
  last_contact_at TIMESTAMP WITH TIME ZONE,
  -- Health score: 0-100, calculated based on staleness, reciprocity, sentiment
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  -- Reciprocity balance: positive = giving more, negative = asking more
  reciprocity_balance INTEGER DEFAULT 0,
  -- Dormant tie detection
  is_dormant BOOLEAN DEFAULT FALSE,
  dormant_since TIMESTAMP WITH TIME ZONE,
  -- User's reason for tier assignment
  reason_for_tier TEXT,
  -- Relationship context and history
  how_met TEXT,
  relationship_context TEXT, -- professional, personal, family, etc.
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraints
  UNIQUE(user_id, person_id)
);

-- Indexes for relationship profiles
CREATE INDEX idx_relationship_profiles_user_id ON relationship_profiles(user_id);
CREATE INDEX idx_relationship_profiles_tier ON relationship_profiles(tier);
CREATE INDEX idx_relationship_profiles_health_score ON relationship_profiles(health_score);
CREATE INDEX idx_relationship_profiles_last_contact ON relationship_profiles(last_contact_at);
CREATE INDEX idx_relationship_profiles_dormant ON relationship_profiles(is_dormant, dormant_since);

-- Touchpoint logging
-- Records all interactions with contacts, enabling health score calculation
CREATE TABLE relationship_touchpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  -- Communication channel
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'phone', 'text', 'in_person', 'video_call', 'social_media', 'messaging_app', 'other')),
  -- Direction of communication
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  -- Brief summary of interaction
  summary TEXT,
  -- Sentiment scale: -2 (very negative) to +2 (very positive)
  sentiment INTEGER DEFAULT 0 CHECK (sentiment >= -2 AND sentiment <= 2),
  -- Duration in minutes (optional)
  duration_minutes INTEGER,
  -- Give/Ask tracking for reciprocity
  is_give BOOLEAN DEFAULT FALSE, -- true when giving help/value, false when asking
  give_ask_type VARCHAR(50), -- 'advice', 'referral', 'support', 'favor', 'information', etc.
  -- Context and tags
  context VARCHAR(100), -- 'work', 'personal', 'social', 'professional_development', etc.
  tags TEXT[], -- Array of tags for categorization
  -- Follow-up tracking
  needs_followup BOOLEAN DEFAULT FALSE,
  followup_date TIMESTAMP WITH TIME ZONE,
  followup_notes TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for touchpoints
CREATE INDEX idx_touchpoints_user_id ON relationship_touchpoints(user_id);
CREATE INDEX idx_touchpoints_person_id ON relationship_touchpoints(person_id);
CREATE INDEX idx_touchpoints_channel ON relationship_touchpoints(channel);
CREATE INDEX idx_touchpoints_created_at ON relationship_touchpoints(created_at DESC);
CREATE INDEX idx_touchpoints_sentiment ON relationship_touchpoints(sentiment);
CREATE INDEX idx_touchpoints_followup ON relationship_touchpoints(needs_followup, followup_date);

-- Brokerage/introduction tracking
-- Manages introductions between contacts for network value creation
CREATE TABLE relationship_introductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_a_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  -- Introduction status
  status VARCHAR(20) DEFAULT 'suggested' CHECK (status IN ('suggested', 'planned', 'made', 'successful', 'declined', 'failed')),
  -- Why this introduction makes sense
  rationale TEXT,
  -- Notes about the introduction
  notes TEXT,
  -- When the introduction was made
  introduced_at TIMESTAMP WITH TIME ZONE,
  -- Outcome tracking
  outcome VARCHAR(50), -- 'meeting_scheduled', 'collaboration', 'business_deal', 'friendship', 'no_response', etc.
  outcome_notes TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate suggestions
  UNIQUE(user_id, person_a_id, person_b_id)
);

-- Indexes for introductions
CREATE INDEX idx_introductions_user_id ON relationship_introductions(user_id);
CREATE INDEX idx_introductions_status ON relationship_introductions(status);
CREATE INDEX idx_introductions_created_at ON relationship_introductions(created_at);

-- Default cadences by tier
-- User-customizable default contact frequencies for each Dunbar tier
CREATE TABLE relationship_cadences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL CHECK (tier IN (5, 15, 50, 150)),
  default_days INTEGER NOT NULL,
  -- Customization options
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One cadence setting per user per tier
  UNIQUE(user_id, tier)
);

-- Insert default cadence settings for new users
-- These can be customized per user but provide sensible defaults
-- INSERT INTO relationship_cadences (user_id, tier, default_days) VALUES
--   ('00000000-0000-0000-0000-000000000000', 5, 7),    -- Core 5: weekly
--   ('00000000-0000-0000-0000-000000000000', 15, 14),   -- Close 15: bi-weekly
--   ('00000000-0000-0000-0000-000000000000', 50, 30),   -- Active 50: monthly
--   ('00000000-0000-0000-0000-000000000000', 150, 90);  -- Wider 150: quarterly

-- Indexes for cadences
CREATE INDEX idx_cadences_user_id ON relationship_cadences(user_id);
CREATE INDEX idx_cadences_tier ON relationship_cadences(tier);

-- Micro-gathering events
-- Supports Parker's "mindful gatherings" for strengthening relationships
CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  virtual_link TEXT, -- Zoom, Meet, etc.
  max_participants INTEGER DEFAULT 8, -- Small gatherings are more effective
  -- Event type and purpose
  event_type VARCHAR(50) DEFAULT 'social', -- 'social', 'professional', 'learning', 'celebration', etc.
  purpose TEXT, -- Why this gathering exists
  -- Planning status
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'inviting', 'confirmed', 'completed', 'cancelled')),
  -- Success metrics
  actual_participants INTEGER,
  success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
  success_notes TEXT,
  -- Follow-up planning
  follow_up_planned BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX idx_events_user_id ON activity_events(user_id);
CREATE INDEX idx_events_event_date ON activity_events(event_date);
CREATE INDEX idx_events_status ON activity_events(status);

-- Event participants
-- Many-to-many relationship between events and people
CREATE TABLE activity_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES activity_events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  -- Invitation and attendance tracking
  status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'declined', 'tentative', 'attended', 'no_show')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  -- Response and notes
  response_notes TEXT,
  -- Role in event (optional)
  role VARCHAR(50), -- 'organizer', 'speaker', 'participant', etc.
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate invitations
  UNIQUE(event_id, person_id)
);

-- Indexes for participants
CREATE INDEX idx_participants_event_id ON activity_participants(event_id);
CREATE INDEX idx_participants_person_id ON activity_participants(person_id);
CREATE INDEX idx_participants_status ON activity_participants(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationship_profiles_updated_at BEFORE UPDATE ON relationship_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationship_introductions_updated_at BEFORE UPDATE ON relationship_introductions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationship_cadences_updated_at BEFORE UPDATE ON relationship_cadences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_events_updated_at BEFORE UPDATE ON activity_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_participants_updated_at BEFORE UPDATE ON activity_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Ensure users can only access their own data

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_introductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for people table
CREATE POLICY "Users can view their own people" ON people
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people" ON people
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own people" ON people
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own people" ON people
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for relationship_profiles table
CREATE POLICY "Users can view their own relationship profiles" ON relationship_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own relationship profiles" ON relationship_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own relationship profiles" ON relationship_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own relationship profiles" ON relationship_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for relationship_touchpoints table
CREATE POLICY "Users can view their own touchpoints" ON relationship_touchpoints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own touchpoints" ON relationship_touchpoints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own touchpoints" ON relationship_touchpoints
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own touchpoints" ON relationship_touchpoints
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for relationship_introductions table
CREATE POLICY "Users can view their own introductions" ON relationship_introductions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own introductions" ON relationship_introductions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own introductions" ON relationship_introductions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own introductions" ON relationship_introductions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for relationship_cadences table
CREATE POLICY "Users can view their own cadences" ON relationship_cadences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cadences" ON relationship_cadences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cadences" ON relationship_cadences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cadences" ON relationship_cadences
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activity_events table
CREATE POLICY "Users can view their own events" ON activity_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON activity_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON activity_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON activity_events
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activity_participants table
CREATE POLICY "Users can view participants of their own events" ON activity_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activity_events
      WHERE activity_events.id = activity_participants.event_id
      AND activity_events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert participants to their own events" ON activity_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activity_events
      WHERE activity_events.id = activity_participants.event_id
      AND activity_events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update participants of their own events" ON activity_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM activity_events
      WHERE activity_events.id = activity_participants.event_id
      AND activity_events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete participants from their own events" ON activity_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM activity_events
      WHERE activity_events.id = activity_participants.event_id
      AND activity_events.user_id = auth.uid()
    )
  );

-- Useful views for common queries

-- View for relationship health overview
CREATE VIEW relationship_health_overview AS
SELECT
  rp.user_id,
  rp.tier,
  COUNT(*) as total_relationships,
  AVG(rp.health_score) as avg_health_score,
  COUNT(*) FILTER (WHERE rp.health_score >= 80) as healthy_count,
  COUNT(*) FILTER (WHERE rp.health_score BETWEEN 50 AND 79) as moderate_count,
  COUNT(*) FILTER (WHERE rp.health_score < 50) as at_risk_count,
  COUNT(*) FILTER (WHERE rp.is_dormant = TRUE) as dormant_count
FROM relationship_profiles rp
GROUP BY rp.user_id, rp.tier;

-- View for check-in queue (relationships due for contact)
CREATE VIEW checkin_queue AS
SELECT
  p.id as person_id,
  p.name,
  p.email,
  p.avatar_url,
  rp.tier,
  rp.health_score,
  rp.last_contact_at,
  rp.cadence_days,
  COALESCE(rp.last_contact_at, rp.created_at) + INTERVAL '1 day' * rp.cadence_days as next_contact_due,
  EXTRACT(days FROM NOW() - (COALESCE(rp.last_contact_at, rp.created_at) + INTERVAL '1 day' * rp.cadence_days)) as days_overdue,
  rp.reason_for_tier,
  rp.relationship_context
FROM relationship_profiles rp
JOIN people p ON p.id = rp.person_id
WHERE COALESCE(rp.last_contact_at, rp.created_at) + INTERVAL '1 day' * rp.cadence_days <= NOW()
ORDER BY
  EXTRACT(days FROM NOW() - (COALESCE(rp.last_contact_at, rp.created_at) + INTERVAL '1 day' * rp.cadence_days)) DESC,
  rp.tier ASC;

-- View for dormant tie suggestions
CREATE VIEW dormant_tie_suggestions AS
SELECT
  p.id as person_id,
  p.name,
  p.email,
  p.avatar_url,
  rp.tier,
  rp.last_contact_at,
  rp.dormant_since,
  EXTRACT(days FROM NOW() - rp.last_contact_at) as days_since_last_contact,
  rp.how_met,
  rp.relationship_context,
  -- Get the last touchpoint for context
  (
    SELECT rt.summary
    FROM relationship_touchpoints rt
    WHERE rt.person_id = p.id AND rt.user_id = p.user_id
    ORDER BY rt.created_at DESC
    LIMIT 1
  ) as last_interaction_summary
FROM relationship_profiles rp
JOIN people p ON p.id = rp.person_id
WHERE rp.is_dormant = TRUE
  AND rp.last_contact_at < NOW() - INTERVAL '6 months'
ORDER BY rp.last_contact_at ASC;

-- Comments for documentation
COMMENT ON TABLE people IS 'Core contact information for all people in users networks';
COMMENT ON TABLE relationship_profiles IS 'Relationship management with Dunbar tiers, cadences, and health scoring';
COMMENT ON TABLE relationship_touchpoints IS 'Interaction logging for health score calculation and relationship tracking';
COMMENT ON TABLE relationship_introductions IS 'Brokerage and introduction management for network value creation';
COMMENT ON TABLE relationship_cadences IS 'User-customizable default contact frequencies by Dunbar tier';
COMMENT ON TABLE activity_events IS 'Micro-gathering events for strengthening relationships';
COMMENT ON TABLE activity_participants IS 'Event participation tracking';

COMMENT ON VIEW relationship_health_overview IS 'Aggregated relationship health metrics by tier';
COMMENT ON VIEW checkin_queue IS 'Relationships due for contact based on cadence settings';
COMMENT ON VIEW dormant_tie_suggestions IS 'Dormant relationships that could be revived';