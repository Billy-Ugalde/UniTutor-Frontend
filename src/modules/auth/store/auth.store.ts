import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database.types'

interface AuthState {
  /** Sesión activa de Supabase (contiene el JWT) */
  session: Session | null
  /** Usuario de Supabase Auth */
  user: User | null
  /** Perfil de la tabla public.profiles */
  profile: Profile | null
  /** Roles activos del usuario en su institución */
  roles: UserRole[]
  /** true mientras se verifica la sesión inicial */
  isLoading: boolean

  /** Inicializar: verificar sesión y suscribirse a cambios de auth */
  initialize: () => Promise<() => void>
  /** Iniciar sesión con email y contraseña */
  signIn: (email: string, password: string) => Promise<void>
  /** Cerrar sesión */
  signOut: () => Promise<void>
  /** Cargar perfil desde la base de datos (interno) */
  _loadProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  roles: [],
  isLoading: true,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    set({ session, user: session?.user ?? null, isLoading: false })

    if (session?.user) {
      await get()._loadProfile(session.user.id)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null })

      if (newSession?.user) {
        await get()._loadProfile(newSession.user.id)
      } else {
        set({ profile: null, roles: [] })
      }
    })

    return () => subscription.unsubscribe()
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, roles: [] })
  },

  _loadProfile: async (userId) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('active', true)

    set({
      profile: profile ?? null,
      roles: ((userRoles ?? []) as Array<{ role: string }>).map((r) => r.role as UserRole),
    })
  },
}))
