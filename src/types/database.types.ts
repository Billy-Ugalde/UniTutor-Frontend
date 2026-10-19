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
          code: string | null
          name: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          career_id: string
          code?: string | null
          name: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          career_id?: string
          code?: string | null
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
          custom_code: string | null
          active: boolean
        }
        Insert: {
          institution_id: string
          subject_id: string
          custom_code?: string | null
          active?: boolean
        }
        Update: {
          institution_id?: string
          subject_id?: string
          custom_code?: string | null
          active?: boolean
        }
      }

      tutor_subjects: {
        Row: {
          id: string
          tutor_id: string
          subject_id: string
          institution_id: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tutor_id: string
          subject_id: string
          institution_id: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tutor_id?: string
          subject_id?: string
          institution_id?: string
          active?: boolean
          created_at?: string
        }
      }

      tutoring_sessions: {
        Row: {
          id: string
          tutor_id: string
          subject_id: string
          institution_id: string
          title: string
          description: string | null
          date: string
          start_time: string
          end_time: string
          modality: 'virtual' | 'presencial' | 'hibrida'
          location_or_link: string
          max_students: number
          status: 'programada' | 'en_curso' | 'completada' | 'cancelada'
          created_at: string
        }
        Insert: {
          id?: string
          tutor_id: string
          subject_id: string
          institution_id: string
          title: string
          description?: string | null
          date: string
          start_time: string
          end_time: string
          modality?: 'virtual' | 'presencial' | 'hibrida'
          location_or_link: string
          max_students?: number
          status?: 'programada' | 'en_curso' | 'completada' | 'cancelada'
          created_at?: string
        }
        Update: {
          id?: string
          tutor_id?: string
          subject_id?: string
          institution_id?: string
          title?: string
          description?: string | null
          date?: string
          start_time?: string
          end_time?: string
          modality?: 'virtual' | 'presencial' | 'hibrida'
          location_or_link?: string
          max_students?: number
          status?: 'programada' | 'en_curso' | 'completada' | 'cancelada'
          created_at?: string
        }
      }

      tutoring_requests: {
        Row: {
          id: string
          session_id: string
          student_id: string
          tutor_id: string
          subject_id: string
          institution_id: string
          message: string | null
          status: 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada'
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          student_id: string
          tutor_id: string
          subject_id: string
          institution_id: string
          message?: string | null
          status?: 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada'
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          student_id?: string
          tutor_id?: string
          subject_id?: string
          institution_id?: string
          message?: string | null
          status?: 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada'
          created_at?: string
        }
      }

      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          request_id: string | null
          payload: Json
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          request_id?: string | null
          payload?: Json
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_tutors: {
        Args: {
          p_query?: string | null
          p_institution_id?: string | null
          p_course_id?: string | null
          p_subject_id?: string | null
          p_only_available?: boolean
          p_tutor_id?: string | null
        }
        Returns: TutorSearchRow[]
      }
      get_tutor_availability: {
        Args: {
          p_tutor_id: string
          p_institution_id?: string | null
          p_subject_id?: string | null
        }
        Returns: TutorSlotRow[]
      }
      create_tutoring_request: {
        Args: {
          p_session_id: string
          p_message?: string | null
        }
        Returns: { request_id: string; status: TutoringRequestStatus; success: boolean }
      }
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
export type InstitutionSubject = Database['public']['Tables']['institution_subjects']['Row']
export type TutorSubject = Database['public']['Tables']['tutor_subjects']['Row']
export type TutoringSession = Database['public']['Tables']['tutoring_sessions']['Row']
export type TutoringRequest = Database['public']['Tables']['tutoring_requests']['Row']
export type AppNotification = Database['public']['Tables']['notifications']['Row']
export type SessionModality = 'virtual' | 'presencial' | 'hibrida'
export type SessionStatus = 'programada' | 'en_curso' | 'completada' | 'cancelada'
export type TutoringRequestStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada'

export interface TutorSearchSubject {
  id: string
  name: string
  code: string
  course_id: string | null
  course_name: string | null
  career_name: string | null
}

export interface TutorSearchRow {
  tutor_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  institution_id: string
  institution_name: string
  subjects: TutorSearchSubject[]
  upcoming_slots: number
}

export interface TutorSlotRow {
  session_id: string
  subject_id: string
  subject_name: string
  subject_code: string
  title: string
  description: string | null
  session_date: string
  start_time: string
  end_time: string
  modality: SessionModality
  max_students: number
  taken_spots: number
  available_spots: number
  my_request_status: 'pendiente' | 'aceptada' | null
}

export interface NewRequestNotificationPayload {
  student_name?: string
  subject_name?: string
  subject_code?: string
  session_title?: string
  date?: string
  start_time?: string
  end_time?: string
  message?: string | null
}
