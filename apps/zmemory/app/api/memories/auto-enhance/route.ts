import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { analyzeMemory, type MemoryAnalysisInput } from '@/lib/memory-business-logic';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema for auto-enhancement request
const AutoEnhanceSchema = z.object({
  memory_ids: z.array(z.string().uuid()).optional(), // Specific memory IDs to enhance
  batch_size: z.number().int().min(1).max(100).default(20), // How many memories to process at once
  include_recent: z.boolean().default(true), // Include recent memories (last 30 days)
  update_salience: z.boolean().default(true), // Update salience scores
  update_highlights: z.boolean().default(true), // Update highlight status
  suggest_tags: z.boolean().default(false), // Add suggested tags (more conservative)
  dry_run: z.boolean().default(false), // Preview changes without applying
});

/**
 * @swagger
 * /api/memories/auto-enhance:
 *   post:
 *     summary: Automatically enhance memories using business logic
 *     description: Apply salience scoring, highlight detection, and tag suggestions to memories
 *     tags: [Memory Business Logic]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               memory_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Specific memory IDs to enhance (if not provided, processes recent memories)
 *               batch_size:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               include_recent:
 *                 type: boolean
 *                 default: true
 *                 description: Include memories from last 30 days
 *               update_salience:
 *                 type: boolean
 *                 default: true
 *               update_highlights:
 *                 type: boolean
 *                 default: true
 *               suggest_tags:
 *                 type: boolean
 *                 default: false
 *               dry_run:
 *                 type: boolean
 *                 default: false
 *                 description: Preview changes without applying them
 *     responses:
 *       200:
 *         description: Enhancement results showing what was updated or would be updated
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleAutoEnhance(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const params = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Get memories to process
  let memoryQuery = supabaseServer
    .from('timeline_items')
    .select(`
      *,
      memory:memories!inner(*)
    `)
    .eq('user_id', userId)
    .eq('type', 'memory');

  if (params.memory_ids && params.memory_ids.length > 0) {
    // Process specific memories
    memoryQuery = memoryQuery.in('id', params.memory_ids);
  } else if (params.include_recent) {
    // Process recent memories (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    memoryQuery = memoryQuery.gte('memories.captured_at', thirtyDaysAgo.toISOString());
  }

  memoryQuery = memoryQuery.limit(params.batch_size);

  const { data: memories, error: fetchError } = await memoryQuery;

  if (fetchError) {
    console.error('Failed to fetch memories:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch memories for enhancement' }, { status: 500 });
  }

  if (!memories || memories.length === 0) {
    return NextResponse.json({
      message: 'No memories found to enhance',
      processed: 0,
      updated: 0,
      changes: []
    });
  }

  const enhancementResults = [];
  let updatedCount = 0;

  for (const memoryItem of memories) {
    try {
      const memory = Array.isArray(memoryItem.memory) ? memoryItem.memory[0] : memoryItem.memory;

      // Prepare memory data for analysis
      const memoryInput: MemoryAnalysisInput = {
        id: memoryItem.id,
        note: memory.note,
        title: memoryItem.title,
        memory_type: memory.memory_type,
        emotion_valence: memory.emotion_valence,
        emotion_arousal: memory.emotion_arousal,
        energy_delta: memory.energy_delta,
        place_name: memory.place_name,
        context: memory.context,
        tags: memory.tags || [],
        captured_at: memory.captured_at,
        importance_level: memory.importance_level,
        user_id: userId
      };

      // Analyze the memory
      const analysis = analyzeMemory(memoryInput);

      // Determine what needs to be updated
      const updates: any = {};
      const changes: string[] = [];

      if (params.update_salience && analysis.salience_score !== memory.salience_score) {
        updates.salience_score = analysis.salience_score;
        changes.push(`salience: ${memory.salience_score?.toFixed(3) || 'null'} → ${analysis.salience_score.toFixed(3)}`);
      }

      if (params.update_highlights && analysis.is_highlight !== memory.is_highlight) {
        updates.is_highlight = analysis.is_highlight;
        changes.push(`highlight: ${memory.is_highlight} → ${analysis.is_highlight}`);
      }

      if (params.suggest_tags && analysis.suggested_tags && analysis.suggested_tags.length > 0) {
        // Only add new tags that aren't already present
        const currentTags = memory.tags || [];
        const newTags = analysis.suggested_tags.filter(tag => !currentTags.includes(tag));

        if (newTags.length > 0) {
          updates.tags = [...currentTags, ...newTags];
          changes.push(`tags: +${newTags.join(', ')}`);
        }
      }

      const result: any = {
        memory_id: memoryItem.id,
        title: memoryItem.title || memory.note?.substring(0, 50) + '...',
        changes: changes,
        analysis_summary: {
          salience_score: analysis.salience_score,
          is_highlight: analysis.is_highlight,
          suggested_importance: analysis.suggested_importance_level,
          confidence: analysis.confidence_scores.salience_confidence
        }
      };

      // Apply updates if not a dry run and there are changes
      if (!params.dry_run && Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseServer
          .from('memories')
          .update(updates)
          .eq('id', memoryItem.id);

        if (updateError) {
          console.error(`Failed to update memory ${memoryItem.id}:`, updateError);
          result.error = 'Failed to apply updates';
        } else {
          result.applied = true;
          updatedCount++;
        }
      } else if (Object.keys(updates).length > 0) {
        result.would_update = true;
      } else {
        result.no_changes_needed = true;
      }

      enhancementResults.push(result);

    } catch (error) {
      console.error(`Error processing memory ${memoryItem.id}:`, error);
      enhancementResults.push({
        memory_id: memoryItem.id,
        error: 'Processing failed',
        changes: []
      });
    }
  }

  const summary = {
    processed: memories.length,
    updated: updatedCount,
    changes_detected: enhancementResults.filter(r => r.changes.length > 0).length,
    errors: enhancementResults.filter(r => r.error).length,
    dry_run: params.dry_run
  };

  const response = {
    summary,
    results: enhancementResults,
    parameters: params,
    processed_at: new Date().toISOString()
  };

  return NextResponse.json(response);
}

// Apply middleware
export const POST = withStandardMiddleware(handleAutoEnhance, {
  validation: {
    bodySchema: AutoEnhanceSchema
  },
  rateLimit: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10 // Restrictive for auto-enhancement
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
