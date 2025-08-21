import { NextRequest } from 'next/server';
import { GET as getTasks, POST as createTask } from '../../app/api/tasks/route';
import { GET as getTask, PUT as updateTask } from '../../app/api/tasks/[id]/route';

// Mock the auth functions
jest.mock('../../lib/auth', () => ({
  getUserIdFromRequest: jest.fn(() => Promise.resolve('test-user-id')),
  createClientForRequest: jest.fn(() => null)
}));

// Mock Supabase to test without database
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null)
}));

describe('/api/tasks - Subtasks Integration', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('GET /api/tasks - Subtasks filtering', () => {
    it('should handle parent_task_id filter parameter', async () => {
      const parentTaskId = '123e4567-e89b-12d3-a456-426614174000';
      const request = new NextRequest(
        `http://localhost:3001/api/tasks?parent_task_id=${parentTaskId}`
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle root_tasks_only filter', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?root_tasks_only=true'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle hierarchy_level filter', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?hierarchy_level=1'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle include_subtasks parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?include_subtasks=false'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should support hierarchy_level sorting', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?sort_by=hierarchy_level&sort_order=asc'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should support subtask_order sorting', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?sort_by=subtask_order&sort_order=asc'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should validate parent_task_id UUID format', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?parent_task_id=invalid-uuid'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should validate hierarchy_level as number', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?hierarchy_level=not-a-number'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should combine multiple subtasks filters', async () => {
      const parentTaskId = '123e4567-e89b-12d3-a456-426614174000';
      const request = new NextRequest(
        `http://localhost:3001/api/tasks?parent_task_id=${parentTaskId}&hierarchy_level=1&include_subtasks=true`
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/tasks - Subtasks creation', () => {
    it('should create a task with subtasks hierarchy fields', async () => {
      const parentTaskId = '123e4567-e89b-12d3-a456-426614174000';
      const taskData = {
        type: 'task',
        content: {
          title: 'Subtask 1',
          description: 'This is a subtask',
          status: 'pending',
          priority: 'medium',
          parent_task_id: parentTaskId,
          subtask_order: 1,
          completion_behavior: 'manual',
          progress_calculation: 'manual'
        },
        tags: ['subtask', 'test']
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'task');
      expect(data.content.title).toBe('Subtask 1');
      expect(data.content.parent_task_id).toBe(parentTaskId);
      expect(data.content.subtask_order).toBe(1);
      expect(data.content.completion_behavior).toBe('manual');
      expect(data.content.progress_calculation).toBe('manual');
      
      // Check that hierarchy metadata is included
      expect(data).toHaveProperty('hierarchy_level');
      expect(data).toHaveProperty('hierarchy_path');
      expect(data).toHaveProperty('subtask_count');
      expect(data).toHaveProperty('completed_subtask_count');
    });

    it('should create a root task (no parent)', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Root Task',
          description: 'This is a root task',
          status: 'pending',
          priority: 'high',
          completion_behavior: 'auto_when_subtasks_complete',
          progress_calculation: 'average_subtasks'
        },
        tags: ['root', 'parent']
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.content.title).toBe('Root Task');
      expect(data.content.parent_task_id).toBeUndefined();
      expect(data.content.completion_behavior).toBe('auto_when_subtasks_complete');
      expect(data.content.progress_calculation).toBe('average_subtasks');
    });

    it('should validate parent_task_id UUID format', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Invalid Subtask',
          status: 'pending',
          priority: 'medium',
          parent_task_id: 'invalid-uuid'
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

    it('should validate subtask_order as non-negative integer', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Invalid Order Subtask',
          status: 'pending',
          priority: 'medium',
          subtask_order: -1
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

    it('should validate completion_behavior enum', async () => {
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

    it('should validate progress_calculation enum', async () => {
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
  });

  describe('GET /api/tasks/[id] - Subtasks metadata', () => {
    it('should return task with hierarchy metadata', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1');
      const response = await getTask(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', '1');
      expect(data).toHaveProperty('type', 'task');
      
      // Check hierarchy fields in content
      expect(data.content).toHaveProperty('parent_task_id');
      expect(data.content).toHaveProperty('subtask_order');
      expect(data.content).toHaveProperty('completion_behavior');
      expect(data.content).toHaveProperty('progress_calculation');
      
      // Check hierarchy metadata
      expect(data).toHaveProperty('hierarchy_level');
      expect(data).toHaveProperty('hierarchy_path');
      expect(data).toHaveProperty('subtask_count');
      expect(data).toHaveProperty('completed_subtask_count');
    });
  });

  describe('PUT /api/tasks/[id] - Subtasks updates', () => {
    it('should update subtasks hierarchy fields', async () => {
      const parentTaskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        content: {
          parent_task_id: parentTaskId,
          subtask_order: 3,
          completion_behavior: 'auto_when_subtasks_complete',
          progress_calculation: 'weighted_subtasks'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content.parent_task_id).toBe(parentTaskId);
      expect(data.content.subtask_order).toBe(3);
      expect(data.content.completion_behavior).toBe('auto_when_subtasks_complete');
      expect(data.content.progress_calculation).toBe('weighted_subtasks');
    });

    it('should allow removing parent (converting to root task)', async () => {
      const updateData = {
        content: {
          parent_task_id: null
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content.parent_task_id).toBeUndefined();
    });

    it('should validate parent_task_id format in updates', async () => {
      const updateData = {
        content: {
          parent_task_id: 'invalid-uuid'
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

    it('should update only specified hierarchy fields', async () => {
      const updateData = {
        content: {
          subtask_order: 5
          // Only updating order, other fields should remain unchanged
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content.subtask_order).toBe(5);
      // Other fields should have default/existing values
      expect(data.content.completion_behavior).toBeDefined();
      expect(data.content.progress_calculation).toBeDefined();
    });

    it('should handle concurrent status and hierarchy updates', async () => {
      const parentTaskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        content: {
          status: 'completed',
          progress: 100,
          parent_task_id: parentTaskId,
          completion_behavior: 'manual'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content.status).toBe('completed');
      expect(data.content.progress).toBe(100);
      expect(data.content.parent_task_id).toBe(parentTaskId);
      expect(data.content.completion_behavior).toBe('manual');
      expect(data.content).toHaveProperty('completion_date');
    });
  });

  describe('Error handling for hierarchy operations', () => {
    it('should handle malformed JSON in task creation', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: '{ invalid json }',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      expect(response.status).toBe(500);
    });

    it('should handle missing content in task creation', async () => {
      const taskData = {
        type: 'task'
        // Missing content field
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

    it('should handle invalid query parameter combinations', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?root_tasks_only=true&parent_task_id=123e4567-e89b-12d3-a456-426614174000'
      );
      const response = await getTasks(request);
      
      // Should still work, but with conflicting logic (implementation dependent)
      expect([200, 400]).toContain(response.status);
    });
  });
});