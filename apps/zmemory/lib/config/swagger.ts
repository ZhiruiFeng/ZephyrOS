// OpenAPI/Swagger configuration for ZMemory API
import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'ZMemory API',
        version: '1.0.0',
        description: 'Memory management API for ZephyrOS - Your personal AI efficiency operating system',
        contact: {
          name: 'ZephyrOS Team',
          url: 'https://github.com/your-username/ZephyrOS'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server'
        },
        {
          url: 'https://your-domain.vercel.app',
          description: 'Production server'
        }
      ],
      components: {
        schemas: {
          Memory: {
            type: 'object',
            required: ['id', 'type', 'content', 'created_at', 'updated_at'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Unique identifier for the memory'
              },
              type: {
                type: 'string',
                description: 'Type of memory content',
                examples: ['task', 'note', 'bookmark']
              },
              content: {
                type: 'object',
                description: 'Flexible content object based on memory type'
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Array of tags for categorization'
              },
              metadata: {
                type: 'object',
                description: 'Additional metadata'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: 'ISO 8601 timestamp of creation'
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: 'ISO 8601 timestamp of last update'
              }
            }
          },
          TaskContent: {
            type: 'object',
            required: ['title', 'status', 'priority'],
            properties: {
              title: {
                type: 'string',
                description: 'Task title',
                maxLength: 200
              },
              description: {
                type: 'string',
                description: 'Optional task description'
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'],
                description: 'Current status of the task'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Priority level of the task'
              },
              category: {
                type: 'string',
                enum: ['work', 'personal', 'project', 'meeting', 'learning', 'maintenance', 'other'],
                description: 'Task category'
              },
              due_date: {
                type: 'string',
                format: 'date-time',
                description: 'Optional due date for the task'
              },
              estimated_duration: {
                type: 'number',
                minimum: 1,
                description: 'Estimated duration in minutes'
              },
              progress: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                default: 0,
                description: 'Task completion progress (0-100%)'
              },
              assignee: {
                type: 'string',
                description: 'Person assigned to the task'
              },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of task IDs this task depends on'
              },
              subtasks: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of subtask IDs'
              },
              notes: {
                type: 'string',
                description: 'Additional notes about the task'
              },
              completion_date: {
                type: 'string',
                format: 'date-time',
                description: 'Date when the task was completed'
              }
            }
          },
          TaskMemory: {
            allOf: [
              { $ref: '#/components/schemas/Memory' },
              {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['task']
                  },
                  content: {
                    $ref: '#/components/schemas/TaskContent'
                  }
                }
              }
            ]
          },
          CreateTaskRequest: {
            type: 'object',
            required: ['type', 'content'],
            properties: {
              type: {
                type: 'string',
                enum: ['task'],
                description: 'Must be "task" for task creation'
              },
              content: {
                $ref: '#/components/schemas/TaskContent'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags for categorization'
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata'
              }
            }
          },
          UpdateTaskRequest: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['task'],
                description: 'Task type (optional for updates)'
              },
              content: {
                type: 'object',
                description: 'Partial task content to update',
                properties: {
                  title: { type: 'string', maxLength: 200 },
                  description: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'urgent']
                  },
                  category: {
                    type: 'string',
                    enum: ['work', 'personal', 'project', 'meeting', 'learning', 'maintenance', 'other']
                  },
                  due_date: { type: 'string', format: 'date-time' },
                  estimated_duration: { type: 'number', minimum: 1 },
                  progress: { type: 'number', minimum: 0, maximum: 100 },
                  assignee: { type: 'string' },
                  dependencies: { type: 'array', items: { type: 'string' } },
                  subtasks: { type: 'array', items: { type: 'string' } },
                  notes: { type: 'string' },
                  completion_date: { type: 'string', format: 'date-time' }
                }
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Update tags'
              },
              metadata: {
                type: 'object',
                description: 'Update metadata'
              }
            }
          },
          CreateMemoryRequest: {
            type: 'object',
            required: ['type', 'content'],
            properties: {
              type: {
                type: 'string',
                description: 'Type of memory to create'
              },
              content: {
                type: 'object',
                description: 'Content object for the memory'
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Optional tags for categorization'
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata'
              }
            }
          },
          UpdateMemoryRequest: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Update memory type'
              },
              content: {
                type: 'object',
                description: 'Update content object'
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Update tags'
              },
              metadata: {
                type: 'object',
                description: 'Update metadata'
              }
            }
          },
          Error: {
            type: 'object',
            required: ['error'],
            properties: {
              error: {
                type: 'string',
                description: 'Error message'
              },
              details: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'object' } }
                ],
                description: 'Additional error details'
              }
            }
          },
          HealthCheck: {
            type: 'object',
            required: ['status', 'timestamp', 'service', 'version'],
            properties: {
              status: {
                type: 'string',
                enum: ['healthy', 'unhealthy'],
                description: 'Service health status'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Health check timestamp'
              },
              service: {
                type: 'string',
                description: 'Service name'
              },
              version: {
                type: 'string',
                description: 'Service version'
              },
              database: {
                type: 'string',
                enum: ['connected', 'error', 'unknown'],
                description: 'Database connection status'
              }
            }
          }
        },
        responses: {
          NotFound: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          BadRequest: {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          InternalServerError: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      },
      tags: [
        {
          name: 'Health',
          description: 'Service health and status endpoints'
        },
        {
          name: 'Memories',
          description: 'Memory management operations'
        },
        {
          name: 'Tasks',
          description: 'Task management operations and statistics'
        }
      ]
    }
  });

  return spec;
};