import { TaskRelationType } from '../../app/types/task'
import { API_BASE, authenticatedFetch } from './api-base'

// Task Relations API
export const taskRelationsApi = {
  async getByTask(taskId: string): Promise<any[]> {
    const response = await authenticatedFetch(`${API_BASE}/task-relations?task_id=${taskId}`)
    if (!response.ok) throw new Error('Failed to fetch task relations')
    const data = await response.json()
    return data.relations || []
  },

  async create(relation: { parent_task_id: string; child_task_id: string; relation_type: TaskRelationType }): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/task-relations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relation),
    })
    if (!response.ok) throw new Error('Failed to create task relation')
    const data = await response.json()
    return data.relation
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/task-relations/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete task relation')
  }
}