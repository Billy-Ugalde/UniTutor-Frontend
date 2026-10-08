import { Outlet } from 'react-router-dom'
import { LanguageSelector } from '@/shared/components/LanguageSelector'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <header className="flex justify-end px-4 pt-4 sm:px-6">
        <LanguageSelector />
      </header>
      <Outlet />
    </div>
  )
}

