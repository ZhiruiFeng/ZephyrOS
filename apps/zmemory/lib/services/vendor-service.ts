import { BaseServiceImpl } from './base-service';
import type { ServiceContext, ServiceDependencies, ServiceResult } from './types';
import { createClient } from '@supabase/supabase-js';

export interface VendorService {
  getVendors(includeServices?: boolean): Promise<ServiceResult<any[]>>;
  getVendor(vendorId: string): Promise<ServiceResult<any>>;
}

export class VendorServiceImpl extends BaseServiceImpl implements VendorService {
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

  async getVendors(includeServices = false): Promise<ServiceResult<any[]>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getVendorsStarted', { includeServices });

      const query = this.supabase
        .from('vendors')
        .select(includeServices ? `*, vendor_services(*)` : '*')
        .eq('is_active', true)
        .order('name');

      const { data: vendors, error } = await query;

      if (error) {
        this.logOperation('error', 'getVendorsFailed', { error: error.message });
        throw new Error(`Failed to fetch vendors: ${error.message}`);
      }

      this.logOperation('info', 'getVendorsSuccess', { count: vendors?.length || 0 });

      return vendors || [];
    });
  }

  async getVendor(vendorId: string): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getVendorStarted', { vendorId });

      const { data: vendor, error } = await this.supabase
        .from('vendors')
        .select(`*, vendor_services(*)`)
        .eq('id', vendorId)
        .eq('is_active', true)
        .single();

      if (error) {
        this.logOperation('error', 'getVendorFailed', { vendorId, error: error.message });
        throw new Error(`Failed to fetch vendor: ${error.message}`);
      }

      this.logOperation('info', 'getVendorSuccess', { vendorId });

      return vendor;
    });
  }
}
