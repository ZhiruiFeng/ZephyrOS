import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  RepositoryResult,
  RepositoryListResult,
  Category,
  CategoryFilterParams,
  CreateCategoryInput,
  UpdateCategoryInput
} from '../types';
import { RepositoryError } from '../types';

export interface CategoryRepository {
  findByUserAndId(userId: string, categoryId: string): Promise<RepositoryResult<Category>>;
  findAllByUser(userId: string, filters?: CategoryFilterParams): Promise<RepositoryListResult<Category>>;
  createCategory(userId: string, data: CreateCategoryInput): Promise<RepositoryResult<Category>>;
  updateCategory(userId: string, categoryId: string, updates: UpdateCategoryInput): Promise<RepositoryResult<Category>>;
  deleteCategory(userId: string, categoryId: string): Promise<RepositoryResult<boolean>>;
  isCategoryInUse(userId: string, categoryId: string): Promise<RepositoryResult<boolean>>;
}

export class CategoryRepositoryImpl extends BaseRepository<Category> implements CategoryRepository {
  constructor(client: DatabaseClient) {
    super(client, 'categories', '*');
  }

  /**
   * Find category by user and ID
   */
  async findByUserAndId(userId: string, categoryId: string): Promise<RepositoryResult<Category>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('user_id', userId)
        .eq('id', categoryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new RepositoryError('Category not found', '404') };
        }
        console.error(`Database error finding category:`, error);
        return { data: null, error: new RepositoryError('Failed to get category', error.code) };
      }

      return { data: data as unknown as Category, error: null };
    } catch (error) {
      console.error('Error finding category:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find all categories for a user with optional filtering
   */
  async findAllByUser(userId: string, filters?: CategoryFilterParams): Promise<RepositoryListResult<Category>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect, { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters if provided
      if (filters) {
        if (filters.name) {
          query = query.ilike('name', `%${filters.name}%`);
        }

        if (filters.color) {
          query = query.eq('color', filters.color);
        }

        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        // Pagination
        if (filters.limit !== undefined) {
          query = query.limit(filters.limit);
        }

        if (filters.offset !== undefined) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }
      }

      // Always order by name
      query = query.order('name', { ascending: true });

      const { data, error, count } = await query;

      if (error) {
        console.error(`Database error finding categories:`, error);
        return { data: null, error: new RepositoryError('Failed to get categories', error.code), total: 0 };
      }

      return {
        data: (data as unknown as Category[]) || [],
        error: null,
        total: count || 0
      };
    } catch (error) {
      console.error('Error finding categories:', error);
      return { data: null, error: error as Error, total: 0 };
    }
  }

  /**
   * Create a new category
   */
  async createCategory(userId: string, data: CreateCategoryInput): Promise<RepositoryResult<Category>> {
    try {
      const categoryData = {
        ...data,
        user_id: userId,
        // Ensure color has default if not provided
        color: data.color || '#6B7280'
      };

      const { data: category, error } = await this.client
        .from(this.tableName)
        .insert(categoryData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: new RepositoryError('Category name already exists', '400') };
        }
        console.error('Database error creating category:', error);
        return { data: null, error: new RepositoryError('Failed to create category', error.code) };
      }

      return { data: category as unknown as Category, error: null };
    } catch (error) {
      console.error('Error creating category:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(userId: string, categoryId: string, updates: UpdateCategoryInput): Promise<RepositoryResult<Category>> {
    try {
      const { data: category, error } = await this.client
        .from(this.tableName)
        .update(updates)
        .eq('id', categoryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new RepositoryError('Category not found', '404') };
        }
        if (error.code === '23505') {
          return { data: null, error: new RepositoryError('Category name already exists', '400') };
        }
        console.error('Database error updating category:', error);
        return { data: null, error: new RepositoryError('Failed to update category', error.code) };
      }

      return { data: category as unknown as Category, error: null };
    } catch (error) {
      console.error('Error updating category:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(userId: string, categoryId: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: false, error: new RepositoryError('Category not found', '404') };
        }
        console.error('Database error deleting category:', error);
        return { data: false, error: new RepositoryError('Failed to delete category', error.code) };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Check if a category is in use by any tasks
   */
  async isCategoryInUse(userId: string, categoryId: string): Promise<RepositoryResult<boolean>> {
    try {
      const { data: tasks, error } = await this.client
        .from('tasks')
        .select('id')
        .eq('category_id', categoryId)
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Database error checking category usage:', error);
        return { data: false, error: new RepositoryError('Failed to check category usage', error.code) };
      }

      return { data: tasks && tasks.length > 0, error: null };
    } catch (error) {
      console.error('Error checking category usage:', error);
      return { data: false, error: error as Error };
    }
  }
}
