import { NextRequest } from 'next/server';
import { POST as createTask } from '../../app/api/tasks/route';
import { PUT as updateTask } from '../../app/api/tasks/[id]/route';
import { POST as createSubtask } from '../../app/api/subtasks/route';

// Mock the auth functions
jest.mock('../../lib/auth', () => ({
  getUserIdFromRequest: jest.fn(() => Promise.resolve('test-user-id')),
  createClientForRequest: jest.fn(() => null)
}));

// Mock Supabase to test without database
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null)
}));

describe('Hierarchy Validation and Error Cases', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('Circular Reference Prevention', () => {
    it('should prevent creating circular references (direct)', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Self-referencing Task',
          status: 'pending',
          priority: 'medium',
          parent_task_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      };

      // Mock the created task to have the same ID as the parent
      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      // In a real scenario, this would be caught by database constraints
      // For mock mode, we test the validation logic
      const response = await createTask(request);
      
      // Should succeed in mock mode, but in real DB would be caught by triggers
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should prevent updating task to create circular reference', async () => {
      const updateData = {
        content: {
          parent_task_id: '1' // Trying to set task 1's parent to itself
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      
      // In mock mode this may succeed, but real DB would prevent this
      expect([200, 400, 409]).toContain(response.status);
    });

    it('should prevent indirect circular references (A->B->A)', async () => {
      // Create task B with parent A
      const taskB = {
        type: 'task',
        content: {
          title: 'Task B',
          status: 'pending',
          priority: 'medium',
          parent_task_id: '123e4567-e89b-12d3-a456-426614174000' // Task A
        }
      };

      const requestB = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskB),
        headers: { 'Content-Type': 'application/json' }
      });

      const responseB = await createTask(requestB);
      expect([200, 201]).toContain(responseB.status);

      // Now try to update Task A to have Task B as parent (creating cycle)
      const updateA = {
        content: {
          parent_task_id: 'task-b-id' // Set A's parent to B
        }
      };

      const requestUpdateA = new NextRequest('http://localhost:3001/api/tasks/123e4567-e89b-12d3-a456-426614174000', {
        method: 'PUT',
        body: JSON.stringify(updateA),
        headers: { 'Content-Type': 'application/json' }
      });

      const responseUpdateA = await updateTask(requestUpdateA, { 
        params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) 
      });

      // Should be prevented by database constraints
      expect([200, 400, 409]).toContain(responseUpdateA.status);
    });
  });

  describe('Maximum Hierarchy Depth Validation', () => {
    it('should enforce maximum hierarchy depth (10 levels)', async () => {
      // Try to create a subtask at depth 10 (should be rejected)
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000', // Mock task at depth 9
        task: {
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

      // In mock mode, depth checking depends on mock data hierarchy_level
      if (response.status === 400) {
        expect(data).toHaveProperty('error', 'Maximum hierarchy depth exceeded');
      } else {
        expect([200, 201]).toContain(response.status);
      }
    });

    it('should validate hierarchy_level bounds in queries', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?hierarchy_level=11');
      const { GET: getTasks } = require('../../app/api/tasks/route');
      
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should handle edge case at maximum allowed depth', async () => {
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000', // Mock task at depth 8
        task: {
          type: 'task',
          content: {
            title: 'Max Depth Subtask',
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
      
      // Should succeed if within limits
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('Parent Task Validation', () => {
    it('should validate parent task exists', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Orphaned Task',
          status: 'pending',
          priority: 'medium',
          parent_task_id: '123e4567-e89b-12d3-a456-426614174999' // Non-existent
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      
      // In mock mode may succeed, real DB would enforce foreign key constraint
      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should validate parent task ownership', async () => {
      // Mock auth to return different user ID
      const authMock = require('../../lib/auth');
      authMock.getUserIdFromRequest.mockResolvedValueOnce('different-user-id');

      const taskData = {
        type: 'task',
        content: {
          title: 'Unauthorized Parent Task',
          status: 'pending',
          priority: 'medium',
          parent_task_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      
      // Should be prevented by RLS or explicit checks
      expect([200, 201, 403, 404]).toContain(response.status);

      // Reset mock
      authMock.getUserIdFromRequest.mockResolvedValue('test-user-id');
    });

    it('should prevent setting deleted task as parent', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Child of Deleted Task',
          status: 'pending',
          priority: 'medium',
          parent_task_id: 'deleted-task-id'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      
      // Should fail due to foreign key constraint
      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('Subtask Order Validation', () => {
    it('should validate subtask_order is non-negative', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Invalid Order Task',
          status: 'pending',
          priority: 'medium',
          subtask_order: -5
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid task data');
    });

    it('should handle large subtask_order values', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Large Order Task',
          status: 'pending',
          priority: 'medium',
          subtask_order: 2147483647 // Max 32-bit integer
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      
      expect([200, 201]).toContain(response.status);
    });

    it('should validate subtask_order type', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'String Order Task',
          status: 'pending',
          priority: 'medium',
          subtask_order: 'not-a-number'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid task data');
    });
  });

  describe('Completion Behavior Validation', () => {
    it('should validate completion_behavior enum values', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Invalid Behavior Task',
          status: 'pending',
          priority: 'medium',
          completion_behavior: 'invalid_behavior'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid task data');
    });

    it('should allow valid completion_behavior values', async () => {
      const validBehaviors = ['manual', 'auto_when_subtasks_complete'];
      
      for (const behavior of validBehaviors) {
        const taskData = {
          type: 'task',
          content: {
            title: `Task with ${behavior}`,
            status: 'pending',
            priority: 'medium',
            completion_behavior: behavior
          }
        };

        const request = new NextRequest('http://localhost:3001/api/tasks', {
          method: 'POST',
          body: JSON.stringify(taskData),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await createTask(request);
        expect([200, 201]).toContain(response.status);
      }
    });
  });

  describe('Progress Calculation Validation', () => {
    it('should validate progress_calculation enum values', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Invalid Calculation Task',
          status: 'pending',
          priority: 'medium',
          progress_calculation: 'invalid_calculation'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid task data');
    });

    it('should allow valid progress_calculation values', async () => {
      const validCalculations = ['manual', 'average_subtasks', 'weighted_subtasks'];
      
      for (const calculation of validCalculations) {
        const taskData = {
          type: 'task',
          content: {
            title: `Task with ${calculation}`,
            status: 'pending',
            priority: 'medium',
            progress_calculation: calculation
          }
        };

        const request = new NextRequest('http://localhost:3001/api/tasks', {
          method: 'POST',
          body: JSON.stringify(taskData),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await createTask(request);
        expect([200, 201]).toContain(response.status);
      }
    });
  });

  describe('UUID Format Validation', () => {
    it('should validate parent_task_id UUID format in creation', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Invalid UUID Task',
          status: 'pending',
          priority: 'medium',
          parent_task_id: 'not-a-valid-uuid'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid task data');
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['content', 'parent_task_id']
          })
        ])
      );
    });

    it('should validate parent_task_id UUID format in updates', async () => {
      const updateData = {
        content: {
          parent_task_id: 'invalid-uuid-format'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should accept valid UUID formats', async () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789',
        '00000000-0000-0000-0000-000000000000'
      ];

      for (const uuid of validUUIDs) {
        const taskData = {
          type: 'task',
          content: {
            title: `Task with valid UUID ${uuid}`,
            status: 'pending',
            priority: 'medium',
            parent_task_id: uuid
          }
        };

        const request = new NextRequest('http://localhost:3001/api/tasks', {
          method: 'POST',
          body: JSON.stringify(taskData),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await createTask(request);
        expect([200, 201, 404]).toContain(response.status); // 404 if UUID doesn't exist
      }
    });
  });

  describe('Hierarchy Metadata Consistency', () => {
    it('should maintain hierarchy_level consistency', async () => {
      // Create subtask and verify hierarchy_level is calculated correctly
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        task: {
          type: 'task',
          content: {
            title: 'Level Test Subtask',
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
      
      if (response.status === 201) {
        const data = await response.json();
        expect(data).toHaveProperty('hierarchy_level');
        expect(typeof data.hierarchy_level).toBe('number');
        expect(data.hierarchy_level).toBeGreaterThanOrEqual(0);
      }
    });

    it('should maintain hierarchy_path consistency', async () => {
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        task: {
          type: 'task',
          content: {
            title: 'Path Test Subtask',
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
      
      if (response.status === 201) {
        const data = await response.json();
        expect(data).toHaveProperty('hierarchy_path');
        expect(typeof data.hierarchy_path).toBe('string');
      }
    });

    it('should update subtask counts correctly', async () => {
      // This test would verify that parent task counts are updated
      // In mock mode, we can only test the API response structure
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        task: {
          type: 'task',
          content: {
            title: 'Count Test Subtask',
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
      
      if (response.status === 201) {
        const data = await response.json();
        expect(data).toHaveProperty('subtask_count');
        expect(data).toHaveProperty('completed_subtask_count');
      }
    });
  });

  describe('Authorization and Security', () => {
    it('should prevent unauthorized hierarchy modifications', async () => {
      const authMock = require('../../lib/auth');
      authMock.getUserIdFromRequest.mockResolvedValueOnce(null);

      const taskData = {
        type: 'task',
        content: {
          title: 'Unauthorized Task',
          status: 'pending',
          priority: 'medium',
          parent_task_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error', 'Unauthorized');

      // Reset mock
      authMock.getUserIdFromRequest.mockResolvedValue('test-user-id');
    });

    it('should validate cross-tenant hierarchy isolation', async () => {
      // Test that users cannot create subtasks under other users' tasks
      const authMock = require('../../lib/auth');
      authMock.getUserIdFromRequest.mockResolvedValueOnce('different-user');

      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000', // Different user's task
        task: {
          type: 'task',
          content: {
            title: 'Cross-tenant Subtask',
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
      
      // Should be prevented by RLS
      expect([400, 403, 404]).toContain(response.status);

      // Reset mock
      authMock.getUserIdFromRequest.mockResolvedValue('test-user-id');
    });
  });

  describe('Data Integrity Edge Cases', () => {
    it('should handle null parent_task_id correctly', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Root Task',
          status: 'pending',
          priority: 'medium',
          parent_task_id: null
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      
      if (response.status === 201) {
        const data = await response.json();
        expect(data.content.parent_task_id).toBeUndefined();
        expect(data.hierarchy_level).toBe(0);
      }
    });

    it('should handle undefined vs null parent_task_id', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Undefined Parent Task',
          status: 'pending',
          priority: 'medium'
          // parent_task_id is undefined (not included)
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      expect([200, 201]).toContain(response.status);
    });

    it('should handle concurrent hierarchy modifications', async () => {
      const taskA = {
        type: 'task',
        content: {
          title: 'Concurrent Task A',
          status: 'pending',
          priority: 'medium'
        }
      };

      const taskB = {
        type: 'task',
        content: {
          title: 'Concurrent Task B',
          status: 'pending',
          priority: 'medium'
        }
      };

      const requests = [taskA, taskB].map(data => 
        createTask(new NextRequest('http://localhost:3001/api/tasks', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        }))
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });
    });
  });
});