import { createTranscriptionClient } from './openai-client';
import { resolveOpenAIKey } from './api-key-resolver';

/**
 * Enhanced Transcription Service with User API Key Support
 * 
 * Handles audio transcription using user-stored OpenAI API keys
 * with fallback to environment variables.
 */

export interface TranscriptionOptions {
  userId?: string;
  language?: string;
  model?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  keySource: 'user' | 'environment';
}

/**
 * Transcribe audio file using user's OpenAI API key
 */
export async function transcribeAudio(
  file: File,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // Resolve API key
  const resolvedKey = await resolveOpenAIKey(options.userId || null, 'openai_whisper');
  
  if (!resolvedKey) {
    throw new Error(
      'No OpenAI API key available for transcription. ' +
      'Please configure an API key in your settings or set OPENAI_API_KEY environment variable.'
    );
  }

  // Create OpenAI client with user's key
  const { client, keySource } = await createTranscriptionClient(options.userId);

  try {
    const transcriptionParams = {
      file,
      model: options.model || 'whisper-1',
      ...(options.language && options.language !== 'auto' && { language: options.language }),
      response_format: options.response_format || 'verbose_json',
      ...(options.temperature !== undefined && { temperature: options.temperature })
    };

    const response = await client.audio.transcriptions.create(transcriptionParams);

    // Handle different response formats
    if (options.response_format === 'text') {
      return {
        text: response as unknown as string,
        keySource
      };
    }

    // For JSON responses (default verbose_json)
    const jsonResponse = response as any;
    
    return {
      text: jsonResponse.text || '',
      language: jsonResponse.language,
      duration: jsonResponse.duration,
      segments: jsonResponse.segments,
      keySource
    };

  } catch (error) {
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('401')) {
        throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
      }
      if (error.message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('400')) {
        throw new Error('Invalid request. Please check your audio file format and parameters.');
      }
      throw new Error(`Transcription failed: ${error.message}`);
    }
    throw new Error('Transcription failed: Unknown error');
  }
}

/**
 * Enhanced transcribe function with retry logic and fallback
 */
export async function transcribeAudioWithRetry(
  file: File,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  // Try with requested model first
  const requestedModel = options.model || 'whisper-1';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // On subsequent attempts, try with different models
      const modelToUse = attempt === 1 ? requestedModel : 'whisper-1';
      
      const result = await transcribeAudio(file, {
        ...options,
        model: modelToUse
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on authentication errors
      if (lastError.message.includes('Invalid OpenAI API key')) {
        throw lastError;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Transcription failed after multiple attempts');
}

/**
 * Validate audio file for transcription
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 25 * 1024 * 1024; // 25MB limit for OpenAI Whisper
  const supportedTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 
    'audio/mp4', 'audio/webm', 'audio/flac', 'audio/ogg'
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 25MB limit'
    };
  }

  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: ${supportedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Check if transcription is available for a user
 */
export async function hasTranscriptionAccess(userId?: string): Promise<{
  hasAccess: boolean;
  keySource?: 'user' | 'environment';
  error?: string;
}> {
  try {
    const resolvedKey = await resolveOpenAIKey(userId || null, 'openai_whisper');
    
    if (resolvedKey) {
      return {
        hasAccess: true,
        keySource: resolvedKey.source
      };
    } else {
      return {
        hasAccess: false,
        error: 'No OpenAI API key configured for transcription'
      };
    }
  } catch (error) {
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Legacy function for backward compatibility
 * 
 * @deprecated Use transcribeAudio instead
 */
export async function transcribeAudioLegacy(params: {
  file: File;
  language?: string;
  model?: string;
  apiKey: string;
}): Promise<Response> {
  const upstream = new FormData();
  upstream.append('file', params.file, params.file.name || 'audio.webm');
  upstream.append('model', params.model || 'whisper-1');
  if (params.language && params.language !== 'auto') {
    upstream.append('language', params.language);
  }
  upstream.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${params.apiKey}` 
    },
    body: upstream
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    return new Response(
      JSON.stringify({ 
        error: 'OpenAI transcription failed', 
        detail: errorText 
      }),
      { 
        status: response.status, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }

  const data = await response.json();
  return new Response(
    JSON.stringify({ 
      text: data.text || '', 
      raw: data 
    }), 
    {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }
  );
}