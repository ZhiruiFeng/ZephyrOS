import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabase-server';
import { getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';
import { z } from 'zod';
import { nowUTC } from '../../../../../lib/time-utils';

// Validation schemas
const RelationshipProfileUpdateSchema = z.object({
  tier: z.number().int().refine(val => [5, 15, 50, 150].includes(val), 'Tier must be 5, 15, 50, or 150').optional(),
  cadence_days: z.number().int().min(1).max(365).optional(),
  reason_for_tier: z.string().optional(),
  relationship_context: z.string().optional(),
  how_met: z.string().optional(),
  is_dormant: z.boolean().optional(),
  health_score: z.number().int().min(0).max(100).optional(),
  reciprocity_balance: z.number().int().optional(),
});

/**
 * @swagger
 * /api/relations/profiles/{id}:
 *   get:
 *     summary: Get a specific relationship profile
 *     description: Retrieve details of a specific relationship profile
 *     tags: [Relations - Profiles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relationship profile ID
 *     responses:
 *       200:
 *         description: Relationship profile details
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;
  try {
    // Rate limiting
    const rlKey = `${getClientIP(request)}:GET:/api/relations/profiles/[id]`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If Supabase is not configured, return mock data
    if (!supabaseServer) {
      const mockProfile = {
        id: profileId,
        user_id: 'mock-user',
        person_id: '1',
        tier: 50,
        cadence_days: 30,
        last_contact_at: new Date(Date.now() - 604800000).toISOString(),
        health_score: 85,
        reciprocity_balance: 2,
        is_dormant: false,
        reason_for_tier: 'Professional colleague',
        relationship_context: 'work',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        person: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Tech Corp'
        }
      };
      return jsonWithCors(request, mockProfile);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Get relationship profile with person details and recent touchpoints
    const { data, error } = await supabaseServer
      .from('relationship_profiles')
      .select(`
        *,
        person:people(
          id,
          name,
          email,
          phone,
          company,
          job_title,
          location,
          avatar_url,
          notes
        ),
        recent_touchpoints:relationship_touchpoints(
          id,
          channel,
          direction,
          summary,
          sentiment,
          is_give,
          created_at
        )
      `)
      .eq('id', profileId)
      .eq('user_id', userId)
      .order('created_at', { referencedTable: 'relationship_touchpoints', ascending: false })
      .limit(10, { referencedTable: 'relationship_touchpoints' })
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Relationship profile not found' }, 404);
      }
      return jsonWithCors(request, { error: 'Failed to fetch relationship profile' }, 500);
    }

    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/relations/profiles/{id}:
 *   put:
 *     summary: Update a relationship profile
 *     description: Update tier, cadence, or other relationship profile settings
 *     tags: [Relations - Profiles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relationship profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tier:
 *                 type: integer
 *                 enum: [5, 15, 50, 150]
 *                 description: Dunbar tier
 *               cadence_days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: How often to check in (days)
 *               reason_for_tier:
 *                 type: string
 *                 description: Why this person is in this tier
 *               relationship_context:
 *                 type: string
 *                 description: Context of relationship
 *               how_met:
 *                 type: string
 *                 description: How you met this person
 *               is_dormant:
 *                 type: boolean
 *                 description: Whether this relationship is dormant
 *               health_score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Manual health score override
 *               reciprocity_balance:
 *                 type: integer
 *                 description: Give/ask balance (-ve = asking more, +ve = giving more)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid profile data
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;
  try {
    // Rate limiting
    const putKey = `${getClientIP(request)}:PUT:/api/relations/profiles/[id]`;
    if (isRateLimited(putKey, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }
    const body = await request.json();

    // Validate request body
    const validationResult = RelationshipProfileUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonWithCors(request, { error: 'Invalid profile data', details: validationResult.error.errors }, 400);
    }

    const updateData = validationResult.data;

    // If Supabase is not configured, return mock response
    if (!supabaseServer) {
      const mockProfile = {
        id: profileId,
        user_id: 'mock-user',
        ...updateData,
        updated_at: nowUTC()
      };
      return jsonWithCors(request, mockProfile);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Special handling for dormancy status changes
    const now = nowUTC();
    const finalUpdateData: any = { ...updateData, updated_at: now };

    if (updateData.is_dormant === true) {
      // Mark as dormant and set dormant_since timestamp
      finalUpdateData.dormant_since = now;
    } else if (updateData.is_dormant === false) {
      // Reviving from dormancy, clear dormant_since
      finalUpdateData.dormant_since = null;
    }

    // Update relationship profile
    const { data, error } = await supabaseServer
      .from('relationship_profiles')
      .update(finalUpdateData)
      .eq('id', profileId)
      .eq('user_id', userId)
      .select(`
        *,
        person:people(
          id,
          name,
          email,
          company,
          job_title,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Relationship profile not found' }, 404);
      }
      return jsonWithCors(request, { error: 'Failed to update relationship profile' }, 500);
    }

    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/relations/profiles/{id}:
 *   delete:
 *     summary: Delete a relationship profile
 *     description: Remove relationship profile (person remains, but no longer tracked for relationship management)
 *     tags: [Relations - Profiles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relationship profile ID
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;
  try {
    // Rate limiting
    const deleteKey = `${getClientIP(request)}:DELETE:/api/relations/profiles/[id]`;
    if (isRateLimited(deleteKey, 15 * 60 * 1000, 20)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If Supabase is not configured, return mock response
    if (!supabaseServer) {
      return jsonWithCors(request, { success: true, message: 'Relationship profile deleted' });
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Delete relationship profile (cascading deletes will handle touchpoints)
    const { error } = await supabaseServer
      .from('relationship_profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete relationship profile' }, 500);
    }

    return jsonWithCors(request, { success: true, message: 'Relationship profile deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}