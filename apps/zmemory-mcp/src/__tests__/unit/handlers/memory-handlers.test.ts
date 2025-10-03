/**
 * Unit tests for MemoryHandlers
 */

import { MemoryHandlers } from '../../../handlers/memory-handlers.js';
import { createMockClient } from '../../../../test/mocks/zmemory-api-mock.js';

describe('MemoryHandlers', () => {
  let memoryHandlers: MemoryHandlers;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockClient();
    memoryHandlers = new MemoryHandlers(mockClient as any);
  });

  afterEach(() => {
    mockClient.reset();
  });

  describe('handleAddMemory', () => {
    it('should add a memory successfully', async () => {
      const args = {
        note: 'This is a test memory',
        memory_type: 'knowledge',
        tags: ['test', 'important'],
      };

      const result = await memoryHandlers.handleAddMemory(args);

      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('成功添加记忆');
      expect(result.content[1].text).toContain('ID:');
      expect(result.content[1].text).toContain('类型:');
      expect(result.content[1].text).toContain('创建时间:');
    });

    it('should throw validation error for invalid params', async () => {
      const args = {
        // Missing required note
        memory_type: 'knowledge',
      };

      await expect(memoryHandlers.handleAddMemory(args)).rejects.toThrow();
    });

    it('should handle memory with emotion', async () => {
      mockClient.addMemory = jest.fn().mockResolvedValue({
        id: 'mem-test',
        note: 'Happy memory',
        memory_type: 'experience',
        emotion_valence: 0.8,
        created_at: new Date().toISOString(),
      });

      const args = {
        note: 'Happy memory',
        memory_type: 'experience',
        emotion_valence: 0.8,
      };

      const result = await memoryHandlers.handleAddMemory(args);

      expect(result.content[1].text).toContain('情感效价');
    });

    it('should handle memory with place', async () => {
      mockClient.addMemory = jest.fn().mockResolvedValue({
        id: 'mem-test',
        note: 'Memory at office',
        memory_type: 'experience',
        place_name: 'Office',
        created_at: new Date().toISOString(),
      });

      const args = {
        note: 'Memory at office',
        memory_type: 'experience',
        place_name: 'Office',
      };

      const result = await memoryHandlers.handleAddMemory(args);

      expect(result.content[1].text).toContain('地点: Office');
    });

    it('should handle highlighted memory', async () => {
      mockClient.addMemory = jest.fn().mockResolvedValue({
        id: 'mem-test',
        note: 'Important memory',
        memory_type: 'milestone',
        is_highlight: true,
        created_at: new Date().toISOString(),
      });

      const args = {
        note: 'Important memory',
        memory_type: 'milestone',
        is_highlight: true,
      };

      const result = await memoryHandlers.handleAddMemory(args);

      expect(result.content[1].text).toContain('✨ 重要记忆');
    });
  });

  describe('handleSearchMemories', () => {
    it('should search memories by type', async () => {
      const args = {
        memory_type: 'knowledge',
      };

      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('条记忆');
    });

    it('should search memories by tags', async () => {
      const args = {
        tags: ['mcp'],
      };

      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].text).toContain('找到');
    });

    it('should search memories by query', async () => {
      const args = {
        query: 'MCP protocol',
      };

      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].text).toContain('找到');
    });

    it('should return message when no memories found', async () => {
      const args = {
        memory_type: 'nonexistent',
      };

      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].text).toBe('未找到匹配的记忆');
    });

    it('should handle empty search params', async () => {
      const args = {};

      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].text).toContain('找到');
      expect(result.content[0].text).toContain('条记忆');
    });

    it('should display memory with emotion', async () => {
      mockClient.searchMemories = jest.fn().mockResolvedValue([
        {
          id: 'mem-001',
          note: 'Positive memory',
          memory_type: 'experience',
          emotion_valence: 0.5,
        },
      ]);

      const args = {};
      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].text).toContain('情感: +0.5');
    });

    it('should display memory with place', async () => {
      mockClient.searchMemories = jest.fn().mockResolvedValue([
        {
          id: 'mem-001',
          note: 'Memory at home',
          memory_type: 'experience',
          place_name: 'Home',
        },
      ]);

      const args = {};
      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].text).toContain('@Home');
    });

    it('should display highlighted memories', async () => {
      mockClient.searchMemories = jest.fn().mockResolvedValue([
        {
          id: 'mem-001',
          note: 'Important memory',
          memory_type: 'milestone',
          is_highlight: true,
        },
      ]);

      const args = {};
      const result = await memoryHandlers.handleSearchMemories(args);

      expect(result.content[0].text).toContain('✨');
    });
  });

  describe('handleGetMemory', () => {
    it('should get a memory by ID', async () => {
      const args = {
        id: 'mem-001',
      };

      const result = await memoryHandlers.handleGetMemory(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('记忆详情');
      expect(result.content[0].text).toContain('ID: mem-001');
      expect(result.content[0].text).toContain('类型:');
      expect(result.content[0].text).toContain('内容:');
    });

    it('should throw validation error when ID is missing', async () => {
      const args = {};

      await expect(memoryHandlers.handleGetMemory(args)).rejects.toThrow();
    });

    it('should throw error when memory not found', async () => {
      const args = {
        id: 'non-existent-memory',
      };

      await expect(memoryHandlers.handleGetMemory(args)).rejects.toThrow('Memory not found');
    });

    it('should display memory tags', async () => {
      const args = {
        id: 'mem-001',
      };

      const result = await memoryHandlers.handleGetMemory(args);

      expect(result.content[0].text).toContain('标签:');
    });

    it('should display emotion details', async () => {
      mockClient.getMemory = jest.fn().mockResolvedValue({
        id: 'mem-001',
        note: 'Emotional memory',
        memory_type: 'experience',
        emotion_valence: 0.7,
        emotion_arousal: 0.5,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const args = {
        id: 'mem-001',
      };

      const result = await memoryHandlers.handleGetMemory(args);

      expect(result.content[0].text).toContain('情感效价: 0.7');
      expect(result.content[0].text).toContain('情感唤醒: 0.5');
    });

    it('should display energy delta', async () => {
      mockClient.getMemory = jest.fn().mockResolvedValue({
        id: 'mem-001',
        note: 'Energetic memory',
        memory_type: 'experience',
        energy_delta: 0.3,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const args = {
        id: 'mem-001',
      };

      const result = await memoryHandlers.handleGetMemory(args);

      expect(result.content[0].text).toContain('能量影响: 0.3');
    });

    it('should display salience score', async () => {
      mockClient.getMemory = jest.fn().mockResolvedValue({
        id: 'mem-001',
        note: 'Important memory',
        memory_type: 'milestone',
        salience_score: 0.95,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const args = {
        id: 'mem-001',
      };

      const result = await memoryHandlers.handleGetMemory(args);

      expect(result.content[0].text).toContain('重要性: 95.0%');
    });
  });

  describe('handleUpdateMemory', () => {
    it('should update a memory successfully', async () => {
      const args = {
        id: 'mem-001',
        updates: {
          note: 'Updated memory content',
          tags: ['updated'],
        },
      };

      const result = await memoryHandlers.handleUpdateMemory(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('成功更新记忆');
      expect(result.content[1].text).toContain('更新时间');
    });

    it('should throw validation error for invalid params', async () => {
      const args = {
        // Missing required id
        updates: {
          note: 'Updated content',
        },
      };

      await expect(memoryHandlers.handleUpdateMemory(args)).rejects.toThrow();
    });

    it('should throw error when memory not found', async () => {
      const args = {
        id: 'non-existent-memory',
        updates: {
          note: 'Updated content',
        },
      };

      await expect(memoryHandlers.handleUpdateMemory(args)).rejects.toThrow('Memory not found');
    });

    it('should handle partial updates', async () => {
      const args = {
        id: 'mem-001',
        updates: {
          is_highlight: true,
        },
      };

      const result = await memoryHandlers.handleUpdateMemory(args);

      expect(result.content[0].text).toContain('成功更新记忆');
    });
  });

  describe('handleDeleteMemory', () => {
    it('should delete a memory successfully', async () => {
      const args = {
        id: 'mem-001',
      };

      const result = await memoryHandlers.handleDeleteMemory(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('成功删除记忆');
      expect(result.content[0].text).toContain('mem-001');
    });

    it('should throw validation error when ID is missing', async () => {
      const args = {};

      await expect(memoryHandlers.handleDeleteMemory(args)).rejects.toThrow();
    });

    it('should throw error when memory not found', async () => {
      const args = {
        id: 'non-existent-memory',
      };

      await expect(memoryHandlers.handleDeleteMemory(args)).rejects.toThrow('Memory not found');
    });
  });

  describe('handleGetMemoryStats', () => {
    it('should return memory statistics', async () => {
      const args = {};

      const result = await memoryHandlers.handleGetMemoryStats(args);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('记忆统计信息');
      expect(result.content[0].text).toContain('总记忆数:');
      expect(result.content[0].text).toContain('按类型分布:');
    });

    it('should display correct memory counts', async () => {
      mockClient.getStats = jest.fn().mockResolvedValue({
        total: 10,
        recent_count: 2,
        highlights: 3,
        by_type: {
          knowledge: 5,
          note: 3,
          reminder: 2,
        },
        by_status: {
          active: 8,
          archived: 2,
        },
      });

      const args = {};
      const result = await memoryHandlers.handleGetMemoryStats(args);

      const text = result.content[0].text;
      expect(text).toContain('总记忆数: 10');
      expect(text).toContain('最近24小时新增: 2');
      expect(text).toContain('重要记忆数: 3');
      expect(text).toContain('knowledge: 5');
    });

    it('should handle zero stats gracefully', async () => {
      mockClient.getStats = jest.fn().mockResolvedValue({
        total: 0,
        recent_count: 0,
        highlights: 0,
        by_type: {},
        by_status: {},
      });

      const args = {};
      const result = await memoryHandlers.handleGetMemoryStats(args);

      expect(result.content[0].text).toContain('总记忆数: 0');
    });

    it('should display emotion stats when available', async () => {
      mockClient.getStats = jest.fn().mockResolvedValue({
        total: 5,
        by_type: {},
        by_status: {},
        by_emotion: {
          positive: 3,
          neutral: 1,
          negative: 1,
        },
      });

      const args = {};
      const result = await memoryHandlers.handleGetMemoryStats(args);

      const text = result.content[0].text;
      expect(text).toContain('按情感分布:');
      expect(text).toContain('positive: 3');
    });
  });
});
