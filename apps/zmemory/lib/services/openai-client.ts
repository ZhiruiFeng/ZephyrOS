import OpenAI from 'openai';
import { resolveOpenAIKey } from './api-key-resolver';

/**
 * OpenAI Client with User API Key Support
 * 
 * Creates OpenAI client instances using user-stored keys with fallback to environment variables.
 */

interface OpenAIClientOptions {
  userId?: string;
  serviceId?: string; // e.g., 'openai_gpt4', 'openai_whisper'
  organizationId?: string;
  baseURL?: string;
  timeout?: number;
}

/**
 * Create an OpenAI client instance for a user
 */
export async function createOpenAIClient(options: OpenAIClientOptions = {}): Promise<{
  client: OpenAI;
  keySource: 'user' | 'environment';
  keyId?: string;
}> {
  const resolvedKey = await resolveOpenAIKey(options.userId || null, options.serviceId);
  
  if (!resolvedKey) {
    throw new Error(
      'No OpenAI API key available. Please configure an API key in your settings ' +
      'or set the OPENAI_API_KEY environment variable.'
    );
  }

  const client = new OpenAI({
    apiKey: resolvedKey.key,
    organization: options.organizationId,
    baseURL: options.baseURL,
    timeout: options.timeout || 60000, // 60 seconds default
  });

  return {
    client,
    keySource: resolvedKey.source,
    keyId: resolvedKey.keyId
  };
}

/**
 * Create OpenAI client for chat completions
 */
export async function createChatClient(userId?: string): Promise<{
  client: OpenAI;
  keySource: 'user' | 'environment';
}> {
  const { client, keySource } = await createOpenAIClient({
    userId,
    serviceId: 'openai_gpt4' // Prefer GPT-4 specific keys
  });

  return { client, keySource };
}

/**
 * Create OpenAI client for transcription (Whisper)
 */
export async function createTranscriptionClient(userId?: string): Promise<{
  client: OpenAI;
  keySource: 'user' | 'environment';
}> {
  const { client, keySource } = await createOpenAIClient({
    userId,
    serviceId: 'openai_whisper' // Prefer Whisper specific keys
  });

  return { client, keySource };
}

/**
 * Create OpenAI client for image generation (DALL-E)
 */
export async function createImageClient(userId?: string): Promise<{
  client: OpenAI;
  keySource: 'user' | 'environment';
}> {
  const { client, keySource } = await createOpenAIClient({
    userId,
    serviceId: 'openai_dalle' // Prefer DALL-E specific keys
  });

  return { client, keySource };
}

/**
 * Create OpenAI client for embeddings
 */
export async function createEmbeddingClient(userId?: string): Promise<{
  client: OpenAI;
  keySource: 'user' | 'environment';
}> {
  const { client, keySource } = await createOpenAIClient({
    userId,
    serviceId: 'openai_embeddings' // Prefer embeddings specific keys
  });

  return { client, keySource };
}

/**
 * Stream-safe wrapper for OpenAI completions with user context
 */
export class UserOpenAIClient {
  private userId?: string;
  private serviceId?: string;

  constructor(userId?: string, serviceId?: string) {
    this.userId = userId;
    this.serviceId = serviceId;
  }

  /**
   * Create chat completion with user's API key
   */
  async createChatCompletion(
    params: OpenAI.ChatCompletionCreateParams
  ): Promise<OpenAI.ChatCompletion> {
    const { client } = await createOpenAIClient({
      userId: this.userId,
      serviceId: this.serviceId || 'openai_gpt4'
    });

    return await client.chat.completions.create(params) as OpenAI.ChatCompletion;
  }

  /**
   * Create streaming chat completion with user's API key
   */
  async createChatCompletionStream(
    params: OpenAI.ChatCompletionCreateParamsStreaming
  ): Promise<AsyncIterable<OpenAI.ChatCompletionChunk>> {
    const { client } = await createOpenAIClient({
      userId: this.userId,
      serviceId: this.serviceId || 'openai_gpt4'
    });

    return await client.chat.completions.create(params);
  }

  /**
   * Create transcription with user's API key
   */
  async createTranscription(
    file: File,
    options: {
      model?: string;
      language?: string;
      response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
      temperature?: number;
    } = {}
  ): Promise<OpenAI.Audio.Transcription> {
    const { client } = await createOpenAIClient({
      userId: this.userId,
      serviceId: 'openai_whisper'
    });

    return await client.audio.transcriptions.create({
      file,
      model: options.model || 'whisper-1',
      language: options.language,
      response_format: options.response_format || 'json',
      temperature: options.temperature
    });
  }

  /**
   * Generate images with user's API key
   */
  async createImage(
    params: OpenAI.ImageGenerateParams
  ): Promise<OpenAI.ImagesResponse> {
    const { client } = await createOpenAIClient({
      userId: this.userId,
      serviceId: 'openai_dalle'
    });

    return await client.images.generate(params) as OpenAI.ImagesResponse;
  }

  /**
   * Create embeddings with user's API key
   */
  async createEmbedding(
    params: OpenAI.EmbeddingCreateParams
  ): Promise<OpenAI.CreateEmbeddingResponse> {
    const { client } = await createOpenAIClient({
      userId: this.userId,
      serviceId: 'openai_embeddings'
    });

    return await client.embeddings.create(params);
  }
}

/**
 * Utility function to check if OpenAI API key is available for a user
 */
export async function hasOpenAIAccess(userId?: string): Promise<{
  hasAccess: boolean;
  keySource?: 'user' | 'environment';
  error?: string;
}> {
  try {
    const resolvedKey = await resolveOpenAIKey(userId || null);
    
    if (resolvedKey) {
      return {
        hasAccess: true,
        keySource: resolvedKey.source
      };
    } else {
      return {
        hasAccess: false,
        error: 'No OpenAI API key configured'
      };
    }
  } catch (error) {
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}