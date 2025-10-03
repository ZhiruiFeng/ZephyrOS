import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import { z } from 'zod';

// Query validation schema
const BrokerageQuerySchema = z.object({
  min_strength_score: z.string().transform(val => parseInt(val) || 60).optional(),
  exclude_recent_days: z.string().transform(val => parseInt(val) || 90).optional(), // Don't suggest recent introductions
  limit: z.string().transform(val => parseInt(val) || 10).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
  sort_by: z.enum(['strength_score', 'mutual_benefit_score', 'introduction_likelihood']).optional().default('strength_score'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Mock data for development
const generateMockBrokerageOpportunities = () => [
  {
    id: 'suggestion-1',
    person_a: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Tech Corp',
      job_title: 'Software Engineer',
      avatar_url: null
    },
    person_b: {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@company.com',
      company: 'StartupXYZ',
      job_title: 'Product Manager',
      avatar_url: null
    },
    rationale: 'Both are in tech with complementary skills - John has deep technical expertise while Jane has strong product vision. They could collaborate on innovative projects.',
    mutual_benefit_potential: 'High',
    introduction_context: 'professional development and potential collaboration',
    suggested_setting: 'Virtual coffee chat or tech meetup',
    strength_score: 85,
    mutual_benefit_score: 90,
    introduction_likelihood: 80,
    suggested_message: "Hi John and Jane! I think you two would really hit it off. John, meet Jane - she's an exceptional product manager at StartupXYZ with a great eye for user experience. Jane, John is a brilliant software engineer at Tech Corp who loves working on innovative solutions. I thought you might enjoy chatting about the intersection of product and engineering. Would you both be up for a quick virtual coffee sometime?",
    next_steps: [
      'Send introduction email',
      'Offer to facilitate initial meeting',
      'Follow up in 2 weeks on connection outcome'
    ],
    tags: ['tech', 'collaboration', 'product-engineering']
  },
  {
    id: 'suggestion-2',
    person_a: {
      id: '3',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      company: 'Design Studio',
      job_title: 'Creative Director',
      avatar_url: null
    },
    person_b: {
      id: '4',
      name: 'Michael Chen',
      email: 'michael@tech.co',
      company: 'TechCorp',
      job_title: 'Software Architect',
      avatar_url: null
    },
    rationale: 'Alice has strong design expertise and Michael has technical leadership skills. They could work together on design systems or user-focused technical products.',
    mutual_benefit_potential: 'Medium-High',
    introduction_context: 'design-tech collaboration and knowledge exchange',
    suggested_setting: 'Design meetup or tech conference',
    strength_score: 75,
    mutual_benefit_score: 82,
    introduction_likelihood: 70,
    suggested_message: "Alice and Michael, I'd love to introduce you two! Alice is a fantastic creative director with deep expertise in user-centered design, and Michael is a thoughtful software architect who really cares about the user experience of technical products. I think you'd both bring unique perspectives to each other's work. Would you be interested in connecting?",
    next_steps: [
      'Check availability for introduction',
      'Share relevant work portfolios',
      'Suggest attending design-tech meetup together'
    ],
    tags: ['design', 'architecture', 'user-experience']
  }
];

/**
 * @swagger
 * /api/relations/brokerage:
 *   get:
 *     summary: Get brokerage opportunities
 *     description: Find potential introductions between people in your network based on Burt's structural holes theory. Identifies valuable connections that could benefit both parties.
 *     tags: [Relations - Brokerage]
 *     parameters:
 *       - in: query
 *         name: min_strength_score
 *         schema:
 *           type: integer
 *           default: 60
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum strength score for introduction suggestions
 *       - in: query
 *         name: exclude_recent_days
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Don't suggest introductions made within this many days
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions (keep manageable for weekly review)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of suggestions to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [strength_score, mutual_benefit_score, introduction_likelihood]
 *           default: strength_score
 *         description: Sort by metric
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction (desc = highest scores first)
 *     responses:
 *       200:
 *         description: Brokerage opportunities with introduction guidance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 opportunities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       person_a:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           company:
 *                             type: string
 *                           job_title:
 *                             type: string
 *                       person_b:
 *                         type: object
 *                       rationale:
 *                         type: string
 *                       mutual_benefit_potential:
 *                         type: string
 *                       introduction_context:
 *                         type: string
 *                       suggested_setting:
 *                         type: string
 *                       strength_score:
 *                         type: integer
 *                       mutual_benefit_score:
 *                         type: integer
 *                       introduction_likelihood:
 *                         type: integer
 *                       suggested_message:
 *                         type: string
 *                       next_steps:
 *                         type: array
 *                         items:
 *                           type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_opportunities:
 *                       type: integer
 *                     high_potential:
 *                       type: integer
 *                     average_strength_score:
 *                       type: number
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleGet(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!

  const { searchParams } = new URL(request.url)

  // Parse and validate query parameters
  const queryResult = BrokerageQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!queryResult.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: queryResult.error.errors }, { status: 400 })
  }

  const query = queryResult.data

  // If Supabase is not configured, return mock data
  if (!supabaseServer) {
    const mockOpportunities = generateMockBrokerageOpportunities()
    const mockSummary = {
      total_opportunities: mockOpportunities.length,
      high_potential: mockOpportunities.filter(o => o.strength_score >= 80).length,
      average_strength_score: 80
    }

    return NextResponse.json({
      opportunities: mockOpportunities.slice(query.offset || 0, (query.offset || 0) + (query.limit || 10)),
      summary: mockSummary
    })
  }

  // Complex query to find brokerage opportunities
  // This identifies pairs of people who:
  // 1. Are both connected to the user
  // 2. Are not already connected to each other (or introduction not recently attempted)
  // 3. Have complementary profiles that suggest mutual benefit

  // First, get all active relationship profiles for the user
  const { data: profiles, error: profilesError } = await supabaseServer!
    .from('relationship_profiles')
    .select(`
      id,
      person_id,
      tier,
      health_score,
      relationship_context,
      person:people(
        id,
        name,
        email,
        company,
        job_title,
        location,
        avatar_url
      )
    `)
    .eq('user_id', userId)
    .eq('is_dormant', false)
    .gte('health_score', 50) // Only suggest introductions for healthy relationships

  if (profilesError) {
    console.error('Database error fetching profiles:', profilesError)
    if (process.env.NODE_ENV !== 'production') {
      const mockOpportunities = generateMockBrokerageOpportunities()
      const mockSummary = {
        total_opportunities: mockOpportunities.length,
        high_potential: 2,
        average_strength_score: 80
      }
      return NextResponse.json({
        opportunities: mockOpportunities.slice(query.offset || 0, (query.offset || 0) + (query.limit || 10)),
        summary: mockSummary
      })
    }
    return NextResponse.json({ error: 'Failed to fetch brokerage opportunities' }, { status: 500 })
  }

  // Get recent introductions to exclude
  const recentCutoff = new Date()
  recentCutoff.setDate(recentCutoff.getDate() - (query.exclude_recent_days || 90))

  const { data: recentIntros } = await supabaseServer!
    .from('relationship_introductions')
    .select('person_a_id, person_b_id')
    .eq('user_id', userId)
    .gte('created_at', recentCutoff.toISOString())

  const recentIntroSet = new Set(
    (recentIntros || []).map(intro => `${intro.person_a_id}-${intro.person_b_id}`)
  )

  // Generate brokerage opportunities
  const opportunities = []
  const processedPairs = new Set()

  for (let i = 0; i < (profiles || []).length; i++) {
    for (let j = i + 1; j < (profiles || []).length; j++) {
      const personA = profiles![i]
      const personB = profiles![j]

      // Skip if introduction was recently attempted
      const pairKey1 = `${personA.person_id}-${personB.person_id}`
      const pairKey2 = `${personB.person_id}-${personA.person_id}`

      if (recentIntroSet.has(pairKey1) || recentIntroSet.has(pairKey2) || processedPairs.has(pairKey1)) {
        continue
      }
      processedPairs.add(pairKey1)
      processedPairs.add(pairKey2)

      // Calculate brokerage opportunity scores
      const opportunity = calculateBrokerageOpportunity(personA, personB)

      if (opportunity && opportunity.strength_score >= (query.min_strength_score || 60)) {
        opportunities.push(opportunity)
      }
    }
  }

  // Sort opportunities
  opportunities.sort((a, b) => {
    const sortField = query.sort_by || 'strength_score'
    const sortOrder = query.sort_order === 'asc' ? 1 : -1
    const aValue = Number(a[sortField as keyof typeof a] || 0)
    const bValue = Number(b[sortField as keyof typeof b] || 0)
    return sortOrder * (bValue - aValue)
  })

  // Apply pagination
  const paginatedOpportunities = opportunities.slice(query.offset || 0, (query.offset || 0) + (query.limit || 10))

  // Calculate summary
  const summary = {
    total_opportunities: opportunities.length,
    high_potential: opportunities.filter(o => o.strength_score >= 80).length,
    average_strength_score: opportunities.length > 0
      ? Math.round(opportunities.reduce((sum, o) => sum + o.strength_score, 0) / opportunities.length)
      : 0
  }

  return NextResponse.json({
    opportunities: paginatedOpportunities,
    summary
  })
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 30 }
})

// Helper function to calculate brokerage opportunity strength
function calculateBrokerageOpportunity(personA: any, personB: any) {
  const personAData = personA.person;
  const personBData = personB.person;

  if (!personAData || !personBData) return null;

  // Base strength score
  let strengthScore = 50;
  let mutualBenefitScore = 50;
  let introductionLikelihood = 50;

  // Company/industry alignment (different companies = more brokerage value)
  if (personAData.company && personBData.company && personAData.company !== personBData.company) {
    strengthScore += 15;
    mutualBenefitScore += 10;
  }

  // Job title complementarity heuristics
  const titleA = (personAData.job_title || '').toLowerCase();
  const titleB = (personBData.job_title || '').toLowerCase();

  // Tech complementarity patterns
  if ((titleA.includes('engineer') || titleA.includes('developer')) &&
      (titleB.includes('product') || titleB.includes('manager') || titleB.includes('design'))) {
    strengthScore += 20;
    mutualBenefitScore += 25;
  }

  // Business complementarity
  if ((titleA.includes('sales') || titleA.includes('business')) &&
      (titleB.includes('tech') || titleB.includes('engineer') || titleB.includes('product'))) {
    strengthScore += 15;
    mutualBenefitScore += 20;
  }

  // Leadership level alignment
  const isLeaderA = titleA.includes('director') || titleA.includes('manager') || titleA.includes('lead') || titleA.includes('vp') || titleA.includes('ceo');
  const isLeaderB = titleB.includes('director') || titleB.includes('manager') || titleB.includes('lead') || titleB.includes('vp') || titleB.includes('ceo');

  if (isLeaderA && isLeaderB) {
    strengthScore += 10;
    introductionLikelihood += 15;
  }

  // Tier considerations (closer relationships = higher introduction likelihood)
  const avgTier = (personA.tier + personB.tier) / 2;
  if (avgTier <= 50) {
    introductionLikelihood += 20;
    strengthScore += 10;
  }

  // Health score considerations
  const avgHealthScore = (personA.health_score + personB.health_score) / 2;
  if (avgHealthScore >= 80) {
    introductionLikelihood += 15;
  }

  // Location proximity (if available)
  if (personAData.location && personBData.location) {
    const sameLocation = personAData.location.toLowerCase() === personBData.location.toLowerCase();
    if (sameLocation) {
      introductionLikelihood += 10;
    }
  }

  // Cap scores at 100
  strengthScore = Math.min(100, strengthScore);
  mutualBenefitScore = Math.min(100, mutualBenefitScore);
  introductionLikelihood = Math.min(100, introductionLikelihood);

  // Generate rationale and suggested message
  const rationale = generateIntroductionRationale(personAData, personBData, titleA, titleB);
  const suggestedMessage = generateIntroductionMessage(personAData, personBData, rationale);

  return {
    id: `${personA.person_id}-${personB.person_id}`,
    person_a: {
      id: personAData.id,
      name: personAData.name,
      email: personAData.email,
      company: personAData.company,
      job_title: personAData.job_title,
      avatar_url: personAData.avatar_url
    },
    person_b: {
      id: personBData.id,
      name: personBData.name,
      email: personBData.email,
      company: personBData.company,
      job_title: personBData.job_title,
      avatar_url: personBData.avatar_url
    },
    rationale,
    mutual_benefit_potential: mutualBenefitScore >= 80 ? 'High' : mutualBenefitScore >= 60 ? 'Medium-High' : 'Medium',
    introduction_context: generateIntroductionContext(personAData, personBData),
    suggested_setting: generateSuggestedSetting(personAData, personBData),
    strength_score: strengthScore,
    mutual_benefit_score: mutualBenefitScore,
    introduction_likelihood: introductionLikelihood,
    suggested_message: suggestedMessage,
    next_steps: [
      'Send introduction email',
      'Check both parties\' availability and interest',
      'Follow up in 2 weeks on connection outcome'
    ],
    tags: generateTags(personAData, personBData)
  };
}

function generateIntroductionRationale(personA: any, personB: any, titleA: string, titleB: string): string {
  const nameA = personA.name.split(' ')[0];
  const nameB = personB.name.split(' ')[0];

  if (titleA.includes('engineer') && titleB.includes('product')) {
    return `${nameA} has strong technical expertise while ${nameB} brings excellent product vision. They could collaborate on innovative solutions and share valuable perspectives on product-engineering alignment.`;
  }

  if (titleA.includes('design') && (titleB.includes('tech') || titleB.includes('engineer'))) {
    return `${nameA} has deep design expertise and ${nameB} has technical skills. They could work together on user-focused products or design systems.`;
  }

  if (titleA.includes('sales') && titleB.includes('tech')) {
    return `${nameA} understands market needs and customer perspectives, while ${nameB} has technical implementation knowledge. Together they could bridge business and technical requirements.`;
  }

  // Generic fallback
  return `Both ${nameA} and ${nameB} are accomplished professionals in their respective fields. They could benefit from sharing experiences and potentially exploring collaboration opportunities.`;
}

function generateIntroductionMessage(personA: any, personB: any, rationale: string): string {
  const nameA = personA.name.split(' ')[0];
  const nameB = personB.name.split(' ')[0];

  return `Hi ${nameA} and ${nameB}! I think you two would really enjoy connecting. ${rationale} Would you both be interested in a quick virtual coffee to explore potential synergies?`;
}

function generateIntroductionContext(personA: any, personB: any): string {
  if (personA.job_title && personB.job_title) {
    return 'professional development and potential collaboration';
  }
  return 'knowledge sharing and networking';
}

function generateSuggestedSetting(personA: any, personB: any): string {
  if (personA.location && personB.location && personA.location === personB.location) {
    return 'Local coffee meeting or industry meetup';
  }
  return 'Virtual coffee chat or online networking event';
}

function generateTags(personA: any, personB: any): string[] {
  const tags = [];

  if (personA.company && personB.company) {
    if (personA.company !== personB.company) {
      tags.push('cross-company');
    }
  }

  const titleA = (personA.job_title || '').toLowerCase();
  const titleB = (personB.job_title || '').toLowerCase();

  if (titleA.includes('tech') || titleB.includes('tech') || titleA.includes('engineer') || titleB.includes('engineer')) {
    tags.push('tech');
  }

  if (titleA.includes('product') || titleB.includes('product')) {
    tags.push('product');
  }

  if (titleA.includes('design') || titleB.includes('design')) {
    tags.push('design');
  }

  if (titleA.includes('sales') || titleB.includes('sales') || titleA.includes('business') || titleB.includes('business')) {
    tags.push('business');
  }

  tags.push('networking');

  return tags;
}

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';