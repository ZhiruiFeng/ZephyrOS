import { createClient } from '@supabase/supabase-js';

export interface MemoryAnalysisInput {
  id?: string;
  note?: string;
  title?: string;
  memory_type: string;
  emotion_valence?: number;
  emotion_arousal?: number;
  energy_delta?: number;
  place_name?: string;
  context?: string;
  tags?: string[];
  captured_at: string;
  importance_level?: string;
  user_id: string;
}

export interface MemoryAnalysisResult {
  salience_score: number;
  is_highlight: boolean;
  suggested_importance_level?: string;
  suggested_tags?: string[];
  confidence_scores: {
    salience_confidence: number;
    highlight_confidence: number;
    importance_confidence: number;
  };
  reasoning: string[];
}

/**
 * Calculate salience score for a memory based on multiple factors
 * Salience represents how likely this memory is to be important for future recall
 */
export function calculateSalienceScore(memory: MemoryAnalysisInput): number {
  let score = 0;
  const factors: string[] = [];

  // Base score from memory type
  const typeWeights: { [key: string]: number } = {
    'insight': 0.8,      // High value insights
    'quote': 0.7,        // Meaningful quotes
    'thought': 0.6,      // Personal reflections
    'note': 0.5,         // General notes
    'link': 0.4,         // External references
    'file': 0.3          // File attachments
  };
  
  const typeScore = typeWeights[memory.memory_type] || 0.4;
  score += typeScore;
  factors.push(`type_${memory.memory_type}: +${typeScore.toFixed(2)}`);

  // Emotional intensity boost
  if (memory.emotion_valence !== undefined && memory.emotion_arousal !== undefined) {
    // High arousal memories (very positive or very negative) are more memorable
    const emotionalIntensity = Math.abs(memory.emotion_valence) * (memory.emotion_arousal / 5);
    const emotionScore = emotionalIntensity * 0.15;
    score += emotionScore;
    factors.push(`emotional_intensity: +${emotionScore.toFixed(2)}`);
  }

  // Energy impact boost
  if (memory.energy_delta !== undefined) {
    const energyScore = Math.abs(memory.energy_delta) * 0.08;
    score += energyScore;
    factors.push(`energy_impact: +${energyScore.toFixed(2)}`);
  }

  // Content length and richness
  const noteLength = memory.note?.length || 0;
  if (noteLength > 500) {
    score += 0.15; // Long, detailed memories are often more salient
    factors.push('detailed_content: +0.15');
  } else if (noteLength > 100) {
    score += 0.08;
    factors.push('moderate_content: +0.08');
  }

  // Context richness (having both context and location)
  if (memory.context && memory.place_name) {
    score += 0.1;
    factors.push('rich_context: +0.10');
  } else if (memory.context || memory.place_name) {
    score += 0.05;
    factors.push('some_context: +0.05');
  }

  // Tag richness
  const tagCount = memory.tags?.length || 0;
  if (tagCount >= 3) {
    score += 0.1;
    factors.push('well_tagged: +0.10');
  } else if (tagCount >= 1) {
    score += 0.05;
    factors.push('tagged: +0.05');
  }

  // Importance level boost
  if (memory.importance_level === 'high') {
    score += 0.2;
    factors.push('high_importance: +0.20');
  } else if (memory.importance_level === 'medium') {
    score += 0.1;
    factors.push('medium_importance: +0.10');
  }

  // Recency factor (recent memories get slight boost for review)
  const daysSinceCapture = (Date.now() - new Date(memory.captured_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCapture < 1) {
    score += 0.05; // Today's memories
    factors.push('today: +0.05');
  }

  // Cap at 1.0
  const finalScore = Math.min(1.0, Math.max(0.0, score));
  
  console.log(`Salience calculation for memory ${memory.id || 'new'}:`, {
    finalScore: finalScore.toFixed(3),
    factors
  });

  return finalScore;
}

/**
 * Determine if a memory should be automatically highlighted
 */
export function shouldHighlight(memory: MemoryAnalysisInput, salienceScore: number): boolean {
  const reasons: string[] = [];
  
  // High salience threshold
  if (salienceScore >= 0.8) {
    reasons.push('high_salience');
  }

  // Extreme emotional experiences
  if (memory.emotion_valence !== undefined && memory.emotion_arousal !== undefined) {
    if (Math.abs(memory.emotion_valence) >= 4 && memory.emotion_arousal >= 4) {
      reasons.push('intense_emotion');
    }
  }

  // Significant energy change
  if (memory.energy_delta !== undefined && Math.abs(memory.energy_delta) >= 4) {
    reasons.push('significant_energy_change');
  }

  // Insight-type memories with high salience
  if (memory.memory_type === 'insight' && salienceScore >= 0.7) {
    reasons.push('valuable_insight');
  }

  // High importance explicitly set
  if (memory.importance_level === 'high') {
    reasons.push('high_importance');
  }

  // Rich, detailed memories with good salience
  if ((memory.note?.length || 0) > 300 && salienceScore >= 0.6) {
    reasons.push('detailed_important_memory');
  }

  const shouldBeHighlight = reasons.length > 0;
  
  if (shouldBeHighlight) {
    console.log(`Auto-highlight triggered for memory ${memory.id || 'new'}:`, reasons);
  }

  return shouldBeHighlight;
}

/**
 * Suggest importance level based on content analysis
 */
export function suggestImportanceLevel(memory: MemoryAnalysisInput, salienceScore: number): string {
  if (salienceScore >= 0.8) return 'high';
  if (salienceScore >= 0.6) return 'medium';
  return 'low';
}

/**
 * Suggest additional tags based on content analysis
 */
export function suggestTags(memory: MemoryAnalysisInput): string[] {
  const suggestions: string[] = [];
  const content = `${memory.note || ''} ${memory.context || ''}`.toLowerCase();

  // Emotion-based tags
  if (memory.emotion_valence !== undefined) {
    if (memory.emotion_valence >= 3) suggestions.push('positive');
    if (memory.emotion_valence <= -3) suggestions.push('negative');
    if (Math.abs(memory.emotion_valence) >= 4) suggestions.push('intense');
  }

  // Type-based contextual tags
  if (memory.memory_type === 'insight') suggestions.push('learning');
  if (memory.memory_type === 'thought') suggestions.push('reflection');

  // Content-based tags (simple keyword matching)
  const keywordMap: { [key: string]: string[] } = {
    'work': ['project', 'meeting', 'deadline', 'colleague', 'office', 'business'],
    'health': ['exercise', 'workout', 'medical', 'doctor', 'wellness', 'fitness'],
    'learning': ['book', 'course', 'study', 'research', 'knowledge', 'skill'],
    'social': ['friend', 'family', 'conversation', 'dinner', 'party', 'relationship'],
    'travel': ['trip', 'vacation', 'flight', 'hotel', 'destination', 'journey'],
    'creative': ['art', 'music', 'writing', 'design', 'creative', 'inspiration']
  };

  for (const [tag, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      suggestions.push(tag);
    }
  }

  // Location-based tags
  if (memory.place_name) {
    const place = memory.place_name.toLowerCase();
    if (place.includes('office') || place.includes('work')) suggestions.push('work');
    if (place.includes('home')) suggestions.push('personal');
    if (place.includes('gym') || place.includes('park')) suggestions.push('health');
  }

  // Remove duplicates and limit to 3 suggestions
  const uniqueSuggestions = Array.from(new Set(suggestions));
  return uniqueSuggestions.slice(0, 3);
}

/**
 * Comprehensive memory analysis combining all business logic
 */
export function analyzeMemory(memory: MemoryAnalysisInput): MemoryAnalysisResult {
  const salienceScore = calculateSalienceScore(memory);
  const isHighlight = shouldHighlight(memory, salienceScore);
  const suggestedImportance = suggestImportanceLevel(memory, salienceScore);
  const suggestedTags = suggestTags(memory);

  const reasoning: string[] = [];
  
  // Explain salience score
  if (salienceScore >= 0.8) {
    reasoning.push('High salience - likely to be important for future recall');
  } else if (salienceScore >= 0.6) {
    reasoning.push('Medium salience - moderately important');
  } else {
    reasoning.push('Lower salience - routine or basic memory');
  }

  // Explain highlight decision
  if (isHighlight) {
    reasoning.push('Auto-highlighted due to high importance indicators');
  }

  // Explain importance suggestion
  if (suggestedImportance !== memory.importance_level) {
    reasoning.push(`Suggested importance level: ${suggestedImportance}`);
  }

  return {
    salience_score: Number(salienceScore.toFixed(3)),
    is_highlight: isHighlight,
    suggested_importance_level: suggestedImportance,
    suggested_tags: suggestedTags,
    confidence_scores: {
      salience_confidence: salienceScore >= 0.7 ? 0.9 : 0.7,
      highlight_confidence: isHighlight ? 0.8 : 0.6,
      importance_confidence: 0.75
    },
    reasoning
  };
}

/**
 * Find potential memory relationships based on content similarity and temporal proximity
 */
export async function findPotentialAnchors(
  client: any, 
  memory: MemoryAnalysisInput, 
  limit: number = 5
): Promise<Array<{
  timeline_item_id: string;
  type: string;
  title: string;
  relationship_type: string;
  confidence: number;
  reasoning: string;
}>> {
  try {
    const suggestions: Array<{
      timeline_item_id: string;
      type: string;
      title: string;
      relationship_type: string;
      confidence: number;
      reasoning: string;
    }> = [];

    // Find temporally close timeline items (within 7 days)
    const memoryDate = new Date(memory.captured_at);
    const weekBefore = new Date(memoryDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAfter = new Date(memoryDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: nearbyItems } = await client
      .from('timeline_items')
      .select('id, type, title, created_at, tags')
      .eq('user_id', memory.user_id)
      .gte('created_at', weekBefore.toISOString())
      .lte('created_at', weekAfter.toISOString())
      .neq('id', memory.id || 'none')
      .limit(20);

    if (nearbyItems) {
      for (const item of nearbyItems) {
        const daysDiff = Math.abs(
          (new Date(item.created_at).getTime() - memoryDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Temporal proximity score
        let confidence = Math.max(0, 1 - daysDiff / 7) * 0.3;
        let relationshipType = 'related_to';
        let reasoning = `Temporally close (${daysDiff.toFixed(1)} days apart)`;

        // Tag overlap
        const memoryTags = memory.tags || [];
        const itemTags = item.tags || [];
        const tagOverlap = memoryTags.filter(tag => itemTags.includes(tag)).length;
        if (tagOverlap > 0) {
          confidence += tagOverlap * 0.2;
          reasoning += `, ${tagOverlap} shared tags`;
        }

        // Content similarity (simple keyword matching)
        const memoryContent = `${memory.note || ''} ${memory.title || ''}`.toLowerCase();
        const itemTitle = item.title.toLowerCase();
        
        const sharedWords = memoryContent.split(' ').filter(word => 
          word.length > 3 && itemTitle.includes(word)
        );
        
        if (sharedWords.length > 0) {
          confidence += sharedWords.length * 0.15;
          reasoning += `, content similarity`;
        }

        // Context-based relationship types
        if (memory.memory_type === 'insight' && daysDiff <= 1) {
          relationshipType = 'insight_from';
          confidence += 0.2;
        } else if (item.type === 'task' && daysDiff <= 2) {
          relationshipType = 'result_of';
          confidence += 0.15;
        }

        if (confidence >= 0.3) { // Minimum confidence threshold
          suggestions.push({
            timeline_item_id: item.id,
            type: item.type,
            title: item.title,
            relationship_type: relationshipType,
            confidence: Math.min(0.95, confidence),
            reasoning
          });
        }
      }
    }

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

  } catch (error) {
    console.error('Error finding potential anchors:', error);
    return [];
  }
}

/**
 * Generate a weekly review of highlights and significant memories
 */
export async function generateWeeklyReview(
  client: any,
  userId: string,
  weekOffset: number = 0 // 0 = current week, -1 = last week, etc.
): Promise<{
  period: { start: string; end: string };
  highlights: any[];
  insights: any[];
  emotional_summary: {
    avg_valence: number;
    avg_arousal: number;
    avg_energy_delta: number;
    total_memories: number;
  };
  recommendations: string[];
}> {
  const now = new Date();
  const currentWeekStart = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(currentWeekStart.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // Get all memories from the week
    const { data: weekMemories } = await client
      .from('timeline_items')
      .select(`
        *,
        memory:memories!inner(*)
      `)
      .eq('user_id', userId)
      .eq('type', 'memory')
      .gte('memories.captured_at', weekStart.toISOString())
      .lt('memories.captured_at', weekEnd.toISOString());

    if (!weekMemories || weekMemories.length === 0) {
      return {
        period: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
        highlights: [],
        insights: [],
        emotional_summary: {
          avg_valence: 0,
          avg_arousal: 0,
          avg_energy_delta: 0,
          total_memories: 0
        },
        recommendations: ['No memories found for this week period.']
      };
    }

    // Flatten memory data
    const memories = weekMemories.map((item: any) => ({
      ...item,
      ...item.memory[0]
    }));

    // Get highlights (high salience or manually marked)
    const highlights = memories.filter((m: any) => 
      m.is_highlight || m.salience_score >= 0.7
    ).sort((a: any, b: any) => (b.salience_score || 0) - (a.salience_score || 0));

    // Get insights specifically
    const insights = memories.filter((m: any) => 
      m.memory_type === 'insight'
    ).sort((a: any, b: any) => (b.salience_score || 0) - (a.salience_score || 0));

    // Calculate emotional summary
    const emotionalMemories = memories.filter((m: any) => 
      m.emotion_valence !== null && m.emotion_arousal !== null
    );
    
    const emotionalSummary = {
      avg_valence: emotionalMemories.length > 0 
        ? emotionalMemories.reduce((sum: number, m: any) => sum + m.emotion_valence, 0) / emotionalMemories.length
        : 0,
      avg_arousal: emotionalMemories.length > 0
        ? emotionalMemories.reduce((sum: number, m: any) => sum + m.emotion_arousal, 0) / emotionalMemories.length
        : 0,
      avg_energy_delta: memories.filter((m: any) => m.energy_delta !== null).length > 0
        ? memories.filter((m: any) => m.energy_delta !== null).reduce((sum: number, m: any) => sum + m.energy_delta, 0) / memories.filter((m: any) => m.energy_delta !== null).length
        : 0,
      total_memories: memories.length
    };

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (highlights.length === 0) {
      recommendations.push('Consider reflecting on significant moments to create more memorable entries.');
    }
    
    if (insights.length === 0) {
      recommendations.push('Try capturing insights and learnings from your experiences.');
    }
    
    if (emotionalSummary.avg_valence < -2) {
      recommendations.push('This week showed challenging emotions - consider self-care activities.');
    } else if (emotionalSummary.avg_valence > 2) {
      recommendations.push('Great week emotionally! Consider what contributed to these positive experiences.');
    }
    
    if (memories.length < 3) {
      recommendations.push('Consider capturing more regular moments - even small memories can become meaningful.');
    }

    return {
      period: { 
        start: weekStart.toISOString(), 
        end: weekEnd.toISOString() 
      },
      highlights: highlights.slice(0, 10),
      insights: insights.slice(0, 5),
      emotional_summary: {
        avg_valence: Number(emotionalSummary.avg_valence.toFixed(2)),
        avg_arousal: Number(emotionalSummary.avg_arousal.toFixed(2)),
        avg_energy_delta: Number(emotionalSummary.avg_energy_delta.toFixed(2)),
        total_memories: emotionalSummary.total_memories
      },
      recommendations
    };

  } catch (error) {
    console.error('Error generating weekly review:', error);
    throw error;
  }
}