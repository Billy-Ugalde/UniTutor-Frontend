interface TutorAvatarProps {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  size?: 'md' | 'lg'
}

const sizeClasses = {
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
}

export function TutorAvatar({ firstName, lastName, avatarUrl, size = 'md' }: TutorAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClasses[size]} shrink-0 rounded-full border border-gray-200 object-cover`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700`}
    >
      {initials}
    </div>
  )
}
