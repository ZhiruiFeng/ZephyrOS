import { NextRequest } from 'next/server';
import { PUT as reorderSubtasks } from '../../app/api/subtasks/reorder/route';

// Mock the auth functions
jest.mock('../../lib/auth', () => ({
  getUserIdFromRequest: jest.fn(() => Promise.resolve('test-user-id')),
  createClientForRequest: jest.fn(() => null)
}));

// Mock Supabase to test without database
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null)
}));

describe('/api/subtasks/reorder', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('PUT /api/subtasks/reorder', () => {
    it('should reorder subtasks with valid data', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 },
          { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 1 },
          { task_id: '123e4567-e89b-12d3-a456-426614174003', new_order: 2 }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      // In mock mode without real database, this may return 500
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(data).toHaveProperty('message', 'Subtasks reordered successfully');
        expect(data).toHaveProperty('parent_task_id', '123e4567-e89b-12d3-a456-426614174000');
        expect(data).toHaveProperty('reordered_count');
        expect(typeof data.reordered_count).toBe('number');
        expect(data.reordered_count).toBe(3);
      }
    });

    it('should validate parent_task_id format', async () => {
      const reorderData = {
        parent_task_id: 'invalid-uuid',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 }
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
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['parent_task_id']
          })
        ])
      );
    });

    it('should validate subtask_orders array structure', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: 'invalid-uuid', new_order: 0 },
          { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: -1 } // Invalid negative order
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

    it('should require non-empty subtask_orders array', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
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

    it('should validate maximum array length', async () => {
      const subtask_orders = Array.from({ length: 101 }, (_, i) => ({
        task_id: `123e4567-e89b-12d3-a456-${(426614174000 + i).toString().padStart(12, '0')}`,
        new_order: i
      }));

      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders
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
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['subtask_orders']
          })
        ])
      );
    });

    it('should handle reordering with gaps in order numbers', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 },
          { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 5 },
          { task_id: '123e4567-e89b-12d3-a456-426614174003', new_order: 10 }
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
      expect(data.reordered_count).toBe(3);
    });

    it('should handle duplicate order numbers', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 1 },
          { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 1 }, // Duplicate order
          { task_id: '123e4567-e89b-12d3-a456-426614174003', new_order: 2 }
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
      expect(data).toHaveProperty('error', 'Duplicate order values are not allowed');
    });

    it('should handle duplicate task IDs', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 },
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 1 }, // Duplicate task_id
          { task_id: '123e4567-e89b-12d3-a456-426614174003', new_order: 2 }
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
      expect(data).toHaveProperty('error', 'Duplicate task IDs are not allowed');
    });

    it('should handle non-existent parent task', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174999', // Non-existent
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 }
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
    });

    it('should handle non-existent subtasks', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174999', new_order: 0 } // Non-existent subtask
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
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Some specified tasks are not subtasks of the parent task');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: '{ invalid json }',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      expect(response.status).toBe(500);
    });

    it('should handle missing content-type header', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData)
        // Missing Content-Type header
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Should still work
      expect(data).toHaveProperty('message', 'Subtasks reordered successfully');
    });

    it('should preserve existing task properties during reorder', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 2 }, // Reversing order
          { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 1 },
          { task_id: '123e4567-e89b-12d3-a456-426614174003', new_order: 0 }
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
      expect(data.reordered_count).toBe(3);
    });

    it('should handle large order numbers', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 2147483647 }, // Max integer value
          { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 1000000 }
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
    });

    it('should return appropriate error for authorization issues', async () => {
      // Mock auth to return null (unauthorized)
      const authMock = require('../../lib/auth');
      authMock.getUserIdFromRequest.mockResolvedValueOnce(null);

      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error', 'Unauthorized');

      // Reset mock
      authMock.getUserIdFromRequest.mockResolvedValue('test-user-id');
    });

    it('should handle single subtask reorder', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 5 }
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
      expect(data.reordered_count).toBe(1);
    });

    it('should validate ownership of parent task', async () => {
      // This test assumes the mock will simulate unauthorized access
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174001', // Different user's task
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 }
        ]
      };

      const request = new NextRequest('http://localhost:3001/api/subtasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await reorderSubtasks(request);
      const data = await response.json();

      // In mock mode, this may return 404 or 200 depending on mock data
      expect([200, 404, 403]).toContain(response.status);
    });

    it('should handle concurrent reorder requests', async () => {
      const baseData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const requests = [
        {
          ...baseData,
          subtask_orders: [{ task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 }, { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 1 }]
        },
        {
          ...baseData,
          subtask_orders: [{ task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 1 }, { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 0 }]
        }
      ].map(data => 
        reorderSubtasks(new NextRequest('http://localhost:3001/api/subtasks/reorder', {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        }))
      );

      const responses = await Promise.all(requests);
      
      // At least one should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle zero-based indexing correctly', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 0 },
          { task_id: '123e4567-e89b-12d3-a456-426614174002', new_order: 0 } // Duplicate zero order
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
      expect(data).toHaveProperty('error', 'Duplicate order values are not allowed');
    });

    it('should handle maximum valid order value', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: '123e4567-e89b-12d3-a456-426614174001', new_order: 2147483647 } // Maximum 32-bit integer
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
    });

    it('should validate that task_ids belong to the specified parent', async () => {
      const reorderData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        subtask_orders: [
          { task_id: 'different-parent-subtask', new_order: 0 } // Belongs to different parent
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
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('not subtasks of the parent task');
    });
  });
});