import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database.types'
import { useAdminStore } from '@/modules/admin/store/admin.store'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: UserRole[]
  isLoading: boolean

  initialize: () => Promise<() => void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
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
    const cleanEmail = email.trim().toLowerCase()

    const { data: statusCheck, error: checkError } = await supabase.rpc(
      'check_user_can_sign_in',
      { p_email: cleanEmail }
    )

    if (!checkError && statusCheck && (statusCheck as { allowed: boolean; message?: string }).allowed === false) {
      throw new Error((statusCheck as { allowed: boolean; message?: string }).message || 'Esta cuenta ha sido desactivada.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) throw error

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active')
        .eq('id', data.user.id)
        .single()

      if (profile && profile.active === false) {
        await supabase.auth.signOut()
        set({ session: null, user: null, profile: null, roles: [] })
        throw new Error('Esta cuenta ha sido desactivada. Comunícate con el administrador de tu institución.')
      }
    }
  },

  signOut: async () => {
    useAdminStore.getState().setSelectedInstitutionId(null)
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, roles: [] })
  },

  _loadProfile: async (userId) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, institutions(active)')
      .eq('id', userId)
      .single()

    const instData = (profile as { institutions?: { active: boolean } | null } | null)?.institutions
    const isInstActive = instData?.active !== false

    if (profile && (profile.active === false || !isInstActive)) {
      useAdminStore.getState().setSelectedInstitutionId(null)
      await supabase.auth.signOut()
      set({ session: null, user: null, profile: null, roles: [] })
      return
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('active', true)

    const currentUser = get().user
    const isSuperAdmin = Boolean(currentUser?.app_metadata?.is_super_admin)
    if (!isSuperAdmin) {
      useAdminStore.getState().setSelectedInstitutionId(profile?.institution_id ?? null)
    }

    set({
      profile: profile ?? null,
      roles: ((userRoles ?? []) as Array<{ role: string }>).map((r) => r.role as UserRole),
    })
  },
}))
