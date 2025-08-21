import { NextRequest } from 'next/server';
import { GET as getTaskTree } from '../../app/api/tasks/[id]/tree/route';

// Mock the auth functions
jest.mock('../../lib/auth', () => ({
  getUserIdFromRequest: jest.fn(() => Promise.resolve('test-user-id')),
  createClientForRequest: jest.fn(() => null)
}));

// Mock Supabase to test without database
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null)
}));

describe('/api/tasks/[id]/tree', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('GET /api/tasks/[id]/tree', () => {
    it('should return task tree with flat format by default', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('task');
      expect(data).toHaveProperty('subtasks');
      expect(Array.isArray(data.subtasks)).toBe(true);
      
      // Check task structure
      expect(data.task).toHaveProperty('id', '1');
      expect(data.task).toHaveProperty('type', 'task');
      expect(data.task.content).toHaveProperty('title');
      expect(data.task).toHaveProperty('hierarchy_level');
      expect(data.task).toHaveProperty('hierarchy_path');
      expect(data.task).toHaveProperty('subtask_count');
      expect(data.task).toHaveProperty('completed_subtask_count');
    });

    it('should return nested tree format when requested', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=nested');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('task');
      expect(data.task).toHaveProperty('children');
      expect(Array.isArray(data.task.children)).toBe(true);
      
      // Check nested structure
      if (data.task.children.length > 0) {
        expect(data.task.children[0]).toHaveProperty('id');
        expect(data.task.children[0]).toHaveProperty('children');
      }
    });

    it('should filter tree by max_depth parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?max_depth=1');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.subtasks)).toBe(true);
      
      // Check depth constraint
      data.subtasks.forEach((subtask: any) => {
        expect(subtask.hierarchy_level).toBeLessThanOrEqual(data.task.hierarchy_level + 1);
      });
    });

    it('should filter tree by status', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?status=pending');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      data.subtasks.forEach((subtask: any) => {
        expect(subtask.content.status).toBe('pending');
      });
    });

    it('should include completion metadata', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?include_completed=true');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tree_stats');
      expect(data.tree_stats).toHaveProperty('total_subtasks');
      expect(data.tree_stats).toHaveProperty('completed_subtasks');
      expect(data.tree_stats).toHaveProperty('pending_subtasks');
      expect(data.tree_stats).toHaveProperty('in_progress_subtasks');
      expect(data.tree_stats).toHaveProperty('completion_percentage');
      expect(data.tree_stats).toHaveProperty('max_depth');
    });

    it('should handle empty tree (task with no subtasks)', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/2/tree');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.task).toHaveProperty('id', '2');
      expect(data.subtasks).toEqual([]);
      expect(data.tree_stats.total_subtasks).toBe(0);
    });

    it('should return 404 for non-existent task', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/999/tree');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Task not found');
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?max_depth=invalid');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid query parameters');
    });

    it('should handle nested tree building correctly', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=nested&max_depth=3');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Recursive function to check tree structure
      const validateTreeStructure = (node: any, currentDepth: number, maxDepth: number) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('children');
        expect(Array.isArray(node.children)).toBe(true);
        
        if (currentDepth < maxDepth) {
          node.children.forEach((child: any) => {
            expect(child.hierarchy_level).toBe(node.hierarchy_level + 1);
            validateTreeStructure(child, currentDepth + 1, maxDepth);
          });
        }
      };

      validateTreeStructure(data.task, 0, 3);
    });

    it('should support multiple filter combinations', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?status=pending&max_depth=2&format=flat');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subtasks).toBeDefined();
      
      data.subtasks.forEach((subtask: any) => {
        expect(subtask.content.status).toBe('pending');
        expect(subtask.hierarchy_level).toBeLessThanOrEqual(data.task.hierarchy_level + 2);
      });
    });

    it('should maintain hierarchy order in flat format', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=flat');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Check that subtasks are ordered by hierarchy_level and subtask_order
      for (let i = 1; i < data.subtasks.length; i++) {
        const prev = data.subtasks[i - 1];
        const curr = data.subtasks[i];
        
        if (prev.hierarchy_level === curr.hierarchy_level) {
          // Same level should be ordered by subtask_order
          expect(prev.content.subtask_order).toBeLessThanOrEqual(curr.content.subtask_order);
        } else {
          // Different levels should be in depth-first order
          expect(prev.hierarchy_level).toBeLessThanOrEqual(curr.hierarchy_level);
        }
      }
    });

    it('should handle include_completed parameter correctly', async () => {
      const includedRequest = new NextRequest('http://localhost:3001/api/tasks/1/tree?include_completed=true');
      const excludedRequest = new NextRequest('http://localhost:3001/api/tasks/1/tree?include_completed=false');

      const [includedResponse, excludedResponse] = await Promise.all([
        getTaskTree(includedRequest, { params: Promise.resolve({ id: '1' }) }),
        getTaskTree(excludedRequest, { params: Promise.resolve({ id: '1' }) })
      ]);

      const includedData = await includedResponse.json();
      const excludedData = await excludedResponse.json();

      expect(includedResponse.status).toBe(200);
      expect(excludedResponse.status).toBe(200);

      // Excluded should have fewer or equal subtasks
      expect(excludedData.subtasks.length).toBeLessThanOrEqual(includedData.subtasks.length);
      
      // Excluded should not contain completed tasks
      excludedData.subtasks.forEach((subtask: any) => {
        expect(subtask.content.status).not.toBe('completed');
      });
    });

    it('should validate max_depth bounds', async () => {
      // Test negative max_depth
      const negativeRequest = new NextRequest('http://localhost:3001/api/tasks/1/tree?max_depth=-1');
      const negativeResponse = await getTaskTree(negativeRequest, { params: Promise.resolve({ id: '1' }) });
      const negativeData = await negativeResponse.json();

      expect(negativeResponse.status).toBe(400);
      expect(negativeData).toHaveProperty('error');

      // Test excessive max_depth
      const excessiveRequest = new NextRequest('http://localhost:3001/api/tasks/1/tree?max_depth=100');
      const excessiveResponse = await getTaskTree(excessiveRequest, { params: Promise.resolve({ id: '1' }) });
      const excessiveData = await excessiveResponse.json();

      expect(excessiveResponse.status).toBe(400);
      expect(excessiveData).toHaveProperty('error');
      expect(excessiveData.error).toContain('max_depth cannot exceed 10');
    });

    it('should handle malformed task ID', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/invalid-id/tree');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: 'invalid-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should calculate tree statistics correctly', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?include_completed=true');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tree_stats).toBeDefined();
      
      const stats = data.tree_stats;
      expect(typeof stats.total_subtasks).toBe('number');
      expect(typeof stats.completed_subtasks).toBe('number');
      expect(typeof stats.pending_subtasks).toBe('number');
      expect(typeof stats.in_progress_subtasks).toBe('number');
      expect(typeof stats.completion_percentage).toBe('number');
      expect(typeof stats.max_depth).toBe('number');
      
      // Verify totals add up
      expect(stats.completed_subtasks + stats.pending_subtasks + stats.in_progress_subtasks)
        .toBeLessThanOrEqual(stats.total_subtasks);
        
      // Verify percentage is valid
      expect(stats.completion_percentage).toBeGreaterThanOrEqual(0);
      expect(stats.completion_percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Error handling', () => {
    it('should handle missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks//tree');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should handle invalid format parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=invalid');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('format');
    });

    it('should handle invalid status filter', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?status=invalid_status');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should handle concurrent requests gracefully', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        getTaskTree(
          new NextRequest(`http://localhost:3001/api/tasks/1/tree?format=${i % 2 === 0 ? 'flat' : 'nested'}`),
          { params: Promise.resolve({ id: '1' }) }
        )
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(async (response, index) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('task');
        expect(data.task.id).toBe('1');
      });
    });
  });
});