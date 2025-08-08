import { NextRequest } from 'next/server';
import { GET as getTasks, POST as createTask } from '../../app/api/tasks/route';
import { GET as getTask, PUT as updateTask, DELETE as deleteTask } from '../../app/api/tasks/[id]/route';
import { PUT as updateStatus } from '../../app/api/tasks/[id]/status/route';
import { GET as getStats } from '../../app/api/tasks/stats/route';

// Mock environment to disable Supabase for tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null)
}));

describe('/api/tasks', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('GET /api/tasks', () => {
    it('should return mock tasks when Supabase is not configured', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('type', 'task');
      expect(data[0]).toHaveProperty('content');
      expect(data[0].content).toHaveProperty('title');
      expect(data[0].content).toHaveProperty('status');
      expect(data[0].content).toHaveProperty('priority');
    });

    it('should filter tasks by status', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?status=completed');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      data.forEach((task: any) => {
        expect(task.content.status).toBe('completed');
      });
    });

    it('should filter tasks by priority', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?priority=high');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      data.forEach((task: any) => {
        expect(task.content.priority).toBe('high');
      });
    });

    it('should handle search queries', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?search=API');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?limit=invalid');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Test Task',
          description: 'This is a test task',
          status: 'pending',
          priority: 'medium',
          category: 'work'
        },
        tags: ['test', 'api']
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
      expect(data.content.title).toBe('Test Task');
      expect(data.content.status).toBe('pending');
      expect(data.content.priority).toBe('medium');
      expect(data.tags).toEqual(['test', 'api']);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        type: 'task',
        content: {
          description: 'Missing title'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTask(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Invalid task data');
    });

    it('should validate title length', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'a'.repeat(201), // Exceeds max length
          status: 'pending',
          priority: 'medium'
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
      expect(data).toHaveProperty('error');
    });

    it('should validate enum values', async () => {
      const taskData = {
        type: 'task',
        content: {
          title: 'Test Task',
          status: 'invalid_status',
          priority: 'medium'
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
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/tasks/[id]', () => {
    it('should return a specific task', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1');
      const response = await getTask(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', '1');
      expect(data).toHaveProperty('type', 'task');
      expect(data.content).toHaveProperty('title');
    });

    it('should return 404 for non-existent task', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/999');
      const response = await getTask(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Task not found');
    });
  });

  describe('PUT /api/tasks/[id]', () => {
    it('should update a task', async () => {
      const updateData = {
        content: {
          status: 'completed',
          progress: 100,
          notes: 'Task completed successfully'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content.status).toBe('completed');
      expect(data.content.progress).toBe(100);
      expect(data.content.notes).toBe('Task completed successfully');
    });

    it('should return 404 for non-existent task', async () => {
      const updateData = {
        content: { status: 'completed' }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/999', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Task not found');
    });
  });

  describe('PUT /api/tasks/[id]/status', () => {
    it('should update task status', async () => {
      const statusUpdate = {
        status: 'completed',
        notes: 'Task completed',
        progress: 100
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1/status', {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateStatus(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content.status).toBe('completed');
      expect(data.content.progress).toBe(100);
      expect(data.content).toHaveProperty('completion_date');
    });

    it('should validate status values', async () => {
      const statusUpdate = {
        status: 'invalid_status'
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1/status', {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateStatus(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('should delete a task', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'DELETE'
      });

      const response = await deleteTask(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Task deleted successfully');
      expect(data).toHaveProperty('id', '1');
    });

    it('should return 404 for non-existent task', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/999', {
        method: 'DELETE'
      });

      const response = await deleteTask(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Task not found');
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('should return task statistics', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/stats');
      const response = await getStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('by_status');
      expect(data).toHaveProperty('by_priority');
      expect(data).toHaveProperty('by_category');
      expect(data).toHaveProperty('overdue');
      expect(data).toHaveProperty('due_today');
      expect(data).toHaveProperty('due_this_week');
      expect(data).toHaveProperty('completion_rate');
      expect(data).toHaveProperty('average_completion_time');

      // Validate structure
      expect(typeof data.total).toBe('number');
      expect(typeof data.by_status).toBe('object');
      expect(typeof data.by_priority).toBe('object');
      expect(typeof data.by_category).toBe('object');
      expect(typeof data.completion_rate).toBe('number');
    });

    it('should filter statistics by date range', async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = new Date().toISOString();
      
      const request = new NextRequest(
        `http://localhost:3001/api/tasks/stats?from_date=${fromDate}&to_date=${toDate}`
      );
      const response = await getStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
    });
  });
});