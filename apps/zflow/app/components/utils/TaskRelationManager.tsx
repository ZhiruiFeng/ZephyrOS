'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskRelationType } from '../../types/task';

interface TaskRelation {
  id: string;
  parent_task_id: string;
  child_task_id: string;
  relation_type: TaskRelationType;
  created_at: string;
  parent_task?: Task;
  child_task?: Task;
}

interface TaskRelationManagerProps {
  taskId: string;
  relations: TaskRelation[];
  availableTasks: Task[];
  onAddRelation: (relation: { parent_task_id: string; child_task_id: string; relation_type: TaskRelationType }) => Promise<void>;
  onRemoveRelation: (relationId: string) => Promise<void>;
}

const relationTypeLabels: Record<TaskRelationType, string> = {
  subtask: '子任务',
  related: '相关任务',
  dependency: '依赖任务',
  blocked_by: '阻塞任务'
};

const relationTypeColors: Record<TaskRelationType, string> = {
  subtask: 'bg-blue-100 text-blue-800',
  related: 'bg-green-100 text-green-800',
  dependency: 'bg-yellow-100 text-yellow-800',
  blocked_by: 'bg-red-100 text-red-800'
};

export default function TaskRelationManager({
  taskId,
  relations,
  availableTasks,
  onAddRelation,
  onRemoveRelation
}: TaskRelationManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState<TaskRelationType>('subtask');

  const filteredTasks = availableTasks.filter(task => 
    task.id !== taskId && 
    !relations.some(rel => 
      (rel.parent_task_id === taskId && rel.child_task_id === task.id) ||
      (rel.child_task_id === taskId && rel.parent_task_id === task.id)
    )
  );

  const handleAddRelation = async () => {
    if (!selectedTaskId) return;
    
    try {
      await onAddRelation({
        parent_task_id: taskId,
        child_task_id: selectedTaskId,
        relation_type: selectedRelationType
      });
      setSelectedTaskId('');
      setSelectedRelationType('subtask');
      setIsAdding(false);
    } catch (error) {
      console.error('添加任务关系失败:', error);
    }
  };

  const handleRemoveRelation = async (relationId: string) => {
    try {
      await onRemoveRelation(relationId);
    } catch (error) {
      console.error('删除任务关系失败:', error);
    }
  };

  const getRelatedTasks = (relationType: TaskRelationType) => {
    return relations.filter(rel => rel.relation_type === relationType);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">任务关系</h3>
        {filteredTasks.length > 0 && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isAdding ? '取消' : '添加关系'}
          </button>
        )}
      </div>

      {isAdding && (
        <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选择任务
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择任务...</option>
                {filteredTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关系类型
              </label>
              <select
                value={selectedRelationType}
                onChange={(e) => setSelectedRelationType(e.target.value as TaskRelationType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(relationTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleAddRelation}
                disabled={!selectedTaskId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(relationTypeLabels).map(([type, label]) => {
          const typeRelations = getRelatedTasks(type as TaskRelationType);
          if (typeRelations.length === 0) return null;

          return (
            <div key={type} className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">{label}</h4>
              <div className="space-y-2">
                {typeRelations.map(relation => {
                  const relatedTask = relation.parent_task_id === taskId 
                    ? relation.child_task 
                    : relation.parent_task;
                  
                  if (!relatedTask) return null;

                  return (
                    <div key={relation.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${relationTypeColors[relation.relation_type]}`}>
                          {label}
                        </span>
                        <span className="text-sm text-gray-900">{relatedTask.title}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          relatedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                          relatedTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {relatedTask.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveRelation(relation.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {relations.length === 0 && !isAdding && (
        <div className="text-center py-8 text-gray-500">
          暂无任务关系
        </div>
      )}
    </div>
  );
}
