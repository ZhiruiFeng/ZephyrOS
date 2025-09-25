import React from 'react'

interface TextareaProps {
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  className?: string
}

export const Textarea = ({
  placeholder,
  value,
  onChange,
  className = ""
}: TextareaProps) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
  />
)
