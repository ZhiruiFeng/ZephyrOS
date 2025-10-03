/**
 * Mock implementation of ZMemory API Client for testing
 */

import { AxiosInstance } from 'axios';
import { AuthState } from '../types.js';
import tasksFixture from '../../test/fixtures/tasks.json';
import memoriesFixture from '../../test/fixtures/memories.json';
import usersFixture from '../../test/fixtures/users.json';

export class MockZMemoryClient {
  private mockTasks = [...tasksFixture];
  private mockMemories = [...memoriesFixture];
  private mockUsers = [...usersFixture];

  public authState: AuthState = {
    isAuthenticated: true,
    tokens: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
    },
    userInfo: usersFixture[0] as any,
  };

  // Task methods
  async createTask(params: any) {
    const newTask = {
      id: `task-${Date.now()}`,
      ...params,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.mockTasks.push(newTask);
    return newTask;
  }

  async searchTasks(params: any) {
    let results = [...this.mockTasks];

    if (params.status) {
      results = results.filter(t => t.status === params.status);
    }
    if (params.priority) {
      results = results.filter(t => t.priority === params.priority);
    }
    if (params.query) {
      results = results.filter(t =>
        t.title.toLowerCase().includes(params.query.toLowerCase()) ||
        t.description?.toLowerCase().includes(params.query.toLowerCase())
      );
    }

    return results;
  }

  async getTask(id: string) {
    const task = this.mockTasks.find(t => t.id === id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return task;
  }

  async updateTask(params: any) {
    const index = this.mockTasks.findIndex(t => t.id === params.id);
    if (index === -1) {
      throw new Error(`Task not found: ${params.id}`);
    }

    this.mockTasks[index] = {
      ...this.mockTasks[index],
      ...params.updates,
      updatedAt: new Date().toISOString(),
    };

    return this.mockTasks[index];
  }

  async getTaskStats() {
    return {
      total: this.mockTasks.length,
      pending: this.mockTasks.filter(t => t.status === 'pending').length,
      in_progress: this.mockTasks.filter(t => t.status === 'in_progress').length,
      completed: this.mockTasks.filter(t => t.status === 'completed').length,
      by_priority: {
        urgent: this.mockTasks.filter(t => t.priority === 'urgent').length,
        high: this.mockTasks.filter(t => t.priority === 'high').length,
        medium: this.mockTasks.filter(t => t.priority === 'medium').length,
        low: this.mockTasks.filter(t => t.priority === 'low').length,
      },
    };
  }

  // Memory methods
  async addMemory(params: any) {
    const newMemory = {
      id: `mem-${Date.now()}`,
      ...params,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.mockMemories.push(newMemory);
    return newMemory;
  }

  async searchMemories(params: any) {
    let results = [...this.mockMemories];

    if (params.type) {
      results = results.filter(m => m.type === params.type);
    }
    if (params.tags) {
      results = results.filter(m =>
        params.tags.some((tag: string) => m.tags.includes(tag))
      );
    }
    if (params.query) {
      results = results.filter(m =>
        m.content.toLowerCase().includes(params.query.toLowerCase())
      );
    }

    return results;
  }

  async getMemory(id: string) {
    const memory = this.mockMemories.find(m => m.id === id);
    if (!memory) {
      throw new Error(`Memory not found: ${id}`);
    }
    return memory;
  }

  async updateMemory(params: any) {
    const index = this.mockMemories.findIndex(m => m.id === params.id);
    if (index === -1) {
      throw new Error(`Memory not found: ${params.id}`);
    }

    this.mockMemories[index] = {
      ...this.mockMemories[index],
      ...params.updates,
      updatedAt: new Date().toISOString(),
    };

    return this.mockMemories[index];
  }

  async deleteMemory(id: string) {
    const index = this.mockMemories.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Memory not found: ${id}`);
    }
    this.mockMemories.splice(index, 1);
  }

  async getStats() {
    return {
      total: this.mockMemories.length,
      by_type: {
        knowledge: this.mockMemories.filter(m => m.type === 'knowledge').length,
        note: this.mockMemories.filter(m => m.type === 'note').length,
        reminder: this.mockMemories.filter(m => m.type === 'reminder').length,
      },
    };
  }

  // Auth methods
  async getUserInfo() {
    return this.authState.userInfo;
  }

  isAuthenticated() {
    return this.authState.isAuthenticated;
  }

  getAuthState() {
    return this.authState;
  }

  setAccessToken(token: string) {
    this.authState.isAuthenticated = true;
    if (this.authState.tokens) {
      this.authState.tokens.access_token = token;
    }
  }

  clearAuth() {
    this.authState.isAuthenticated = false;
    this.authState.tokens = undefined;
    this.authState.userInfo = undefined;
  }

  // Reset for testing
  reset() {
    this.mockTasks = [...tasksFixture];
    this.mockMemories = [...memoriesFixture];
    this.authState = {
      isAuthenticated: true,
      tokens: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      },
      userInfo: usersFixture[0] as any,
    };
  }
}

export function createMockClient(): MockZMemoryClient {
  return new MockZMemoryClient();
}
