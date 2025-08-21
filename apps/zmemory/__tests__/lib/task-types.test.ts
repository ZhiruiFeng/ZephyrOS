import {
  TaskContentSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskQuerySchema,
  CreateSubtaskRequest,
  TaskStatus,
  TaskPriority,
  CompletionBehavior,
  ProgressCalculation
} from '../../lib/task-types';

describe('Task Types Validation Schemas', () => {
  describe('TaskContentSchema', () => {
    it('should validate a complete task content object', () => {
      const validTaskContent = {
        title: 'Test Task',
        description: 'This is a test task',
        status: 'pending',
        priority: 'medium',
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        due_date: '2024-12-31T23:59:59Z',
        estimated_duration: 120,
        progress: 50,
        assignee: 'john.doe@example.com',
        notes: 'Some notes about the task',
        parent_task_id: '123e4567-e89b-12d3-a456-426614174001',
        subtask_order: 1,
        completion_behavior: 'manual',
        progress_calculation: 'manual'
      };

      const result = TaskContentSchema.safeParse(validTaskContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Task');
        expect(result.data.status).toBe('pending');
        expect(result.data.priority).toBe('medium');
        expect(result.data.progress).toBe(50);
        expect(result.data.subtask_order).toBe(1);
        expect(result.data.completion_behavior).toBe('manual');
        expect(result.data.progress_calculation).toBe('manual');
      }
    });

    it('should validate minimal task content with defaults', () => {
      const minimalTaskContent = {
        title: 'Minimal Task',
        status: 'pending',
        priority: 'medium'
      };

      const result = TaskContentSchema.safeParse(minimalTaskContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.progress).toBe(0); // default
        expect(result.data.subtask_order).toBe(0); // default
        expect(result.data.completion_behavior).toBe('manual'); // default
        expect(result.data.progress_calculation).toBe('manual'); // default
      }
    });

    it('should reject invalid title (empty)', () => {
      const invalidTaskContent = {
        title: '',
        status: 'pending',
        priority: 'medium'
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['title'],
              message: 'Task title is required'
            })
          ])
        );
      }
    });

    it('should reject invalid title (too long)', () => {
      const invalidTaskContent = {
        title: 'a'.repeat(201), // Exceeds 200 character limit
        status: 'pending',
        priority: 'medium'
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['title'],
              message: 'Title too long'
            })
          ])
        );
      }
    });

    it('should reject invalid status', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'invalid_status',
        priority: 'medium'
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['status']);
      }
    });

    it('should reject invalid priority', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'pending',
        priority: 'invalid_priority'
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['priority']);
      }
    });

    it('should reject invalid progress (negative)', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        progress: -10
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid progress (over 100)', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        progress: 150
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid parent_task_id format', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        parent_task_id: 'not-a-uuid'
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['parent_task_id']);
      }
    });

    it('should reject invalid subtask_order (negative)', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        subtask_order: -1
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid completion_behavior', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        completion_behavior: 'invalid_behavior'
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['completion_behavior']);
      }
    });

    it('should reject invalid progress_calculation', () => {
      const invalidTaskContent = {
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        progress_calculation: 'invalid_calculation'
      };

      const result = TaskContentSchema.safeParse(invalidTaskContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['progress_calculation']);
      }
    });

    it('should validate all enum values', () => {
      // Test all valid status values
      Object.values(TaskStatus).forEach(status => {
        const taskContent = {
          title: 'Test Task',
          status,
          priority: 'medium'
        };
        const result = TaskContentSchema.safeParse(taskContent);
        expect(result.success).toBe(true);
      });

      // Test all valid priority values
      Object.values(TaskPriority).forEach(priority => {
        const taskContent = {
          title: 'Test Task',
          status: 'pending',
          priority
        };
        const result = TaskContentSchema.safeParse(taskContent);
        expect(result.success).toBe(true);
      });

      // Test all valid completion behavior values
      Object.values(CompletionBehavior).forEach(behavior => {
        const taskContent = {
          title: 'Test Task',
          status: 'pending',
          priority: 'medium',
          completion_behavior: behavior
        };
        const result = TaskContentSchema.safeParse(taskContent);
        expect(result.success).toBe(true);
      });

      // Test all valid progress calculation values
      Object.values(ProgressCalculation).forEach(calculation => {
        const taskContent = {
          title: 'Test Task',
          status: 'pending',
          priority: 'medium',
          progress_calculation: calculation
        };
        const result = TaskContentSchema.safeParse(taskContent);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('CreateTaskSchema', () => {
    it('should validate a complete create task request', () => {
      const validCreateRequest = {
        type: 'task',
        content: {
          title: 'New Task',
          description: 'Task description',
          status: 'pending',
          priority: 'high',
          parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
          subtask_order: 2,
          completion_behavior: 'auto_when_subtasks_complete',
          progress_calculation: 'average_subtasks'
        },
        tags: ['work', 'urgent'],
        metadata: { source: 'api', version: '1.0' }
      };

      const result = CreateTaskSchema.safeParse(validCreateRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('task');
        expect(result.data.content.title).toBe('New Task');
        expect(result.data.content.completion_behavior).toBe('auto_when_subtasks_complete');
        expect(result.data.tags).toEqual(['work', 'urgent']);
        expect(result.data.metadata).toEqual({ source: 'api', version: '1.0' });
      }
    });

    it('should reject invalid type', () => {
      const invalidCreateRequest = {
        type: 'invalid_type',
        content: {
          title: 'New Task',
          status: 'pending',
          priority: 'medium'
        }
      };

      const result = CreateTaskSchema.safeParse(invalidCreateRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['type']);
      }
    });
  });

  describe('UpdateTaskSchema', () => {
    it('should validate partial task updates', () => {
      const validUpdateRequest = {
        content: {
          status: 'completed',
          progress: 100,
          completion_behavior: 'manual'
        }
      };

      const result = UpdateTaskSchema.safeParse(validUpdateRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content?.status).toBe('completed');
        expect(result.data.content?.progress).toBe(100);
        expect(result.data.content?.completion_behavior).toBe('manual');
      }
    });

    it('should allow empty updates', () => {
      const emptyUpdate = {};
      const result = UpdateTaskSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate hierarchy field updates', () => {
      const hierarchyUpdate = {
        content: {
          parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
          subtask_order: 5,
          completion_behavior: 'auto_when_subtasks_complete',
          progress_calculation: 'weighted_subtasks'
        }
      };

      const result = UpdateTaskSchema.safeParse(hierarchyUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content?.parent_task_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.data.content?.subtask_order).toBe(5);
        expect(result.data.content?.completion_behavior).toBe('auto_when_subtasks_complete');
        expect(result.data.content?.progress_calculation).toBe('weighted_subtasks');
      }
    });
  });

  describe('TaskQuerySchema', () => {
    it('should validate query with subtasks filters', () => {
      const queryParams = {
        status: 'pending',
        priority: 'high',
        parent_task_id: '123e4567-e89b-12d3-a456-426614174000',
        include_subtasks: 'true',
        hierarchy_level: '2',
        root_tasks_only: 'false',
        limit: '25',
        offset: '10',
        sort_by: 'hierarchy_level',
        sort_order: 'asc'
      };

      const result = TaskQuerySchema.safeParse(queryParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pending');
        expect(result.data.priority).toBe('high');
        expect(result.data.parent_task_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.data.include_subtasks).toBe(true);
        expect(result.data.hierarchy_level).toBe(2);
        expect(result.data.root_tasks_only).toBe(false);
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
        expect(result.data.sort_by).toBe('hierarchy_level');
        expect(result.data.sort_order).toBe('asc');
      }
    });

    it('should apply default values', () => {
      const minimalQuery = {};
      const result = TaskQuerySchema.safeParse(minimalQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_subtasks).toBe(true); // default
        expect(result.data.root_tasks_only).toBe(false); // default
        expect(result.data.limit).toBe(50); // default
        expect(result.data.offset).toBe(0); // default
        expect(result.data.sort_by).toBe('created_at'); // default
        expect(result.data.sort_order).toBe('desc'); // default
      }
    });

    it('should validate new sorting options', () => {
      const validSortOptions = ['created_at', 'updated_at', 'due_date', 'priority', 'title', 'hierarchy_level', 'subtask_order'];
      
      validSortOptions.forEach(sortBy => {
        const query = { sort_by: sortBy };
        const result = TaskQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort_by).toBe(sortBy);
        }
      });
    });

    it('should reject invalid parent_task_id format', () => {
      const invalidQuery = {
        parent_task_id: 'not-a-uuid'
      };

      const result = TaskQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['parent_task_id']);
      }
    });

    it('should reject invalid boolean values', () => {
      const invalidQuery = {
        include_subtasks: 'maybe'
      };

      const result = TaskQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should reject invalid numeric strings', () => {
      const invalidQuery = {
        hierarchy_level: 'not-a-number'
      };

      const result = TaskQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });

  describe('Type Exports', () => {
    it('should export all required enums', () => {
      expect(TaskStatus).toBeDefined();
      expect(TaskPriority).toBeDefined();
      expect(CompletionBehavior).toBeDefined();
      expect(ProgressCalculation).toBeDefined();
    });

    it('should have correct enum values', () => {
      expect(TaskStatus.PENDING).toBe('pending');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.CANCELLED).toBe('cancelled');
      expect(TaskStatus.ON_HOLD).toBe('on_hold');

      expect(TaskPriority.LOW).toBe('low');
      expect(TaskPriority.MEDIUM).toBe('medium');
      expect(TaskPriority.HIGH).toBe('high');
      expect(TaskPriority.URGENT).toBe('urgent');

      expect(CompletionBehavior.MANUAL).toBe('manual');
      expect(CompletionBehavior.AUTO_WHEN_SUBTASKS_COMPLETE).toBe('auto_when_subtasks_complete');

      expect(ProgressCalculation.MANUAL).toBe('manual');
      expect(ProgressCalculation.AVERAGE_SUBTASKS).toBe('average_subtasks');
      expect(ProgressCalculation.WEIGHTED_SUBTASKS).toBe('weighted_subtasks');
    });
  });
});