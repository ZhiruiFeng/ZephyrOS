import { GET, POST } from '../../app/api/memories/route';
import { NextRequest } from 'next/server';

// Mock Supabase for testing
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440000',
                  type: 'task',
                  content: {
                    title: 'Test task',
                    status: 'pending',
                    priority: 'medium'
                  },
                  tags: ['test'],
                  created_at: '2024-08-01T10:00:00Z',
                  updated_at: '2024-08-01T10:00:00Z'
                }
              ],
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              type: 'task',
              content: {
                title: 'New test task',
                status: 'pending',
                priority: 'high'
              },
              tags: ['test', 'new'],
              created_at: '2024-08-01T10:00:00Z',
              updated_at: '2024-08-01T10:00:00Z'
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('/api/memories', () => {
  describe('GET', () => {
    it('should return memories list', async () => {
      const request = new NextRequest('http://localhost:3001/api/memories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('type');
        expect(data[0]).toHaveProperty('content');
        expect(data[0]).toHaveProperty('created_at');
        expect(data[0]).toHaveProperty('updated_at');
      }
    });

    it('should handle type filter parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/memories?type=task');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle limit parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/memories?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle offset parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/memories?offset=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST', () => {
    it('should create a new memory', async () => {
      const requestBody = {
        type: 'task',
        content: {
          title: 'New test task',
          status: 'pending',
          priority: 'high'
        },
        tags: ['test', 'new']
      };

      const request = new NextRequest('http://localhost:3001/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'task');
      expect(data).toHaveProperty('content');
      expect(data.content).toHaveProperty('title', 'New test task');
      expect(data).toHaveProperty('tags');
      expect(data.tags).toContain('test');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');
    });

    it('should validate required fields', async () => {
      const requestBody = {
        // Missing type and content
        tags: ['test']
      };

      const request = new NextRequest('http://localhost:3001/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3001/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});