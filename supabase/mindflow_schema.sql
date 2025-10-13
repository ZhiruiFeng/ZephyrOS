-- MindFlow STT Interactions Schema
-- Stores user interactions with MindFlow speech-to-text and optimization features

CREATE TABLE mindflow_stt_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Transcription data
  original_transcription TEXT NOT NULL,
  transcription_api VARCHAR(50) NOT NULL, -- 'OpenAI' or 'ElevenLabs'
  transcription_model VARCHAR(100), -- 'whisper-1' or 'scribe_v1'

  -- Optimization data
  refined_text TEXT,
  optimization_model VARCHAR(100), -- 'gpt-4o-mini', 'gpt-4o', 'gpt-4'
  optimization_level VARCHAR(20), -- 'light', 'medium', 'heavy'
  output_style VARCHAR(20), -- 'conversational', 'formal'

  -- Educational feedback
  teacher_explanation TEXT, -- AI-generated explanation of improvements

  -- Metadata
  audio_duration FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional: audio file storage reference
  audio_file_url TEXT
);

-- Index for user queries
CREATE INDEX idx_mindflow_stt_interactions_user_id ON mindflow_stt_interactions(user_id);
CREATE INDEX idx_mindflow_stt_interactions_created_at ON mindflow_stt_interactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE mindflow_stt_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own interactions
CREATE POLICY "Users can view own interactions"
  ON mindflow_stt_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON mindflow_stt_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON mindflow_stt_interactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mindflow_stt_interactions_updated_at
  BEFORE UPDATE ON mindflow_stt_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
