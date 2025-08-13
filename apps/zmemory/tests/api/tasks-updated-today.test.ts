import { NextRequest } from 'next/server';
import { GET as getTasksUpdatedToday } from '../../app/api/tasks/updated-today/route';

// Mock environment to disable Supabase for tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null)
}));

describe('/api/tasks/updated-today', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('GET /api/tasks/updated-today', () => {
    it('should return tasks updated today when Supabase is not configured', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/updated-today');
      const response = await getTasksUpdatedToday(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('date_range');
      expect(Array.isArray(data.tasks)).toBe(true);
      expect(typeof data.total).toBe('number');
      expect(data.date_range).toHaveProperty('start');
      expect(data.date_range).toHaveProperty('end');
      
      // Validate task structure
      if (data.tasks.length > 0) {
        const task = data.tasks[0];
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('type', 'task');
        expect(task).toHaveProperty('content');
        expect(task.content).toHaveProperty('title');
        expect(task.content).toHaveProperty('status');
        expect(task.content).toHaveProperty('priority');
        expect(task).toHaveProperty('updated_at');
      }
    });

    it('should filter tasks by status', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/updated-today?status=completed');
      const response = await getTasksUpdatedToday(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      data.tasks.forEach((task: any) => {
        expect(task.content.status).toBe('completed');
      });
    });

    it('should filter tasks by priority', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/updated-today?priority=high');
      const response = await getTasksUpdatedToday(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      data.tasks.forEach((task: any) => {
        expect(task.content.priority).toBe('high');
      });
    });

    it('should filter tasks by category', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/updated-today?category=work');
      const response = await getTasksUpdatedToday(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      data.tasks.forEach((task: any) => {
        if (task.content.category) {
          expect(task.content.category).toBe('work');
        }
      });
    });

    it('should support pagination with limit and offset', async () => {
      const firstPageReq = new NextRequest('http://localhost:3001/api/tasks/updated-today?limit=1&offset=0');
      const secondPageReq = new NextRequest('http://localhost:3001/api/tasks/updated-today?limit=1&offset=1');

      const [firstRes, secondRes] = await Promise.all([
        getTasksUpdatedToday(firstPageReq),
        getTasksUpdatedToday(secondPageReq)
      ]);

      const firstData = await firstRes.json();
      const secondData = await secondRes.json();

      expect(firstRes.status).toBe(200);
      expect(secondRes.status).toBe(200);
      expect(firstData).toHaveProperty('tasks');
      expect(secondData).toHaveProperty('tasks');
      
      if (firstData.tasks.length && secondData.tasks.length) {
        expect(firstData.tasks[0].id).not.toBe(secondData.tasks[0].id);
      }
    });

    it('should validate date_range covers today', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/updated-today');
      const response = await getTasksUpdatedToday(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('date_range');
      
      const today = new Date();
      const startDate = new Date(data.date_range.start);
      const endDate = new Date(data.date_range.end);
      
      // Start should be beginning of today
      expect(startDate.getFullYear()).toBe(today.getFullYear());
      expect(startDate.getMonth()).toBe(today.getMonth());
      expect(startDate.getDate()).toBe(today.getDate());
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
      
      // End should be end of today
      expect(endDate.getFullYear()).toBe(today.getFullYear());
      expect(endDate.getMonth()).toBe(today.getMonth());
      expect(endDate.getDate()).toBe(today.getDate());
    });

    it('should return all tasks updated today from mock data', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/updated-today');
      const response = await getTasksUpdatedToday(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('total');
      
      // Mock data should have tasks updated today
      data.tasks.forEach((task: any) => {
        const updatedDate = new Date(task.updated_at);
        const today = new Date();
        
        expect(updatedDate.getFullYear()).toBe(today.getFullYear());
        expect(updatedDate.getMonth()).toBe(today.getMonth());
        expect(updatedDate.getDate()).toBe(today.getDate());
      });
    });
  });
});