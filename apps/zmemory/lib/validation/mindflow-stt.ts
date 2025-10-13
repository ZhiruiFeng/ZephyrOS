import { z } from 'zod';

/**
 * Validation schema for creating a MindFlow STT interaction
 */
export const CreateMindflowSTTInteractionSchema = z.object({
  original_transcription: z.string().min(1, 'Original transcription cannot be empty'),
  transcription_api: z.enum(['OpenAI', 'ElevenLabs'], {
    errorMap: () => ({ message: 'Transcription API must be either OpenAI or ElevenLabs' })
  }),
  transcription_model: z.string().max(100).optional(),
  refined_text: z.string().optional(),
  optimization_model: z.string().max(100).optional(),
  optimization_level: z.enum(['light', 'medium', 'heavy']).optional(),
  output_style: z.enum(['conversational', 'formal']).optional(),
  teacher_explanation: z.string().optional(),
  audio_duration: z.number().min(0).optional(),
  audio_file_url: z.string().url().optional()
});

/**
 * Validation schema for updating a MindFlow STT interaction (all fields optional)
 */
export const UpdateMindflowSTTInteractionSchema = z.object({
  original_transcription: z.string().min(1, 'Original transcription cannot be empty').optional(),
  transcription_api: z.enum(['OpenAI', 'ElevenLabs']).optional(),
  transcription_model: z.string().max(100).optional(),
  refined_text: z.string().optional(),
  optimization_model: z.string().max(100).optional(),
  optimization_level: z.enum(['light', 'medium', 'heavy']).optional(),
  output_style: z.enum(['conversational', 'formal']).optional(),
  teacher_explanation: z.string().optional(),
  audio_duration: z.number().min(0).optional(),
  audio_file_url: z.string().url().optional()
});

/**
 * Validation schema for query parameters
 */
export const MindflowSTTInteractionQuerySchema = z.object({
  transcription_api: z.enum(['OpenAI', 'ElevenLabs']).optional(),
  optimization_level: z.enum(['light', 'medium', 'heavy']).optional(),
  output_style: z.enum(['conversational', 'formal']).optional(),
  has_refinement: z.string().transform(v => v === 'true').optional(),
  has_teacher_explanation: z.string().transform(v => v === 'true').optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  offset: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined)
});

export type CreateMindflowSTTInteractionInput = z.infer<typeof CreateMindflowSTTInteractionSchema>;
export type UpdateMindflowSTTInteractionInput = z.infer<typeof UpdateMindflowSTTInteractionSchema>;
export type MindflowSTTInteractionQueryParams = z.infer<typeof MindflowSTTInteractionQuerySchema>;
