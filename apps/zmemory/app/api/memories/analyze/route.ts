import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import { analyzeMemory, findPotentialAnchors, type MemoryAnalysisInput } from '@/lib/memory-business-logic';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema for memory analysis request
const MemoryAnalysisSchema = z.object({
  note: z.string().optional(),
  title: z.string().optional(),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']),
  emotion_valence: z.number().int().min(-5).max(5).optional(),
  emotion_arousal: z.number().int().min(0).max(5).optional(),
  energy_delta: z.number().int().min(-5).max(5).optional(),
  place_name: z.string().optional(),
  context: z.string().optional(),
  tags: z.array(z.string()).default([]),
  captured_at: z.string().datetime().optional(),
  importance_level: z.enum(['low', 'medium', 'high']).optional(),
  memory_id: z.string().uuid().optional(), // If analyzing existing memory
  include_anchor_suggestions: z.boolean().default(true),
});

/**
 * @swagger
 * /api/memories/analyze:
 *   post:
 *     summary: Analyze memory content and provide business logic insights
 *     description: Get salience scores, highlight recommendations, tag suggestions, and potential relationships
 *     tags: [Memory Business Logic]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *               title:
 *                 type: string
 *               memory_type:
 *                 type: string
 *                 enum: [note, link, file, thought, quote, insight]
 *               emotion_valence:
 *                 type: integer
 *                 minimum: -5
 *                 maximum: 5
 *               emotion_arousal:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *               energy_delta:
 *                 type: integer
 *                 minimum: -5
 *                 maximum: 5
 *               place_name:
 *                 type: string
 *               context:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               captured_at:
 *                 type: string
 *                 format: date-time
 *               importance_level:
 *                 type: string
 *                 enum: [low, medium, high]
 *               memory_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of existing memory to analyze
 *               include_anchor_suggestions:
 *                 type: boolean
 *                 default: true
 *             required: [memory_type]
 *     responses:
 *       200:
 *         description: Memory analysis results with recommendations
 */
async function handleAnalyzeMemory(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const body = request.validatedBody!;
  const client = await getClientForAuthType(request);

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Prepare memory data for analysis
  const memoryInput: MemoryAnalysisInput = {
    id: body.memory_id,
    note: body.note,
    title: body.title,
    memory_type: body.memory_type,
    emotion_valence: body.emotion_valence,
    emotion_arousal: body.emotion_arousal,
    energy_delta: body.energy_delta,
    place_name: body.place_name,
    context: body.context,
    tags: body.tags,
    captured_at: body.captured_at || new Date().toISOString(),
    importance_level: body.importance_level,
    user_id: userId
  };

  // Perform memory analysis
  const analysisResult = analyzeMemory(memoryInput);

  // Find potential anchors if requested
  let potentialAnchors: any[] = [];
  if (body.include_anchor_suggestions) {
    try {
      potentialAnchors = await findPotentialAnchors(client, memoryInput, 5);
    } catch (error) {
      console.warn('Failed to find potential anchors:', error);
      // Continue without anchor suggestions
    }
  }

  const response = {
    analysis: analysisResult,
    potential_anchors: potentialAnchors,
    recommendations: {
      // Actionable recommendations based on analysis
      update_salience: analysisResult.salience_score !== (memoryInput.id ? 0 : undefined),
      set_highlight: analysisResult.is_highlight && !body.memory_id, // Only for new memories
      update_importance: analysisResult.suggested_importance_level !== body.importance_level,
      add_tags: analysisResult.suggested_tags?.filter(tag =>
        !body.tags.includes(tag)
      ) || [],
      create_anchors: potentialAnchors.filter(anchor => anchor.confidence >= 0.6).length > 0
    },
    metadata: {
      analyzed_at: new Date().toISOString(),
      analysis_version: '1.0',
      user_id: userId
    }
  };

  return NextResponse.json(response);
}

// Apply middleware with custom rate limit for analysis endpoint
export const POST = withStandardMiddleware(handleAnalyzeMemory, {
  validation: {
    bodySchema: MemoryAnalysisSchema
  },
  rateLimit: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 30
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
