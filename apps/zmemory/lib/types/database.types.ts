export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      vendors: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          auth_type: 'api_key' | 'oauth' | 'bearer_token';
          base_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          auth_type?: 'api_key' | 'oauth' | 'bearer_token';
          base_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          auth_type?: 'api_key' | 'oauth' | 'bearer_token';
          base_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vendor_services: {
        Row: {
          id: string;
          vendor_id: string;
          service_name: string;
          display_name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          vendor_id: string;
          service_name: string;
          display_name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          service_name?: string;
          display_name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_services_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          }
        ];
      };
      user_api_keys: {
        Row: {
          id: string;
          user_id: string;
          vendor_id: string;
          service_id: string | null;
          encrypted_key: string;
          key_preview: string | null;
          display_name: string | null;
          is_active: boolean;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vendor_id: string;
          service_id?: string | null;
          encrypted_key: string;
          key_preview?: string | null;
          display_name?: string | null;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vendor_id?: string;
          service_id?: string | null;
          encrypted_key?: string;
          key_preview?: string | null;
          display_name?: string | null;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_api_keys_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_api_keys_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_api_keys_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_services';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {
      add_vendor: {
        Args: {
          p_id: string;
          p_name: string;
          p_description?: string | null;
          p_auth_type?: 'api_key' | 'oauth' | 'bearer_token';
          p_base_url?: string | null;
        };
        Returns: Database['public']['Tables']['vendors']['Row'];
      };
      add_vendor_service: {
        Args: {
          p_vendor_id: string;
          p_service_name: string;
          p_display_name: string;
          p_description?: string | null;
        };
        Returns: Database['public']['Tables']['vendor_services']['Row'];
      };
      get_user_api_key: {
        Args: {
          p_user_id: string;
          p_vendor_id: string;
          p_service_id?: string | null;
        };
        Returns: {
          id: string;
          encrypted_key: string;
          display_name: string | null;
          vendor_name: string;
          service_name: string | null;
        }[];
      };
      update_api_key_last_used: {
        Args: {
          p_user_id: string;
          p_vendor_id: string;
          p_service_id?: string | null;
        };
        Returns: void;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
