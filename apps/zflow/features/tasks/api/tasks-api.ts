// Tasks Feature API
// Consolidates task-related API calls from lib/api

import { 
  tasksApi as baseTasksApi,
  subtasksApi as baseSubtasksApi,
  type TaskMemory,
  type TaskContent,
  type CreateTaskRequest,
  type UpdateTaskRequest
} from '@/lib/api'

// Re-export the base API functions with additional organization
export const tasksApi = {
  // Basic CRUD operations
  getAll: baseTasksApi.getAll,
  get: ((id: string) => Promise.reject(new Error('Not implemented'))),
  create: baseTasksApi.create,
  update: baseTasksApi.update,
  delete: baseTasksApi.delete,

  // Status operations
  complete: ((id: string) => Promise.reject(new Error('Not implemented'))),
  hold: ((id: string) => Promise.reject(new Error('Not implemented'))),
  activate: ((id: string) => Promise.reject(new Error('Not implemented'))),
  reopen: ((id: string) => Promise.reject(new Error('Not implemented'))),

  // Category operations
  updateCategory: ((id: string, categoryId: string) => Promise.reject(new Error('Not implemented'))),

  // Search and filtering
  search: ((query: string) => Promise.resolve([])),
}

export const subtasksApi = {
  // Subtask operations
  getTaskTree: baseSubtasksApi.getTaskTree,
  createSubtask: ((parentTaskId: string, subtask: any) => Promise.reject(new Error('Not implemented'))),
  updateSubtask: ((id: string, updates: any) => Promise.reject(new Error('Not implemented'))),
  deleteSubtask: ((id: string) => Promise.reject(new Error('Not implemented'))),
  moveSubtask: ((id: string, newParentId: string) => Promise.reject(new Error('Not implemented'))),
}

// Export types for the tasks feature
export type {
  TaskMemory,
  TaskContent,
  CreateTaskRequest,
  UpdateTaskRequest
}
