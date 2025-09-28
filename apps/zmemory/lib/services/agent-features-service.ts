import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult
} from './types';
import { createClient } from '@supabase/supabase-js';

export interface AgentFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AgentFeaturesFilters {
  category?: string;
  is_active?: boolean;
  group_by_category?: boolean;
}

export interface GroupedFeatures {
  features: Record<string, AgentFeature[]>;
  categories: string[];
}

export interface AgentFeaturesService {
  getFeatures(filters?: AgentFeaturesFilters): Promise<ServiceResult<AgentFeature[] | GroupedFeatures>>;
}

export class AgentFeaturesServiceImpl extends BaseServiceImpl implements AgentFeaturesService {
  private supabase;

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get agent features with optional filtering and grouping
   */
  async getFeatures(filters: AgentFeaturesFilters = {}): Promise<ServiceResult<AgentFeature[] | GroupedFeatures>> {
    return this.safeOperation(async () => {
      const { category, is_active, group_by_category } = filters;

      // Build query
      let query = this.supabase
        .from('agent_features')
        .select('*')
        .order('sort_order')
        .order('name');

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (is_active !== undefined) {
        query = query.eq('is_active', is_active);
      } else {
        // Default to active features only
        query = query.eq('is_active', true);
      }

      const { data: features, error } = await query;

      if (error) {
        this.logOperation('error', 'getFeaturesFailed', {
          error: error.message,
          filters
        });
        throw new Error(`Failed to fetch agent features: ${error.message}`);
      }

      if (!features) {
        return [];
      }

      this.logOperation('info', 'getFeaturesSuccess', {
        count: features.length,
        filters,
        grouped: group_by_category
      });

      // Group by category if requested
      if (group_by_category) {
        const grouped = features.reduce((acc: Record<string, AgentFeature[]>, feature) => {
          const cat = feature.category || 'other';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(feature);
          return acc;
        }, {});

        return {
          features: grouped,
          categories: Object.keys(grouped)
        };
      }

      return features;
    });
  }
}