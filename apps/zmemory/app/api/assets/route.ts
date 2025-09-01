import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../lib/security';
import { 
  AssetCreateSchema,
  AssetsQuerySchema,
  type AssetCreateBody,
  type AssetsQuery
} from '../../../lib/validators';
import { nowUTC } from '../../../lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for development/testing
const generateMockAssets = () => [
  {
    id: 'asset-123',
    url: 'https://example.com/sunset.jpg',
    mime_type: 'image/jpeg',
    kind: 'image',
    duration_seconds: null,
    file_size_bytes: 2048576,
    hash_sha256: 'abc123def456789',
    user_id: 'mock-user',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'asset-456',
    url: 'https://example.com/voice-note.m4a',
    mime_type: 'audio/m4a',
    kind: 'audio',
    duration_seconds: 45,
    file_size_bytes: 512000,
    hash_sha256: 'def456ghi789abc',
    user_id: 'mock-user',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'asset-789',
    url: 'https://example.com/document.pdf',
    mime_type: 'application/pdf',
    kind: 'document',
    duration_seconds: null,
    file_size_bytes: 1024000,
    hash_sha256: 'ghi789jkl012mno',
    user_id: 'mock-user',
    created_at: new Date(Date.now() - 10800000).toISOString()
  }
];

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: Get user assets
 *     description: Retrieve all assets belonging to the authenticated user with filtering options
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: kind
 *         schema:
 *           type: string
 *           enum: [image, audio, video, document, link]
 *         description: Filter by asset kind
 *       - in: query
 *         name: mime_type
 *         schema:
 *           type: string
 *         description: Filter by MIME type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of assets to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of assets to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, file_size_bytes, kind]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of assets
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = AssetsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let assets = generateMockAssets();
      
      // Apply filters to mock data
      if (query.kind) {
        assets = assets.filter(a => a.kind === query.kind);
      }
      if (query.mime_type) {
        assets = assets.filter(a => a.mime_type === query.mime_type);
      }
      
      // Apply sorting
      assets.sort((a, b) => {
        let comparison = 0;
        switch (query.sort_by) {
          case 'file_size_bytes':
            comparison = (a.file_size_bytes || 0) - (b.file_size_bytes || 0);
            break;
          case 'kind':
            comparison = a.kind.localeCompare(b.kind);
            break;
          case 'created_at':
          default:
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return query.sort_order === 'asc' ? comparison : -comparison;
      });
      
      return jsonWithCors(request, assets.slice(query.offset, query.offset + query.limit));
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockAssets().slice(query.offset, query.offset + query.limit));
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Build query
    let dbQuery = client
      .from('assets')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (query.kind) {
      dbQuery = dbQuery.eq('kind', query.kind);
    }
    if (query.mime_type) {
      dbQuery = dbQuery.eq('mime_type', query.mime_type);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    dbQuery = dbQuery.order(query.sort_by, { ascending });

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;
    
    if (error) {
      console.error('Database error:', error);
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockAssets().slice(query.offset, query.offset + query.limit));
      }
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
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
 * /api/assets:
 *   post:
 *     summary: Create a new asset
 *     description: Create a new asset record for uploaded files or external URLs
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL where the asset is stored
 *               mime_type:
 *                 type: string
 *                 description: MIME type of the asset
 *               kind:
 *                 type: string
 *                 enum: [image, audio, video, document, link]
 *                 description: Type of asset
 *               duration_seconds:
 *                 type: integer
 *                 minimum: 1
 *                 description: Duration for audio/video assets
 *               file_size_bytes:
 *                 type: integer
 *                 minimum: 1
 *                 description: File size in bytes
 *               hash_sha256:
 *                 type: string
 *                 description: SHA-256 hash for deduplication
 *             required: [url, mime_type, kind]
 *     responses:
 *       201:
 *         description: Asset created successfully
 *       409:
 *         description: Asset with same hash already exists
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    console.log('=== CREATE ASSET API DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = AssetCreateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('CREATE ASSET Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid asset data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const assetData = validationResult.data;
    const now = nowUTC();

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockAsset = {
        id: Date.now().toString(),
        ...assetData,
        user_id: 'mock-user',
        created_at: now
      };
      return jsonWithCors(request, mockAsset, 201);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Check for duplicate hash (if provided)
    if (assetData.hash_sha256) {
      const { data: existingAsset } = await client
        .from('assets')
        .select('id, url')
        .eq('hash_sha256', assetData.hash_sha256)
        .eq('user_id', userId)
        .single();

      if (existingAsset) {
        return jsonWithCors(request, { 
          error: 'Asset with same hash already exists',
          existing_asset: existingAsset
        }, 409);
      }
    }

    // Create asset
    const insertPayload = {
      ...assetData,
      user_id: userId,
      created_at: now
    };

    console.log('Creating asset with payload:', JSON.stringify(insertPayload, null, 2));

    const { data, error } = await client
      .from('assets')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to create asset' }, 500);
    }

    console.log('Returning created asset:', JSON.stringify(data, null, 2));
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