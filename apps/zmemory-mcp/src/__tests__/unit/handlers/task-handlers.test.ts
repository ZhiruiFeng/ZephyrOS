/**
 * Unit tests for TaskHandlers
 */

import { TaskHandlers } from '../../../handlers/task-handlers.js';
import { createMockClient } from '../../../../test/mocks/zmemory-api-mock.js';

describe('TaskHandlers', () => {
  let taskHandlers: TaskHandlers;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockClient();
    taskHandlers = new TaskHandlers(mockClient as any);
  });

  afterEach(() => {
    mockClient.reset();
  });

  describe('handleCreateTask', () => {
    it('should create a task successfully', async () => {
      const args = {
        title: 'New Test Task',
        description: 'This is a test task',
        priority: 'high',
        status: 'pending',
      };

      const result = await taskHandlers.handleCreateTask(args);

      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('成功创建任务');
      expect(result.content[1].text).toContain('ID:');
      expect(result.content[1].text).toContain('状态:');
      expect(result.content[1].text).toContain('优先级:');
    });

    it('should throw validation error for invalid params', async () => {
      const args = {
        // Missing required title
        priority: 'high',
      };

      await expect(taskHandlers.handleCreateTask(args)).rejects.toThrow();
    });

    it('should handle task with minimal fields', async () => {
      const args = {
        title: 'Minimal Task',
      };

      const result = await taskHandlers.handleCreateTask(args);

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('Minimal Task');
    });
  });

  describe('handleSearchTasks', () => {
    it('should search tasks by status', async () => {
      const args = {
        status: 'pending',
      };

      const result = await taskHandlers.handleSearchTasks(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('个任务');
    });

    it('should search tasks by priority', async () => {
      const args = {
        priority: 'high',
      };

      const result = await taskHandlers.handleSearchTasks(args);

      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('[high]');
    });

    it('should search tasks by query string', async () => {
      const args = {
        query: 'documentation',
      };

      const result = await taskHandlers.handleSearchTasks(args);

      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('documentation');
    });

    it('should return message when no tasks found', async () => {
      const args = {
        status: 'archived',
      };

      const result = await taskHandlers.handleSearchTasks(args);

      expect(result.content[0].text).toBe('未找到匹配的任务');
    });

    it('should handle empty search params', async () => {
      const args = {};

      const result = await taskHandlers.handleSearchTasks(args);

      expect(result.content[0].text).toContain('找到');
      // Should return all tasks
      expect(result.content[0].text).toContain('个任务');
    });

    it('should display task information correctly', async () => {
      const args = {
        priority: 'urgent',
      };

      const result = await taskHandlers.handleSearchTasks(args);

      expect(result.content[0].text).toContain('ID:');
      expect(result.content[0].text).toContain('[urgent]');
    });
  });

  describe('handleGetTask', () => {
    it('should get a task by ID', async () => {
      const args = {
        id: 'task-001',
      };

      const result = await taskHandlers.handleGetTask(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('任务详情');
      expect(result.content[0].text).toContain('ID: task-001');
      expect(result.content[0].text).toContain('创建时间');
      expect(result.content[0].text).toContain('更新时间');
    });

    it('should throw error when ID is missing', async () => {
      const args = {};

      await expect(taskHandlers.handleGetTask(args)).rejects.toThrow('需要提供任务ID');
    });

    it('should throw error when task not found', async () => {
      const args = {
        id: 'non-existent-task',
      };

      await expect(taskHandlers.handleGetTask(args)).rejects.toThrow('Task not found');
    });

    it('should display task tags', async () => {
      const args = {
        id: 'task-001',
      };

      const result = await taskHandlers.handleGetTask(args);

      expect(result.content[0].text).toContain('标签:');
    });
  });

  describe('handleUpdateTask', () => {
    it('should update a task successfully', async () => {
      const args = {
        id: 'task-001',
        updates: {
          status: 'in_progress',
          priority: 'urgent',
        },
      };

      const result = await taskHandlers.handleUpdateTask(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('成功更新任务');
      expect(result.content[1].text).toContain('更新时间');
    });

    it('should throw validation error for invalid params', async () => {
      const args = {
        // Missing required id
        updates: {
          status: 'completed',
        },
      };

      await expect(taskHandlers.handleUpdateTask(args)).rejects.toThrow();
    });

    it('should throw error when task not found', async () => {
      const args = {
        id: 'non-existent-task',
        updates: {
          status: 'completed',
        },
      };

      await expect(taskHandlers.handleUpdateTask(args)).rejects.toThrow('Task not found');
    });

    it('should handle partial updates', async () => {
      const args = {
        id: 'task-001',
        updates: {
          status: 'completed',
        },
      };

      const result = await taskHandlers.handleUpdateTask(args);

      expect(result.content[0].text).toContain('成功更新任务');
    });
  });

  describe('handleGetTaskStats', () => {
    it('should return task statistics', async () => {
      const args = {};

      const result = await taskHandlers.handleGetTaskStats(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('任务统计信息');
      expect(result.content[0].text).toContain('总任务数:');
      expect(result.content[0].text).toContain('按状态分布:');
      expect(result.content[0].text).toContain('按优先级分布:');
    });

    it('should display correct task counts', async () => {
      const args = {};

      const result = await taskHandlers.handleGetTaskStats(args);

      const text = result.content[0].text;
      expect(text).toContain('总任务数:');
      expect(text).toContain('pending:');
      expect(text).toContain('high:');
    });

    it('should handle zero stats gracefully', async () => {
      // Clear all tasks
      mockClient.reset();
      mockClient.mockTasks = [];

      const args = {};
      const result = await taskHandlers.handleGetTaskStats(args);

      expect(result.content[0].text).toContain('总任务数: 0');
    });
  });

  describe('handleGetTaskUpdatesForToday', () => {
    it('should return today\'s task updates', async () => {
      // Mock the method
      mockClient.getTaskUpdatesForToday = jest.fn().mockResolvedValue({
        tasks: [
          {
            id: 'task-001',
            content: { title: 'Test Task', status: 'completed' },
            change_type: 'updated',
            timestamp: new Date().toISOString(),
          },
        ],
        timezone: 'UTC',
      });

      const args = {};
      const result = await taskHandlers.handleGetTaskUpdatesForToday(args);

      expect(result.content[0].text).toContain('今日任务更新');
      expect(result.content[0].text).toContain('总更新数: 1');
    });

    it('should handle no updates for today', async () => {
      mockClient.getTaskUpdatesForToday = jest.fn().mockResolvedValue({
        tasks: [],
        timezone: 'UTC',
      });

      const args = {};
      const result = await taskHandlers.handleGetTaskUpdatesForToday(args);

      expect(result.content[0].text).toContain('今日无任务更新');
    });

    it('should respect timezone parameter', async () => {
      mockClient.getTaskUpdatesForToday = jest.fn().mockResolvedValue({
        tasks: [],
        timezone: 'Asia/Shanghai',
      });

      const args = { timezone: 'Asia/Shanghai' };
      const result = await taskHandlers.handleGetTaskUpdatesForToday(args);

      expect(mockClient.getTaskUpdatesForToday).toHaveBeenCalledWith('Asia/Shanghai');
    });
  });

  describe('handleGetTaskUpdatesForDate', () => {
    it('should return task updates for specific date', async () => {
      mockClient.getTaskUpdatesForDate = jest.fn().mockResolvedValue({
        tasks: [
          {
            id: 'task-001',
            content: { title: 'Test Task', status: 'completed' },
            change_type: 'created',
            timestamp: '2025-10-01T10:00:00Z',
          },
        ],
        timezone: 'UTC',
      });

      const args = { date: '2025-10-01' };
      const result = await taskHandlers.handleGetTaskUpdatesForDate(args);

      expect(result.content[0].text).toContain('2025-10-01 任务更新');
      expect(result.content[0].text).toContain('总更新数: 1');
    });

    it('should throw error when date is missing', async () => {
      const args = {};

      await expect(taskHandlers.handleGetTaskUpdatesForDate(args)).rejects.toThrow(
        '需要提供日期参数'
      );
    });

    it('should handle no updates for date', async () => {
      mockClient.getTaskUpdatesForDate = jest.fn().mockResolvedValue({
        tasks: [],
        timezone: 'UTC',
      });

      const args = { date: '2025-10-01' };
      const result = await taskHandlers.handleGetTaskUpdatesForDate(args);

      expect(result.content[0].text).toContain('2025-10-01 无任务更新');
    });

    it('should pass timezone to client', async () => {
      mockClient.getTaskUpdatesForDate = jest.fn().mockResolvedValue({
        tasks: [],
        timezone: 'America/New_York',
      });

      const args = { date: '2025-10-01', timezone: 'America/New_York' };
      await taskHandlers.handleGetTaskUpdatesForDate(args);

      expect(mockClient.getTaskUpdatesForDate).toHaveBeenCalledWith(
        '2025-10-01',
        'America/New_York'
      );
    });
  });
});
