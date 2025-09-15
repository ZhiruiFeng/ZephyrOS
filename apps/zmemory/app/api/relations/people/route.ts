import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase-server';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security';
import { z } from 'zod';
import { nowUTC } from '../../../../lib/time-utils';

// Validation schemas
const PersonCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
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

const PersonUpdateSchema = PersonCreateSchema.partial();

const PersonQuerySchema = z.object({
  search: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  limit: z.string().transform(val => parseInt(val) || 50).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
  sort_by: z.enum(['name', 'company', 'created_at', 'updated_at']).optional().default('name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Mock data for development
const generateMockPeople = () => [
  {
    id: '1',
    user_id: 'mock-user',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123',
    company: 'Tech Corp',
    job_title: 'Software Engineer',
    location: 'San Francisco, CA',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'mock-user',
    name: 'Jane Smith',
    email: 'jane@company.com',
    company: 'StartupXYZ',
    job_title: 'Product Manager',
    location: 'New York, NY',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

/**
 * @swagger
 * /api/relations/people:
 *   get:
 *     summary: Get all contacts/people
 *     description: Retrieve all people in the user's network with optional filtering
 *     tags: [Relations - People]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or company
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Filter by company
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of people to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of people to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, company, created_at, updated_at]
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of people
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   company:
 *                     type: string
 *                   job_title:
 *                     type: string
 *                   location:
 *                     type: string
 *                   relationship_profile:
 *                     type: object
 *                     properties:
 *                       tier:
 *                         type: integer
 *                       health_score:
 *                         type: integer
 *                       last_contact_at:
 *                         type: string
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rlKey = `${getClientIP(request)}:GET:/api/relations/people`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 200)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = PersonQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, { error: 'Invalid query parameters', details: queryResult.error.errors }, 400);
    }

    const query = queryResult.data;

    // If Supabase is not configured, return mock data
    if (!supabaseServer) {
      let people = generateMockPeople();

      // Apply basic filters to mock data
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        people = people.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.email && p.email.toLowerCase().includes(searchLower)) ||
          (p.company && p.company.toLowerCase().includes(searchLower))
        );
      }
      if (query.company) {
        people = people.filter(p => p.company && p.company.toLowerCase().includes(query.company!.toLowerCase()));
      }
      if (query.location) {
        people = people.filter(p => p.location && p.location.toLowerCase().includes(query.location!.toLowerCase()));
      }

      return jsonWithCors(request, people.slice(query.offset || 0, (query.offset || 0) + (query.limit || 50)));
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Build Supabase query with relationship profile data
    let dbQuery = supabaseServer
      .from('people')
      .select(`
        *,
        relationship_profile:relationship_profiles(
          id,
          tier,
          health_score,
          last_contact_at,
          is_dormant,
          cadence_days,
          reason_for_tier,
          relationship_context
        )
      `)
      .eq('user_id', userId);

    // Apply filters
    if (query.search) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query.search}%,email.ilike.%${query.search}%,company.ilike.%${query.search}%`
      );
    }
    if (query.company) {
      dbQuery = dbQuery.ilike('company', `%${query.company}%`);
    }
    if (query.location) {
      dbQuery = dbQuery.ilike('location', `%${query.location}%`);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    dbQuery = dbQuery.order(query.sort_by, { ascending });

    // Apply pagination
    dbQuery = dbQuery.range(query.offset || 0, (query.offset || 0) + (query.limit || 50) - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockPeople().slice(query.offset || 0, (query.offset || 0) + (query.limit || 50)));
      }
      return jsonWithCors(request, { error: 'Failed to fetch people' }, 500);
    }

    return jsonWithCors(request, data || []);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/relations/people:
 *   post:
 *     summary: Create a new contact/person
 *     description: Add a new person to the user's network
 *     tags: [Relations - People]
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
 *                 description: Full name (required)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               phone:
 *                 type: string
 *                 maxLength: 50
 *                 description: Phone number
 *               avatar_url:
 *                 type: string
 *                 format: url
 *                 description: Profile picture URL
 *               notes:
 *                 type: string
 *                 description: Personal notes about this person
 *               company:
 *                 type: string
 *                 maxLength: 255
 *                 description: Company name
 *               job_title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Job title
 *               location:
 *                 type: string
 *                 maxLength: 255
 *                 description: Location/city
 *               social_linkedin:
 *                 type: string
 *                 maxLength: 255
 *                 description: LinkedIn profile URL
 *               social_twitter:
 *                 type: string
 *                 maxLength: 255
 *                 description: Twitter handle
 *             required: [name]
 *             example:
 *               name: "John Doe"
 *               email: "john@example.com"
 *               company: "Tech Corp"
 *               job_title: "Software Engineer"
 *               location: "San Francisco, CA"
 *     responses:
 *       201:
 *         description: Person created successfully
 *       400:
 *         description: Invalid person data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const postKey = `${getClientIP(request)}:POST:/api/relations/people`;
    if (isRateLimited(postKey, 15 * 60 * 1000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();

    // Validate request body
    const validationResult = PersonCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonWithCors(request, { error: 'Invalid person data', details: validationResult.error.errors }, 400);
    }

    const personData = validationResult.data;
    const now = nowUTC();

    // If Supabase is not configured, return mock response
    if (!supabaseServer) {
      const mockPerson = {
        id: Date.now().toString(),
        user_id: 'mock-user',
        ...personData,
        created_at: now,
        updated_at: now
      };
      return jsonWithCors(request, mockPerson, 201);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Create person
    const personPayload = {
      ...personData,
      user_id: userId,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabaseServer
      .from('people')
      .insert(personPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to create person' }, 500);
    }

    return jsonWithCors(request, data, 201);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}