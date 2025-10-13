import { BaseEntity, FilterParams } from '../common';

// MindFlow STT Interaction Entity shape aligned with mindflow_stt_interactions table
export interface MindflowSTTInteraction extends BaseEntity {
  user_id: string;
  original_transcription: string;
  transcription_api: 'OpenAI' | 'ElevenLabs';
  transcription_model?: string | null;
  refined_text?: string | null;
  optimization_model?: string | null;
  optimization_level?: 'light' | 'medium' | 'heavy' | null;
  output_style?: 'conversational' | 'formal' | null;
  teacher_explanation?: string | null;
  audio_duration?: number | null;
  audio_file_url?: string | null;
}

export interface MindflowSTTInteractionFilterParams extends FilterParams {
  transcription_api?: 'OpenAI' | 'ElevenLabs';
  optimization_level?: 'light' | 'medium' | 'heavy';
  output_style?: 'conversational' | 'formal';
  has_refinement?: boolean;
  has_teacher_explanation?: boolean;
  start_date?: string;
  end_date?: string;
}

// Create MindFlow STT Interaction input (what comes from POST request)
export interface CreateMindflowSTTInteractionInput {
  original_transcription: string;
  transcription_api: 'OpenAI' | 'ElevenLabs';
  transcription_model?: string;
  refined_text?: string;
  optimization_model?: string;
  optimization_level?: 'light' | 'medium' | 'heavy';
  output_style?: 'conversational' | 'formal';
  teacher_explanation?: string;
  audio_duration?: number;
  audio_file_url?: string;
}

// Update MindFlow STT Interaction input (what comes from PUT request)
export interface UpdateMindflowSTTInteractionInput {
  original_transcription?: string;
  transcription_api?: 'OpenAI' | 'ElevenLabs';
  transcription_model?: string;
  refined_text?: string;
  optimization_model?: string;
  optimization_level?: 'light' | 'medium' | 'heavy';
  output_style?: 'conversational' | 'formal';
  teacher_explanation?: string;
  audio_duration?: number;
  audio_file_url?: string;
}
