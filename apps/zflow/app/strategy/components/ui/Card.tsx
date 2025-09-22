import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card = ({ children, className = "" }: CardProps) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
)

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader = ({ children, className = "" }: CardHeaderProps) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
)

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export const CardTitle = ({ children, className = "" }: CardTitleProps) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
)

interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const CardDescription = ({ children, className = "" }: CardDescriptionProps) => (
  <p className={`text-sm text-gray-600 mt-1 ${className}`}>
    {children}
  </p>
)

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent = ({ children, className = "" }: CardContentProps) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
)
