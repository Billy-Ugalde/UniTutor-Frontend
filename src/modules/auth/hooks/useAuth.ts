import { useAuthStore } from '@/modules/auth/store/auth.store'
import type { UserRole } from '@/types/database.types'

export function useAuth() {
  const { session, user, profile, roles, isLoading, signIn, signOut } =
    useAuthStore()

  const isAuthenticated = session !== null

  const isSuperAdmin = Boolean(user?.app_metadata?.is_super_admin)

  const hasRole = (role: UserRole): boolean => {
    if (isSuperAdmin && role === 'inst_admin') return true
    return roles.includes(role)
  }

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
    isSuperAdmin,
    fullName,
    hasRole,
    signIn,
    signOut,
  }
}

