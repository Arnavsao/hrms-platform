import { createBrowserClient } from '@supabase/ssr';

// Get environment variables with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single Supabase client instance for the browser
// Using @supabase/ssr ensures the session is persisted to cookies
// so middleware can read the auth state reliably
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Type definitions for database tables
export type Database = {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string;
          name: string;
          email: string;
          resume_url: string | null;
          parsed_data: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['candidates']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>;
      };
      jobs: {
        Row: {
          id: string;
          title: string;
          description: string;
          requirements: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
      };
      applications: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          fit_score: number | null;
          highlights: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
      };
      screenings: {
        Row: {
          id: string;
          application_id: string;
          transcript: string | null;
          ai_summary: any; // JSONB
          score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['screenings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['screenings']['Insert']>;
      };
      digital_footprints: {
        Row: {
          id: string;
          candidate_id: string;
          github_data: any | null; // JSONB
          linkedin_data: any | null; // JSONB
          portfolio_data: any | null; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['digital_footprints']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['digital_footprints']['Insert']>;
      };
    };
  };
};

