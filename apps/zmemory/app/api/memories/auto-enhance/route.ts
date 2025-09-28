import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { analyzeMemory, type MemoryAnalysisInput } from '@/lib/memory-business-logic';
import { z } from 'zod';

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
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - restrictive for auto-enhancement
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 60 * 60 * 1000, 10)) { // 10 requests per hour
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const body = await request.json().catch(() => ({})); // Default to empty object
    
    console.log('=== AUTO-ENHANCE API DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = AutoEnhanceSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('AUTO-ENHANCE Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid enhancement parameters', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const params = validationResult.data;

    console.log('Processing auto-enhancement with params:', JSON.stringify(params, null, 2));

    // Get memories to process
    let memoryQuery = client
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
      return jsonWithCors(request, { error: 'Failed to fetch memories for enhancement' }, 500);
    }

    if (!memories || memories.length === 0) {
      return jsonWithCors(request, { 
        message: 'No memories found to enhance',
        processed: 0,
        updated: 0,
        changes: []
      });
    }

    console.log(`Processing ${memories.length} memories for enhancement`);

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
          const { error: updateError } = await client
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

    console.log('Auto-enhancement completed:', JSON.stringify(summary, null, 2));

    return jsonWithCors(request, response);

  } catch (error) {
    console.error('Auto-enhance API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}