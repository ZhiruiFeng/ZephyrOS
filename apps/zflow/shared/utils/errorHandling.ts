// Error Handling Utilities
// Centralized error handling for consistent user experience

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ERROR_MESSAGES = {
  TASK_CREATE_FAILED: 'Failed to create task, please try again',
  TASK_UPDATE_FAILED: 'Failed to update task, please try again',
  TASK_DELETE_FAILED: 'Failed to delete task, please try again',
  TASK_LOAD_FAILED: 'Failed to load tasks',
  CATEGORY_CREATE_FAILED: 'Failed to create category, please try again',
  CATEGORY_UPDATE_FAILED: 'Failed to update category, please try again',
  CATEGORY_DELETE_FAILED: 'Failed to delete category, please try again',
  CATEGORY_LOAD_FAILED: 'Failed to load categories',
  VALIDATION_FAILED: 'Please check your input and try again',
  NETWORK_ERROR: 'Network error, please check your connection',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  SERVER_ERROR: 'Server error, please try again later'
};

export const handleApiError = (error: any): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return ERROR_MESSAGES.VALIDATION_FAILED;
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return 'Resource not found';
      case 500:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return ERROR_MESSAGES.NETWORK_ERROR;
    }
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

export const showErrorNotification = (error: any) => {
  const message = handleApiError(error);
  // For now using alert, but could be replaced with toast notification
  alert(message);
};

export const confirmAction = (message: string): boolean => {
  return confirm(message);
};

export const CONFIRMATION_MESSAGES = {
  DELETE_TASK: 'Are you sure you want to delete this task?',
  DELETE_CATEGORY: 'Are you sure you want to delete this category? Associated tasks will become uncategorized.',
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?'
};