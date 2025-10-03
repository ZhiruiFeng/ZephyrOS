/**
 * Unit tests for ActivityHandlers
 */

import { ActivityHandlers } from '../../../handlers/activity-handlers.js';
import { createMockClient } from '../../../__mocks__/zmemory-api-mock.js';

describe('ActivityHandlers', () => {
  let activityHandlers: ActivityHandlers;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockClient();
    activityHandlers = new ActivityHandlers(mockClient as any);
  });

  afterEach(() => {
    mockClient.reset();
  });

  describe('handleCreateActivity', () => {
    it('should create an activity successfully', async () => {
      mockClient.createActivity = jest.fn().mockResolvedValue({
        id: 'act-001',
        title: 'Morning Exercise',
        activity_type: 'exercise',
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const args = {
        title: 'Morning Exercise',
        activity_type: 'exercise',
      };

      const result = await activityHandlers.handleCreateActivity(args);

      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('成功创建活动');
      expect(result.content[0].text).toContain('Morning Exercise');
      expect(result.content[1].text).toContain('ID: act-001');
      expect(result.content[1].text).toContain('类型: exercise');
    });

    it('should throw validation error for invalid params', async () => {
      const args = {
        // Missing required title
        activity_type: 'exercise',
      };

      await expect(activityHandlers.handleCreateActivity(args)).rejects.toThrow();
    });

    it('should display mood changes', async () => {
      mockClient.createActivity = jest.fn().mockResolvedValue({
        id: 'act-001',
        title: 'Meditation',
        activity_type: 'wellness',
        mood_before: 5,
        mood_after: 8,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const args = {
        title: 'Meditation',
        activity_type: 'wellness',
        mood_before: 5,
        mood_after: 8,
      };

      const result = await activityHandlers.handleCreateActivity(args);

      expect(result.content[1].text).toContain('心情变化: 5 → 8');
    });

    it('should display energy changes', async () => {
      mockClient.createActivity = jest.fn().mockResolvedValue({
        id: 'act-001',
        title: 'Run',
        activity_type: 'exercise',
        energy_before: 6,
        energy_after: 9,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const args = {
        title: 'Run',
        activity_type: 'exercise',
        energy_before: 6,
        energy_after: 9,
      };

      const result = await activityHandlers.handleCreateActivity(args);

      expect(result.content[1].text).toContain('能量变化: 6 → 9');
    });

    it('should display satisfaction level', async () => {
      mockClient.createActivity = jest.fn().mockResolvedValue({
        id: 'act-001',
        title: 'Reading',
        activity_type: 'learning',
        satisfaction_level: 9,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const args = {
        title: 'Reading',
        activity_type: 'learning',
        satisfaction_level: 9,
      };

      const result = await activityHandlers.handleCreateActivity(args);

      expect(result.content[1].text).toContain('满意度: 9/10');
    });
  });

  describe('handleSearchActivities', () => {
    beforeEach(() => {
      mockClient.searchActivities = jest.fn().mockResolvedValue([
        {
          id: 'act-001',
          title: 'Exercise',
          activity_type: 'exercise',
          mood_after: 8,
          satisfaction_level: 9,
          duration_minutes: 30,
        },
        {
          id: 'act-002',
          title: 'Reading',
          activity_type: 'learning',
          mood_after: 7,
          duration_minutes: 60,
        },
      ]);
    });

    it('should search activities by type', async () => {
      const args = {
        activity_type: 'exercise',
      };

      const result = await activityHandlers.handleSearchActivities(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('项活动');
    });

    it('should search activities by date range', async () => {
      const args = {
        from_date: '2025-10-01',
        to_date: '2025-10-31',
      };

      const result = await activityHandlers.handleSearchActivities(args);

      expect(result.content[0].text).toContain('找到');
    });

    it('should return message when no activities found', async () => {
      mockClient.searchActivities = jest.fn().mockResolvedValue([]);

      const args = {
        activity_type: 'nonexistent',
      };

      const result = await activityHandlers.handleSearchActivities(args);

      expect(result.content[0].text).toBe('未找到匹配的活动');
    });

    it('should handle empty search params', async () => {
      const args = {};

      const result = await activityHandlers.handleSearchActivities(args);

      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('项活动');
    });

    it('should display activity details in list', async () => {
      const args = {};

      const result = await activityHandlers.handleSearchActivities(args);

      const text = result.content[0].text;
      expect(text).toContain('[exercise]');
      expect(text).toContain('(心情: 8/10)');
      expect(text).toContain('(满意: 9/10)');
      expect(text).toContain('(30分钟)');
    });
  });

  describe('handleGetActivity', () => {
    beforeEach(() => {
      mockClient.getActivity = jest.fn().mockResolvedValue({
        id: 'act-001',
        title: 'Morning Exercise',
        activity_type: 'exercise',
        description: 'Daily morning workout',
        started_at: '2025-10-03T06:00:00Z',
        ended_at: '2025-10-03T06:30:00Z',
        duration_minutes: 30,
        mood_before: 6,
        mood_after: 8,
        energy_before: 5,
        energy_after: 9,
        satisfaction_level: 9,
        intensity_level: 'moderate',
        location: 'Home',
        weather: 'Sunny',
        companions: ['John'],
        tags: ['exercise', 'morning'],
        status: 'completed',
        notes: 'Felt great after workout',
        insights: 'Morning exercise boosts energy',
        gratitude: 'Grateful for good health',
        created_at: '2025-10-03T06:00:00Z',
        updated_at: '2025-10-03T06:30:00Z',
      });
    });

    it('should get an activity by ID', async () => {
      const args = {
        id: 'act-001',
      };

      const result = await activityHandlers.handleGetActivity(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('活动详情');
      expect(result.content[0].text).toContain('ID: act-001');
      expect(result.content[0].text).toContain('标题: Morning Exercise');
    });

    it('should throw validation error when ID is missing', async () => {
      const args = {};

      await expect(activityHandlers.handleGetActivity(args)).rejects.toThrow();
    });

    it('should throw error when activity not found', async () => {
      mockClient.getActivity = jest.fn().mockRejectedValue(
        new Error('Activity not found')
      );

      const args = {
        id: 'non-existent-activity',
      };

      await expect(activityHandlers.handleGetActivity(args)).rejects.toThrow(
        'Activity not found'
      );
    });

    it('should display all activity details', async () => {
      const args = {
        id: 'act-001',
      };

      const result = await activityHandlers.handleGetActivity(args);

      const text = result.content[0].text;
      expect(text).toContain('描述: Daily morning workout');
      expect(text).toContain('开始时间:');
      expect(text).toContain('结束时间:');
      expect(text).toContain('持续时间: 30分钟');
      expect(text).toContain('活动前心情: 6/10');
      expect(text).toContain('活动后心情: 8/10');
      expect(text).toContain('活动前能量: 5/10');
      expect(text).toContain('活动后能量: 9/10');
      expect(text).toContain('满意度: 9/10');
      expect(text).toContain('强度: moderate');
      expect(text).toContain('地点: Home');
      expect(text).toContain('天气: Sunny');
      expect(text).toContain('同伴: John');
      expect(text).toContain('标签: exercise, morning');
      expect(text).toContain('备注: Felt great after workout');
      expect(text).toContain('感悟: Morning exercise boosts energy');
      expect(text).toContain('感恩: Grateful for good health');
    });

    it('should handle activity without optional fields', async () => {
      mockClient.getActivity = jest.fn().mockResolvedValue({
        id: 'act-002',
        title: 'Simple Activity',
        activity_type: 'other',
        status: 'completed',
        created_at: '2025-10-03T10:00:00Z',
        updated_at: '2025-10-03T10:00:00Z',
      });

      const args = {
        id: 'act-002',
      };

      const result = await activityHandlers.handleGetActivity(args);

      expect(result.content[0].text).toContain('ID: act-002');
      expect(result.content[0].text).toContain('标题: Simple Activity');
    });
  });

  describe('handleUpdateActivity', () => {
    beforeEach(() => {
      mockClient.updateActivity = jest.fn().mockImplementation((params) => {
        return Promise.resolve({
          id: params.id,
          title: 'Updated Activity',
          updated_at: new Date().toISOString(),
          ...params.updates,
        });
      });
    });

    it('should update an activity successfully', async () => {
      const args = {
        id: 'act-001',
        updates: {
          status: 'completed',
          satisfaction_level: 10,
        },
      };

      const result = await activityHandlers.handleUpdateActivity(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('成功更新活动');
      expect(result.content[1].text).toContain('更新时间');
    });

    it('should throw validation error for invalid params', async () => {
      const args = {
        // Missing required id
        updates: {
          status: 'completed',
        },
      };

      await expect(activityHandlers.handleUpdateActivity(args)).rejects.toThrow();
    });

    it('should throw error when activity not found', async () => {
      mockClient.updateActivity = jest.fn().mockRejectedValue(
        new Error('Activity not found')
      );

      const args = {
        id: 'non-existent-activity',
        updates: {
          status: 'completed',
        },
      };

      await expect(activityHandlers.handleUpdateActivity(args)).rejects.toThrow(
        'Activity not found'
      );
    });

    it('should handle partial updates', async () => {
      const args = {
        id: 'act-001',
        updates: {
          notes: 'Added some notes',
        },
      };

      const result = await activityHandlers.handleUpdateActivity(args);

      expect(result.content[0].text).toContain('成功更新活动');
    });
  });

  describe('handleGetActivityStats', () => {
    beforeEach(() => {
      mockClient.getActivityStats = jest.fn().mockResolvedValue({
        total: 50,
        recent_count: 10,
        avg_satisfaction: 8.5,
        avg_mood_improvement: 2.3,
        by_type: {
          exercise: 15,
          learning: 10,
          social: 8,
          wellness: 7,
          other: 10,
        },
        by_status: {
          completed: 45,
          in_progress: 3,
          planned: 2,
        },
        by_intensity: {
          low: 20,
          moderate: 20,
          high: 10,
        },
      });
    });

    it('should return activity statistics', async () => {
      const args = {};

      const result = await activityHandlers.handleGetActivityStats(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('活动统计信息');
      expect(result.content[0].text).toContain('总活动数:');
      expect(result.content[0].text).toContain('按类型分布:');
      expect(result.content[0].text).toContain('按状态分布:');
    });

    it('should display correct activity counts', async () => {
      const args = {};

      const result = await activityHandlers.handleGetActivityStats(args);

      const text = result.content[0].text;
      expect(text).toContain('总活动数: 50');
      expect(text).toContain('最近7天活动: 10');
      expect(text).toContain('平均满意度: 8.5/10');
      expect(text).toContain('平均心情提升: +2.3');
      expect(text).toContain('exercise: 15');
      expect(text).toContain('completed: 45');
    });

    it('should handle zero stats gracefully', async () => {
      mockClient.getActivityStats = jest.fn().mockResolvedValue({
        total: 0,
        recent_count: 0,
        by_type: {},
        by_status: {},
      });

      const args = {};
      const result = await activityHandlers.handleGetActivityStats(args);

      expect(result.content[0].text).toContain('总活动数: 0');
    });

    it('should display intensity stats when available', async () => {
      const args = {};

      const result = await activityHandlers.handleGetActivityStats(args);

      const text = result.content[0].text;
      expect(text).toContain('按强度分布:');
      expect(text).toContain('low: 20');
      expect(text).toContain('moderate: 20');
      expect(text).toContain('high: 10');
    });

    it('should handle missing optional stats', async () => {
      mockClient.getActivityStats = jest.fn().mockResolvedValue({
        total: 10,
        by_type: { exercise: 5, learning: 5 },
        by_status: { completed: 10 },
      });

      const args = {};
      const result = await activityHandlers.handleGetActivityStats(args);

      expect(result.content[0].text).toContain('总活动数: 10');
      // Should not contain avg_satisfaction or avg_mood_improvement
      expect(result.content[0].text).not.toContain('平均满意度:');
      expect(result.content[0].text).not.toContain('平均心情提升:');
    });
  });
});
