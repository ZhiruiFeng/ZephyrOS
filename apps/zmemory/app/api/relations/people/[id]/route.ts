import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabase-server';
import { getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';
import { z } from 'zod';
import { nowUTC } from '../../../../../lib/time-utils';

// Validation schemas
const PersonUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
  notes: z.string().optional(),
  company: z.string().max(255).optional(),
  job_title: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  social_linkedin: z.string().max(255).optional(),
  social_twitter: z.string().max(255).optional(),
});

/**
 * @swagger
 * /api/relations/people/{id}:
 *   get:
 *     summary: Get a specific person
 *     description: Retrieve details of a specific person including their relationship profile
 *     tags: [Relations - People]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Person ID
 *     responses:
 *       200:
 *         description: Person details
 *       404:
 *         description: Person not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: personId } = await params;
  try {
    // Rate limiting
    const rlKey = `${getClientIP(request)}:GET:/api/relations/people/[id]`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If Supabase is not configured, return mock data
    if (!supabaseServer) {
      const mockPerson = {
        id: personId,
        user_id: 'mock-user',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
        company: 'Tech Corp',
        job_title: 'Software Engineer',
        location: 'San Francisco, CA',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        relationship_profile: {
          id: 'profile-1',
          tier: 50,
          health_score: 85,
          last_contact_at: new Date(Date.now() - 604800000).toISOString(),
          is_dormant: false,
          cadence_days: 30,
          reason_for_tier: 'Professional colleague'
        }
      };
      return jsonWithCors(request, mockPerson);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Get person with relationship profile and recent touchpoints
    const { data, error } = await supabaseServer
      .from('people')
      .select(`
        *,
        relationship_profile:relationship_profiles(
          id,
          tier,
          health_score,
          last_contact_at,
          is_dormant,
          dormant_since,
          cadence_days,
          reason_for_tier,
          relationship_context,
          how_met,
          reciprocity_balance
        ),
        recent_touchpoints:relationship_touchpoints(
          id,
          channel,
          direction,
          summary,
          sentiment,
          created_at
        )
      `)
      .eq('id', personId)
      .eq('user_id', userId)
      .order('created_at', { referencedTable: 'relationship_touchpoints', ascending: false })
      .limit(5, { referencedTable: 'relationship_touchpoints' })
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Person not found' }, 404);
      }
      return jsonWithCors(request, { error: 'Failed to fetch person' }, 500);
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
 * /api/relations/people/{id}:
 *   put:
 *     summary: Update a person
 *     description: Update contact information for a specific person
 *     tags: [Relations - People]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Person ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 maxLength: 50
 *               avatar_url:
 *                 type: string
 *                 format: url
 *               notes:
 *                 type: string
 *               company:
 *                 type: string
 *                 maxLength: 255
 *               job_title:
 *                 type: string
 *                 maxLength: 255
 *               location:
 *                 type: string
 *                 maxLength: 255
 *               social_linkedin:
 *                 type: string
 *                 maxLength: 255
 *               social_twitter:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Person updated successfully
 *       400:
 *         description: Invalid person data
 *       404:
 *         description: Person not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: personId } = await params;
  try {
    // Rate limiting
    const putKey = `${getClientIP(request)}:PUT:/api/relations/people/[id]`;
    if (isRateLimited(putKey, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }
    const body = await request.json();

    // Validate request body
    const validationResult = PersonUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonWithCors(request, { error: 'Invalid person data', details: validationResult.error.errors }, 400);
    }

    const updateData = validationResult.data;

    // If Supabase is not configured, return mock response
    if (!supabaseServer) {
      const mockPerson = {
        id: personId,
        user_id: 'mock-user',
        ...updateData,
        updated_at: nowUTC()
      };
      return jsonWithCors(request, mockPerson);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Update person
    const { data, error } = await supabaseServer
      .from('people')
      .update({
        ...updateData,
        updated_at: nowUTC()
      })
      .eq('id', personId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Person not found' }, 404);
      }
      return jsonWithCors(request, { error: 'Failed to update person' }, 500);
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
 * /api/relations/people/{id}:
 *   delete:
 *     summary: Delete a person
 *     description: Remove a person from the user's network (also removes relationship profile and touchpoints)
 *     tags: [Relations - People]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Person ID
 *     responses:
 *       200:
 *         description: Person deleted successfully
 *       404:
 *         description: Person not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: personId } = await params;
  try {
    // Rate limiting
    const deleteKey = `${getClientIP(request)}:DELETE:/api/relations/people/[id]`;
    if (isRateLimited(deleteKey, 15 * 60 * 1000, 20)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If Supabase is not configured, return mock response
    if (!supabaseServer) {
      return jsonWithCors(request, { success: true, message: 'Person deleted' });
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Delete person (cascading deletes will handle related data)
    const { error } = await supabaseServer
      .from('people')
      .delete()
      .eq('id', personId)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete person' }, 500);
    }

    return jsonWithCors(request, { success: true, message: 'Person deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}