export interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
    updated_at: string;
    due_date?: string;
    tags?: string[];
}
export interface Memory {
    id: string;
    title: string;
    content: string;
    type: 'note' | 'link' | 'file' | 'thought';
    tags?: string[];
    created_at: string;
    updated_at: string;
    metadata?: Record<string, any>;
}
export declare const TABLES: {
    readonly TASKS: "tasks";
    readonly MEMORIES: "memories";
    readonly TAGS: "tags";
};
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export declare const formatDate: (date: string | Date) => string;
export declare const formatDateTime: (date: string | Date) => string;
