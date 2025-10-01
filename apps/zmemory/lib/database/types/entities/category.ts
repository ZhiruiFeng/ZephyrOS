import { BaseEntity, FilterParams } from '../common';

// Category Entity shape aligned with categories table
export interface Category extends BaseEntity {
  name: string;
  description?: string | null;
  color: string; // Hex color format #RRGGBB
  icon?: string | null;
}

export interface CategoryFilterParams extends FilterParams {
  name?: string;
  color?: string;
}

// Create category input (what comes from POST request)
export interface CreateCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

// Update category input (what comes from PUT request)
export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}
