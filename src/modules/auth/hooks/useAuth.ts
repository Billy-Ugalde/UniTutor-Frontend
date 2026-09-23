import { useAuthStore } from '@/modules/auth/store/auth.store'
import type { UserRole } from '@/types/database.types'

/**
 * Hook de autenticación — acceso simplificado al estado de auth.
 *
 * @example
 * const { user, profile, isAuthenticated, hasRole } = useAuth()
 */
export function useAuth() {
  const { session, user, profile, roles, isLoading, signIn, signOut } =
    useAuthStore()

  const isAuthenticated = session !== null

  const hasRole = (role: UserRole): boolean => roles.includes(role)

  const fullName =
    profile
      ? `${profile.first_name} ${profile.last_name}`.trim() || user?.email
      : user?.email

  return {
    session,
    user,
    profile,
    roles,
    isLoading,
    isAuthenticated,
    fullName,
    hasRole,
    signIn,
    signOut,
  }
}

