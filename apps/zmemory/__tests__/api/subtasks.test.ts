import { NextRequest } from 'next/server';
import { GET as getSubtasks, POST as createSubtask } from '../../app/api/subtasks/route';
import { PUT as reorderSubtasks } from '../../app/api/subtasks/reorder/route';

// Mock the auth functions
jest.mock('../../lib/auth', () => ({
  getUserIdFromRequest: jest.fn(() => Promise.resolve('test-user-id')),
  createClientForRequest: jest.fn(() => mockSupabaseClient)
}));

// Mock Supabase client with subtasks-specific operations
const mockSupabaseClient = {
  from: jest.fn((table: string) => {
    if (table === 'tasks') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hierarchy_level: 0
              },
              error: null
            }))
          })),
          in: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                { id: '123e4567-e89b-12d3-a456-426614174001', parent_task_id: '123e4567-e89b-12d3-a456-426614174000' },
                { id: '123e4567-e89b-12d3-a456-426614174002', parent_task_id: '123e4567-e89b-12d3-a456-426614174000' }
              ],
              error: null
            }))
          })),
          limit: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { subtask_order: 2 },
              error: null
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: '123e4567-e89b-12d3-a456-426614174003',
                title: 'New Subtask',
                status: 'pending',
                priority: 'medium',
                parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
                subtask_order: 3,
                hierarchy_level: 1,
                hierarchy_path: '123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174003',
                subtask_count: 0,
                completed_subtask_count: 0,
                completion_behavior: 'manual',
                progress_calculation: 'manual',
                created_at: '2024-08-21T10:00:00Z',
                updated_at: '2024-08-21T10:00:00Z'
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            error: null
          }))
        }))
      };
    }
    return {};
  }),
  rpc: jest.fn((functionName: string) => {
    if (functionName === 'get_subtask_tree') {
      return Promise.resolve({
        data: [
          {
            task_id: '123e4567-e89b-12d3-a456-426614174000',
            parent_task_id: null,
            title: 'Parent Task',
            status: 'in_progress',
            progress: 50,
            hierarchy_level: 0,
            subtask_order: 0
          },
          {
            task_id: '123e4567-e89b-12d3-a456-426614174001',
            parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Subtask 1',
            status: 'completed',
            progress: 100,
            hierarchy_level: 1,
            subtask_order: 1
          },
          {
            task_id: '123e4567-e89b-12d3-a456-426614174002',
            parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Subtask 2',
            status: 'pending',
            progress: 0,
            hierarchy_level: 1,
            subtask_order: 2
          }
        ],
        error: null
      });
    }
    return Promise.resolve({ data: [], error: null });
  })
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('/api/subtasks', () => {
  const parentTaskId = '123e4567-e89b-12d3-a456-426614174000';

  describe('GET /api/subtasks', () => {
    it('should get subtasks tree for a parent task', async () => {
      const request = new NextRequest(
        `http://localhost:3001/api/subtasks?parent_task_id=${parentTaskId}`
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2); // Excludes parent task
      expect(data[0]).toHaveProperty('task_id');
      expect(data[0]).toHaveProperty('parent_task_id', parentTaskId);
      expect(data[0]).toHaveProperty('title');
      expect(data[0]).toHaveProperty('status');
      expect(data[0]).toHaveProperty('progress');
      expect(data[0]).toHaveProperty('hierarchy_level');
      expect(data[0]).toHaveProperty('subtask_order');
    });

    it('should handle max_depth parameter', async () => {
      const request = new NextRequest(
        `http://localhost:3001/api/subtasks?parent_task_id=${parentTaskId}&max_depth=2`
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle include_completed parameter', async () => {
      const request = new NextRequest(
        `http://localhost:3001/api/subtasks?parent_task_id=${parentTaskId}&include_completed=false`
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      // Should exclude completed subtasks (in real implementation)
    });

    it('should validate required parent_task_id parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/subtasks'
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid query parameters');
    });

    it('should validate parent_task_id UUID format', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/subtasks?parent_task_id=invalid-uuid'
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid query parameters');
    });

    it('should validate max_depth as positive integer', async () => {
      const request = new NextRequest(
        `http://localhost:3001/api/subtasks?parent_task_id=${parentTaskId}&max_depth=not-a-number`
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid query parameters');
    });

    it('should handle non-existent parent task', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      
      // Mock client to return no data for non-existent task
      const mockClientWithNoData = {
        ...mockSupabaseClient,
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116' }
              }))
            }))
          }))
        }))
      };

      // Temporarily replace the mock
      require('../../lib/auth').createClientForRequest.mockReturnValue(mockClientWithNoData);

      const request = new NextRequest(
        `http://localhost:3001/api/subtasks?parent_task_id=${nonExistentId}`
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Parent task not found');

      // Restore original mock
      require('../../lib/auth').createClientForRequest.mockReturnValue(mockSupabaseClient);
    });
  });

  describe('POST /api/subtasks', () => {
    it('should create a new subtask', async () => {
      const subtaskData = {
        parent_task_id: parentTaskId,
        task_data: {
          type: 'task',
          content: {
            title: 'New Subtask',
            description: 'This is a new subtask',
            status: 'pending',
            priority: 'medium',
            completion_behavior: 'manual',
            progress_calculation: 'manual'
          },
          tags: ['subtask', 'test']
        },
        subtask_order: 3
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(subtaskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'task');
      expect(data.content.title).toBe('New Subtask');
      expect(data.content.parent_task_id).toBe(parentTaskId);
      expect(data.content.subtask_order).toBe(3);
      expect(data.content.completion_behavior).toBe('manual');
      expect(data.content.progress_calculation).toBe('manual');
      expect(data).toHaveProperty('hierarchy_level', 1);
      expect(data).toHaveProperty('hierarchy_path');
    });

    it('should auto-assign subtask order when not provided', async () => {
      const subtaskData = {
        parent_task_id: parentTaskId,
        task_data: {
          type: 'task',
          content: {
            title: 'Auto-ordered Subtask',
            status: 'pending',
            priority: 'medium'
          }
        }
        // No subtask_order provided
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(subtaskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.content.subtask_order).toBe(3); // Next available order
    });

    it('should validate required fields', async () => {
      const invalidData = {
        parent_task_id: parentTaskId,
        task_data: {
          type: 'task',
          content: {
            // Missing title
            status: 'pending',
            priority: 'medium'
          }
        }
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid subtask data');
    });

    it('should validate parent_task_id format', async () => {
      const subtaskData = {
        parent_task_id: 'invalid-uuid',
        task_data: {
          type: 'task',
          content: {
            title: 'Test Subtask',
            status: 'pending',
            priority: 'medium'
          }
        }
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(subtaskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid subtask data');
    });

    it('should validate task_data structure', async () => {
      const subtaskData = {
        parent_task_id: parentTaskId,
        task_data: {
          // Missing type field
          content: {
            title: 'Test Subtask',
            status: 'pending',
            priority: 'medium'
          }
        }
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(subtaskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid subtask data');
    });

    it('should handle maximum hierarchy depth', async () => {
      // Mock a task that's already at level 9 (max depth - 1)
      const mockClientWithMaxDepth = {
        ...mockSupabaseClient,
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: {
                  id: parentTaskId,
                  hierarchy_level: 9 // At maximum allowed depth
                },
                error: null
              }))
            }))
          }))
        }))
      };

      require('../../lib/auth').createClientForRequest.mockReturnValue(mockClientWithMaxDepth);

      const subtaskData = {
        parent_task_id: parentTaskId,
        task_data: {
          type: 'task',
          content: {
            title: 'Deep Subtask',
            status: 'pending',
            priority: 'medium'
          }
        }
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(subtaskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Maximum hierarchy depth exceeded');

      // Restore original mock
      require('../../lib/auth').createClientForRequest.mockReturnValue(mockSupabaseClient);
    });

    it('should handle non-existent parent task', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      
      const mockClientWithNoParent = {
        ...mockSupabaseClient,
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116' }
              }))
            }))
          }))
        }))
      };

      require('../../lib/auth').createClientForRequest.mockReturnValue(mockClientWithNoParent);

      const subtaskData = {
        parent_task_id: nonExistentId,
        task_data: {
          type: 'task',
          content: {
            title: 'Orphaned Subtask',
            status: 'pending',
            priority: 'medium'
          }
        }
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(subtaskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Parent task not found');

      // Restore original mock
      require('../../lib/auth').createClientForRequest.mockReturnValue(mockSupabaseClient);
    });
  });

  describe('PUT /api/subtasks/reorder', () => {
    it('should reorder subtasks successfully', async () => {
      const reorderData = {
        parent_task_id: parentTaskId,
        subtask_orders: [
          {
            task_id: '123e4567-e89b-12d3-a456-426614174001',
            new_order: 2
          },
          {
            task_id: '123e4567-e89b-12d3-a456-426614174002',
            new_order: 1
          }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Subtasks reordered successfully');
      expect(data).toHaveProperty('updated_count', 2);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        parent_task_id: parentTaskId
        // Missing subtask_orders
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid reorder data');
    });

    it('should validate parent_task_id format', async () => {
      const reorderData = {
        parent_task_id: 'invalid-uuid',
        subtask_orders: [
          {
            task_id: '123e4567-e89b-12d3-a456-426614174001',
            new_order: 1
          }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid reorder data');
    });

    it('should validate task_id formats', async () => {
      const reorderData = {
        parent_task_id: parentTaskId,
        subtask_orders: [
          {
            task_id: 'invalid-uuid',
            new_order: 1
          }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid reorder data');
    });

    it('should validate new_order as non-negative integer', async () => {
      const reorderData = {
        parent_task_id: parentTaskId,
        subtask_orders: [
          {
            task_id: '123e4567-e89b-12d3-a456-426614174001',
            new_order: -1
          }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid reorder data');
    });

    it('should require at least one subtask order', async () => {
      const reorderData = {
        parent_task_id: parentTaskId,
        subtask_orders: []
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid reorder data');
    });

    it('should handle non-existent parent task', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      
      const mockClientWithNoParent = {
        ...mockSupabaseClient,
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116' }
              }))
            }))
          }))
        }))
      };

      require('../../lib/auth').createClientForRequest.mockReturnValue(mockClientWithNoParent);

      const reorderData = {
        parent_task_id: nonExistentId,
        subtask_orders: [
          {
            task_id: '123e4567-e89b-12d3-a456-426614174001',
            new_order: 1
          }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Parent task not found');

      // Restore original mock
      require('../../lib/auth').createClientForRequest.mockReturnValue(mockSupabaseClient);
    });
  });

  describe('Error handling', () => {
    it('should handle unauthorized requests', async () => {
      // Mock auth to return null user
      require('../../lib/auth').getUserIdFromRequest.mockReturnValue(Promise.resolve(null));

      const request = new NextRequest(
        `http://localhost:3001/api/subtasks?parent_task_id=${parentTaskId}`
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error', 'Unauthorized');

      // Restore mock
      require('../../lib/auth').getUserIdFromRequest.mockReturnValue(Promise.resolve('test-user-id'));
    });

    it('should handle database connection failures', async () => {
      // Mock client to return null
      require('../../lib/auth').createClientForRequest.mockReturnValue(null);

      const request = new NextRequest(
        `http://localhost:3001/api/subtasks?parent_task_id=${parentTaskId}`
      );
      const response = await getSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error', 'Database connection failed');

      // Restore mock
      require('../../lib/auth').createClientForRequest.mockReturnValue(mockSupabaseClient);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: '{ invalid json }',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createSubtask(request);
      expect(response.status).toBe(500);
    });
  });
});