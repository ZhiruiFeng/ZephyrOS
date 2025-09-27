// Activities Feature API
// Consolidates activity-related API calls

import { activitiesApi as baseActivitiesApi } from '@/lib/api'

// Re-export the activities API with additional organization
export const activitiesApi = {
  // Basic CRUD operations
  getAll: baseActivitiesApi?.getAll || (() => Promise.resolve([])),
  get: ((id: string) => Promise.reject(new Error('Not implemented'))),
  create: baseActivitiesApi?.create || ((data: any) => Promise.reject(new Error('Not implemented'))),
  update: baseActivitiesApi?.update || ((id: string, data: any) => Promise.reject(new Error('Not implemented'))),
  delete: baseActivitiesApi?.delete || ((id: string) => Promise.reject(new Error('Not implemented'))),

  // Status operations
  complete: ((id: string) => Promise.reject(new Error('Not implemented'))),
  activate: ((id: string) => Promise.reject(new Error('Not implemented'))),
  cancel: ((id: string) => Promise.reject(new Error('Not implemented'))),

  // Search and filtering
  search: ((query: string) => Promise.resolve([])),
  getByType: ((type: string) => Promise.resolve([])),
  getByCategory: ((categoryId: string) => Promise.resolve([])),
}
