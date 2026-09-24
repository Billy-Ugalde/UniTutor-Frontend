export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'inst_admin' | 'tutor' | 'estudiante'

export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string
          name: string
          slug: string
          official_email: string | null
          phone: string | null
          address: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          official_email?: string | null
          phone?: string | null
          address?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          official_email?: string | null
          phone?: string | null
          address?: string | null
          active?: boolean
          created_at?: string
        }
      }

      profiles: {
        Row: {
          id: string
          institution_id: string | null
          email: string | null
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          institution_id?: string | null
          email?: string | null
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string | null
          email?: string | null
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          active?: boolean
          created_at?: string
        }
      }

      user_roles: {
        Row: {
          id: string
          user_id: string
          institution_id: string
          role: UserRole
          active: boolean
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          institution_id: string
          role: UserRole
          active?: boolean
          assigned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          institution_id?: string
          role?: UserRole
          active?: boolean
          assigned_at?: string
        }
      }

      careers: {
        Row: {
          id: string
          name: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
      }

      courses: {
        Row: {
          id: string
          career_id: string
          code: string
          name: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          career_id: string
          code: string
          name: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          career_id?: string
          code?: string
          name?: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
      }

      subjects: {
        Row: {
          id: string
          course_id: string
          code: string
          name: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          code: string
          name: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          code?: string
          name?: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
      }

      institution_subjects: {
        Row: {
          institution_id: string
          subject_id: string
          active: boolean
        }
        Insert: {
          institution_id: string
          subject_id: string
          active?: boolean
        }
        Update: {
          institution_id?: string
          subject_id?: string
          active?: boolean
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
      user_role: UserRole
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Institution = Database['public']['Tables']['institutions']['Row']
export type UserRoleRecord = Database['public']['Tables']['user_roles']['Row']
export type Career = Database['public']['Tables']['careers']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Subject = Database['public']['Tables']['subjects']['Row']
