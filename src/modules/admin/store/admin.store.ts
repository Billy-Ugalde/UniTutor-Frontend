import { create } from 'zustand'

interface AdminState {
  selectedInstitutionId: string | null
  setSelectedInstitutionId: (id: string | null) => void
}

const STORAGE_KEY = 'unitutor_selected_inst_id'

export const useAdminStore = create<AdminState>((set) => ({
  selectedInstitutionId:
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,

  setSelectedInstitutionId: (id: string | null) => {
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    set({ selectedInstitutionId: id })
  },
}))

