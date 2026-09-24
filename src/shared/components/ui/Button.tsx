import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border-transparent',
  secondary:
    'bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500 border-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300 border-transparent',
  success:
    'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border-transparent',
}

const sizeClasses: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center rounded-md border font-medium shrink-0',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}

