import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import { z } from 'zod';
import { nowUTC } from '@/lib/utils/time-utils';

export const dynamic = 'force-dynamic';

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
async function handleGetRelationshipProfile(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: profileId } = await params;

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
    return NextResponse.json(mockProfile);
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
      return NextResponse.json({ error: 'Relationship profile not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch relationship profile' }, { status: 500 });
  }

  return NextResponse.json(data);
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
async function handleUpdateRelationshipProfile(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: profileId } = await params;
  const updateData = request.validatedBody!;

  // If Supabase is not configured, return mock response
  if (!supabaseServer) {
    const mockProfile = {
      id: profileId,
      user_id: 'mock-user',
      ...updateData,
      updated_at: nowUTC()
    };
    return NextResponse.json(mockProfile);
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
      return NextResponse.json({ error: 'Relationship profile not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update relationship profile' }, { status: 500 });
  }

  return NextResponse.json(data);
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
async function handleDeleteRelationshipProfile(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: profileId } = await params;

  // If Supabase is not configured, return mock response
  if (!supabaseServer) {
    return NextResponse.json({ success: true, message: 'Relationship profile deleted' });
  }

  // Delete relationship profile (cascading deletes will handle touchpoints)
  const { error } = await supabaseServer
    .from('relationship_profiles')
    .delete()
    .eq('id', profileId)
    .eq('user_id', userId);

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to delete relationship profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Relationship profile deleted successfully' });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetRelationshipProfile, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const PUT = withStandardMiddleware(handleUpdateRelationshipProfile, {
  validation: {
    bodySchema: RelationshipProfileUpdateSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDeleteRelationshipProfile, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
