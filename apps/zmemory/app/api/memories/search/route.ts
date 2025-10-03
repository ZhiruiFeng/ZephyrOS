import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/lib/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';

// Search query validation schema
const MemorySearchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  search_type: z.enum(['full_text', 'semantic', 'hybrid']).default('full_text'),
  include_anchored: z.boolean().default(true), // Include memories linked to matching timeline items
  include_context: z.boolean().default(true), // Include context field in search
  include_place: z.boolean().default(true), // Include place names in search
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional(),
  importance_level: z.enum(['low', 'medium', 'high']).optional(),
  is_highlight: z.boolean().optional(),
  from_date: z.string().datetime({ offset: true }).optional(),
  to_date: z.string().datetime({ offset: true }).optional(),
  min_salience: z.number().min(0).max(1).optional(),
  tags: z.string().optional(), // comma-separated
  limit: z.string().optional().transform(v => parseInt(v || '20')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
});

type MemorySearch = z.infer<typeof MemorySearchSchema>;

// Mock search results for development
const generateMockSearchResults = (query: string) => [
  {
    id: 'search-1',
    note: `Found relevant content about ${query}. This is a comprehensive note that matches your search criteria.`,
    memory_type: 'note',
    captured_at: new Date(Date.now() - 3600000).toISOString(),
    emotion_valence: 3,
    is_highlight: true,
    salience_score: 0.85,
    place_name: 'Home Office',
    tags: [query.toLowerCase(), 'important'],
    relevance_score: 0.95,
    match_type: 'content',
    highlights: [`Found relevant content about <mark>${query}</mark>`]
  },
  {
    id: 'search-2',
    note: 'Another memory that relates to your search query through contextual matching.',
    memory_type: 'thought',
    captured_at: new Date(Date.now() - 7200000).toISOString(),
    emotion_valence: 1,
    is_highlight: false,
    salience_score: 0.65,
    context: `Discussion about ${query}`,
    tags: ['thinking', 'analysis'],
    relevance_score: 0.78,
    match_type: 'context',
    highlights: [`Discussion about <mark>${query}</mark>`]
  }
];

/**
 * @swagger
 * /api/memories/search:
 *   get:
 *     summary: Advanced memory search
 *     description: Search memories using full-text, semantic, or hybrid approaches with ranking
 *     tags: [Memory Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: search_type
 *         schema:
 *           type: string
 *           enum: [full_text, semantic, hybrid]
 *           default: full_text
 *         description: Type of search to perform
 *       - in: query
 *         name: include_anchored
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include memories linked to matching timeline items
 *       - in: query
 *         name: include_context
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include context field in search
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [note, link, file, thought, quote, insight]
 *         description: Filter by memory type
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Search memories created after this date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Search memories created before this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum results to return
 *     responses:
 *       200:
 *         description: Search results with relevance scores and highlights
 */
async function handleGet(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  // Parse and validate search parameters
  const searchResult = MemorySearchSchema.safeParse(Object.fromEntries(searchParams));
  if (!searchResult.success) {
    return NextResponse.json(
      { error: 'Invalid search parameters', details: searchResult.error.errors },
      { status: 400 }
    );
  }

  const search = searchResult.data;

  // If Supabase is not configured, return mock search results
  if (!supabaseServer) {
    const mockResults = generateMockSearchResults(search.q);
    return NextResponse.json({
      results: mockResults.slice(search.offset, search.offset + search.limit),
      total_count: mockResults.length,
      search_type: search.search_type,
      query: search.q
    });
  }

  let searchResults: any[] = [];
  let totalCount = 0;

  // Perform different types of search based on search_type
  switch (search.search_type) {
    case 'full_text':
      const fullTextResults = await performFullTextSearch(supabaseServer, userId, search);
      searchResults = fullTextResults.results;
      totalCount = fullTextResults.totalCount;
      break;

    case 'semantic':
      // For semantic search, we would use vector embeddings
      // For now, fall back to enhanced full-text search
      const semanticResults = await performSemanticSearch(supabaseServer, userId, search);
      searchResults = semanticResults.results;
      totalCount = semanticResults.totalCount;
      break;

    case 'hybrid':
      // Combine full-text and semantic results
      const hybridResults = await performHybridSearch(supabaseServer, userId, search);
      searchResults = hybridResults.results;
      totalCount = hybridResults.totalCount;
      break;
  }

  return NextResponse.json({
    results: searchResults,
    total_count: totalCount,
    search_type: search.search_type,
    query: search.q,
    filters: {
      memory_type: search.memory_type,
      importance_level: search.importance_level,
      is_highlight: search.is_highlight,
      from_date: search.from_date,
      to_date: search.to_date
    }
  });
}

// Full-text search implementation
async function performFullTextSearch(client: any, userId: string, search: MemorySearch) {
  let query = client
    .from('memories')
    .select(`
      *,
      category:categories(id, name, color, icon)
    `)
    .eq('user_id', userId);

  // Build search conditions
  const searchTerms = search.q.toLowerCase().split(' ').filter(term => term.length > 2);

  // Create search conditions for multiple fields
  const searchConditions: string[] = [];

  // Search in note content (primary)
  searchConditions.push(`note.ilike.%${search.q}%`);

  if (search.include_context) {
    searchConditions.push(`context.ilike.%${search.q}%`);
  }

  if (search.include_place) {
    searchConditions.push(`place_name.ilike.%${search.q}%`);
  }

  // Search in source field
  searchConditions.push(`source.ilike.%${search.q}%`);

  // Apply search conditions
  if (searchConditions.length > 0) {
    query = query.or(searchConditions.join(','));
  }

  // Apply filters
  if (search.memory_type) {
    query = query.eq('memory_type', search.memory_type);
  }
  if (search.importance_level) {
    query = query.eq('importance_level', search.importance_level);
  }
  if (search.is_highlight !== undefined) {
    query = query.eq('is_highlight', search.is_highlight);
  }
  if (search.from_date) {
    query = query.gte('captured_at', search.from_date);
  }
  if (search.to_date) {
    query = query.lte('captured_at', search.to_date);
  }
  if (search.min_salience !== undefined) {
    query = query.gte('salience_score', search.min_salience);
  }
  if (search.tags) {
    const filterTags = search.tags.split(',').map(tag => tag.trim());
    query = query.overlaps('tags', filterTags);
  }

  // Order by relevance (salience_score) and recency
  query = query.order('salience_score', { ascending: false })
    .order('captured_at', { ascending: false })
    .range(search.offset, search.offset + search.limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Full-text search error:', error);
    throw error;
  }

  // Add relevance scoring and highlights
  const results = (data || []).map((memory: any) => ({
    ...memory,
    relevance_score: calculateRelevanceScore(memory, search.q),
    match_type: determineMatchType(memory, search.q),
    highlights: generateHighlights(memory, search.q)
  }));

  // Sort by relevance score
  results.sort((a: any, b: any) => b.relevance_score - a.relevance_score);

  return {
    results,
    totalCount: data?.length || 0
  };
}

// Semantic search placeholder (would use vector embeddings)
async function performSemanticSearch(client: any, userId: string, search: MemorySearch) {
  // TODO: Implement actual semantic search with vector embeddings
  // For now, perform enhanced full-text search with synonym expansion

  return performFullTextSearch(client, userId, search);
}

// Hybrid search combining multiple approaches
async function performHybridSearch(client: any, userId: string, search: MemorySearch) {
  // Get results from both full-text and semantic search
  const fullTextResults = await performFullTextSearch(client, userId, search);
  // const semanticResults = await performSemanticSearch(client, userId, search);

  // For now, just return full-text results
  // TODO: Implement proper result fusion and ranking

  return fullTextResults;
}

// Calculate relevance score based on multiple factors
function calculateRelevanceScore(memory: any, query: string): number {
  let score = 0;

  const queryLower = query.toLowerCase();
  const noteLower = (memory.note || '').toLowerCase();
  const contextLower = (memory.context || '').toLowerCase();
  const placeLower = (memory.place_name || '').toLowerCase();

  // Exact match in note (highest weight)
  if (noteLower.includes(queryLower)) score += 1.0;

  // Match in context
  if (contextLower.includes(queryLower)) score += 0.7;

  // Match in place name
  if (placeLower.includes(queryLower)) score += 0.5;

  // Boost for highlights
  if (memory.is_highlight) score += 0.3;

  // Boost for high salience
  score += (memory.salience_score || 0) * 0.2;

  // Recency boost (newer memories get slight boost)
  const daysSinceCapture = (Date.now() - new Date(memory.captured_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCapture < 7) score += 0.1;
  else if (daysSinceCapture < 30) score += 0.05;

  return Math.min(1.0, score); // Cap at 1.0
}

// Determine primary match type
function determineMatchType(memory: any, query: string): string {
  const queryLower = query.toLowerCase();

  if ((memory.note || '').toLowerCase().includes(queryLower)) return 'content';
  if ((memory.context || '').toLowerCase().includes(queryLower)) return 'context';
  if ((memory.place_name || '').toLowerCase().includes(queryLower)) return 'location';
  if ((memory.source || '').toLowerCase().includes(queryLower)) return 'source';

  return 'other';
}

// Generate highlighted text snippets
function generateHighlights(memory: any, query: string): string[] {
  const highlights: string[] = [];
  const queryLower = query.toLowerCase();

  // Highlight in note content
  if (memory.note && memory.note.toLowerCase().includes(queryLower)) {
    const highlighted = highlightText(memory.note, query);
    highlights.push(highlighted);
  }

  // Highlight in context
  if (memory.context && memory.context.toLowerCase().includes(queryLower)) {
    const highlighted = highlightText(memory.context, query);
    highlights.push(`Context: ${highlighted}`);
  }

  // Highlight in place name
  if (memory.place_name && memory.place_name.toLowerCase().includes(queryLower)) {
    const highlighted = highlightText(memory.place_name, query);
    highlights.push(`Location: ${highlighted}`);
  }

  return highlights;
}

// Helper function to highlight matching text
function highlightText(text: string, query: string): string {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});
