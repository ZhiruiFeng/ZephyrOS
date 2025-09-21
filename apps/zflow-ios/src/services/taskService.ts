import { httpClient, handleApiResponse } from '../utils/httpClient';
import {
  Task,
  TaskMemory,
  CreateTaskRequest,
  TaskQueryParams,
  Category,
  TaskStats,
} from '../types/task';

export class TaskService {
  // Get tasks with filtering
  static async getTasks(params: TaskQueryParams = {}): Promise<TaskMemory[]> {
    console.log('📋 Fetching tasks with params:', params);

    const response = await httpClient.get<TaskMemory[]>('/tasks', params);
    return handleApiResponse(response);
  }

  // Get a specific task by ID
  static async getTask(id: string): Promise<TaskMemory> {
    console.log(`📋 Fetching task: ${id}`);

    const response = await httpClient.get<TaskMemory>(`/tasks/${id}`);
    return handleApiResponse(response);
  }

  // Create a new task
  static async createTask(taskData: CreateTaskRequest): Promise<TaskMemory> {
    console.log('📋 Creating task:', taskData.content.title);

    const response = await httpClient.post<TaskMemory>('/tasks', taskData);
    return handleApiResponse(response);
  }

  // Update an existing task
  static async updateTask(id: string, taskData: Partial<CreateTaskRequest>): Promise<TaskMemory> {
    console.log(`📋 Updating task: ${id}`);

    const response = await httpClient.put<TaskMemory>(`/tasks/${id}`, taskData);
    return handleApiResponse(response);
  }

  // Delete a task
  static async deleteTask(id: string): Promise<void> {
    console.log(`📋 Deleting task: ${id}`);

    const response = await httpClient.delete(`/tasks/${id}`);
    handleApiResponse(response);
  }

  // Update task status
  static async updateTaskStatus(id: string, status: Task['status']): Promise<TaskMemory> {
    console.log(`📋 Updating task status: ${id} -> ${status}`);

    const response = await httpClient.patch<TaskMemory>(`/tasks/${id}/status`, { status });
    return handleApiResponse(response);
  }

  // Get tasks updated today
  static async getTasksUpdatedToday(): Promise<TaskMemory[]> {
    console.log('📋 Fetching tasks updated today');

    const response = await httpClient.get<TaskMemory[]>('/tasks/updated-today');
    return handleApiResponse(response);
  }

  // Get task hierarchy/tree
  static async getTaskTree(id: string): Promise<TaskMemory[]> {
    console.log(`📋 Fetching task tree: ${id}`);

    const response = await httpClient.get<TaskMemory[]>(`/tasks/${id}/tree`);
    return handleApiResponse(response);
  }

  // Timer operations
  static async startTimer(taskId: string): Promise<any> {
    console.log(`⏱️ Starting timer for task: ${taskId}`);

    const response = await httpClient.post(`/tasks/${taskId}/timer/start`);
    return handleApiResponse(response);
  }

  static async stopTimer(taskId: string): Promise<any> {
    console.log(`⏱️ Stopping timer for task: ${taskId}`);

    const response = await httpClient.post(`/tasks/${taskId}/timer/stop`);
    return handleApiResponse(response);
  }

  // Get time entries for a task
  static async getTaskTimeEntries(taskId: string): Promise<any[]> {
    console.log(`⏱️ Fetching time entries for task: ${taskId}`);

    const response = await httpClient.get<any[]>(`/tasks/${taskId}/time-entries`);
    return handleApiResponse(response);
  }

  // Convenience methods for common task operations
  static async getActiveTasks(): Promise<TaskMemory[]> {
    return this.getTasks({
      status: 'in_progress',
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  }

  static async getPendingTasks(): Promise<TaskMemory[]> {
    return this.getTasks({
      status: 'pending',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  }

  static async getCompletedTasks(limit: number = 20): Promise<TaskMemory[]> {
    return this.getTasks({
      status: 'completed',
      sort_by: 'completion_date',
      sort_order: 'desc',
      limit,
    });
  }

  static async getRootTasks(): Promise<TaskMemory[]> {
    return this.getTasks({
      root_tasks_only: true,
      sort_by: 'updated_at',
      sort_order: 'desc',
      limit: 500,
    });
  }

  static async getOverdueTasks(): Promise<TaskMemory[]> {
    const now = new Date().toISOString();
    return this.getTasks({
      due_before: now,
      status: 'pending',
      sort_by: 'due_date',
      sort_order: 'asc',
    });
  }

  static async searchTasks(query: string): Promise<TaskMemory[]> {
    return this.getTasks({
      search: query,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  }

  static async getTasksByCategory(categoryId: string): Promise<TaskMemory[]> {
    return this.getTasks({
      category: categoryId,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  }

  static async getTasksByPriority(priority: Task['priority']): Promise<TaskMemory[]> {
    return this.getTasks({
      priority,
      sort_by: 'due_date',
      sort_order: 'asc',
    });
  }
}

// Category service
export class CategoryService {
  static async getCategories(): Promise<Category[]> {
    console.log('🏷️ Fetching categories');

    const response = await httpClient.get<Category[]>('/categories');
    return handleApiResponse(response);
  }

  static async createCategory(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    console.log('🏷️ Creating category:', categoryData.name);

    const response = await httpClient.post<Category>('/categories', categoryData);
    return handleApiResponse(response);
  }

  static async updateCategory(id: string, categoryData: Partial<Category>): Promise<Category> {
    console.log(`🏷️ Updating category: ${id}`);

    const response = await httpClient.put<Category>(`/categories/${id}`, categoryData);
    return handleApiResponse(response);
  }

  static async deleteCategory(id: string): Promise<void> {
    console.log(`🏷️ Deleting category: ${id}`);

    const response = await httpClient.delete(`/categories/${id}`);
    handleApiResponse(response);
  }
}