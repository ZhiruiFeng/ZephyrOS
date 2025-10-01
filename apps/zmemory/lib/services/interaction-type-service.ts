import { BaseServiceImpl } from './base-service';
import type { ServiceContext, ServiceDependencies, ServiceResult } from './types';
import { createClient } from '@supabase/supabase-js';

export interface InteractionTypeFilters {
  category?: string;
  is_active?: boolean;
  group_by_category?: boolean;
}

export interface InteractionTypeService {
  getInteractionTypes(filters?: InteractionTypeFilters): Promise<ServiceResult<any>>;
}

export class InteractionTypeServiceImpl extends BaseServiceImpl implements InteractionTypeService {
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

  async getInteractionTypes(filters: InteractionTypeFilters = {}): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      const { category, is_active, group_by_category } = filters;

      this.logOperation('info', 'getInteractionTypesStarted', { filters });

      let query = this.supabase
        .from('interaction_types')
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
        // Default to active types only
        query = query.eq('is_active', true);
      }

      const { data: types, error } = await query;

      if (error) {
        this.logOperation('error', 'getInteractionTypesFailed', { error: error.message });
        throw new Error(`Failed to fetch interaction types: ${error.message}`);
      }

      if (!types || types.length === 0) {
        this.logOperation('info', 'getInteractionTypesSuccess', { count: 0 });
        return { types: [] };
      }

      this.logOperation('info', 'getInteractionTypesSuccess', {
        count: types.length,
        grouped: group_by_category
      });

      // Group by category if requested
      if (group_by_category) {
        const grouped = types.reduce((acc: Record<string, any[]>, type) => {
          const cat = type.category || 'other';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(type);
          return acc;
        }, {});

        return {
          types: grouped,
          categories: Object.keys(grouped)
        };
      }

      return { types };
    });
  }
}
