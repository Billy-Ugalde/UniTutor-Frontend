import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`border-b border-gray-100 px-6 py-4 ${className}`}>{children}</div>
  )
}

Card.Body = function CardBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

Card.Footer = function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`border-t border-gray-100 px-6 py-4 ${className}`}>{children}</div>
  )
}

