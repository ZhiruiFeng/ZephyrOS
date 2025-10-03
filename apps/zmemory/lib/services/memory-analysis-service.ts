import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult,
  MemoryAnalysisInput,
  MemoryAnalysisResult,
  EnhancementParams,
  EnhancementResult,
  AnchorSuggestion
} from './types';
import type { Memory, MemoryFilterParams } from '@/database';

export interface MemoryAnalysisService {
  analyzeMemory(memory: MemoryAnalysisInput): Promise<ServiceResult<MemoryAnalysisResult>>;
  batchEnhanceMemories(params: EnhancementParams): Promise<ServiceResult<EnhancementResult>>;
  calculateSalienceScore(memory: MemoryAnalysisInput): Promise<ServiceResult<number>>;
  detectHighlights(memory: MemoryAnalysisInput): Promise<ServiceResult<boolean>>;
  suggestTags(memory: MemoryAnalysisInput): Promise<ServiceResult<string[]>>;
  findPotentialAnchors(memory: MemoryAnalysisInput, limit?: number): Promise<ServiceResult<AnchorSuggestion[]>>;
}

export class MemoryAnalysisServiceImpl extends BaseServiceImpl implements MemoryAnalysisService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Analyze memory for salience, highlights, and relationships
   */
  async analyzeMemory(memory: MemoryAnalysisInput): Promise<ServiceResult<MemoryAnalysisResult>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(memory.title || memory.note, 'memory content');

      const analysisFactors: string[] = [];

      // Calculate salience score
      const salienceResult = await this.calculateSalienceScore(memory);
      if (salienceResult.error) throw salienceResult.error;
      const salience_score = salienceResult.data!;

      // Detect if should be highlighted
      const highlightResult = await this.detectHighlights(memory);
      if (highlightResult.error) throw highlightResult.error;
      const is_highlight = highlightResult.data!;

      // Suggest additional tags
      const tagsResult = await this.suggestTags(memory);
      if (tagsResult.error) throw tagsResult.error;
      const suggested_tags = tagsResult.data!;

      // Find potential relationships
      const anchorsResult = await this.findPotentialAnchors(memory, 5);
      if (anchorsResult.error) throw anchorsResult.error;
      const potential_relationships = anchorsResult.data!;

      // Calculate overall confidence
      const confidenceFactors = [
        { weight: 0.3, score: this.normalizeScore(salience_score, 0, 1) },
        { weight: 0.2, score: memory.emotion_valence ? Math.abs(memory.emotion_valence) / 5 : 0 },
        { weight: 0.2, score: memory.tags.length / 10 }, // More tags = higher confidence
        { weight: 0.3, score: potential_relationships.length / 5 }
      ];

      const enhancement_confidence = this.calculateConfidence(confidenceFactors);

      return {
        salience_score,
        is_highlight,
        suggested_tags,
        enhancement_confidence,
        analysis_factors: analysisFactors,
        potential_relationships
      };
    });
  }

  /**
   * Calculate salience score using multi-factor algorithm
   */
  async calculateSalienceScore(memory: MemoryAnalysisInput): Promise<ServiceResult<number>> {
    return this.safeOperation(async () => {
      let score = 0;
      const factors: string[] = [];

      // Base score from memory type
      const typeWeights = {
        'insight': 0.8,
        'quote': 0.7,
        'thought': 0.6,
        'note': 0.5,
        'link': 0.4,
        'file': 0.3
      };

      const baseScore = typeWeights[memory.memory_type as keyof typeof typeWeights] || 0.3;
      score += baseScore * 0.2; // 20% weight for type
      factors.push(`type:${memory.memory_type}(${baseScore})`);

      // Emotional intensity factor
      if (memory.emotion_valence !== undefined && memory.emotion_arousal !== undefined) {
        const emotionalIntensity = Math.abs(memory.emotion_valence) * (memory.emotion_arousal / 5);
        const emotionScore = this.normalizeScore(emotionalIntensity, 0, 5);
        score += emotionScore * 0.25; // 25% weight for emotion
        factors.push(`emotion:${emotionScore.toFixed(2)}`);
      }

      // Energy impact factor
      if (memory.energy_delta !== undefined) {
        const energyScore = this.normalizeScore(Math.abs(memory.energy_delta), 0, 5);
        score += energyScore * 0.15; // 15% weight for energy
        factors.push(`energy:${energyScore.toFixed(2)}`);
      }

      // Context richness factor
      const contextLength = (memory.note?.length || 0) + (memory.context?.length || 0);
      const contextnessScore = this.normalizeScore(contextLength, 0, 1000);
      score += contextnessScore * 0.1; // 10% weight for context
      factors.push(`context:${contextnessScore.toFixed(2)}`);

      // Tag richness factor
      const tagScore = this.normalizeScore(memory.tags.length, 0, 10);
      score += tagScore * 0.1; // 10% weight for tags
      factors.push(`tags:${tagScore.toFixed(2)}`);

      // Importance level factor
      const importanceWeights = { 'low': 0.3, 'medium': 0.6, 'high': 1.0 };
      const importanceScore = importanceWeights[memory.importance_level as keyof typeof importanceWeights] || 0.6;
      score += importanceScore * 0.15; // 15% weight for importance
      factors.push(`importance:${importanceScore}`);

      // Recency factor (newer memories get slight boost)
      const daysSinceCapture = memory.captured_at ?
        (Date.now() - new Date(memory.captured_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
      const recencyScore = this.calculateTimeDecay(memory.captured_at, 90); // 90-day half-life
      score += recencyScore * 0.05; // 5% weight for recency
      factors.push(`recency:${recencyScore.toFixed(2)}`);

      // Normalize final score to 0-1 range
      const finalScore = Math.max(0, Math.min(1, score));

      this.logOperation('info', 'calculateSalienceScore', {
        memoryId: memory.id,
        finalScore,
        factors
      });

      return finalScore;
    });
  }

  /**
   * Determine if memory should be highlighted
   */
  async detectHighlights(memory: MemoryAnalysisInput): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      // Get salience score
      const salienceResult = await this.calculateSalienceScore(memory);
      if (salienceResult.error) throw salienceResult.error;
      const salienceScore = salienceResult.data!;

      let highlightScore = 0;

      // High salience factor
      if (salienceScore > 0.7) {
        highlightScore += 0.4;
      }

      // High emotional intensity
      if (memory.emotion_valence !== undefined && Math.abs(memory.emotion_valence) >= 4) {
        highlightScore += 0.3;
      }

      // Insights and quotes are more likely to be highlights
      if (['insight', 'quote'].includes(memory.memory_type)) {
        highlightScore += 0.2;
      }

      // High importance level
      if (memory.importance_level === 'high') {
        highlightScore += 0.2;
      }

      // Rich content (long notes or many tags)
      const contentRichness = (memory.note?.length || 0) > 200 || memory.tags.length > 5;
      if (contentRichness) {
        highlightScore += 0.1;
      }

      // Location data adds context value
      if (memory.place_name) {
        highlightScore += 0.1;
      }

      return highlightScore > 0.6; // Threshold for highlighting
    });
  }

  /**
   * Suggest additional tags based on content analysis
   */
  async suggestTags(memory: MemoryAnalysisInput): Promise<ServiceResult<string[]>> {
    return this.safeOperation(async () => {
      const suggestedTags: string[] = [];
      const content = `${memory.title || ''} ${memory.note || ''} ${memory.context || ''}`.toLowerCase();

      // Emotion-based tags
      if (memory.emotion_valence !== undefined) {
        if (memory.emotion_valence > 2) suggestedTags.push('positive');
        if (memory.emotion_valence < -2) suggestedTags.push('negative');
        if (Math.abs(memory.emotion_valence) >= 4) suggestedTags.push('intense');
      }

      // Energy-based tags
      if (memory.energy_delta !== undefined) {
        if (memory.energy_delta > 2) suggestedTags.push('energizing');
        if (memory.energy_delta < -2) suggestedTags.push('draining');
      }

      // Content-based tags (simple keyword matching)
      const keywordMap = {
        'work': ['work', 'job', 'career', 'project', 'meeting', 'business'],
        'learning': ['learn', 'study', 'education', 'course', 'book', 'research'],
        'health': ['health', 'exercise', 'fitness', 'medical', 'doctor', 'wellness'],
        'family': ['family', 'parent', 'child', 'sibling', 'relative'],
        'relationship': ['friend', 'partner', 'relationship', 'social', 'date'],
        'travel': ['travel', 'trip', 'vacation', 'journey', 'flight', 'hotel'],
        'food': ['food', 'restaurant', 'meal', 'cooking', 'recipe', 'dinner'],
        'creative': ['art', 'music', 'write', 'create', 'design', 'creative'],
        'reflection': ['reflect', 'think', 'realize', 'understand', 'insight']
      };

      for (const [tag, keywords] of Object.entries(keywordMap)) {
        if (keywords.some(keyword => content.includes(keyword)) && !memory.tags.includes(tag)) {
          suggestedTags.push(tag);
        }
      }

      // Location-based tags
      if (memory.place_name) {
        if (!memory.tags.includes('location')) {
          suggestedTags.push('location');
        }
      }

      // Time-based tags
      const hour = new Date(memory.captured_at).getHours();
      if (hour < 6 || hour > 22) {
        if (!memory.tags.includes('late-night')) {
          suggestedTags.push('late-night');
        }
      }

      return suggestedTags.slice(0, 5); // Limit to 5 suggestions
    });
  }

  /**
   * Find potential anchor relationships for memory
   */
  async findPotentialAnchors(
    memory: MemoryAnalysisInput,
    limit: number = 5
  ): Promise<ServiceResult<AnchorSuggestion[]>> {
    return this.safeOperation(async () => {
      const suggestions: AnchorSuggestion[] = [];

      // Find temporally related memories
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const memoryTime = new Date(memory.captured_at).getTime();

      const temporalFilters: MemoryFilterParams = {
        captured_from: new Date(memoryTime - timeWindow).toISOString(),
        captured_to: new Date(memoryTime + timeWindow).toISOString(),
        limit: 20
      };

      const { data: nearbyMemories } = await this.dependencies.memoryRepository.findMemoriesAdvanced(
        this.context.userId,
        temporalFilters
      );

      if (nearbyMemories) {
        for (const relatedMemory of nearbyMemories) {
          if (relatedMemory.id === memory.id) continue;

          let confidence = 0;
          const reasons: string[] = [];

          // Tag overlap
          const commonTags = memory.tags.filter(tag => relatedMemory.tags.includes(tag));
          if (commonTags.length > 0) {
            confidence += commonTags.length * 0.2;
            reasons.push(`shared tags: ${commonTags.join(', ')}`);
          }

          // Location proximity
          if (memory.place_name && relatedMemory.place_name &&
              memory.place_name.toLowerCase() === relatedMemory.place_name.toLowerCase()) {
            confidence += 0.3;
            reasons.push('same location');
          }

          // Emotional correlation
          if (memory.emotion_valence !== undefined && relatedMemory.emotion_valence !== undefined) {
            const emotionSimilarity = 1 - Math.abs(memory.emotion_valence - relatedMemory.emotion_valence) / 10;
            confidence += emotionSimilarity * 0.2;
            reasons.push('similar emotional state');
          }

          // Time proximity boost
          const timeDiff = Math.abs(memoryTime - new Date(relatedMemory.captured_at).getTime());
          const timeProximity = Math.max(0, 1 - (timeDiff / timeWindow));
          confidence += timeProximity * 0.3;

          if (confidence > 0.3 && reasons.length > 0) {
            suggestions.push({
              target_id: relatedMemory.id,
              target_type: 'memory',
              target_title: relatedMemory.title,
              relation_type: this.determineRelationType(commonTags, reasons),
              confidence_score: Math.min(1, confidence),
              reasoning: reasons.join('; ')
            });
          }
        }
      }

      // Sort by confidence and limit results
      suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
      return suggestions.slice(0, limit);
    });
  }

  /**
   * Batch enhance memories with analysis
   */
  async batchEnhanceMemories(params: EnhancementParams): Promise<ServiceResult<EnhancementResult>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(params.user_id, 'user_id');

      const batchSize = params.batch_size || 10;
      const filters: MemoryFilterParams = {
        limit: 1000 // Process up to 1000 memories
      };

      if (params.memory_types) {
        // Would need to implement type filtering in repository
      }

      const { data: memories } = await this.dependencies.memoryRepository.findMemoriesAdvanced(
        params.user_id,
        filters
      );

      if (!memories) {
        throw new Error('Failed to fetch memories for enhancement');
      }

      const result: EnhancementResult = {
        processed_count: 0,
        updated_count: 0,
        skipped_count: 0,
        errors: [],
        batch_summary: {
          salience_updates: 0,
          highlight_updates: 0,
          tag_updates: 0
        }
      };

      const { errors, successCount } = await this.processBatch(
        memories,
        async (memory) => {
          result.processed_count++;

          if (params.dry_run) {
            result.skipped_count++;
            return null;
          }

          const analysisInput: MemoryAnalysisInput = {
            id: memory.id,
            title: memory.title,
            note: memory.note,
            context: memory.context,
            memory_type: memory.memory_type,
            emotion_valence: memory.emotion_valence,
            emotion_arousal: memory.emotion_arousal,
            energy_delta: memory.energy_delta,
            place_name: memory.place_name,
            tags: memory.tags,
            importance_level: memory.importance_level || 'medium',
            captured_at: memory.captured_at
          };

          const analysis = await this.analyzeMemory(analysisInput);
          if (analysis.error) throw analysis.error;

          const updates: Partial<Memory> = {};

          if (params.update_salience && analysis.data!.salience_score !== memory.salience_score) {
            updates.salience_score = analysis.data!.salience_score;
            result.batch_summary.salience_updates++;
          }

          if (params.update_highlights && analysis.data!.is_highlight !== memory.is_highlight) {
            updates.is_highlight = analysis.data!.is_highlight;
            result.batch_summary.highlight_updates++;
          }

          if (params.update_tags && analysis.data!.suggested_tags.length > 0) {
            const newTags = [...memory.tags, ...analysis.data!.suggested_tags]
              .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates

            if (newTags.length > memory.tags.length) {
              updates.tags = newTags;
              result.batch_summary.tag_updates++;
            }
          }

          if (Object.keys(updates).length > 0) {
            await this.dependencies.memoryRepository.updateMemory(
              params.user_id,
              memory.id,
              updates
            );
            result.updated_count++;
          } else {
            result.skipped_count++;
          }

          return updates;
        },
        batchSize
      );

      // Add errors to result
      result.errors = errors.map(({ index, item, error }) => ({
        memory_id: (item as Memory).id,
        error: error.message
      }));

      this.logOperation('info', 'batchEnhanceMemories', {
        userId: params.user_id,
        result
      });

      return result;
    });
  }

  /**
   * Determine relationship type based on analysis factors
   */
  private determineRelationType(commonTags: string[], reasons: string[]): string {
    if (commonTags.includes('work') || commonTags.includes('project')) {
      return 'context_of';
    }

    if (reasons.some(r => r.includes('same location'))) {
      return 'co_occurred';
    }

    if (reasons.some(r => r.includes('emotional'))) {
      return 'reflects_on';
    }

    return 'about';
  }
}