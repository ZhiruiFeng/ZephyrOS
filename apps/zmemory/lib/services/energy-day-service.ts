import { BaseServiceImpl } from './base-service';
import type { ServiceContext, ServiceDependencies, ServiceResult } from './types';
import { createClient } from '@supabase/supabase-js';

export interface EnergyDayFilters {
  start?: string;
  end?: string;
  limit?: number;
}

export interface EnergyDayData {
  local_date: string;
  tz?: string;
  curve: any;
  source?: string;
  edited_mask?: any[];
  last_checked_index?: number;
  last_checked_at?: string;
}

export interface EnergyDayService {
  getEnergyDays(filters?: EnergyDayFilters): Promise<ServiceResult<any[]>>;
  getEnergyDay(date: string): Promise<ServiceResult<any>>;
  upsertEnergyDay(data: EnergyDayData): Promise<ServiceResult<any>>;
}

export class EnergyDayServiceImpl extends BaseServiceImpl implements EnergyDayService {
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

  async getEnergyDays(filters: EnergyDayFilters = {}): Promise<ServiceResult<any[]>> {
    return this.safeOperation(async () => {
      const { start, end, limit = 90 } = filters;
      const maxLimit = Math.min(limit, 365);

      this.logOperation('info', 'getEnergyDaysStarted', { filters });

      let query = this.supabase
        .from('energy_day')
        .select('*')
        .eq('user_id', this.context.userId)
        .order('local_date', { ascending: true })
        .limit(maxLimit);

      if (start) query = query.gte('local_date', start);
      if (end) query = query.lte('local_date', end);

      const { data, error } = await query;

      if (error) {
        this.logOperation('error', 'getEnergyDaysFailed', { error: error.message });
        throw new Error('Failed to fetch energy days');
      }

      this.logOperation('info', 'getEnergyDaysSuccess', { count: data?.length || 0 });

      return data || [];
    });
  }

  async getEnergyDay(date: string): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getEnergyDayStarted', { date });

      const { data, error } = await this.supabase
        .from('energy_day')
        .select('*')
        .eq('user_id', this.context.userId)
        .eq('local_date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logOperation('error', 'getEnergyDayFailed', { date, error: error.message });
        throw new Error('Failed to fetch energy day');
      }

      this.logOperation('info', 'getEnergyDaySuccess', { date, found: !!data });

      return data || null;
    });
  }

  async upsertEnergyDay(data: EnergyDayData): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'upsertEnergyDayStarted', { date: data.local_date });

      // Build payload without introducing nulls to NOT NULL columns
      const payload: any = {
        user_id: this.context.userId,
        local_date: data.local_date,
        tz: data.tz || 'America/Los_Angeles',
        curve: data.curve,
        source: data.source || 'user_edited',
      };

      if (Array.isArray(data.edited_mask)) payload.edited_mask = data.edited_mask;
      if (data.last_checked_index !== undefined) payload.last_checked_index = data.last_checked_index;
      if (data.last_checked_at !== undefined) payload.last_checked_at = data.last_checked_at;

      const { data: result, error } = await this.supabase
        .from('energy_day')
        .upsert(payload, { onConflict: 'user_id,local_date' })
        .select('*')
        .single();

      if (error) {
        this.logOperation('error', 'upsertEnergyDayFailed', {
          date: data.local_date,
          error: error.message
        });
        throw new Error('Failed to upsert energy day');
      }

      this.logOperation('info', 'upsertEnergyDaySuccess', { date: data.local_date });

      return result;
    });
  }
}
