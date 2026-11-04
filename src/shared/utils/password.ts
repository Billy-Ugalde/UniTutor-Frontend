export interface PasswordCriteria {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export interface PasswordValidationResult {
  criteria: PasswordCriteria
  score: number
  isValid: boolean
  strength: 'weak' | 'medium' | 'strong'
}

export function validatePassword(password: string): PasswordValidationResult {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  }

  const score = Object.values(criteria).filter(Boolean).length

  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (score >= 5) {
    strength = 'strong'
  } else if (score >= 3) {
    strength = 'medium'
  }

  return {
    criteria,
    score,
    isValid: score === 5,
    strength,
  }
}

