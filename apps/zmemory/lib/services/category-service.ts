import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult
} from './types';
import type {
  Category,
  CategoryFilterParams,
  CreateCategoryInput,
  UpdateCategoryInput
} from '../database/types';
import { createCategoryRepository } from '../database';

export interface CategoryService {
  getCategories(filters?: CategoryFilterParams): Promise<ServiceResult<Category[]>>;
  getCategory(categoryId: string): Promise<ServiceResult<Category>>;
  createCategory(data: CreateCategoryInput): Promise<ServiceResult<Category>>;
  updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<ServiceResult<Category>>;
  deleteCategory(categoryId: string): Promise<ServiceResult<boolean>>;
}

export class CategoryServiceImpl extends BaseServiceImpl implements CategoryService {
  private categoryRepo = createCategoryRepository();

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Get all categories for the user
   */
  async getCategories(filters: CategoryFilterParams = {}): Promise<ServiceResult<Category[]>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getCategoriesStarted', { filters });

      const result = await this.categoryRepo.findAllByUser(this.context.userId, filters);

      if (result.error) {
        this.logOperation('error', 'getCategoriesFailed', {
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'getCategoriesSuccess', {
        count: result.data?.length || 0,
        total: result.total
      });

      return result.data || [];
    });
  }

  /**
   * Get a single category by ID
   */
  async getCategory(categoryId: string): Promise<ServiceResult<Category>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getCategoryStarted', { categoryId });

      const result = await this.categoryRepo.findByUserAndId(this.context.userId, categoryId);

      if (result.error) {
        this.logOperation('error', 'getCategoryFailed', {
          categoryId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Category not found');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'getCategorySuccess', { categoryId });

      return result.data;
    });
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryInput): Promise<ServiceResult<Category>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'createCategoryStarted', { name: data.name });

      // Validate and normalize data
      const categoryData: CreateCategoryInput = {
        ...data,
        color: data.color || '#6B7280' // Default color
      };

      const result = await this.categoryRepo.createCategory(this.context.userId, categoryData);

      if (result.error) {
        this.logOperation('error', 'createCategoryFailed', {
          error: result.error.message,
          name: data.name
        });
        throw result.error;
      }

      this.logOperation('info', 'createCategorySuccess', {
        categoryId: result.data?.id,
        name: result.data?.name
      });

      return result.data!;
    });
  }

  /**
   * Update an existing category
   */
  async updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<ServiceResult<Category>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'updateCategoryStarted', { categoryId, updates: data });

      const result = await this.categoryRepo.updateCategory(this.context.userId, categoryId, data);

      if (result.error) {
        this.logOperation('error', 'updateCategoryFailed', {
          categoryId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Category not found');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'updateCategorySuccess', { categoryId });

      return result.data;
    });
  }

  /**
   * Delete a category
   * Checks if category is in use before deletion
   */
  async deleteCategory(categoryId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'deleteCategoryStarted', { categoryId });

      // First check if category is in use
      const usageResult = await this.categoryRepo.isCategoryInUse(this.context.userId, categoryId);

      if (usageResult.error) {
        this.logOperation('error', 'deleteCategoryCheckFailed', {
          categoryId,
          error: usageResult.error.message
        });
        throw usageResult.error;
      }

      if (usageResult.data === true) {
        this.logOperation('warn', 'deleteCategoryInUse', { categoryId });
        const error = new Error('Cannot delete category that is in use');
        (error as any).code = '400';
        throw error;
      }

      // Delete category
      const result = await this.categoryRepo.deleteCategory(this.context.userId, categoryId);

      if (result.error) {
        this.logOperation('error', 'deleteCategoryFailed', {
          categoryId,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'deleteCategorySuccess', { categoryId });

      return true;
    });
  }
}
