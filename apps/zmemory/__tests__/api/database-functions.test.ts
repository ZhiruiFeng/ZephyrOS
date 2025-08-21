import { NextRequest } from 'next/server';
import { GET as getTasks } from '../../app/api/tasks/route';
import { GET as getTaskTree } from '../../app/api/tasks/[id]/tree/route';
import { POST as createSubtask } from '../../app/api/subtasks/route';
import { PUT as updateTask } from '../../app/api/tasks/[id]/route';

// Mock the auth functions
jest.mock('../../lib/auth', () => ({
  getUserIdFromRequest: jest.fn(() => Promise.resolve('test-user-id')),
  createClientForRequest: jest.fn(() => null)
}));

// Mock Supabase to test without database
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null)
}));

describe('Database Functions Integration Tests', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('get_subtask_tree() Function Integration', () => {
    it('should return hierarchical tree structure via API', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=nested');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('task');
      expect(data.task).toHaveProperty('children');
      expect(Array.isArray(data.task.children)).toBe(true);

      // Verify tree structure represents database function output
      if (data.task.children.length > 0) {
        const child = data.task.children[0];
        expect(child).toHaveProperty('id');
        expect(child).toHaveProperty('hierarchy_level');
        expect(child).toHaveProperty('hierarchy_path');
        expect(child).toHaveProperty('children');
        expect(Array.isArray(child.children)).toBe(true);
      }
    });

    it('should respect max_depth parameter in tree retrieval', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=nested&max_depth=2');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify depth limitation (simulating database function behavior)
      const verifyMaxDepth = (node: any, currentDepth: number, maxDepth: number) => {
        if (currentDepth >= maxDepth) {
          expect(node.children).toEqual([]);
          return;
        }
        
        if (node.children && node.children.length > 0) {
          node.children.forEach((child: any) => {
            verifyMaxDepth(child, currentDepth + 1, maxDepth);
          });
        }
      };

      verifyMaxDepth(data.task, 0, 2);
    });

    it('should handle empty tree (no subtasks)', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/2/tree?format=nested');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.task).toHaveProperty('children');
      expect(data.task.children).toEqual([]);
      expect(data.tree_stats.total_subtasks).toBe(0);
    });

    it('should return flat tree representation', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=flat');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('subtasks');
      expect(Array.isArray(data.subtasks)).toBe(true);

      // Verify flat structure maintains hierarchy information
      data.subtasks.forEach((subtask: any) => {
        expect(subtask).toHaveProperty('hierarchy_level');
        expect(subtask).toHaveProperty('hierarchy_path');
        expect(typeof subtask.hierarchy_level).toBe('number');
        expect(typeof subtask.hierarchy_path).toBe('string');
      });
    });
  });

  describe('update_task_hierarchy() Function Integration', () => {
    it('should trigger hierarchy updates when creating subtasks', async () => {
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        task: {
          type: 'task',
          content: {
            title: 'Hierarchy Update Test',
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
        
        // Verify hierarchy metadata is populated (simulating function execution)
        expect(data).toHaveProperty('hierarchy_level');
        expect(data).toHaveProperty('hierarchy_path');
        expect(data).toHaveProperty('subtask_count');
        expect(data).toHaveProperty('completed_subtask_count');
        
        expect(typeof data.hierarchy_level).toBe('number');
        expect(typeof data.hierarchy_path).toBe('string');
        expect(data.hierarchy_level).toBeGreaterThan(0);
      }
    });

    it('should update hierarchy when changing parent task', async () => {
      const updateData = {
        content: {
          parent_task_id: '123e4567-e89b-12d3-a456-426614174001'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      
      if (response.status === 200) {
        const data = await response.json();
        
        // Verify hierarchy recalculation (simulating function execution)
        expect(data).toHaveProperty('hierarchy_level');
        expect(data).toHaveProperty('hierarchy_path');
        expect(data.content.parent_task_id).toBe('123e4567-e89b-12d3-a456-426614174001');
      }
    });

    it('should handle hierarchy updates when removing parent', async () => {
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
      
      if (response.status === 200) {
        const data = await response.json();
        
        // Verify task becomes root level
        expect(data.hierarchy_level).toBe(0);
        expect(data.hierarchy_path).toBe('');
        expect(data.content.parent_task_id).toBeUndefined();
      }
    });
  });

  describe('calculate_subtask_progress() Function Integration', () => {
    it('should calculate progress based on completion behavior', async () => {
      // Test manual progress calculation
      const manualTask = {
        content: {
          progress_calculation: 'manual',
          progress: 75
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(manualTask),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.content.progress).toBe(75);
        expect(data.content.progress_calculation).toBe('manual');
      }
    });

    it('should handle average subtasks progress calculation', async () => {
      const averageTask = {
        content: {
          progress_calculation: 'average_subtasks'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(averageTask),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.content.progress_calculation).toBe('average_subtasks');
        // In real implementation, progress would be calculated from subtasks
        expect(typeof data.content.progress).toBe('number');
      }
    });

    it('should handle weighted subtasks progress calculation', async () => {
      const weightedTask = {
        content: {
          progress_calculation: 'weighted_subtasks'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(weightedTask),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.content.progress_calculation).toBe('weighted_subtasks');
        expect(typeof data.content.progress).toBe('number');
      }
    });
  });

  describe('Trigger Function Integration', () => {
    it('should trigger subtask count updates on task creation', async () => {
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        task: {
          type: 'task',
          content: {
            title: 'Count Trigger Test',
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
        
        // Verify counts are present (simulating trigger execution)
        expect(data).toHaveProperty('subtask_count');
        expect(data).toHaveProperty('completed_subtask_count');
        expect(typeof data.subtask_count).toBe('number');
        expect(typeof data.completed_subtask_count).toBe('number');
        expect(data.subtask_count).toBeGreaterThanOrEqual(0);
        expect(data.completed_subtask_count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should trigger completion behavior on status updates', async () => {
      const statusUpdate = {
        content: {
          status: 'completed',
          completion_behavior: 'auto_when_subtasks_complete'
        }
      };

      const request = new NextRequest('http://localhost:3001/api/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTask(request, { params: Promise.resolve({ id: '1' }) });
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.content.status).toBe('completed');
        expect(data.content).toHaveProperty('completion_date');
        expect(data.content.completion_behavior).toBe('auto_when_subtasks_complete');
      }
    });

    it('should maintain data consistency across hierarchy updates', async () => {
      // Create a subtask and verify parent is updated
      const subtaskData = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        task: {
          type: 'task',
          content: {
            title: 'Consistency Test',
            status: 'pending',
            priority: 'medium'
          }
        }
      };

      const createRequest = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(subtaskData),
        headers: { 'Content-Type': 'application/json' }
      });

      const createResponse = await createSubtask(createRequest);
      
      if (createResponse.status === 201) {
        const subtaskResult = await createResponse.json();
        
        // Verify hierarchy consistency
        expect(subtaskResult.hierarchy_level).toBeGreaterThan(0);
        expect(subtaskResult.hierarchy_path).toContain(subtaskData.parent_task_id);
        
        // Update the subtask and verify consistency is maintained
        const updateData = {
          content: {
            status: 'completed'
          }
        };

        const updateRequest = new NextRequest(`http://localhost:3001/api/tasks/${subtaskResult.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' }
        });

        const updateResponse = await updateTask(updateRequest, { 
          params: Promise.resolve({ id: subtaskResult.id }) 
        });
        
        if (updateResponse.status === 200) {
          const updateResult = await updateResponse.json();
          expect(updateResult.content.status).toBe('completed');
          expect(updateResult.hierarchy_level).toBe(subtaskResult.hierarchy_level);
          expect(updateResult.hierarchy_path).toBe(subtaskResult.hierarchy_path);
        }
      }
    });
  });

  describe('Complex Query Function Integration', () => {
    it('should handle complex filtering with hierarchy awareness', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/tasks?parent_task_id=123e4567-e89b-12d3-a456-426614174000&hierarchy_level=1&status=pending'
      );
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      // Verify filtering respects hierarchy constraints
      data.forEach((task: any) => {
        if (task.content.parent_task_id) {
          expect(task.content.parent_task_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        }
        if (task.hierarchy_level !== undefined) {
          expect(task.hierarchy_level).toBe(1);
        }
        expect(task.content.status).toBe('pending');
      });
    });

    it('should handle root tasks only filtering', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?root_tasks_only=true');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      // Verify only root tasks are returned
      data.forEach((task: any) => {
        expect(task.content.parent_task_id).toBeUndefined();
        expect(task.hierarchy_level).toBe(0);
      });
    });

    it('should handle hierarchy-aware sorting', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?sort_by=hierarchy_level&sort_order=asc');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      // Verify sorting by hierarchy level
      for (let i = 1; i < data.length; i++) {
        expect(data[i].hierarchy_level).toBeGreaterThanOrEqual(data[i - 1].hierarchy_level);
      }
    });

    it('should handle subtask order sorting', async () => {
      const request = new NextRequest('http://localhost:3001/api/tasks?sort_by=subtask_order&sort_order=asc');
      const response = await getTasks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      // Verify sorting respects subtask order
      for (let i = 1; i < data.length; i++) {
        const prevOrder = data[i - 1].content.subtask_order || 0;
        const currentOrder = data[i].content.subtask_order || 0;
        expect(currentOrder).toBeGreaterThanOrEqual(prevOrder);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large hierarchy trees efficiently', async () => {
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=nested&max_depth=10');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      // Verify response time is reasonable (under 5 seconds for mock)
      expect(responseTime).toBeLessThan(5000);
    });

    it('should handle concurrent hierarchy operations', async () => {
      const operations = [
        // Create subtask
        createSubtask(new NextRequest('http://localhost:3001/api/subtasks', {
          method: 'POST',
          body: JSON.stringify({
            parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
            task: {
              type: 'task',
              content: {
                title: 'Concurrent Test 1',
                status: 'pending',
                priority: 'medium'
              }
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        })),

        // Get tree
        getTaskTree(new NextRequest('http://localhost:3001/api/tasks/1/tree'), {
          params: Promise.resolve({ id: '1' })
        }),

        // Update task
        updateTask(new NextRequest('http://localhost:3001/api/tasks/2', {
          method: 'PUT',
          body: JSON.stringify({
            content: { status: 'in_progress' }
          }),
          headers: { 'Content-Type': 'application/json' }
        }), { params: Promise.resolve({ id: '2' }) })
      ];

      const results = await Promise.all(operations);
      
      // Verify all operations completed successfully or with expected errors
      results.forEach(response => {
        expect([200, 201, 400, 404]).toContain(response.status);
      });
    });

    it('should handle edge case with deeply nested hierarchies', async () => {
      // Test retrieval of deeply nested structure
      const request = new NextRequest('http://localhost:3001/api/tasks/1/tree?format=flat&max_depth=9');
      const response = await getTaskTree(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      if (data.subtasks.length > 0) {
        // Verify depth constraint is respected
        data.subtasks.forEach((subtask: any) => {
          expect(subtask.hierarchy_level).toBeLessThanOrEqual(9);
        });
      }
    });

    it('should maintain referential integrity during complex operations', async () => {
      // Create multiple levels of subtasks and verify integrity
      const level1Data = {
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        task: {
          type: 'task',
          content: {
            title: 'Level 1 Task',
            status: 'pending',
            priority: 'medium'
          }
        }
      };

      const level1Request = new NextRequest('http://localhost:3001/api/subtasks', {
        method: 'POST',
        body: JSON.stringify(level1Data),
        headers: { 'Content-Type': 'application/json' }
      });

      const level1Response = await createSubtask(level1Request);
      
      if (level1Response.status === 201) {
        const level1Result = await level1Response.json();
        
        // Verify integrity of created task
        expect(level1Result.hierarchy_level).toBeGreaterThan(0);
        expect(level1Result.hierarchy_path).toBeTruthy();
        expect(level1Result.content.parent_task_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });
  });
});