import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uznzmoulrdzyfpshnixx.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bnptb3VscmR6eWZwc2huaXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzOTM1MjQsImV4cCI6MjA3Njk2OTUyNH0.kxe7XV4IRQDuHLtYLuE2CUVbnsJlwK8kfso4tn8tbeI'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bnptb3VscmR6eWZwc2huaXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTM5MzUyNCwiZXhwIjoyMDc2OTY5NTI0fQ.WORItj1mWcCwkScAF7xxBiqMrjE0Uy-UAiZuu87hQxA'

// Create Supabase client for client-side use (with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create Supabase client for server-side use (with service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types (you can generate these with: npx supabase gen types typescript --project-id uznzmoulrdzyfpshnixx)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          password_hash: string
          role: 'ADMIN' | 'MANAGER' | 'USER'
          store_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          password_hash: string
          role?: 'ADMIN' | 'MANAGER' | 'USER'
          store_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password_hash?: string
          role?: 'ADMIN' | 'MANAGER' | 'USER'
          store_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          address: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      banks: {
        Row: {
          id: string
          bank_name: string
          account_number: string
          routing_number: string
          account_type: 'CHECKING' | 'SAVINGS' | 'BUSINESS'
          store_id: string
          balance: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bank_name: string
          account_number: string
          routing_number: string
          account_type?: 'CHECKING' | 'SAVINGS' | 'BUSINESS'
          store_id: string
          balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bank_name?: string
          account_number?: string
          routing_number?: string
          account_type?: 'CHECKING' | 'SAVINGS' | 'BUSINESS'
          store_id?: string
          balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          vendor_name: string
          vendor_type: 'MERCHANDISE' | 'EXPENSE' | 'EMPLOYEE'
          description: string | null
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          store_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_name: string
          vendor_type: 'MERCHANDISE' | 'EXPENSE' | 'EMPLOYEE'
          description?: string | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          store_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_name?: string
          vendor_type?: 'MERCHANDISE' | 'EXPENSE' | 'EMPLOYEE'
          description?: string | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          store_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      checks: {
        Row: {
          id: string
          check_number: string
          payment_method: 'Check' | 'EDI' | 'MO' | 'Cash'
          bank_id: string
          vendor_id: string
          payee_name: string
          amount: number
          memo: string | null
          status: 'ISSUED' | 'CLEARED' | 'VOIDED' | 'STOPPED'
          invoice_url: string | null
          issued_by: string
          issued_by_user: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          check_number: string
          payment_method: 'Check' | 'EDI' | 'MO' | 'Cash'
          bank_id: string
          vendor_id: string
          payee_name: string
          amount: number
          memo?: string | null
          status?: 'ISSUED' | 'CLEARED' | 'VOIDED' | 'STOPPED'
          invoice_url?: string | null
          issued_by: string
          issued_by_user?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          check_number?: string
          payment_method?: 'Check' | 'EDI' | 'MO' | 'Cash'
          bank_id?: string
          vendor_id?: string
          payee_name?: string
          amount?: number
          memo?: string | null
          status?: 'ISSUED' | 'CLEARED' | 'VOIDED' | 'STOPPED'
          invoice_url?: string | null
          issued_by?: string
          issued_by_user?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          old_values: any | null
          new_values: any | null
          ip_address: string | null
          user_agent: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Export typed Supabase clients
export const typedSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
export const typedSupabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper functions for common operations
export const supabaseHelpers = {
  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Upload file to Supabase Storage
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    return { data, error }
  },

  // Download file from Supabase Storage
  async downloadFile(bucket: string, path: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)
    return { data, error }
  },

  // Get public URL for file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  }
}


