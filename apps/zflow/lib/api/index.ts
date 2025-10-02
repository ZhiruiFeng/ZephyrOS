// Base utilities and types
export * from './api-base'
export * from './zmemory-api-base'

// Feature-specific API modules
export * from './categories-api'
export * from './tasks-api'
export * from './task-relations-api'
export * from './subtasks-api'
export * from './time-tracking-api'
export * from './activities-api'
export * from './energy-api'
export * from './ai-api'
export * from './stats-api'
export * from './memories-api'
export * from './narrative-api'
export * from './zmemory-api-keys-api'
export * from './executor-api'

// Re-export APIs for direct access
export { categoriesApi } from './categories-api'
export { tasksApi } from './tasks-api'
export { taskRelationsApi } from './task-relations-api'
export { subtasksApi } from './subtasks-api'
export { timeTrackingApi, timelineItemsApi } from './time-tracking-api'
export { activitiesApi } from './activities-api'
export { energyDaysApi } from './energy-api'
export { agentFeaturesApi, aiAgentsApi, aiTasksApi } from './ai-api'
export { statsApi } from './stats-api'
export { memoriesApi, useMemoryOperations, MemoryAPIError } from './memories-api'
export { seasonApi, episodeApi, narrativeApi, narrativeApiClient, NarrativeAPIError } from './narrative-api'
export { zmemoryApiKeysApi, ZMEMORY_SCOPES } from './zmemory-api-keys-api'
export { executorApi } from './executor-api'

// Import API modules for legacy compatibility
import { categoriesApi } from './categories-api'
import { tasksApi } from './tasks-api'
import { activitiesApi } from './activities-api'
import { CreateTaskRequest, UpdateTaskRequest } from './api-base'

// Compatible export: maintain apiClient interface for legacy hooks
export const apiClient = {
  getTasks: (params?: Parameters<typeof tasksApi.getAll>[0]) => tasksApi.getAll(params),
  getTask: (id: string) => tasksApi.getById(id),
  createTask: (data: CreateTaskRequest) => tasksApi.create({ ...(data.content), tags: data.tags }),
  updateTask: (id: string, data: UpdateTaskRequest) => tasksApi.update(id, { ...data.content, tags: data.tags }),
  deleteTask: (id: string) => tasksApi.delete(id),
  // Activities
  getActivities: (params?: Parameters<typeof activitiesApi.getAll>[0]) => activitiesApi.getAll(params),
  getActivity: (id: string) => activitiesApi.getById(id),
  createActivity: (data: Parameters<typeof activitiesApi.create>[0]) => activitiesApi.create(data),
  updateActivity: (id: string, data: Parameters<typeof activitiesApi.update>[1]) => activitiesApi.update(id, data),
  deleteActivity: (id: string) => activitiesApi.delete(id),
}