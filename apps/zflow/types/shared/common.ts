// =====================================================
// Shared Common Types - Unified
// =====================================================

// Common utility types
export type ID = string
export type Timestamp = string
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>

// Common status types
export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'archived'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Visibility = 'public' | 'private' | 'shared'

// Common response patterns
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: Timestamp
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
  timestamp: Timestamp
}

// Common UI state patterns
export interface LoadingState {
  loading: boolean
  error: string | null
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

// Common filter patterns
export interface BaseFilters {
  search?: string
  tags?: string[]
  category_id?: string
  status?: string
  priority?: string
  date_from?: string
  date_to?: string
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// Common form patterns
export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox' | 'tags'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    custom?: (value: any) => string | null
  }
}

export interface FormState {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}

// Color and theme
export interface Color {
  name: string
  value: string
  contrast?: string
}

export interface Theme {
  colors: {
    primary: Color
    secondary: Color
    success: Color
    warning: Color
    danger: Color
    info: Color
  }
  mode: 'light' | 'dark' | 'auto'
}

// Location
export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Location {
  name?: string
  address?: string
  coordinates?: Coordinates
}