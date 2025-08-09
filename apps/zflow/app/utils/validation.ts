// Form Validation Utilities
// Centralized validation logic for consistent form handling

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateTaskTitle = (title: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Task title is required');
  }
  
  if (title.length > 200) {
    errors.push('Task title must be less than 200 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateTaskDescription = (description?: string): ValidationResult => {
  const errors: string[] = [];
  
  if (description && description.length > 1000) {
    errors.push('Task description must be less than 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateDueDate = (dueDate?: string): ValidationResult => {
  const errors: string[] = [];
  
  if (dueDate) {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid due date format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateProgress = (progress?: number): ValidationResult => {
  const errors: string[] = [];
  
  if (progress !== undefined) {
    if (progress < 0 || progress > 100) {
      errors.push('Progress must be between 0 and 100');
    }
    
    if (!Number.isInteger(progress)) {
      errors.push('Progress must be a whole number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateEstimatedDuration = (duration?: number): ValidationResult => {
  const errors: string[] = [];
  
  if (duration !== undefined) {
    if (duration < 0) {
      errors.push('Estimated duration cannot be negative');
    }
    
    if (duration > 10080) { // 7 days in minutes
      errors.push('Estimated duration cannot exceed 7 days');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCategoryName = (name: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Category name is required');
  }
  
  if (name.length > 50) {
    errors.push('Category name must be less than 50 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateColorHex = (color: string): ValidationResult => {
  const errors: string[] = [];
  const hexPattern = /^#[0-9A-F]{6}$/i;
  
  if (!hexPattern.test(color)) {
    errors.push('Color must be a valid hex code (e.g., #FF5733)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateTask = (task: {
  title: string;
  description?: string;
  due_date?: string;
  progress?: number;
  estimated_duration?: number;
}): ValidationResult => {
  const errors: string[] = [];
  
  const titleValidation = validateTaskTitle(task.title);
  if (!titleValidation.isValid) {
    errors.push(...titleValidation.errors);
  }
  
  const descValidation = validateTaskDescription(task.description);
  if (!descValidation.isValid) {
    errors.push(...descValidation.errors);
  }
  
  const dueDateValidation = validateDueDate(task.due_date);
  if (!dueDateValidation.isValid) {
    errors.push(...dueDateValidation.errors);
  }
  
  const progressValidation = validateProgress(task.progress);
  if (!progressValidation.isValid) {
    errors.push(...progressValidation.errors);
  }
  
  const durationValidation = validateEstimatedDuration(task.estimated_duration);
  if (!durationValidation.isValid) {
    errors.push(...durationValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};